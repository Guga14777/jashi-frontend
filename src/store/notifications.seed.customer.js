/**
 * Customer-facing demo notifications (shipments, payments, documents, system updates)
 * You can import this into notifications-context.jsx as your default seed.
 */

const minutes = (n) => n * 60 * 1000;
const hours = (n) => n * 60 * 60 * 1000;
const days = (n) => n * 24 * 60 * 60 * 1000;

export function getCustomerSeedNotifications() {
  const now = Date.now();

  return [
    {
      id: 'cust-1001',
      type: 'shipment_assigned',
      category: 'shipment',
      priority: 'high',
      title: 'Carrier assigned — SHP-2091',
      message: 'Your vehicle shipment has been assigned to a carrier. Expect pickup confirmation by tomorrow morning.',
      meta: {
        shipmentId: 'SHP-2091',
        route: 'New York, NY → Dallas, TX',
        shortRoute: 'NYC → DAL',
        pickupWindow: 'Tomorrow 8:00–10:00 AM'
      },
      actionCTA: { label: 'View Shipment', route: '/dashboard/shipments/SHP-2091' },
      createdAt: new Date(now - hours(2)),
      readAt: null,
      archivedAt: null
    },
    {
      id: 'cust-1002',
      type: 'shipment_status',
      category: 'updates',
      priority: 'normal',
      title: 'Pickup confirmed — SHP-2088',
      message: 'Your vehicle was picked up successfully. Estimated delivery in 3–5 days.',
      meta: {
        shipmentId: 'SHP-2088',
        route: 'Atlanta, GA → Houston, TX',
        shortRoute: 'ATL → HOU',
        miles: 690
      },
      actionCTA: { label: 'Track Shipment', route: '/dashboard/shipments/SHP-2088' },
      createdAt: new Date(now - hours(6)),
      readAt: new Date(now - hours(5)),
      archivedAt: null
    },
    {
      id: 'cust-1003',
      type: 'payment_received',
      category: 'payment',
      priority: 'normal',
      title: 'Payment processed — INV-3054',
      message: 'We successfully received your $1,050 payment for shipment SHP-2088.',
      meta: { invoiceId: 'INV-3054', amount: 1050, method: 'Card •••• 4242' },
      actionCTA: { label: 'View Receipt', route: '/dashboard/payments/INV-3054' },
      createdAt: new Date(now - hours(8)),
      readAt: new Date(now - hours(6)),
      archivedAt: null
    },
    {
      id: 'cust-1004',
      type: 'payment_refund',
      category: 'payment',
      priority: 'low',
      title: 'Refund processed — INV-3022',
      message: '$150 refund has been issued to your account for shipment SHP-2065.',
      meta: { invoiceId: 'INV-3022', amount: 150, method: 'ACH' },
      actionCTA: { label: 'View Payment', route: '/dashboard/payments/INV-3022' },
      createdAt: new Date(now - hours(24)),
      readAt: new Date(now - hours(20)),
      archivedAt: null
    },
    {
      id: 'cust-1005',
      type: 'document_needed',
      category: 'documents',
      priority: 'urgent',
      title: 'Action required — Missing title document',
      message: 'Please upload the vehicle title to complete your shipment verification.',
      meta: { documentType: 'Title', shipmentId: 'SHP-2091' },
      actionCTA: { label: 'Upload Document', route: '/dashboard/customer-documents' },
      createdAt: new Date(now - hours(30)),
      readAt: null,
      archivedAt: null
    },
    {
      id: 'cust-1006',
      type: 'delivery_completed',
      category: 'shipment',
      priority: 'normal',
      title: 'Delivery completed — SHP-2085',
      message: 'Your vehicle was delivered successfully to Los Angeles, CA. Thank you for shipping with us!',
      meta: { shipmentId: 'SHP-2085', route: 'Chicago → Los Angeles', shortRoute: 'CHI → LA' },
      actionCTA: { label: 'Leave Review', route: '/dashboard/shipments/SHP-2085/review' },
      createdAt: new Date(now - days(1)),
      readAt: new Date(now - hours(20)),
      archivedAt: null
    },
    {
      id: 'cust-1007',
      type: 'system_maintenance',
      category: 'system',
      priority: 'low',
      title: 'Scheduled maintenance notice',
      message: 'The platform will be temporarily unavailable on Sunday from 2–4 AM EST for routine updates.',
      meta: { window: 'Sunday, 2–4 AM EST' },
      actionCTA: null,
      createdAt: new Date(now - days(2)),
      readAt: null,
      archivedAt: null
    },
    {
      id: 'cust-1008',
      type: 'promo_offer',
      category: 'updates',
      priority: 'low',
      title: 'Loyalty reward — Save 10% on your next shipment!',
      message: 'Use code THANKYOU10 when booking your next shipment to get 10% off instantly.',
      meta: { code: 'THANKYOU10', expires: 'Oct 30, 2025' },
      actionCTA: { label: 'Book Now', route: '/quote' },
      createdAt: new Date(now - days(3)),
      readAt: null,
      archivedAt: null
    }
  ];
}
