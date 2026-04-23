// server/services/notifications.service.cjs
//
// Central place for notification *authoring*. Lifecycle controllers call one
// of the per-event helpers below instead of composing titles/messages inline.
// Benefits:
//   1. Copy lives in one place — easy for product/legal to tweak wording.
//   2. Future delivery channels (email, SMS, push) plug in here — extend
//      `deliver()` to fan out beyond the in-app row without touching call sites.
//   3. Canonical category/type taxonomy matches the frontend's expectations.

const { createNotification } = require('../controllers/notifications.controller.cjs');

// --- Canonical taxonomy (shared with frontend) -----------------------------

const CATEGORY = {
  ORDER:    'order',    // creation, cancellation, admin edits
  DISPATCH: 'dispatch', // carrier lifecycle: assigned, en route, arrived, picked_up, delivered
  BILLING:  'billing',  // detention, dispatch fee, refunds
  SYSTEM:   'system',   // admin messages, account events
};

const TYPE = {
  // customer-facing
  ORDER_CREATED:       'order_created',
  ORDER_ACCEPTED:      'order_accepted',       // a carrier accepted the customer's order
  ORDER_BOOKED:        'order_booked',
  STATUS_ON_THE_WAY:   'status_on_the_way',
  STATUS_ARRIVED:      'status_arrived',
  STATUS_PICKED_UP:    'status_picked_up',
  STATUS_DELIVERED:    'status_delivered',
  ORDER_CANCELLED:     'order_cancelled',
  ORDER_EDITED:        'order_edited',
  CARRIER_DROPPED:     'carrier_dropped',
  PICKUP_ISSUE:        'pickup_issue',
  DETENTION_FEE:       'detention_fee',
  // carrier-facing
  ORDER_ASSIGNED:      'order_assigned',       // a load was given to this carrier
  ORDER_ACCEPT_ACK:    'order_accept_ack',     // self-confirmation "you accepted…"
  ORDER_CUSTOMER_EDIT: 'order_customer_edit',  // customer edited an order you're driving
  ORDER_CUST_CANCEL:   'order_cust_cancel',    // customer cancelled an order you were on
  SYSTEM_MESSAGE:      'system_message',
};

const ROLE = { CUSTOMER: 'customer', CARRIER: 'carrier', ADMIN: 'admin' };

// --- Core dispatch ---------------------------------------------------------
//
// Today every notification is written as an `in_app` row via createNotification.
// When we add email/SMS/push, this function is where those channels fan out —
// every call site stays the same.
async function deliver({
  userId,
  recipientRole,
  type,
  title,
  message,
  category = CATEGORY.DISPATCH,
  orderId = null,
  meta = {},
  channels = ['in_app'],
}) {
  if (!userId || !type) return null;

  const writes = [];
  for (const channel of channels) {
    writes.push(
      createNotification({
        userId,
        orderId,
        type,
        title,
        message,
        category,
        meta: { ...meta, recipientRole },
        channel,
        recipientRole,
      })
    );
  }
  const results = await Promise.all(writes);
  return results[0] || null;
}

const notifyCustomer = (args) => deliver({ ...args, recipientRole: ROLE.CUSTOMER });
const notifyCarrier  = (args) => deliver({ ...args, recipientRole: ROLE.CARRIER });

// --- Per-event helpers ------------------------------------------------------
// Controllers pass a booking-shaped object; the helper chooses recipients + copy.

function orderLabel(booking) {
  return `#${booking?.orderNumber ?? booking?.ref ?? booking?.id ?? '—'}`;
}

async function orderCreated(booking) {
  if (!booking?.userId) return null;
  return notifyCustomer({
    userId: booking.userId,
    orderId: String(booking.orderNumber || booking.id),
    type: TYPE.ORDER_CREATED,
    category: CATEGORY.ORDER,
    title: 'Order received',
    message: `Your order ${orderLabel(booking)} has been received and is awaiting carrier acceptance.`,
    meta: { bookingId: booking.id, status: booking.status },
  });
}

async function carrierAssigned(booking) {
  if (!booking?.userId) return null;
  return notifyCustomer({
    userId: booking.userId,
    orderId: String(booking.orderNumber || booking.id),
    type: TYPE.ORDER_ACCEPTED,
    category: CATEGORY.DISPATCH,
    title: 'A carrier accepted your order',
    message: `Your shipment ${orderLabel(booking)} has been accepted by a carrier.`,
    meta: { bookingId: booking.id, carrierId: booking.carrierId },
  });
}

async function carrierAcceptAck(booking) {
  if (!booking?.carrierId) return null;
  return notifyCarrier({
    userId: booking.carrierId,
    orderId: String(booking.orderNumber || booking.id),
    type: TYPE.ORDER_ACCEPT_ACK,
    category: CATEGORY.DISPATCH,
    title: 'You accepted a shipment',
    message: `You successfully accepted shipment ${orderLabel(booking)}.`,
    meta: { bookingId: booking.id },
  });
}

