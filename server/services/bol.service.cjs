// ============================================================
// FILE: server/services/bol.service.cjs
// PURPOSE: Professional Bill of Lading / Dispatch Sheet PDF
// ✅ UPDATED: Now stores BOL PDFs in Supabase Storage
// ✅ FIXED: Shipper Owes Carrier = $0 when prepaid by card
// ============================================================

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ============================================================
// SUPABASE CLIENT SETUP
// ============================================================
const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

let supabase = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('✅ [BOL] Supabase client initialized for BOL storage');
} else {
  console.warn('⚠️ [BOL] Supabase credentials not found - BOL storage disabled');
}

// Storage bucket (reuse existing documents bucket)
const STORAGE_BUCKET = 'documents';

// Brand Colors
const COLORS = {
  navy: '#1e3a8a',
  blue: '#2563eb',
  text: '#333333',
  textLight: '#6b7280',
  border: '#d1d5db',
  background: '#f9fafb',
  white: '#ffffff',
  green: '#059669',
  yellow: '#d97706',
};

// Company Configuration
const COMPANY_INFO = {
  name: process.env.COMPANY_NAME || 'Guga',
  type: 'Shipper',
  addressLine1: process.env.COMPANY_ADDRESS_1 || '123 Transport Way',
  addressLine2: process.env.COMPANY_ADDRESS_2 || 'New York, NY 10001',
  phone: process.env.COMPANY_PHONE || '+1 (555) 555-5555',
  email: process.env.COMPANY_EMAIL || 'dispatch@guga.com',
  logoPath: path.join(__dirname, '..', '..', 'public', 'images', 'logomercury1.png'),
};

// ✅ 4-Step Status Constants
const SHIPMENT_STATUS = {
  SCHEDULED: 'scheduled',
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  DELIVERED: 'delivered',
};

const STATUS_LABELS = {
  [SHIPMENT_STATUS.SCHEDULED]: 'Scheduled',
  [SHIPMENT_STATUS.ASSIGNED]: 'Assigned',
  [SHIPMENT_STATUS.PICKED_UP]: 'Picked Up',
  [SHIPMENT_STATUS.DELIVERED]: 'Delivered',
};

// Driver Responsibilities
const DRIVER_RESPONSIBILITIES = [
  'Driver must call the pickup and delivery locations at least 1 hour before arrival.',
  'Driver must take pictures of all 4 sides of the vehicle, odometer, interior, VIN plate, and license plate.',
  'Driver must verify the VIN matches this dispatch sheet before loading.',
  'Driver must note any existing damage and document with photos at pickup.',
  'Pickup and delivery must occur in daylight hours only unless otherwise arranged.',
  'Driver must obtain printed name, signature, email address, and date at pickup and delivery.',
  'Any delays must be communicated to dispatch immediately.',
  'Deliver vehicle only to the authorized contact listed on this dispatch sheet.',
];

// Carrier Agreement
const CARRIER_AGREEMENT = `This agreement is between the "Carrier" and the "Broker/Shipper." ${COMPANY_INFO.name} is not a party to this agreement beyond brokering the shipment and assumes no liability for vehicle condition, delays, missed appointments, damages, or payment disputes between the Carrier and Shipper.

By accepting this dispatch sheet, the Carrier certifies:
• It has proper authority (MC/US DOT) to transport vehicles.
• It holds all required insurance and compliance documents.
• It will deliver the vehicle in the same condition as received (except normal transit exposure).
• It will complete pickup and delivery in daylight unless arranged otherwise.
• It will submit an invoice and delivery confirmation upon completion.

The Broker/Shipper confirms:
• It has the right to transport the vehicle.
• The pickup and delivery contacts listed are accurate.
• Any changes must be communicated immediately.

There will be no additional charges unless agreed to in writing by both parties.`;

// Helpers
const safeParseJson = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return {}; }
};

const formatDate = (dateValue) => {
  if (!dateValue) return 'TBD';
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return 'TBD';
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

const formatDateTime = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
};

const buildAddress = (data) => {
  if (!data) return { street: '', cityStateZip: '' };
  const street = [data.street1 || data.address || data.street, data.street2].filter(Boolean).join(', ');
  const cityStateZip = [data.city, data.state, data.zip || data.zipCode].filter(Boolean).join(', ');
  return { street, cityStateZip };
};

