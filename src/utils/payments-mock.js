/**
 * Mock Payment Data Generator
 * Generates realistic payment/transaction data for frontend development and testing
 * 
 * Key Business Rules:
 * - Digital transfers (Zelle, Cash App, etc.) cannot be refunded
 * - Only card payments can be refunded easily
 * - Bank transfers have limited refund capabilities
 * - Cash transactions cannot be refunded electronically
 * - Wire transfers are typically non-refundable
 * - Checks can be voided before clearing
 */

/**
 * Seeded random number generator for deterministic results
 */
class SeededRandom {
  constructor(seed = Date.now()) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  between(min, max) {
    return min + this.next() * (max - min);
  }

  intBetween(min, max) {
    return Math.floor(this.between(min, max + 1));
  }

  choice(array) {
    if (!Array.isArray(array) || array.length === 0) {
      throw new Error('Choice requires a non-empty array');
    }
    return array[this.intBetween(0, array.length - 1)];
  }
}

/**
 * Generate random base36 string
 */
function generateBase36(rng, length) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[rng.intBetween(0, 35)];
  }
  return result;
}

/**
 * Create mock payment transactions with realistic business logic
 * @param {number} count - Number of transactions to generate
 * @param {Object} options - Configuration options
 * @returns {Array} Array of transaction objects
 */