async function statusChanged(booking, next) {
  if (!booking?.userId) return null;
  const map = {
    on_the_way_to_pickup: {
      type: TYPE.STATUS_ON_THE_WAY,
      title: 'Your carrier is on the way',
      message: `Your carrier is on the way to pick up your vehicle for shipment ${orderLabel(booking)}.`,
    },
    arrived_at_pickup: {
      type: TYPE.STATUS_ARRIVED,
      title: 'Carrier arrived at pickup',
      message: `Your carrier has arrived at the pickup location for shipment ${orderLabel(booking)}.`,
    },
    picked_up: {
      type: TYPE.STATUS_PICKED_UP,
      title: 'Vehicle picked up',
      message: `Your vehicle for shipment ${orderLabel(booking)} has been picked up and is now in transit.`,
    },
    delivered: {
      type: TYPE.STATUS_DELIVERED,
      title: 'Vehicle delivered',
      message: `Your vehicle for shipment ${orderLabel(booking)} has been delivered successfully.`,
    },
  };
  const entry = map[next];
  if (!entry) return null;
  return notifyCustomer({
    userId: booking.userId,
    orderId: String(booking.orderNumber || booking.id),
    type: entry.type,
    title: entry.title,
    message: entry.message,
    category: CATEGORY.DISPATCH,
    meta: { bookingId: booking.id, status: next },
  });
}

async function orderCancelledByCustomer(booking) {
  const out = [];
  // Tell the customer (acknowledgement).
  if (booking.userId) {
    out.push(notifyCustomer({
      userId: booking.userId,
      orderId: String(booking.orderNumber || booking.id),
      type: TYPE.ORDER_CANCELLED,
      category: CATEGORY.ORDER,
      title: 'Order cancelled',
      message: `Your order ${orderLabel(booking)} has been cancelled.`,
      meta: { bookingId: booking.id, cancelledBy: 'CUSTOMER' },
    }));
  }
  // Tell the carrier if one had been assigned.
  if (booking.carrierId) {
    out.push(notifyCarrier({
      userId: booking.carrierId,
      orderId: String(booking.orderNumber || booking.id),
      type: TYPE.ORDER_CUST_CANCEL,
      category: CATEGORY.ORDER,
      title: 'Shipment cancelled by customer',
      message: `Shipment ${orderLabel(booking)} was cancelled by the customer.`,
      meta: { bookingId: booking.id, cancelledBy: 'CUSTOMER' },
    }));
  }
  return Promise.all(out);
}

async function orderDroppedByCarrier(booking) {
  if (!booking?.userId) return null;
  return notifyCustomer({
    userId: booking.userId,
    orderId: String(booking.orderNumber || booking.id),
    type: TYPE.CARRIER_DROPPED,
    category: CATEGORY.DISPATCH,
    title: 'We are finding a new carrier',
    message: `The carrier for shipment ${orderLabel(booking)} is no longer available. We're finding a replacement.`,
    meta: { bookingId: booking.id, cancelledBy: 'CARRIER' },
  });
}

async function orderEditedByCustomer(booking, changedFields = []) {
  // Only notify the carrier if one is already assigned — pre-assignment edits
  // affect no-one but the customer.
  if (!booking?.carrierId) return null;
  const fieldSummary = Array.isArray(changedFields) && changedFields.length
    ? changedFields.join(', ')
    : 'shipment details';
  return notifyCarrier({
    userId: booking.carrierId,
    orderId: String(booking.orderNumber || booking.id),
    type: TYPE.ORDER_CUSTOMER_EDIT,
    category: CATEGORY.ORDER,
    title: 'Shipment details updated',
    message: `The customer updated ${fieldSummary} for shipment ${orderLabel(booking)}.`,
    meta: { bookingId: booking.id, changedFields },
  });
}

async function detentionFeeApplied(booking, amount, minutesWaited) {
  if (!booking?.userId) return null;
  return notifyCustomer({
    userId: booking.userId,
    orderId: String(booking.orderNumber || booking.id),
    type: TYPE.DETENTION_FEE,
    category: CATEGORY.BILLING,
    title: 'Waiting fee applied',
    message: `A $${amount} waiting fee has been applied to shipment ${orderLabel(booking)} due to extended wait time at pickup.`,
    meta: { bookingId: booking.id, amount, minutesWaited },
  });
}

async function pickupIssueReported(booking, reason, reasonLabel) {
  if (!booking?.userId) return null;
  return notifyCustomer({
    userId: booking.userId,
    orderId: String(booking.orderNumber || booking.id),
    type: TYPE.PICKUP_ISSUE,
    category: CATEGORY.DISPATCH,
    title: 'Pickup issue reported',
    message: `The carrier reported an issue at pickup for shipment ${orderLabel(booking)}: ${reasonLabel}. Our team will contact you shortly.`,
    meta: { bookingId: booking.id, reason, reasonLabel },
  });
}

// "Direct cancel" path used by the DELETE /api/bookings/:id endpoint. Narrower
// than orderCancelledByCustomer because it only targets the owner.
async function orderCancelledDirect(booking) {
  if (!booking?.userId) return null;
  return notifyCustomer({
    userId: booking.userId,
    orderId: String(booking.orderNumber || booking.id),
    type: TYPE.ORDER_CANCELLED,
    category: CATEGORY.ORDER,
    title: 'Order cancelled',
    message: `Your order ${orderLabel(booking)} has been cancelled.`,
    meta: { bookingId: booking.id },
  });
}

module.exports = {
  // constants
  CATEGORY,
  TYPE,
  ROLE,
  // generic
  deliver,
  notifyCustomer,
  notifyCarrier,
  // per-event
  orderCreated,
  carrierAssigned,
  carrierAcceptAck,
  statusChanged,
  orderCancelledByCustomer,
  orderCancelledDirect,
  orderDroppedByCarrier,
  orderEditedByCustomer,
  detentionFeeApplied,
  pickupIssueReported,
};
