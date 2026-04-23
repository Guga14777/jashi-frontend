/**
 * Validation Utilities
 * Centralized validation for email and phone formats
 * Used across login, signup, and forgot password flows
 */

/**
 * Validate email format
 * Enforces standard email format: name@domain.com
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid email format
 */
export const validateEmail = (email) => {
  // Strict email regex pattern
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  // Additional checks
  if (!email || typeof email !== 'string') return false;
  if (email.length < 5 || email.length > 254) return false; // RFC 5321
  if (email.startsWith('.') || email.endsWith('.')) return false;
  if (email.includes('..')) return false;
  if (email.split('@').length !== 2) return false;
  
  const [localPart, domainPart] = email.split('@');
  
  // Local part validation
  if (localPart.length > 64) return false; // RFC 5321
  if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
  
  // Domain part validation
  if (!domainPart.includes('.')) return false;
  if (domainPart.startsWith('-') || domainPart.endsWith('-')) return false;
  if (domainPart.startsWith('.') || domainPart.endsWith('.')) return false;
  
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 * Enforces format: (XXX) XXX-XXXX
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid phone format
 */
export const validatePhone = (phone) => {
  // Must match exact format: (XXX) XXX-XXXX
  const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
  
  if (!phone || typeof phone !== 'string') return false;
  if (phone.length !== 14) return false; // Exact length for (XXX) XXX-XXXX
  
  // Check if it matches the pattern
  if (!phoneRegex.test(phone)) return false;
  
  // Extract digits to validate area code and exchange
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length !== 10) return false;
  
  // Area code validation (first digit cannot be 0 or 1)
  const areaCode = digitsOnly.substring(0, 3);
  if (areaCode[0] === '0' || areaCode[0] === '1') return false;
  
  // Exchange validation (first digit cannot be 0 or 1)
  const exchange = digitsOnly.substring(3, 6);
  if (exchange[0] === '0' || exchange[0] === '1') return false;
  
  return true;
};

/**
 * Format phone number as user types
 * Auto-formats to (XXX) XXX-XXXX pattern
 * @param {string} value - Input value to format
 * @returns {string} - Formatted phone number
 */
export const formatPhoneNumber = (value) => {
  // Remove all non-digit characters
  const digitsOnly = value.replace(/\D/g, '');
  
  // Limit to 10 digits
  const digits = digitsOnly.substring(0, 10);
  
  // Apply formatting based on length
  if (digits.length === 0) {
    return '';
  } else if (digits.length <= 3) {
    return `(${digits}`;
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
};

/**
 * Detect if input is likely an email or phone
 * @param {string} value - Input value to check
 * @returns {string} - 'email', 'phone', or 'unknown'
 */
export const detectInputType = (value) => {
  if (!value) return 'unknown';
  
  const trimmed = value.trim();
  
  // Check for @ symbol - likely email
  if (trimmed.includes('@')) {
    return 'email';
  }
  
  // Check if starts with digit or parenthesis - likely phone
  if (/^[\d(]/.test(trimmed)) {
    return 'phone';
  }
  
  // Check if contains only digits, spaces, dashes, parentheses - likely phone
  if (/^[\d\s()-]+$/.test(trimmed)) {
    return 'phone';
  }
  
  // Default to email if contains letters
  if (/[a-zA-Z]/.test(trimmed)) {
    return 'email';
  }
  
  return 'unknown';
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Object with validation results
 */
export const validatePassword = (password) => {
  const rules = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  
  const isValid = Object.values(rules).every(rule => rule === true);
  
  return {
    ...rules,
    isValid
  };
};

/**
 * Sanitize input to prevent XSS
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
export const sanitizeInput = (input) => {
  if (!input) return '';
  
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Validate username
 * @param {string} username - Username to validate
 * @returns {boolean} - True if valid username
 */
export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') return false;
  if (username.length < 3 || username.length > 20) return false;
  
  // Alphanumeric, underscore, dash only
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  return usernameRegex.test(username);
};

/**
 * Format error messages for display
 * @param {string} field - Field name
 * @param {string} type - Error type
 * @returns {string} - Formatted error message
 */
export const getErrorMessage = (field, type) => {
  const messages = {
    email: {
      required: 'Email address is required',
      invalid: 'Please enter a valid email address (name@email.com)',
      taken: 'This email is already registered'
    },
    phone: {
      required: 'Phone number is required',
      invalid: 'Please enter a valid phone number (555) 123-4567',
      taken: 'This phone number is already registered'
    },
    password: {
      required: 'Password is required',
      weak: 'Password does not meet security requirements',
      mismatch: 'Passwords do not match'
    },
    username: {
      required: 'Username is required',
      invalid: 'Username must be 3-20 characters, letters, numbers, dash, or underscore only',
      taken: 'This username is already taken'
    },
    code: {
      required: 'Verification code is required',
      invalid: 'Invalid verification code',
      expired: 'Verification code has expired'
    }
  };
  
  return messages[field]?.[type] || 'Invalid input';
};

/**
 * Mask sensitive information for display
 * @param {string} value - Value to mask
 * @param {string} type - Type of value (email, phone)
 * @returns {string} - Masked value
 */
export const maskSensitiveInfo = (value, type) => {
  if (!value) return '';
  
  if (type === 'email') {
    const [username, domain] = value.split('@');
    if (!username || !domain) return value;
    
    if (username.length <= 3) {
      return `***@${domain}`;
    }
    return `${username.substring(0, 2)}***@${domain}`;
  }
  
  if (type === 'phone') {
    // Keep format but mask middle digits: (555) ***-4567
    return value.replace(/(\(\d{3}\)) \d{3}/, '$1 ***');
  }
  
  // Default masking for other types
  if (value.length <= 4) {
    return '****';
  }
  return value.substring(0, 2) + '***' + value.substring(value.length - 2);
};

// Export all functions as a default object too
export default {
  validateEmail,
  validatePhone,
  formatPhoneNumber,
  detectInputType,
  validatePassword,
  sanitizeInput,
  validateUsername,
  getErrorMessage,
  maskSensitiveInfo
};