export function createMockPayments(count = 50, options = {}) {
  const {
    seed = 12345,
    minDaysAgo = 0,
    maxDaysAgo = 90,
    includeRefunds = true
  } = options;

  const rng = new SeededRandom(seed);
  const today = new Date();
  const transactions = [];

  // Comprehensive payment method configurations
  const paymentMethods = [
    {
      type: 'card',
      methodLabel: 'Credit Card',
      canRefund: true,
      weight: 0.35, // 35% of transactions
      statuses: ['paid', 'pending', 'processing', 'failed', 'refunded', 'partial_refund', 'chargeback', 'dispute_open', 'dispute_won', 'dispute_lost', 'voided']
    },
    {
      type: 'ach',
      methodLabel: 'ACH Transfer',
      canRefund: true,
      weight: 0.20, // 20% of transactions
      statuses: ['processing', 'posted', 'failed', 'reversed', 'pending']
    },
    {
      type: 'wire',
      methodLabel: 'Wire Transfer',
      canRefund: false,
      weight: 0.15, // 15% of transactions
      statuses: ['sent', 'posted', 'failed', 'pending']
    },
    {
      type: 'zelle',
      methodLabel: 'Zelle',
      canRefund: false,
      weight: 0.10, // 10% of transactions
      statuses: ['released', 'failed', 'pending']
    },
    {
      type: 'check',
      methodLabel: 'Check',
      canRefund: true,
      weight: 0.10, // 10% of transactions
      statuses: ['sent', 'posted', 'failed', 'voided']
    },
    {
      type: 'cash',
      methodLabel: 'Cash',
      canRefund: false,
      weight: 0.10, // 10% of transactions
      statuses: ['released', 'paid', 'pending']
    }
  ];

  // Build weighted array for selection
  const weightedMethods = [];
  paymentMethods.forEach(method => {
    const count = Math.round(method.weight * 100);
    for (let i = 0; i < count; i++) {
      weightedMethods.push(method);
    }
  });

  // Transaction descriptions
  const descriptions = [
    'Online purchase #',
    'Service payment #',
    'Subscription renewal #',
    'Product order #',
    'Digital download #',
    'Membership fee #',
    'Consultation payment #',
    'Software license #',
    'Training course #',
    'Support service #',
    'Freight payment #',
    'Load delivery #',
    'Shipping service #',
    'Carrier payment #'
  ];

  // Enhanced sample transactions based on document 6 patterns
  const sampleTransactions = [
    // Card transactions
    { type: "card", status: "paid", amount: 245000, method_last4: "4242", description: "Invoice #INV-1024" },
    { type: "card", status: "processing", substatus: "authorization", amount: 8800, method_last4: "1881", description: "Order #10021" },
    { type: "card", status: "refunded", refund_type: "full", amount: 12500, description: "Invoice #INV-1100" },
    { type: "card", status: "dispute_open", amount: 5999, dispute_reason: "fraudulent", description: "Disputed charge" },
    { type: "card", status: "partial_refund", amount: 50000, refund_amount: 15000, description: "Partial refund for delay" },
    { type: "card", status: "voided", amount: 12000, description: "Voided transaction" },
    { type: "card", status: "chargeback", amount: 32000, description: "Chargeback initiated" },

    // ACH transactions
    { type: "ach", status: "processing", amount: 32000, description: "ACH debit processing" },
    { type: "ach", status: "posted", amount: 32000, description: "ACH posted" },
    { type: "ach", status: "failed", failure_code: "R01", amount: 32000, description: "ACH NSF (R01)" },
    { type: "ach", status: "reversed", amount: 20000, description: "ACH reversal" },

    // Wire transactions
    { type: "wire", status: "sent", amount: 150000, bank_ref: "WT1234567", description: "Wire transfer sent" },
    { type: "wire", status: "posted", amount: 150000, bank_ref: "WT1234567", description: "Wire transfer completed" },
    { type: "wire", status: "failed", amount: 150000, description: "Wire transfer failed" },

    // Zelle transactions
    { type: "zelle", status: "released", amount: 9000, recipient: "user@example.com", description: "Zelle payment" },
    { type: "zelle", status: "failed", failure_code: "LIMIT_EXCEEDED", amount: 45000, description: "Zelle limit exceeded" },

    // Check transactions
    { type: "check", status: "sent", amount: 42000, check_no: "100289", description: "Check mailed" },
    { type: "check", status: "posted", amount: 42000, check_no: "100289", description: "Check cleared" },
    { type: "check", status: "voided", amount: 25000, check_no: "100290", description: "Check voided" },

    // Cash transactions
    { type: "cash", status: "released", amount: 6000, pickup_location: "Brooklyn Office", description: "Cash ready for pickup" },
    { type: "cash", status: "paid", amount: 6000, clerk_id: "EMP-22", description: "Cash picked up" }
  ];

  // Generate transactions based on sample data and random generation
  for (let i = 0; i < count; i++) {
    // Use sample data for first transactions, then generate random ones
    if (i < sampleTransactions.length && rng.next() > 0.3) {
      const sample = sampleTransactions[i];
      
      // Generate date
      const daysAgo = rng.intBetween(minDaysAgo, maxDaysAgo);
      const transactionDate = new Date(today);
      transactionDate.setDate(transactionDate.getDate() - daysAgo);
      const dateStr = transactionDate.toISOString().split('T')[0];

      // Generate transaction ID and invoice number
      const transactionId = `TXN-${generateBase36(rng, 8)}`;
      const invoiceNum = String(rng.intBetween(10000, 99999));

      // Find payment method config
      const methodConfig = paymentMethods.find(m => m.type === sample.type);

      let amount = sample.amount / 100; // Convert from cents
      if (sample.status === 'refunded' || sample.status === 'partial_refund') {
        amount = -Math.abs(amount);
      }

      const transaction = {
        id: transactionId,
        date: dateStr,
        description: sample.description || `${rng.choice(descriptions)}${invoiceNum}`,
        type: sample.type,
        methodLabel: methodConfig?.methodLabel || sample.type,
        status: sample.status,
        amount,
        reference: `REF-${generateBase36(rng, 6)}`,
        createdAt: transactionDate.toISOString(),
        updatedAt: new Date(transactionDate.getTime() + rng.intBetween(0, 86400000)).toISOString(),
        // Add method-specific fields
        ...(sample.method_last4 && { method_last4: sample.method_last4 }),
        ...(sample.bank_ref && { bank_ref: sample.bank_ref }),
        ...(sample.check_no && { check_no: sample.check_no }),
        ...(sample.recipient && { recipient: sample.recipient }),
        ...(sample.pickup_location && { pickup_location: sample.pickup_location }),
        ...(sample.clerk_id && { clerk_id: sample.clerk_id }),
        ...(sample.dispute_reason && { dispute_reason: sample.dispute_reason }),
        ...(sample.failure_code && { failure_code: sample.failure_code }),
        ...(sample.refund_amount && { refund_amount: sample.refund_amount })
      };

      transactions.push(transaction);
    } else {
      // Generate random transaction
      const daysAgo = rng.intBetween(minDaysAgo, maxDaysAgo);
      const transactionDate = new Date(today);
      transactionDate.setDate(transactionDate.getDate() - daysAgo);
      const dateStr = transactionDate.toISOString().split('T')[0];

      // Select payment method
      const paymentMethod = rng.choice(weightedMethods);

      // Generate transaction ID and invoice number
      const transactionId = `TXN-${generateBase36(rng, 8)}`;
      const invoiceNum = String(rng.intBetween(10000, 99999));
      const description = `${rng.choice(descriptions)}${invoiceNum}`;

      // Generate amount
      let amount = rng.between(25, 500);
      amount = Math.round(amount * 100) / 100;

      // Select appropriate status for this payment method
      const availableStatuses = paymentMethod.statuses;
      let status = rng.choice(availableStatuses);

      // Apply business logic for refunds
      if ((status === 'refunded' || status === 'partial_refund') && !paymentMethod.canRefund) {
        status = 'paid'; // Change to paid if method can't be refunded
      }

      // Handle negative amounts for refunds
      if (status === 'refunded' || status === 'partial_refund' || status === 'chargeback') {
        amount = -Math.abs(amount);
      }

      // Generate reference number
      let reference = null;
      if (rng.next() > 0.3) {
        reference = `REF-${generateBase36(rng, 6)}`;
      }

      // Add method-specific fields
      const methodSpecificFields = {};
      if (paymentMethod.type === 'card') {
        methodSpecificFields.method_last4 = String(rng.intBetween(1000, 9999));
        methodSpecificFields.card_is_debit = rng.next() < 0.5; // ~50% debit cards
      } else if (paymentMethod.type === 'wire') {
        methodSpecificFields.bank_ref = `WT${generateBase36(rng, 7)}`;
      } else if (paymentMethod.type === 'check') {
        methodSpecificFields.check_no = String(rng.intBetween(100000, 999999));
      } else if (paymentMethod.type === 'zelle') {
        const emails = ['user@example.com', 'customer@domain.com', 'payment@service.com'];
        methodSpecificFields.recipient = rng.choice(emails);
      } else if (paymentMethod.type === 'cash') {
        const locations = ['Brooklyn Office', 'Manhattan Branch', 'Queens Hub', 'Bronx Center'];
        methodSpecificFields.pickup_location = rng.choice(locations);
        if (status === 'paid') {
          methodSpecificFields.clerk_id = `EMP-${rng.intBetween(10, 99)}`;
        }
      }

      // Create transaction object
      const transaction = {
        id: transactionId,
        date: dateStr,
        description,
        type: paymentMethod.type,
        methodLabel: paymentMethod.methodLabel,
        status,
        amount,
        reference,
        createdAt: transactionDate.toISOString(),
        updatedAt: new Date(transactionDate.getTime() + rng.intBetween(0, 86400000)).toISOString(),
        ...methodSpecificFields
      };

      transactions.push(transaction);
    }
  }

  // Sort by date descending (newest first)
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  return transactions;
}

