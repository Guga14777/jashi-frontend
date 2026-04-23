/**
 * Payments Controller - PostgreSQL Version
 * ✅ UPDATED: 100% Real data for Carrier Payouts
 * - Load ID: Real orderNumber like #1045
 * - Method: Only 'cod' or 'ach'
 * - Reference: Real unique reference from DB
 */

const prisma = require('../db.cjs');

/**
 * Generate a unique reference number
 * Pattern: REF- + 6 random uppercase alphanumeric characters
 * @returns {string} Reference string like REF-A3B7K9
 */
const generatePayoutReference = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `REF-${code}`;
};

/**
 * Generate a human-readable reference from payment ID and booking order number
 * @param {string} paymentId - The payment ID
 * @param {number|null} orderNumber - The booking order number (if available)
 * @returns {string} Reference string
 */
const generateReference = (paymentId, orderNumber = null) => {
  if (orderNumber) {
    return `REF-${orderNumber}`;
  }
  // Use last 6 characters of payment ID, uppercase
  return `REF-${paymentId.slice(-6).toUpperCase()}`;
};

/**
 * ✅ Normalize method to only 'cod' or 'ach'
 * @param {string} method - Any method string
 * @returns {string} Either 'cod' or 'ach'
 */
const normalizeMethod = (method) => {
  if (!method) return 'ach';
  const m = String(method).toLowerCase().trim();
  
  // COD variations
  if (['cod', 'cash', 'cash_on_delivery', 'check', 'zelle'].includes(m)) {
    return 'cod';
  }
  
  // Everything else is ACH (platform pays carrier)
  return 'ach';
};

/**
 * ✅ Get method display label
 * @param {string} method - 'cod' or 'ach'
 * @returns {string} 'COD' or 'ACH'
 */
const getMethodLabel = (method) => {
  const normalized = normalizeMethod(method);
  return normalized === 'cod' ? 'COD' : 'ACH';
};

/**
 * ✅ Determine payout method from booking payment status
 * @param {Object} booking - Booking object with paymentStatus
 * @returns {string} 'cod' or 'ach'
 */
const determinePayoutMethod = (booking) => {
  if (!booking) return 'ach';
  
  const paymentStatus = booking.paymentStatus?.toUpperCase();
  
  // If customer paid in full via card, platform pays carrier via ACH
  if (paymentStatus === 'PAID_IN_FULL') {
    return 'ach';
  }
  
  // If COD, customer pays carrier directly
  if (paymentStatus === 'COD') {
    return 'cod';
  }
  
  // Default to ACH
  return 'ach';
};

// ============================================
// CARRIER PAYOUTS ENDPOINTS
// ============================================

/**
 * Get all payouts for the logged-in carrier
 * GET /api/carrier/payouts
 * ✅ UPDATED: Returns real data with real Load IDs and references
 */