// ✅ Normalize status to 4-step flow
const normalizeStatus = (status) => {
  if (!status) return SHIPMENT_STATUS.SCHEDULED;
  const s = status.toLowerCase();
  
  if (['waiting', 'pending', 'booked', 'scheduled'].includes(s)) {
    return SHIPMENT_STATUS.SCHEDULED;
  }
  if (['assigned', 'accepted', 'dispatched'].includes(s)) {
    return SHIPMENT_STATUS.ASSIGNED;
  }
  if (['picked_up', 'in_transit', 'pickup_complete'].includes(s)) {
    return SHIPMENT_STATUS.PICKED_UP;
  }
  if (['delivered', 'completed', 'done'].includes(s)) {
    return SHIPMENT_STATUS.DELIVERED;
  }
  
  return SHIPMENT_STATUS.SCHEDULED;
};

// Data Mapper
function mapBookingToBolData(booking) {
  const vd = safeParseJson(booking.vehicleDetails);
  const pickup = booking.pickup || {};
  const dropoff = booking.dropoff || {};
  const sched = booking.scheduling || {};

  const getCondition = () => {
    const c = booking.vehicleCondition || vd.operable;
    if (!c) return 'Operable';
    return ['no', 'false', 'inoperable'].includes(c.toString().toLowerCase()) ? 'Inoperable' : 'Operable';
  };

  const getPickupContact = () => {
    if (booking.pickupOriginType === 'dealer') return [booking.dealerFirstName, booking.dealerLastName].filter(Boolean).join(' ');
    if (booking.pickupOriginType === 'auction') return booking.auctionName || '';
    if (booking.pickupOriginType === 'private') return [booking.privateFirstName, booking.privateLastName].filter(Boolean).join(' ');
    return [booking.customerFirstName, booking.customerLastName].filter(Boolean).join(' ');
  };

  const getPickupPhone = () => {
    if (booking.pickupOriginType === 'dealer') return booking.dealerPhone || '';
    if (booking.pickupOriginType === 'private') return booking.privatePhone || '';
    return booking.customerPhone || pickup.phone || '';
  };

  const getDropoffContact = () => {
    if (booking.dropoffDestinationType === 'dealer') return [booking.dropoffDealerFirstName, booking.dropoffDealerLastName].filter(Boolean).join(' ');
    if (booking.dropoffDestinationType === 'auction') return booking.dropoffAuctionName || '';
    if (booking.dropoffDestinationType === 'private') return [booking.dropoffPrivateFirstName, booking.dropoffPrivateLastName].filter(Boolean).join(' ');
    return '';
  };

  const getDropoffPhone = () => {
    if (booking.dropoffDestinationType === 'dealer') return booking.dropoffDealerPhone || '';
    if (booking.dropoffDestinationType === 'private') return booking.dropoffPrivatePhone || '';
    return dropoff.phone || '';
  };

  const normalizedStatus = normalizeStatus(booking.status);
  const getDispatchStatus = () => {
    return STATUS_LABELS[normalizedStatus] || 'Scheduled';
  };

  const carrierPayout = booking.carrierPayout || booking.price || 0;
  
  // ✅ FIXED: Payment info logic - Shipper Owes Carrier = $0 when prepaid
  const getPaymentInfo = () => {
    const isPrepaid = 
      booking.paymentStatus === 'PAID_IN_FULL' ||
      booking.paymentStatus === 'paid' ||
      booking.paymentSource === 'CARD' ||
      booking.paymentMode === 'full_card_charge' ||
      booking.paidInFull === true ||
      booking.customerPaidInFull === true;
    
    if (isPrepaid) {
      return {
        method: 'Prepaid (Card)',
        terms: `Customer has paid ${COMPANY_INFO.name} in full. Carrier will be paid directly by ${COMPANY_INFO.name} according to carrier terms.`,
        // ✅ FIX: Customer already paid, so shipper owes carrier $0
        // The carrier will be paid by the platform, not by collecting from customer
        shipperOwesCarrier: 0,
      };
    } else {
      return {
        method: 'COD (Cash on Delivery)',
        terms: 'Customer pays carrier at delivery',
        // COD: Carrier collects full amount from customer at delivery
        shipperOwesCarrier: carrierPayout,
      };
    }
  };

  const paymentInfo = getPaymentInfo();
  const pickupAddr = buildAddress(pickup);
  const deliveryAddr = buildAddress(dropoff);

  return {
    orderId: booking.orderNumber || booking.id,
    dispatchDate: formatDate(booking.createdAt),
    dispatchStatus: getDispatchStatus(),
    normalizedStatus,
    generatedAt: formatDateTime(new Date()),

    carrierPayout,
    customerPrice: booking.price || 0,
    paymentMethod: paymentInfo.method,
    paymentTerms: paymentInfo.terms,
    shipperOwesCarrier: paymentInfo.shipperOwesCarrier,

    shipVia: (booking.transportType || 'open').toUpperCase(),
    condition: getCondition(),

    pickupDate: formatDate(booking.pickupDate || sched.pickupDate),
    deliveryDate: formatDate(booking.dropoffDate || sched.dropoffDate),
    
    assignedAt: booking.assignedAt ? formatDateTime(booking.assignedAt) : null,
    pickedUpAt: (booking.pickedUpAt || booking.pickupAt) ? formatDateTime(booking.pickedUpAt || booking.pickupAt) : null,
    deliveredAt: booking.deliveredAt ? formatDateTime(booking.deliveredAt) : null,

    vehicle: {
      year: vd.year || '',
      make: vd.make || '',
      model: vd.model || '',
      type: vd.type || booking.vehicleType || 'Sedan',
      vin: vd.vin || '',
    },

    billing: {
      contact: [booking.customerFirstName, booking.customerLastName].filter(Boolean).join(' ') || '',
      phone: booking.customerPhone || booking.user?.phone || '',
      email: booking.user?.email || '',
    },

    carrier: booking.carrier ? {
      company: booking.carrier.companyName || '',
      usdot: booking.carrier.dotNumber || '',
      mcNumber: booking.carrier.mcNumber || '',
      contact: [booking.carrier.firstName, booking.carrier.lastName].filter(Boolean).join(' ') || '',
      phone: booking.carrier.phone || '',
      email: booking.carrier.email || '',
    } : null,

    pickup: {
      name: getPickupContact(),
      company: pickup.company || booking.auctionName || '',
      street: pickupAddr.street,
      cityStateZip: pickupAddr.cityStateZip,
      phone: getPickupPhone(),
      notes: pickup.notes || booking.notes || '',
    },

    delivery: {
      name: getDropoffContact() || [booking.customerFirstName, booking.customerLastName].filter(Boolean).join(' '),
      company: dropoff.company || '',
      street: deliveryAddr.street,
      cityStateZip: deliveryAddr.cityStateZip,
      phone: getDropoffPhone(),
    },

    customerNotes: booking.notes || booking.customerInstructions || sched.notes || pickup.notes || '',
  };
}