/**
 * Create mock payout data (for carrier payments)
 */
export function createMockPayouts(count = 10, options = {}) {
  const {
    seed = 54321,
    minDaysAgo = 0,
    maxDaysAgo = 30
  } = options;

  const rng = new SeededRandom(seed);
  const today = new Date();
  const payouts = [];

  const paymentMethods = [
    { type: 'ach', label: 'ACH Transfer', weight: 0.7 },
    { type: 'wire', label: 'Wire Transfer', weight: 0.2 },
    { type: 'check', label: 'Paper Check', weight: 0.1 }
  ];

  // Build weighted array
  const weightedMethods = [];
  paymentMethods.forEach(method => {
    const count = Math.round(method.weight * 100);
    for (let i = 0; i < count; i++) {
      weightedMethods.push(method);
    }
  });

  for (let i = 0; i < count; i++) {
    const daysAgo = rng.intBetween(minDaysAgo, maxDaysAgo);
    const payoutDate = new Date(today);
    payoutDate.setDate(payoutDate.getDate() - daysAgo);
    
    const dateStr = payoutDate.toISOString().split('T')[0];
    const payoutId = `PYT-${generateBase36(rng, 8)}`;
    const method = rng.choice(weightedMethods);
    
    // Generate amount (carrier payouts are typically larger)
    let amount = rng.between(500, 5000);
    amount = Math.round(amount * 100) / 100;

    // Determine status
    const statusRoll = rng.next();
    let status;
    if (statusRoll < 0.8) {
      status = 'paid';
    } else if (statusRoll < 0.95) {
      status = 'pending';
    } else {
      status = 'failed';
    }

    const payout = {
      id: payoutId,
      date: dateStr,
      amount,
      method: method.type,
      methodLabel: method.label,
      status,
      reference: `REF-${generateBase36(rng, 6)}`,
      createdAt: payoutDate.toISOString(),
      updatedAt: new Date(payoutDate.getTime() + rng.intBetween(0, 86400000)).toISOString()
    };

    payouts.push(payout);
  }

  // Sort by date descending
  payouts.sort((a, b) => new Date(b.date) - new Date(a.date));

  return payouts;
}

