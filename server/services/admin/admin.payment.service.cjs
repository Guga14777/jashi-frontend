// server/services/admin/admin.payment.service.cjs
// Collapse a booking's payment transactions into one of four product buckets
// (unpaid / deposit_paid / fully_paid / refunded). Admin UI only cares about
// the bucket; the raw transaction list still flows through unchanged.

const BUCKET_LABELS = {
  unpaid: 'Unpaid',
  deposit_paid: 'Deposit paid',
  fully_paid: 'Fully paid',
  refunded: 'Refunded',
};

const PAID_STATUSES = new Set(['succeeded', 'paid', 'captured', 'completed']);
const REFUND_STATUSES = new Set(['refunded', 'partially_refunded']);

/**
 * Decide the bucket.
 *
 * - refunded: any refund transaction present
 * - fully_paid: sum of paid transactions >= booking.price (within $1 of slop)
 * - deposit_paid: at least one paid transaction but sum < booking.price
 * - unpaid: nothing posted
 */
function resolvePaymentBucket(booking, payments = []) {
  const bookingPrice = Number(booking?.price) || 0;

  const hasRefund = payments.some((p) => REFUND_STATUSES.has(String(p.status || '').toLowerCase()));
  if (hasRefund) {
    return {
      bucket: 'refunded',
      label: BUCKET_LABELS.refunded,
      paidAmount: 0,
      refundedAmount: payments
        .filter((p) => REFUND_STATUSES.has(String(p.status || '').toLowerCase()))
        .reduce((a, b) => a + Number(b.amount || 0), 0),
      outstanding: bookingPrice,
    };
  }

  const paid = payments.filter((p) => PAID_STATUSES.has(String(p.status || '').toLowerCase()));
  const paidAmount = paid.reduce((a, b) => a + Number(b.amount || 0), 0);

  if (paidAmount <= 0) {
    return {
      bucket: 'unpaid',
      label: BUCKET_LABELS.unpaid,
      paidAmount: 0,
      refundedAmount: 0,
      outstanding: bookingPrice,
    };
  }

  // Allow a $1 tolerance so rounding on the payment side doesn't leave orders
  // stuck in 'deposit_paid' forever.
  if (bookingPrice > 0 && paidAmount >= bookingPrice - 1) {
    return {
      bucket: 'fully_paid',
      label: BUCKET_LABELS.fully_paid,
      paidAmount,
      refundedAmount: 0,
      outstanding: 0,
    };
  }

  return {
    bucket: 'deposit_paid',
    label: BUCKET_LABELS.deposit_paid,
    paidAmount,
    refundedAmount: 0,
    outstanding: Math.max(0, bookingPrice - paidAmount),
  };
}

module.exports = { resolvePaymentBucket, BUCKET_LABELS };