// PDF Generator
async function generateBolPdf(booking) {
  const data = mapBookingToBolData(booking);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        info: { Title: `BOL-${data.orderId}`, Author: COMPANY_INFO.name },
      });

      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      // ========== HEADER ==========
      if (fs.existsSync(COMPANY_INFO.logoPath)) {
        try { doc.image(COMPANY_INFO.logoPath, margin, y, { width: 45 }); } catch (e) {}
      }

      const companyX = margin + 55;
      doc.fillColor(COLORS.blue).fontSize(22).font('Helvetica-Bold').text(COMPANY_INFO.name, companyX, y);
      doc.fillColor(COLORS.textLight).fontSize(9).font('Helvetica');
      doc.text(COMPANY_INFO.type, companyX, y + 24);
      doc.text(COMPANY_INFO.addressLine1, companyX, y + 36);
      doc.text(COMPANY_INFO.addressLine2, companyX, y + 48);
      doc.text(`Co. Phone: ${COMPANY_INFO.phone}`, companyX, y + 60);
      doc.text(`Email: ${COMPANY_INFO.email}`, companyX, y + 72);

      // Right side
      const rightX = pageWidth - 200;
      doc.fillColor(COLORS.textLight).fontSize(10).font('Helvetica').text('Order ID:', rightX, y);
      doc.fillColor(COLORS.blue).fontSize(18).font('Helvetica-Bold').text(`#${data.orderId}`, rightX + 60, y - 3);
      doc.fillColor(COLORS.text).fontSize(20).font('Helvetica-Bold').text('Dispatch Sheet', rightX, y + 26);
      doc.fillColor(COLORS.textLight).fontSize(10).font('Helvetica').text('Bill of Lading (BOL)', rightX, y + 48);
      doc.fillColor(COLORS.textLight).fontSize(9).font('Helvetica').text(`Dispatch Date: ${data.dispatchDate}`, rightX, y + 66);

      y += 100;

      // ========== CARRIER INFORMATION ==========
      doc.fillColor(COLORS.navy).rect(margin, y, contentWidth, 20).fill();
      doc.fillColor(COLORS.white).fontSize(9).font('Helvetica-Bold').text('CARRIER INFORMATION', margin + 8, y + 6);
      y += 28;

      const col1 = margin;
      const col2 = margin + 280;
      const labelW = 60;
      const lineH = 16;

      if (data.carrier) {
        doc.fillColor(COLORS.text).fontSize(9);
        doc.font('Helvetica-Bold').text('Carrier:', col1, y);
        doc.font('Helvetica').text(data.carrier.company || 'N/A', col1 + labelW, y);
        doc.font('Helvetica-Bold').text('Contact:', col2, y);
        doc.font('Helvetica').text(data.carrier.contact || 'N/A', col2 + 60, y);
        y += lineH;

        doc.font('Helvetica-Bold').text('USDOT:', col1, y);
        doc.font('Helvetica').text(data.carrier.usdot || 'N/A', col1 + labelW, y);
        doc.font('Helvetica-Bold').text('Phone:', col2, y);
        doc.font('Helvetica').text(data.carrier.phone || 'N/A', col2 + 60, y);
        y += lineH;

        doc.font('Helvetica-Bold').text('MC #:', col1, y);
        doc.font('Helvetica').text(data.carrier.mcNumber || 'N/A', col1 + labelW, y);
        doc.font('Helvetica-Bold').text('Email:', col2, y);
        doc.font('Helvetica').text(data.carrier.email || 'N/A', col2 + 60, y);
        y += lineH + 6;
      } else {
        doc.fillColor(COLORS.textLight).fontSize(9).font('Helvetica-Oblique').text('Carrier not yet assigned', margin, y);
        y += 22;
      }

      // ========== ORDER INFORMATION ==========
      doc.fillColor(COLORS.navy).rect(margin, y, contentWidth, 20).fill();
      doc.fillColor(COLORS.white).fontSize(9).font('Helvetica-Bold').text('ORDER INFORMATION', margin + 8, y + 6);
      y += 28;

      const orderLabelW = 140;
      const orderValX = margin + orderLabelW;
      const orderCol2LabelX = col2;
      const orderCol2ValX = col2 + 150;

      doc.fillColor(COLORS.text).fontSize(9);
      
      doc.font('Helvetica-Bold').text('Dispatch Date:', col1, y);
      doc.font('Helvetica').text(data.dispatchDate, orderValX, y);
      doc.font('Helvetica-Bold').text('Total Payment to Carrier:', orderCol2LabelX, y);
      doc.font('Helvetica').text(`$${data.carrierPayout.toLocaleString()}`, orderCol2ValX, y);
      y += lineH;

      doc.font('Helvetica-Bold').text('Dispatch Status:', col1, y);
      doc.font('Helvetica').text(data.dispatchStatus, orderValX, y);
      doc.font('Helvetica-Bold').text('Payment Method:', orderCol2LabelX, y);
      doc.font('Helvetica').text(data.paymentMethod, orderCol2ValX, y);
      y += lineH;

      doc.font('Helvetica-Bold').text('Estimated Pickup Date:', col1, y);
      doc.font('Helvetica').text(data.pickupDate, orderValX, y);
      doc.font('Helvetica-Bold').text('Shipper Owes Carrier:', orderCol2LabelX, y);
      doc.font('Helvetica').text(`$${data.shipperOwesCarrier.toLocaleString()}`, orderCol2ValX, y);
      y += lineH;

      doc.font('Helvetica-Bold').text('Estimated Delivery Date:', col1, y);
      doc.font('Helvetica').text(data.deliveryDate, orderValX, y);
      y += lineH;

      doc.font('Helvetica-Bold').text('Ship Via:', col1, y);
      doc.font('Helvetica').text(data.shipVia, orderValX, y);
      y += lineH;

      doc.font('Helvetica-Bold').text('Condition:', col1, y);
      doc.font('Helvetica').text(data.condition, orderValX, y);
      y += lineH + 8;

      // ========== CUSTOMER INFORMATION ==========
      doc.fillColor(COLORS.navy).rect(margin, y, contentWidth, 20).fill();
      doc.fillColor(COLORS.white).fontSize(9).font('Helvetica-Bold').text('CUSTOMER INFORMATION', margin + 8, y + 6);
      y += 28;

      doc.fillColor(COLORS.text).fontSize(9);
      doc.font('Helvetica-Bold').text('Contact:', col1, y);
      doc.font('Helvetica').text(data.billing.contact || 'N/A', col1 + 60, y);
      doc.font('Helvetica-Bold').text('Phone:', col2, y);
      doc.font('Helvetica').text(data.billing.phone || 'N/A', col2 + 60, y);
      y += lineH;

      doc.font('Helvetica-Bold').text('Email:', col1, y);
      doc.font('Helvetica').text(data.billing.email || 'N/A', col1 + 60, y);
      y += lineH + 8;

      // ========== VEHICLE INFORMATION ==========
      doc.fillColor(COLORS.navy).rect(margin, y, contentWidth, 20).fill();
      doc.fillColor(COLORS.white).fontSize(9).font('Helvetica-Bold').text('VEHICLE INFORMATION', margin + 8, y + 6);
      doc.text('Total Vehicles: 1', margin + contentWidth - 100, y + 6, { width: 92, align: 'right' });
      y += 28;

      doc.fillColor(COLORS.background).rect(margin, y, contentWidth, 18).fill();
      doc.strokeColor(COLORS.border).rect(margin, y, contentWidth, 18).stroke();

      const vCols = [30, 220, 80, contentWidth - 330];
      let vx = margin;

      doc.fillColor(COLORS.textLight).fontSize(8).font('Helvetica-Bold');
      doc.text('#', vx + 6, y + 5); vx += vCols[0];
      doc.text('Vehicle', vx + 6, y + 5); vx += vCols[1];
      doc.text('Type', vx + 6, y + 5); vx += vCols[2];
      doc.text('VIN', vx + 6, y + 5);
      y += 18;

      doc.strokeColor(COLORS.border).rect(margin, y, contentWidth, 24).stroke();
      vx = margin;
      doc.fillColor(COLORS.text).fontSize(9).font('Helvetica');
      doc.text('1', vx + 6, y + 7); vx += vCols[0];
      const vehicleDesc = `${data.vehicle.year} ${data.vehicle.make} ${data.vehicle.model}`.trim() || 'N/A';
      doc.text(vehicleDesc, vx + 6, y + 7, { width: vCols[1] - 12 }); vx += vCols[1];
      doc.text(data.vehicle.type || 'N/A', vx + 6, y + 7); vx += vCols[2];
      doc.text(data.vehicle.vin || 'N/A', vx + 6, y + 7, { width: vCols[3] - 12 });
      y += 32;

      // ========== PICKUP & DELIVERY SIDE BY SIDE ==========
      const leftCol = margin;
      const rightCol = pageWidth / 2 + 5;
      const colW = (contentWidth - 10) / 2;
      const fieldLabelW = 100;

      doc.fillColor(COLORS.navy).rect(leftCol, y, colW, 20).fill();
      doc.fillColor(COLORS.white).fontSize(9).font('Helvetica-Bold').text('PICKUP INFORMATION', leftCol + 8, y + 6);

      doc.fillColor(COLORS.navy).rect(rightCol, y, colW, 20).fill();
      doc.fillColor(COLORS.white).fontSize(9).font('Helvetica-Bold').text('DELIVERY INFORMATION', rightCol + 8, y + 6);
      y += 28;

      let py = y;
      doc.fillColor(COLORS.text).fontSize(9);

      doc.font('Helvetica-Bold').text('Name:', leftCol, py);
      doc.font('Helvetica').text(data.pickup.name || 'N/A', leftCol + fieldLabelW, py);
      py += lineH;

      doc.font('Helvetica-Bold').text('Street:', leftCol, py);
      doc.font('Helvetica').text(data.pickup.street || 'N/A', leftCol + fieldLabelW, py);
      py += lineH;

      doc.font('Helvetica-Bold').text('City / State / Zip:', leftCol, py);
      doc.font('Helvetica').text(data.pickup.cityStateZip || 'N/A', leftCol + fieldLabelW, py);
      py += lineH;

      doc.font('Helvetica-Bold').text('Phone:', leftCol, py);
      doc.font('Helvetica').text(data.pickup.phone || 'N/A', leftCol + fieldLabelW, py);
      py += lineH + 4;

      if (data.pickup.notes || data.customerNotes) {
        const notesText = data.pickup.notes || data.customerNotes;
        doc.font('Helvetica-Bold').text('Notes:', leftCol, py);
        doc.font('Helvetica').text(notesText, leftCol + fieldLabelW, py, { width: colW - fieldLabelW - 10 });
        py += doc.heightOfString(notesText, { width: colW - fieldLabelW - 10 }) + 10;
      }

      let dy = y;
      doc.fillColor(COLORS.text).fontSize(9);

      doc.font('Helvetica-Bold').text('Name:', rightCol, dy);
      doc.font('Helvetica').text(data.delivery.name || 'N/A', rightCol + fieldLabelW, dy);
      dy += lineH;

      doc.font('Helvetica-Bold').text('Street:', rightCol, dy);
      doc.font('Helvetica').text(data.delivery.street || 'N/A', rightCol + fieldLabelW, dy);
      dy += lineH;

      doc.font('Helvetica-Bold').text('City / State / Zip:', rightCol, dy);
      doc.font('Helvetica').text(data.delivery.cityStateZip || 'N/A', rightCol + fieldLabelW, dy);
      dy += lineH;

      doc.font('Helvetica-Bold').text('Phone:', rightCol, dy);
      doc.font('Helvetica').text(data.delivery.phone || 'N/A', rightCol + fieldLabelW, dy);

      y = Math.max(py, dy) + 18;

      // ========== PAYMENT TERMS BOX ==========
      doc.fillColor(COLORS.navy).rect(margin, y, contentWidth, 20).fill();
      doc.fillColor(COLORS.white).fontSize(9).font('Helvetica-Bold').text('PAYMENT TERMS', margin + 8, y + 6);
      y += 28;

      doc.fillColor(COLORS.text).fontSize(9).font('Helvetica');
      doc.text(data.paymentTerms, margin, y, { width: contentWidth });
      y += doc.heightOfString(data.paymentTerms, { width: contentWidth }) + 16;

      // ========== DISPATCH INSTRUCTIONS ==========
      if (y > doc.page.height - 250) { doc.addPage(); y = margin; }

      doc.strokeColor(COLORS.text).lineWidth(1).rect(margin, y, contentWidth, 20).stroke();
      doc.fillColor(COLORS.text).fontSize(9).font('Helvetica-Bold').text('DISPATCH INSTRUCTIONS', margin + 8, y + 6);
      y += 28;

      doc.fillColor(COLORS.text).fontSize(9).font('Helvetica');
      DRIVER_RESPONSIBILITIES.forEach((item, i) => {
        const text = `${i + 1}. ${item}`;
        doc.text(text, margin, y, { width: contentWidth });
        y += doc.heightOfString(text, { width: contentWidth }) + 4;
      });
      y += 14;

      // ========== CONTRACT TERMS ==========
      if (y > doc.page.height - 220) { doc.addPage(); y = margin; }

      doc.fillColor(COLORS.text).fontSize(9).font('Helvetica-Bold').text('CONTRACT TERMS ***PLEASE READ CAREFULLY***', margin, y);
      y += 16;
      const noticeText = 'Please provide at least 24-hour notice to the customer before Pickup and Delivery. Please complete a careful inspection of the vehicle on Pickup and Delivery.';
      doc.font('Helvetica-Bold').fontSize(9).text(noticeText, margin, y, { width: contentWidth });
      y += doc.heightOfString(noticeText, { width: contentWidth }) + 12;

      doc.fillColor(COLORS.textLight).fontSize(9).font('Helvetica').text('Carrier Terms & Agreement', margin, y);
      y += 20;

      doc.strokeColor(COLORS.border).lineWidth(0.5).moveTo(margin, y).lineTo(pageWidth - margin, y).stroke();
      y += 14;

      doc.fillColor(COLORS.text).fontSize(8).font('Helvetica').text(CARRIER_AGREEMENT, margin, y, { width: contentWidth, lineGap: 2 });
      y += doc.heightOfString(CARRIER_AGREEMENT, { width: contentWidth, lineGap: 2 }) + 18;

      // ========== FOOTER ==========
      if (y > doc.page.height - 50) { doc.addPage(); y = margin; }

      doc.strokeColor(COLORS.border).lineWidth(0.5).moveTo(margin, y).lineTo(pageWidth - margin, y).stroke();
      y += 12;
      doc.fillColor(COLORS.textLight).fontSize(8).font('Helvetica').text(`Generated on ${data.generatedAt} — Powered by ${COMPANY_INFO.name}`, margin, y, { width: contentWidth, align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================================
// ✅ NEW: Generate BOL PDF and store in Supabase
// ============================================================
async function generateAndStoreBol(booking, uploadedByUserId) {
  const orderNumber = booking.orderNumber || booking.id.slice(-6);
  const fileName = `BOL-${orderNumber}.pdf`;
  
  console.log('📄 [BOL] Generating and storing BOL for booking:', booking.id);
  
  // 1. Generate the PDF buffer
  const pdfBuffer = await generateBolPdf(booking);
  
  // 2. Check if Supabase is available
  if (!supabase) {
    console.warn('⚠️ [BOL] Supabase not available, returning PDF without storage');
    return { pdfBuffer, document: null, stored: false };
  }
  
  // 3. Generate storage path
  const timestamp = Date.now();
  const uniqueId = uuidv4().slice(0, 8);
  const filePath = `bol/${booking.id}/${timestamp}-${uniqueId}-${fileName}`;
  
  console.log('📤 [BOL] Uploading BOL to Supabase:', filePath);
  
  // 4. Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    });
  
  if (uploadError) {
    console.error('❌ [BOL] Failed to upload BOL to Supabase:', uploadError);
    // Return PDF anyway, just not stored
    return { pdfBuffer, document: null, stored: false, error: uploadError.message };
  }
  
  // 5. Get public URL
  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  const publicUrl = urlData?.publicUrl || null;
  
  console.log('✅ [BOL] BOL uploaded to Supabase:', publicUrl);
  
  // 6. Create Document record in database
  const document = await prisma.document.create({
    data: {
      id: uuidv4(),
      userId: uploadedByUserId,
      bookingId: booking.id,
      quoteId: booking.quoteId || null,
      type: 'bol',
      fileName: fileName,
      originalName: fileName,
      fileUrl: publicUrl,
      filePath: filePath,
      mimeType: 'application/pdf',
      fileSize: pdfBuffer.length,
      storageType: 'supabase',
    },
  });
  
  console.log('✅ [BOL] BOL Document record created:', document.id);
  
  return { pdfBuffer, document, stored: true };
}

// ============================================================
// ✅ NEW: Get existing BOL document for a booking
// ============================================================
async function getExistingBolDocument(bookingId) {
  const document = await prisma.document.findFirst({
    where: {
      bookingId: bookingId,
      type: 'bol',
    },
    orderBy: {
      createdAt: 'desc', // Get most recent BOL
    },
  });
  
  return document;
}

// ============================================================
// ✅ NEW: Get signed URL for a stored BOL
// ============================================================
async function getBolSignedUrl(filePath, expiresIn = 3600) {
  if (!supabase) return null;
  
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, expiresIn);
  
  if (error) {
    console.error('❌ [BOL] Error creating signed URL:', error);
    return null;
  }
  
  return data?.signedUrl || null;
}

// ============================================================
// ✅ NEW: Download BOL from Supabase Storage
// ============================================================
async function downloadStoredBol(filePath) {
  if (!supabase) return null;
  
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(filePath);
  
  if (error) {
    console.error('❌ [BOL] Error downloading BOL:', error);
    return null;
  }
  
  // Convert Blob to Buffer
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

module.exports = { 
  generateBolPdf, 
  generateAndStoreBol,
  getExistingBolDocument,
  getBolSignedUrl,
  downloadStoredBol,
  mapBookingToBolData, 
  COMPANY_INFO, 
  COLORS,
  SHIPMENT_STATUS,
  STATUS_LABELS,
  normalizeStatus,
  STORAGE_BUCKET,
};