const getCarrierPayouts = async (req, res) => {
  try {
    const carrierId = req.userId;
    
    console.log('📤 [PAYOUTS] Fetching payouts for carrier:', carrierId);
    
    const { 
      page = 1, 
      limit = 50, 
      status, 
      dateFrom, 
      dateTo,
      search
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = { carrierId };
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // Search by reference or order number
    if (search) {
      const searchTerm = search.replace(/^#/, ''); // Remove # prefix if present
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { booking: { ref: { contains: search, mode: 'insensitive' } } },
        // Search by order number (numeric)
        ...(isNaN(parseInt(searchTerm)) ? [] : [
          { booking: { orderNumber: parseInt(searchTerm) } }
        ])
      ];
    }

    console.log('📤 [PAYOUTS] Query where clause:', JSON.stringify(where));

    // Fetch payouts with booking info (for real Load ID)
    const [payouts, total] = await prisma.$transaction([
      prisma.carrierPayout.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            select: {
              id: true,
              ref: true,
              orderNumber: true,
              fromCity: true,
              toCity: true,
              vehicle: true,
              vehicleDetails: true,
              status: true,
              price: true,
              carrierPayout: true,
              paymentStatus: true,
            },
          },
        },
      }),
      prisma.carrierPayout.count({ where }),
    ]);

    console.log(`✅ [PAYOUTS] Found ${payouts.length} payouts (total: ${total})`);

    // Calculate summary stats
    const summaryWhere = { carrierId };
    if (status && status !== 'all') {
      summaryWhere.status = status;
    }
    if (dateFrom || dateTo) {
      summaryWhere.createdAt = {};
      if (dateFrom) summaryWhere.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        summaryWhere.createdAt.lte = endDate;
      }
    }

    const allPayoutsForSummary = await prisma.carrierPayout.findMany({
      where: summaryWhere,
      select: { amount: true, status: true }
    });

    const paidPayouts = allPayoutsForSummary.filter(p => p.status === 'paid');
    const pendingPayouts = allPayoutsForSummary.filter(p => p.status === 'pending');
    
    const summary = {
      totalGross: paidPayouts.reduce((sum, p) => sum + p.amount, 0),
      pendingCount: pendingPayouts.length,
      pendingAmount: pendingPayouts.reduce((sum, p) => sum + p.amount, 0),
      totalCount: allPayoutsForSummary.length
    };

    // ✅ Transform payouts for frontend with REAL data
    const items = payouts.map(payout => {
      // Normalize method to only 'cod' or 'ach'
      const normalizedMethod = normalizeMethod(payout.method);
      const methodLabel = getMethodLabel(normalizedMethod);
      
      // ✅ Real Load ID from booking orderNumber (like #1045)
      const orderNumber = payout.booking?.orderNumber || null;
      const loadId = orderNumber ? `#${orderNumber}` : null;
      
      return {
        id: payout.id,
        // ✅ Real reference from DB
        reference: payout.reference,
        date: payout.createdAt.toISOString().split('T')[0],
        // ✅ Real Load ID like #1045
        loadId: loadId,
        orderNumber: orderNumber,
        grossAmount: payout.amount,
        netAmount: payout.amount,
        status: payout.status,
        // ✅ Only 'cod' or 'ach'
        paymentMethod: normalizedMethod,
        method: normalizedMethod,
        methodLabel: methodLabel,
        createdAt: payout.createdAt.toISOString(),
        updatedAt: payout.updatedAt.toISOString(),
        paidAt: payout.paidAt ? payout.paidAt.toISOString() : null,
        description: payout.description,
        // ✅ Full booking info for details modal
        booking: payout.booking ? {
          id: payout.booking.id,
          ref: payout.booking.ref,
          orderNumber: payout.booking.orderNumber,
          fromCity: payout.booking.fromCity,
          toCity: payout.booking.toCity,
          vehicle: payout.booking.vehicle,
          status: payout.booking.status,
          price: payout.booking.price,
          carrierPayout: payout.booking.carrierPayout,
        } : null
      };
    });

    res.json({
      success: true,
      summary,
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });

  } catch (error) {
    console.error('❌ [PAYOUTS] Get carrier payouts error:', error);
    res.status(500).json({ error: 'Failed to fetch payouts', details: error.message });
  }
};

/**
 * Get single payout by ID for carrier
 * GET /api/carrier/payouts/:id
 * ✅ UPDATED: Returns real data
 */
const getCarrierPayoutById = async (req, res) => {
  try {
    const carrierId = req.userId;
    const { id } = req.params;

    const payout = await prisma.carrierPayout.findFirst({
      where: {
        id,
        carrierId,
      },
      include: {
        booking: {
          select: {
            id: true,
            ref: true,
            orderNumber: true,
            fromCity: true,
            toCity: true,
            vehicle: true,
            vehicleDetails: true,
            price: true,
            status: true,
            pickupDate: true,
            dropoffDate: true,
            paymentStatus: true,
            carrierPayout: true,
          },
        },
      },
    });

    if (!payout) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    // Normalize method
    const normalizedMethod = normalizeMethod(payout.method);
    const methodLabel = getMethodLabel(normalizedMethod);
    const orderNumber = payout.booking?.orderNumber || null;
    const loadId = orderNumber ? `#${orderNumber}` : null;

    res.json({
      success: true,
      payout: {
        id: payout.id,
        reference: payout.reference,
        date: payout.createdAt.toISOString().split('T')[0],
        loadId: loadId,
        orderNumber: orderNumber,
        grossAmount: payout.amount,
        netAmount: payout.amount,
        status: payout.status,
        paymentMethod: normalizedMethod,
        method: normalizedMethod,
        methodLabel: methodLabel,
        createdAt: payout.createdAt.toISOString(),
        updatedAt: payout.updatedAt.toISOString(),
        paidAt: payout.paidAt ? payout.paidAt.toISOString() : null,
        description: payout.description,
        booking: payout.booking,
      },
    });

  } catch (error) {
    console.error('Get carrier payout by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch payout details' });
  }
};

