// src/pages/profile/validation/profileValidators.js

/**
 * Email validation using standard regex pattern
 */
const validateEmail = (email) => {
  if (!email || email.trim() === '') return '';
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email) ? '' : 'Please enter a valid email address';
};

/**
 * Phone validation - expects 10 digits after formatting
 */
const validatePhone = (phone) => {
  if (!phone || phone.trim() === '') return 'Phone number is required';
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? '' : 'Please enter a valid 10-digit phone number';
};

/**
 * ZIP code validation - supports 5-digit and 9-digit formats
 */
const validateZipCode = (zip) => {
  if (!zip || zip.trim() === '') return '';
  const zipPattern = /^\d{5}(-\d{4})?$/;
  return zipPattern.test(zip) ? '' : 'Please enter a valid ZIP code (12345 or 12345-6789)';
};

/**
 * Required field validation
 */
const validateRequired = (value, fieldName) => {
  if (!value || value.trim() === '') {
    return `${fieldName} is required`;
  }
  return '';
};

/**
 * Company Information section validation
 */
export const validateCompanyInfo = (formData) => {
  const errors = {};

  // Required fields
  const requiredFields = [
    { key: 'companyName', name: 'Company name' },
    { key: 'phone', name: 'Phone number' },
    { key: 'email', name: 'Email' },
    { key: 'address', name: 'Address' },
    { key: 'city', name: 'City' },
    { key: 'state', name: 'State' },
    { key: 'zipCode', name: 'ZIP code' }
  ];

  requiredFields.forEach(field => {
    const error = validateRequired(formData[field.key], field.name);
    if (error) errors[field.key] = error;
  });

  // Specific validations
  if (formData.email && !errors.email) {
    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;
  }

  if (formData.phone && !errors.phone) {
    const phoneError = validatePhone(formData.phone);
    if (phoneError) errors.phone = phoneError;
  }

  if (formData.zipCode && !errors.zipCode) {
    const zipError = validateZipCode(formData.zipCode);
    if (zipError) errors.zipCode = zipError;
  }

  return errors;
};

/**
 * Payout Settings section validation
 */
export const validatePayoutSettings = (formData) => {
  const errors = {};

  // Required fields for bank account
  const requiredFields = [
    { key: 'accountHolderFirst', name: 'First name' },
    { key: 'accountHolderLast', name: 'Last name' },
    { key: 'routingNumber', name: 'Routing number' },
    { key: 'accountNumber', name: 'Account number' },
    { key: 'bankName', name: 'Bank name' },
    { key: 'accountType', name: 'Account type' },
    { key: 'payoutCadence', name: 'Payout cadence' },
    { key: 'taxStatus', name: 'Tax status' }
  ];

  requiredFields.forEach(field => {
    const error = validateRequired(formData[field.key], field.name);
    if (error) errors[field.key] = error;
  });

  // Account holder name validation
  if (formData.accountHolderFirst && !errors.accountHolderFirst) {
    const name = formData.accountHolderFirst.trim();
    if (name.length < 2) {
      errors.accountHolderFirst = 'First name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s\-'.]+$/.test(name)) {
      errors.accountHolderFirst = 'Only letters, spaces, hyphens, apostrophes, and periods allowed';
    }
  }

  if (formData.accountHolderLast && !errors.accountHolderLast) {
    const name = formData.accountHolderLast.trim();
    if (name.length < 2) {
      errors.accountHolderLast = 'Last name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s\-'.]+$/.test(name)) {
      errors.accountHolderLast = 'Only letters, spaces, hyphens, apostrophes, and periods allowed';
    }
  }

  // Routing number validation (basic check)
  if (formData.routingNumber && !errors.routingNumber) {
    const routing = formData.routingNumber.replace(/\D/g, '');
    if (routing.length !== 9) {
      errors.routingNumber = 'Routing number must be 9 digits';
    }
  }

  // Account number validation (basic check)
  if (formData.accountNumber && !errors.accountNumber) {
    const account = formData.accountNumber.replace(/\D/g, '');
    if (account.length < 4) {
      errors.accountNumber = 'Account number must be at least 4 digits';
    }
  }

  return errors;
};

/**
 * Contacts section validation
 */
export const validateContacts = (formData) => {
  const errors = {};

  // Primary contact required fields
  const primaryRequiredFields = [
    { key: 'primaryContactName', name: 'Primary contact name' },
    { key: 'primaryContactPhone', name: 'Primary contact phone' },
    { key: 'primaryContactEmail', name: 'Primary contact email' }
  ];

  primaryRequiredFields.forEach(field => {
    const error = validateRequired(formData[field.key], field.name);
    if (error) errors[field.key] = error;
  });

  // Email validation for primary contact
  if (formData.primaryContactEmail && !errors.primaryContactEmail) {
    const emailError = validateEmail(formData.primaryContactEmail);
    if (emailError) errors.primaryContactEmail = emailError;
  }

  // Phone validation for primary contact
  if (formData.primaryContactPhone && !errors.primaryContactPhone) {
    const phoneError = validatePhone(formData.primaryContactPhone);
    if (phoneError) errors.primaryContactPhone = phoneError;
  }

  // Dispatch contact validation (if provided)
  if (formData.dispatchContactEmail) {
    const emailError = validateEmail(formData.dispatchContactEmail);
    if (emailError) errors.dispatchContactEmail = emailError;
  }

  if (formData.dispatchContactPhone) {
    const phoneError = validatePhone(formData.dispatchContactPhone);
    if (phoneError) errors.dispatchContactPhone = phoneError;
  }

  return errors;
};

/**
 * Password validation
 */
export const validatePassword = (password) => {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[^A-Za-z0-9]/.test(password)
  };

  const isValid = Object.values(checks).every(Boolean);
  
  return {
    isValid,
    checks,
    message: isValid ? '' : 'Password must be 8+ characters with uppercase, lowercase, number, and special character'
  };
};

/**
 * Validate password confirmation
 */
export const validatePasswordConfirmation = (password, confirmation) => {
  if (!confirmation) return 'Please confirm your password';
  if (password !== confirmation) return 'Passwords do not match';
  return '';
};

/**
 * Utility function to check if any errors exist in an errors object
 */
export const hasValidationErrors = (errors) => {
  return Object.values(errors).some(error => error && error.trim() !== '');
};

/**
 * Utility function to clear specific field errors
 */
export const clearFieldError = (errors, fieldName) => {
  const newErrors = { ...errors };
  delete newErrors[fieldName];
  return newErrors;
};

/**
 * Comprehensive form validation for entire profile
 */
export const validateEntireProfile = (formData) => {
  return {
    ...validateCompanyInfo(formData),
    ...validatePayoutSettings(formData),
    ...validateContacts(formData)
  };
};