/**
 * Get comprehensive payment method capabilities
 * @param {string} type - Payment method type
 * @returns {Object} Capabilities object
 */
export function getPaymentMethodCapabilities(type) {
  const capabilities = {
    card: {
      canRefund: true,
      refundTimeLimit: '120 days',
      refundNote: 'Refunds typically processed within 3-5 business days',
      instant: true,
      chargebackable: true,
      speed: 'instant'
    },
    ach: {
      canRefund: true,
      refundTimeLimit: '60 days',
      refundNote: 'ACH refunds may take 3-5 business days',
      reversible: true,
      speed: '2-3 business days'
    },
    wire: {
      canRefund: false,
      refundTimeLimit: null,
      refundNote: 'Wire transfers are typically non-refundable due to immediate settlement',
      speed: 'same day if before cutoff'
    },
    zelle: {
      canRefund: false,
      refundTimeLimit: null,
      refundNote: 'Zelle transfers are instant and cannot be refunded here',
      instant: true,
      limits: 'bank daily limits apply'
    },
    check: {
      canRefund: true,
      refundTimeLimit: '90 days',
      refundNote: 'Checks can be voided before clearing, refunds after clearing take 5-10 business days',
      speed: 'mail 5-10 business days'
    },
    cash: {
      canRefund: false,
      refundTimeLimit: null,
      refundNote: 'Cash transactions cannot be refunded electronically',
      instant: true,
      pickup_required: true
    }
  };

  return capabilities[type] || {
    canRefund: false,
    refundTimeLimit: null,
    refundNote: 'Refund policy varies by payment method',
    speed: 'standard'
  };
}

/**
 * Validate refund eligibility with enhanced status-aware messaging
 * @param {Object} transaction - Transaction object
 * @returns {Object} Validation result
 */
export function validateRefundEligibility(transaction) {
  const capabilities = getPaymentMethodCapabilities(transaction.type);
  
  // Handle already refunded transactions
  if (transaction.status === 'refunded' || transaction.status === 'partial_refund') {
    return {
      eligible: false,
      reason: 'This charge has already been refunded.'
    };
  }

  // Handle disputed transactions
  if (transaction.status === 'dispute_open' || transaction.status === 'chargeback') {
    return {
      eligible: false,
      reason: 'Cannot refund disputed transactions. Please resolve dispute first.'
    };
  }

  // Handle voided transactions
  if (transaction.status === 'voided') {
    return {
      eligible: false,
      reason: 'This transaction has been voided.'
    };
  }

  // Handle non-paid transactions
  if (!['paid', 'posted'].includes(transaction.status)) {
    return {
      eligible: false,
      reason: 'Only completed transactions can be refunded.'
    };
  }

  // Handle payment methods that cannot be refunded
  if (!capabilities.canRefund) {
    return {
      eligible: false,
      reason: capabilities.refundNote
    };
  }

  // Check time limit for refunds
  if (capabilities.refundTimeLimit) {
    const dayLimit = parseInt(capabilities.refundTimeLimit);
    const transactionDate = new Date(transaction.date);
    const today = new Date();
    const daysDiff = Math.floor((today - transactionDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > dayLimit) {
      return {
        eligible: false,
        reason: `Refund period expired (${capabilities.refundTimeLimit} limit).`
      };
    }
  }

  return {
    eligible: true,
    reason: 'Eligible within the refund window.'
  };
}

/**
 * Create a specific refund transaction
 * @param {Object} originalTransaction - Original transaction to refund
 * @returns {Object|null} Refund transaction or null if not eligible
 */
export function createRefundTransaction(originalTransaction) {
  const eligibility = validateRefundEligibility(originalTransaction);
  
  if (!eligibility.eligible) {
    console.warn(`Refund not eligible: ${eligibility.reason}`);
    return null;
  }

  const refundId = `RFD-${generateBase36(new SeededRandom(), 8)}`;
  const now = new Date();
  
  return {
    id: refundId,
    date: now.toISOString().split('T')[0],
    description: `Refund for ${originalTransaction.description}`,
    type: originalTransaction.type,
    methodLabel: originalTransaction.methodLabel,
    status: 'refunded',
    amount: -Math.abs(originalTransaction.amount),
    reference: `RFD-${originalTransaction.id}`,
    originalTransactionId: originalTransaction.id,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}

// Export for testing
export { SeededRandom, generateBase36 };

// Default export with common configurations
export default {
  createMockPayments,
  createMockPayouts,
  getPaymentMethodCapabilities,
  validateRefundEligibility,
  createRefundTransaction
};