/**
 * ✅ Create a carrier payout (internal use - called when load is delivered)
 * This is called by booking.controller.cjs when a load is marked as delivered
 * @param {Object} params - { carrierId, bookingId, amount, method }
 * @returns {Object} Created payout or null on error
 */
const createCarrierPayoutInternal = async ({ carrierId, bookingId, amount, method }) => {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('💰 [PAYOUT] createCarrierPayoutInternal called');
    console.log('💰 [PAYOUT] Params:', { carrierId, bookingId, amount, method });
    console.log('═══════════════════════════════════════════════════════');

    if (!carrierId || !amount || amount <= 0) {
      console.error('❌ [PAYOUT] Invalid params:', { carrierId, amount });
      return null;
    }

    // Normalize method to 'cod' or 'ach'
    const normalizedMethod = normalizeMethod(method);

    // Generate unique reference
    let reference;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      reference = generatePayoutReference();
      const existing = await prisma.carrierPayout.findUnique({
        where: { reference }
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      console.error('❌ [PAYOUT] Failed to generate unique reference');
      return null;
    }

    // Determine initial status based on method
    // COD payouts are already "paid" (customer paid carrier directly)
    // ACH payouts start as "pending" (platform needs to pay carrier)
    const initialStatus = normalizedMethod === 'cod' ? 'paid' : 'pending';
    const paidAt = normalizedMethod === 'cod' ? new Date() : null;

    console.log('💰 [PAYOUT] Creating payout with:', {
      carrierId,
      bookingId,
      amount: parseFloat(amount),
      method: normalizedMethod,
      status: initialStatus,
      reference,
    });

    // Create payout record
    const payout = await prisma.carrierPayout.create({
      data: {
        carrierId,
        bookingId: bookingId || null,
        amount: parseFloat(amount),
        currency: 'USD',
        status: initialStatus,
        method: normalizedMethod,
        reference,
        description: bookingId ? `Payout for delivered load` : 'Carrier payout',
        paidAt: paidAt,
      },
      include: {
        booking: {
          select: {
            id: true,
            ref: true,
            orderNumber: true,
          }
        }
      }
    });

    console.log('✅ [PAYOUT] Carrier payout created successfully:', {
      id: payout.id,
      reference: payout.reference,
      carrierId: payout.carrierId,
      amount: payout.amount,
      method: payout.method,
      status: payout.status,
      orderNumber: payout.booking?.orderNumber,
    });

    return payout;

  } catch (error) {
    console.error('❌ [PAYOUT] Create carrier payout error:', error);
    console.error('❌ [PAYOUT] Error stack:', error.stack);
    return null;
  }
};

/**
 * Create a carrier payout (admin endpoint)
 * POST /api/admin/payouts
 */
const createCarrierPayout = async (req, res) => {
  try {
    const {
      carrierId,
      bookingId,
      amount,
      method = 'ach',
      description
    } = req.body;

    if (!carrierId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'carrierId and valid amount are required' });
    }

    // Use internal function
    const payout = await createCarrierPayoutInternal({
      carrierId,
      bookingId,
      amount,
      method,
    });

    if (!payout) {
      return res.status(500).json({ error: 'Failed to create payout' });
    }

    // Update description if provided
    if (description) {
      await prisma.carrierPayout.update({
        where: { id: payout.id },
        data: { description }
      });
    }

    res.status(201).json({
      success: true,
      payout: {
        id: payout.id,
        reference: payout.reference,
        status: payout.status,
        amount: payout.amount,
        method: payout.method,
        createdAt: payout.createdAt.toISOString()
      },
    });

  } catch (error) {
    console.error('Create carrier payout error:', error);
    res.status(500).json({ error: 'Failed to create payout' });
  }
};

/**
 * Update carrier payout status (admin only)
 * PATCH /api/admin/payouts/:id/status
 */
const updateCarrierPayoutStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'paid', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const payout = await prisma.carrierPayout.update({
      where: { id },
      data: {
        status,
        paidAt: status === 'paid' ? new Date() : undefined,
      },
    });

    console.log('✅ Carrier payout status updated:', {
      id: payout.id,
      reference: payout.reference,
      status: payout.status
    });

    res.json({
      success: true,
      payout,
    });

  } catch (error) {
    console.error('Update carrier payout status error:', error);
    res.status(500).json({ error: 'Failed to update payout status' });
  }
};

// ============================================
// CUSTOMER PAYMENTS ENDPOINTS (existing)
// ============================================

/**
 * Get all payments for the logged-in customer
 * GET /api/dashboard/payments
 */
const getCustomerPayments = async (req, res) => {
  try {
    const userId = req.userId;
    const { 
      page = 1, 
      limit = 50, 
      status, 
      dateFrom, 
      dateTo,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = { userId };
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    const [payments, total] = await prisma.$transaction([
      prisma.paymentTransaction.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            select: {
              id: true,
              ref: true,
              orderNumber: true,
              fromCity: true,
              toCity: true,
              vehicle: true,
              status: true,
            },
          },
        },
      }),
      prisma.paymentTransaction.count({ where }),
    ]);

    // Transform to match frontend expected format
    const transformedPayments = payments.map(payment => {
      // Map database status to frontend status
      let frontendStatus = payment.status.toLowerCase();
      if (frontendStatus === 'succeeded') frontendStatus = 'paid';
      
      // Use stored reference or generate one
      const reference = payment.reference || generateReference(payment.id, payment.booking?.orderNumber);
      
      return {
        id: payment.id,
        date: payment.createdAt.toISOString().split('T')[0],
        description: payment.booking 
          ? `Shipping service #${payment.booking.orderNumber || payment.booking.ref}`
          : `Payment #${payment.id.slice(-6).toUpperCase()}`,
        type: payment.cardBrand ? 'card' : (payment.paymentMethod || 'card'),
        methodLabel: payment.cardBrand 
          ? `${payment.cardBrand} •••• ${payment.cardLast4 || '****'}`
          : (payment.paymentMethod || 'Credit Card'),
        status: frontendStatus,
        amount: payment.amount,
        reference: reference,
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
        card_is_debit: false,
        method_last4: payment.cardLast4,
        cardBrand: payment.cardBrand,
        cardholderName: payment.cardholderFirstName && payment.cardholderLastName
          ? `${payment.cardholderFirstName} ${payment.cardholderLastName}`
          : null,
        // Booking info
        bookingId: payment.bookingId,
        bookingRef: payment.booking?.ref,
        bookingOrderNumber: payment.booking?.orderNumber,
      };
    });

    res.json({
      success: true,
      payments: transformedPayments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });

  } catch (error) {
    console.error('Get customer payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

/**
 * Get single payment by ID
 * GET /api/dashboard/payments/:id
 */
const getPaymentById = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const payment = await prisma.paymentTransaction.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        booking: {
          select: {
            id: true,
            ref: true,
            orderNumber: true,
            fromCity: true,
            toCity: true,
            vehicle: true,
            vehicleDetails: true,
            price: true,
            status: true,
            pickupDate: true,
            dropoffDate: true,
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Map database status to frontend status
    let frontendStatus = payment.status.toLowerCase();
    if (frontendStatus === 'succeeded') frontendStatus = 'paid';

    // Use stored reference or generate one
    const reference = payment.reference || generateReference(payment.id, payment.booking?.orderNumber);

    res.json({
      success: true,
      payment: {
        id: payment.id,
        date: payment.createdAt.toISOString().split('T')[0],
        description: payment.booking 
          ? `Shipping service #${payment.booking.orderNumber || payment.booking.ref}`
          : `Payment #${payment.id.slice(-6).toUpperCase()}`,
        type: payment.cardBrand ? 'card' : (payment.paymentMethod || 'card'),
        methodLabel: payment.cardBrand 
          ? `${payment.cardBrand} •••• ${payment.cardLast4 || '****'}`
          : (payment.paymentMethod || 'Credit Card'),
        status: frontendStatus,
        amount: payment.amount,
        reference: reference,
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
        method_last4: payment.cardLast4,
        cardBrand: payment.cardBrand,
        cardholderName: payment.cardholderFirstName && payment.cardholderLastName
          ? `${payment.cardholderFirstName} ${payment.cardholderLastName}`
          : null,
        booking: payment.booking,
        paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
      },
    });

  } catch (error) {
    console.error('Get payment by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch payment details' });
  }
};

/**
 * Create payment when booking is submitted
 * POST /api/shipper/payments
 */
const createPayment = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      bookingId,
      quoteId,
      amount,
      paymentMode,
      cardNumber,
      cardFirstName,
      cardLastName,
      cardExpiry,
      platformFee,
      orderNumber,
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Detect card brand from card number
    let cardBrand = 'Card';
    if (cardNumber) {
      const cleaned = cardNumber.replace(/\s/g, '');
      if (cleaned.startsWith('4')) cardBrand = 'Visa';
      else if (/^5[1-5]/.test(cleaned)) cardBrand = 'Mastercard';
      else if (/^3[47]/.test(cleaned)) cardBrand = 'Amex';
      else if (/^6(?:011|5)/.test(cleaned)) cardBrand = 'Discover';
    }

    // Get last 4 digits
    const cardLast4 = cardNumber ? cardNumber.replace(/\s/g, '').slice(-4) : null;

    // Create payment record
    const payment = await prisma.paymentTransaction.create({
      data: {
        userId,
        bookingId: bookingId || null,
        amount: parseFloat(amount),
        currency: 'USD',
        status: 'pending',
        paymentMethod: paymentMode === 'full_card_charge' ? 'card_full' : 'card_fee_only',
        cardLast4,
        cardBrand,
        cardholderFirstName: cardFirstName || null,
        cardholderLastName: cardLastName || null,
        metadata: {
          quoteId,
          paymentMode,
          platformFee,
          cardExpiry,
        },
      },
    });

    // Generate and store reference
    const reference = generateReference(payment.id, orderNumber);
    
    // Update payment with reference
    const updatedPayment = await prisma.paymentTransaction.update({
      where: { id: payment.id },
      data: { reference },
    });

    console.log('✅ Payment record created:', {
      id: updatedPayment.id,
      reference: updatedPayment.reference,
    });

    res.status(201).json({
      success: true,
      payment: {
        id: updatedPayment.id,
        reference: updatedPayment.reference,
        status: updatedPayment.status,
        amount: updatedPayment.amount,
      },
    });

  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to create payment record' });
  }
};

