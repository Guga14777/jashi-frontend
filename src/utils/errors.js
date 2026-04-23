// src/utils/errors.js

export const getErrorMessage = (error) => {
  // Handle different error types and return user-friendly messages
  
  if (typeof error === 'string') {
    return error;
  }

  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 400:
        return data?.message || 'Invalid request. Please check your input.';
      case 401:
        return 'You need to log in to perform this action.';
      case 402:
        return data?.message || 'Payment required or transaction declined.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return data?.message || 'A conflict occurred with your request.';
      case 410:
        return data?.message || 'This transaction can no longer be processed (refund window expired).';
      case 422:
        return data?.message || 'The data you provided is invalid.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return data?.message || `An error occurred (${status})`;
    }
  } else if (error.request) {
    // Request made but no response received
    return 'Network error. Please check your connection.';
  } else if (error.code === 'ECONNABORTED') {
    // Handle network timeouts
    return 'Request timed out. Please try again.';
  } else if (error.message) {
    // Something else happened
    return error.message;
  }

  // Log error details in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error details:', error);
  }

  return 'An unexpected error occurred. Please try again.';
};

export const getPaymentErrorMessage = (method, status) => {
  // Payment-specific error messages for UI components
  
  if (method === 'digital_transfer' && status === 'refunded') {
    return 'Digital transfers (Zelle, Cash App) cannot be refunded after delivery.';
  }
  
  if (method === 'digital_transfer' && status === 'pending_refund') {
    return 'This digital transfer cannot be refunded. Please contact customer support for assistance.';
  }
  
  if (method === 'card' && status === 'refunded') {
    return 'Card payment successfully refunded. Funds will appear in your account within 3-5 business days.';
  }
  
  if (method === 'card' && status === 'pending_refund') {
    return 'Card refund is being processed. You will receive confirmation shortly.';
  }
  
  if (method === 'bank_transfer' && status === 'refunded') {
    return 'Bank transfer refund completed. Funds will appear in your account within 1-2 business days.';
  }
  
  return null;
};

export class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends AppError {
  constructor(message, fields = {}) {
    super(message, 'VALIDATION_ERROR', 422);
    this.fields = fields;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Permission denied') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', retryAfter = null) {
    super(message, 'RATE_LIMIT', 429);
    this.retryAfter = retryAfter;
  }
}

export class PaymentError extends AppError {
  constructor(message, paymentMethod = null, transactionId = null) {
    super(message, 'PAYMENT_ERROR', 402);
    this.paymentMethod = paymentMethod;
    this.transactionId = transactionId;
  }
}

export class RefundError extends AppError {
  constructor(message, reason = 'REFUND_NOT_ALLOWED') {
    super(message, reason, 410);
    this.isRefundError = true;
  }
}