/**
 * Update payment status (called when carrier accepts)
 * PATCH /api/payments/:id/status
 */
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'succeeded', 'paid', 'failed', 'refunded', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const payment = await prisma.paymentTransaction.update({
      where: { id },
      data: {
        status,
        paidAt: (status === 'succeeded' || status === 'paid') ? new Date() : undefined,
      },
    });

    res.json({
      success: true,
      payment,
    });

  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
};

/**
 * Create payment intent (stub for future Stripe integration)
 * POST /api/payments/create-intent
 */
const createPaymentIntent = async (req, res) => {
  try {
    res.json({ 
      success: true,
      message: 'Payment intent creation coming soon' 
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
};

/**
 * Confirm payment (stub for future Stripe integration)
 * POST /api/payments/confirm
 */
const confirmPayment = async (req, res) => {
  try {
    res.json({ 
      success: true,
      message: 'Payment confirmation coming soon' 
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
};

/**
 * Get all transactions for user (legacy endpoint)
 * GET /api/payments/transactions
 */
const listTransactions = async (req, res) => {
  return getCustomerPayments(req, res);
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
  // Carrier Payouts
  getCarrierPayouts,
  getCarrierPayoutById,
  createCarrierPayoutInternal,
  createCarrierPayout,
  updateCarrierPayoutStatus,
  
  // Customer Payments
  getCustomerPayments,
  getPaymentById,
  createPayment,
  updatePaymentStatus,
  createPaymentIntent,
  confirmPayment,
  listTransactions,
  
  // Helper functions
  determinePayoutMethod,
  normalizeMethod,
  getMethodLabel,
  generatePayoutReference,
};
