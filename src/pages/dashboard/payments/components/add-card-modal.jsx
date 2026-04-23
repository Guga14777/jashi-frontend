import React, { useState, useEffect, useRef, useCallback } from "react";
import Modal from "../../../../components/ui/modal.jsx";
import "./add-card-modal.css";

const MAX_CARD_DIGITS = 16;
const VALIDATION_DEBOUNCE_MS = 350;

// Internationalization message map
const MESSAGES = {
  title: "Add Payment Card",
  subtitle: "Enter your card information securely.",
  firstName: "First Name",
  lastName: "Last Name",
  cardNumber: "Card Number",
  expiration: "Expiration (MM/YY)",
  cvv: "CVV",
  firstNamePlaceholder: "Enter first name",
  lastNamePlaceholder: "Enter last name",
  cardNumberPlaceholder: "Enter card number",
  expirationPlaceholder: "MM/YY",
  cvvPlaceholder: "CVV",
  cancel: "Cancel",
  saveCard: "Save Card",
  saving: "Saving Card...",
  
  // Errors
  firstNameRequired: "First name is required",
  lastNameRequired: "Last name is required",
  cardNumberRequired: "Card number is required",
  cardNumber16Digits: "Please enter a 16-digit card number",
  cardNumberInvalid: "Please enter a valid card number",
  expirationRequired: "Expiration date is required",
  expirationInvalid: "Please enter a valid expiration date (MM/YY)",
  monthInvalid: "Month must be 01-12",
  cardExpired: "Card has expired",
  cardExpiresSoon: "Card expires this month",
  cvvRequired: "CVV must be exactly 3 digits",
  cvvInvalid: "CVV must be exactly 3 digits",
  submitError: "Failed to add card. Please try again.",
  
  // Warnings
  amexNotSupported: "American Express isn't supported. Please use a card with a 3-digit CVV.",
  only16DigitSupported: "Only 16-digit cards are supported",
  
  // Accessibility
  modalOpened: "Add Payment Card dialog opened",
  validationErrors: "Please fix errors in:",
};

export default function AddCardModal({ open, onClose, onSave, onSuccess, onError }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    cardNumber: "",
    expiration: "",
    cvv: ""
  });
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAmexWarning, setShowAmexWarning] = useState(false);
  const [cardBrand, setCardBrand] = useState("Card");
  
  // Refs for focus management
  const firstRef = useRef(null);
  const cvvRef = useRef(null);
  const triggerButtonRef = useRef(null);
  const debounceTimeouts = useRef({});
  const liveRef = useRef(null);

  // Announce helper for live region
  const announce = useCallback((msg, ttl = 1000) => {
    if (!liveRef.current) return;
    liveRef.current.textContent = msg;
    setTimeout(() => { if (liveRef.current) liveRef.current.textContent = ""; }, ttl);
  }, []);

  // Store reference to trigger button when modal opens
  useEffect(() => {
    if (open) {
      triggerButtonRef.current = document.activeElement;
      setTimeout(() => { 
        announce(MESSAGES.modalOpened, 1000); 
        firstRef.current?.focus(); 
      }, 100);
    }
    return () => {
      Object.values(debounceTimeouts.current).forEach(t => clearTimeout(t));
      debounceTimeouts.current = {};
    };
  }, [open, announce]);

  // Debounced validation function
  const debouncedValidate = useCallback((field, value) => {
    if (debounceTimeouts.current[field]) {
      clearTimeout(debounceTimeouts.current[field]);
    }
    
    debounceTimeouts.current[field] = setTimeout(() => {
      validateField(field, value);
    }, VALIDATION_DEBOUNCE_MS);
  }, []);

  // Clear sensitive data
  const clearSensitiveData = useCallback(() => {
    setFormData(prev => ({ ...prev, cvv: "" }));
  }, []);

  // Sanitize pasted content
  const sanitizeInput = (field, value) => {
    switch (field) {
      case "cardNumber":
        return value.replace(/\D/g, "").slice(0, MAX_CARD_DIGITS);
      case "expiration":
        return value.replace(/\D/g, "").slice(0, 4);
      case "cvv":
        return value.replace(/\D/g, "").slice(0, 3);
      case "firstName":
      case "lastName":
        return value.replace(/[^a-zA-Z\s-]/g, "");
      default:
        return value;
    }
  };

  // Handle paste events
  const handlePaste = (field, e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const sanitized = sanitizeInput(field, pastedText);
    handleInputChange(field, sanitized);
  };

  // Handle key down events for numeric fields
  const handleKeyDown = (field, e) => {
    const isNumericField = ["cardNumber", "expiration", "cvv"].includes(field);
    if (!isNumericField) return;

    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End'
    ];

    const isNumberKey = (e.key >= '0' && e.key <= '9');
    const isAllowedKey = allowedKeys.includes(e.key);
    const isModifierKey = e.ctrlKey || e.metaKey || e.altKey;

    if (!isNumberKey && !isAllowedKey && !isModifierKey) {
      e.preventDefault();
    }
  };

  const handleInputChange = (field, value) => {
    let processedValue = value;
    const newWarnings = { ...warnings };

    // Card number: digits only → groups of 4, EXACTLY 16 max
    if (field === "cardNumber") {
      const digits = value.replace(/\D/g, "").slice(0, MAX_CARD_DIGITS);
      processedValue = digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
      const brand = detectCardBrand(digits);
      setCardBrand(brand);
      setShowAmexWarning(brand === "American Express");
    }

    // Expiry as MM/YY (digits only) with auto-advance
    if (field === "expiration") {
      const digits = value.replace(/\D/g, "").slice(0, 4);
      processedValue = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
      
      // Auto-advance to CVV when MM/YY is complete and month is valid
      if (digits.length === 4) {
        const mm = parseInt(digits.slice(0, 2), 10);
        if (mm >= 1 && mm <= 12) setTimeout(() => cvvRef.current?.focus(), 0);
      }
    }

    // CVV - exactly 3 digits
    if (field === "cvv") {
      processedValue = value.replace(/\D/g, "").slice(0, 3);
    }

    // Names - letters, spaces, hyphens only
    if (field === "firstName" || field === "lastName") {
      processedValue = value.replace(/[^a-zA-Z\s-]/g, "");
    }

    // Check for expires soon warning
    if (field === "expiration" && processedValue.length === 5) {
      const [mm, yy] = processedValue.split("/");
      const month = parseInt(mm, 10);
      const year = parseInt(yy, 10);
      const now = new Date();
      const currentYear = now.getFullYear() % 100;
      const currentMonth = now.getMonth() + 1;
      
      if (year === currentYear && month === currentMonth) {
        newWarnings.expiration = MESSAGES.cardExpiresSoon;
      } else {
        delete newWarnings.expiration;
      }
    }

    setFormData(prev => ({ ...prev, [field]: processedValue }));
    setWarnings(newWarnings);
    
    // Clear field error immediately when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }

    // Debounced validation
    debouncedValidate(field, processedValue);
  };

  const validateField = (field, value) => {
    const newErrors = { ...errors };

    switch (field) {
      case "firstName":
        if (!value.trim()) newErrors.firstName = MESSAGES.firstNameRequired;
        else delete newErrors.firstName;
        break;

      case "lastName":
        if (!value.trim()) newErrors.lastName = MESSAGES.lastNameRequired;
        else delete newErrors.lastName;
        break;

      case "cardNumber": {
        const digits = value.replace(/\D/g, "");
        if (!digits) newErrors.cardNumber = MESSAGES.cardNumberRequired;
        else if (digits.length !== MAX_CARD_DIGITS) newErrors.cardNumber = MESSAGES.cardNumber16Digits;
        else if (!isValidLuhn(digits)) newErrors.cardNumber = MESSAGES.cardNumberInvalid;
        else delete newErrors.cardNumber;
        break;
      }

      case "expiration": {
        if (!value) {
          newErrors.expiration = MESSAGES.expirationRequired;
        } else {
          const [mm, yy] = value.split("/");
          const month = parseInt(mm, 10);
          const year = parseInt(yy, 10);
          const now = new Date();
          const cy = now.getFullYear() % 100;
          const cm = now.getMonth() + 1;

          if (!mm || !yy) {
            newErrors.expiration = MESSAGES.expirationInvalid;
          } else if (month < 1 || month > 12) {
            newErrors.expiration = MESSAGES.monthInvalid;
          } else if (year < cy || (year === cy && month < cm)) {
            newErrors.expiration = MESSAGES.cardExpired;
          } else {
            delete newErrors.expiration;
          }
        }
        break;
      }

      case "cvv":
        if (!value) newErrors.cvv = MESSAGES.cvvRequired;
        else if (value.length !== 3) newErrors.cvv = MESSAGES.cvvInvalid;
        else delete newErrors.cvv;
        break;

      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field) => {
    // Clear any pending debounced validation
    if (debounceTimeouts.current[field]) {
      clearTimeout(debounceTimeouts.current[field]);
    }
    validateField(field, formData[field]);
  };

  // Luhn check
  const isValidLuhn = (num) => {
    let sum = 0, alt = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let n = parseInt(num[i], 10);
      if (alt) { n *= 2; if (n > 9) n = (n % 10) + 1; }
      sum += n; alt = !alt;
    }
    return sum % 10 === 0;
  };

  const detectCardBrand = (digits) => {
    if (/^4/.test(digits)) return "Visa";
    if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
    if (/^3[47]/.test(digits)) return "American Express";
    if (/^6/.test(digits)) return "Discover";
    return "Card";
  };

  // Validate all fields on submit
  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = MESSAGES.firstNameRequired;
    if (!formData.lastName.trim()) newErrors.lastName = MESSAGES.lastNameRequired;

    const digits = formData.cardNumber.replace(/\D/g, "");
    if (!digits) newErrors.cardNumber = MESSAGES.cardNumberRequired;
    else if (digits.length !== MAX_CARD_DIGITS) newErrors.cardNumber = MESSAGES.cardNumber16Digits;
    else if (!isValidLuhn(digits)) newErrors.cardNumber = MESSAGES.cardNumberInvalid;

    if (!formData.expiration) {
      newErrors.expiration = MESSAGES.expirationRequired;
    } else {
      const [mm, yy] = formData.expiration.split("/");
      const month = parseInt(mm, 10);
      const year = parseInt(yy, 10);
      const now = new Date();
      const cy = now.getFullYear() % 100;
      const cm = now.getMonth() + 1;
      if (!mm || !yy) {
        newErrors.expiration = MESSAGES.expirationInvalid;
      } else if (month < 1 || month > 12) {
        newErrors.expiration = MESSAGES.monthInvalid;
      } else if (year < cy || (year === cy && month < cm)) {
        newErrors.expiration = MESSAGES.cardExpired;
      }
    }

    if (!formData.cvv) newErrors.cvv = MESSAGES.cvvRequired;
    else if (formData.cvv.length !== 3) newErrors.cvv = MESSAGES.cvvInvalid;

    setErrors(newErrors);
    return { valid: Object.keys(newErrors).length === 0, newErrors };
  };

  // Announce validation errors
  const announceValidationErrors = (errorKeys) => {
    if (errorKeys.length === 0) return;
    announce(`${MESSAGES.validationErrors} ${errorKeys.join(', ')}`, 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { valid, newErrors } = validateForm();
    
    if (!valid) {
      const errorKeys = Object.keys(newErrors);
      announceValidationErrors(errorKeys);
      
      const firstErrorKey = errorKeys[0];
      if (firstErrorKey) {
        document.getElementById(firstErrorKey)?.focus();
      }
      return;
    }

    const digits = formData.cardNumber.replace(/\D/g, "");
    
    // Block AMEX (future-proof)
    if (detectCardBrand(digits) === "American Express") {
      setErrors(prev => ({ ...prev, cardNumber: MESSAGES.only16DigitSupported }));
      setShowAmexWarning(true);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulated API call
      await new Promise(r => setTimeout(r, 800));

      const last4 = digits.slice(-4);
      const brand = detectCardBrand(digits);

      const newCard = {
        id: `pm_${brand.toLowerCase()}_${last4}`,
        brand,
        last4,
        exp: formData.expiration,
        isDefault: false
      };

      onSave?.(newCard);
      onSuccess?.(true);

      // Clear all data including sensitive info
      setFormData({ firstName: "", lastName: "", cardNumber: "", expiration: "", cvv: "" });
      setErrors({});
      setWarnings({});
      setShowAmexWarning(false);
      setCardBrand("Card");
      
    } catch (error) {
      const submitError = { submit: MESSAGES.submitError };
      setErrors(submitError);
      onError?.(false);
      
      // Clear CVV on error after timeout
      setTimeout(clearSensitiveData, 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    
    // Clear all data including sensitive info
    setFormData({ firstName: "", lastName: "", cardNumber: "", expiration: "", cvv: "" });
    setErrors({});
    setWarnings({});
    setShowAmexWarning(false);
    setCardBrand("Card");
    
    // Clear any pending debounced validations
    Object.values(debounceTimeouts.current).forEach(timeout => clearTimeout(timeout));
    
    onClose?.();
    
    // Return focus to trigger button
    setTimeout(() => {
      if (triggerButtonRef.current && typeof triggerButtonRef.current.focus === 'function') {
        triggerButtonRef.current.focus();
      }
    }, 0);
  };

  // Handle escape key when not submitting
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && open && !isSubmitting) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, isSubmitting]);

  const isFormValid =
    formData.firstName &&
    formData.lastName &&
    formData.cardNumber.replace(/\D/g, "").length === MAX_CARD_DIGITS &&
    formData.expiration &&
    formData.cvv.length === 3 &&
    !errors.firstName &&
    !errors.lastName &&
    !errors.cardNumber &&
    !errors.expiration &&
    !errors.cvv;

  return (
    <Modal
      open={open}
      onClose={isSubmitting ? undefined : handleClose}
      maxWidth="520px"
      className="acm-modal"
      data-testid="add-card-modal"
      aria-labelledby="acm-title"
      aria-describedby="acm-subtitle"
      scroll="none"
    >
      <div className="acm-container">
        <div aria-live="polite" aria-atomic="true" className="sr-only" ref={liveRef} />
        
        <div className="acm-header">
          <h2 id="acm-title" className="acm-title">{MESSAGES.title}</h2>
          <p id="acm-subtitle" className="acm-subtitle">{MESSAGES.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="acm-form" noValidate autoComplete="off">
          {errors.submit && (
            <div className="acm-error-banner" role="alert" aria-live="assertive" data-testid="error-banner">
              {errors.submit}
            </div>
          )}

          {/* First Name */}
          <div className="acm-field">
            <label htmlFor="firstName" className="acm-label">{MESSAGES.firstName}</label>
            <input
              ref={firstRef}
              id="firstName"
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              onBlur={() => handleBlur("firstName")}
              onPaste={(e) => handlePaste("firstName", e)}
              className="acm-input"
              placeholder={MESSAGES.firstNamePlaceholder}
              disabled={isSubmitting}
              autoComplete="given-name"
              data-testid="firstName-input"
              aria-invalid={Boolean(errors.firstName)}
              aria-describedby={errors.firstName ? "firstName-error" : undefined}
            />
            {errors.firstName && (
              <span id="firstName-error" className="acm-field-error" role="alert">
                {errors.firstName}
              </span>
            )}
          </div>

          {/* Last Name */}
          <div className="acm-field">
            <label htmlFor="lastName" className="acm-label">{MESSAGES.lastName}</label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              onBlur={() => handleBlur("lastName")}
              onPaste={(e) => handlePaste("lastName", e)}
              className="acm-input"
              placeholder={MESSAGES.lastNamePlaceholder}
              disabled={isSubmitting}
              autoComplete="family-name"
              data-testid="lastName-input"
              aria-invalid={Boolean(errors.lastName)}
              aria-describedby={errors.lastName ? "lastName-error" : undefined}
            />
            {errors.lastName && (
              <span id="lastName-error" className="acm-field-error" role="alert">
                {errors.lastName}
              </span>
            )}
          </div>

          {/* Card Number */}
          <div className="acm-field">
            <label htmlFor="cardNumber" className="acm-label">{MESSAGES.cardNumber}</label>
            <div className="acm-input-wrapper">
              <input
                id="cardNumber"
                name="cardNumber"
                type="text"
                inputMode="numeric"
                pattern="[0-9 ]*"
                value={formData.cardNumber}
                onChange={(e) => handleInputChange("cardNumber", e.target.value)}
                onBlur={() => handleBlur("cardNumber")}
                onPaste={(e) => handlePaste("cardNumber", e)}
                onKeyDown={(e) => handleKeyDown("cardNumber", e)}
                className="acm-input"
                placeholder={MESSAGES.cardNumberPlaceholder}
                disabled={isSubmitting}
                autoComplete="cc-number"
                data-testid="cardNumber-input"
                aria-invalid={Boolean(errors.cardNumber)}
                aria-describedby={
                  errors.cardNumber ? "cardNumber-error" :
                  showAmexWarning ? "amex-warning" :
                  cardBrand !== "Card" ? "card-brand-hint" : undefined
                }
              />
              {cardBrand !== "Card" && !errors.cardNumber && !showAmexWarning && (
                <span id="card-brand-hint" className="acm-field-hint">
                  {cardBrand} detected
                </span>
              )}
            </div>
            {errors.cardNumber && (
              <span id="cardNumber-error" className="acm-field-error" role="alert">
                {errors.cardNumber}
              </span>
            )}
            {showAmexWarning && !errors.cardNumber && (
              <span id="amex-warning" className="acm-field-warning">
                {MESSAGES.amexNotSupported}
              </span>
            )}
          </div>

          {/* Expiration */}
          <div className="acm-field">
            <label htmlFor="expiration" className="acm-label">{MESSAGES.expiration}</label>
            <input
              id="expiration"
              name="expiration"
              type="text"
              inputMode="numeric"
              pattern="[0-9/]*"
              value={formData.expiration}
              onChange={(e) => handleInputChange("expiration", e.target.value)}
              onBlur={() => handleBlur("expiration")}
              onPaste={(e) => handlePaste("expiration", e)}
              onKeyDown={(e) => handleKeyDown("expiration", e)}
              className="acm-input"
              placeholder={MESSAGES.expirationPlaceholder}
              disabled={isSubmitting}
              autoComplete="cc-exp"
              data-testid="expiration-input"
              aria-invalid={Boolean(errors.expiration)}
              aria-describedby={
                errors.expiration ? "expiration-error" :
                warnings.expiration ? "expiration-warning" : undefined
              }
            />
            {errors.expiration && (
              <span id="expiration-error" className="acm-field-error" role="alert">
                {errors.expiration}
              </span>
            )}
            {warnings.expiration && !errors.expiration && (
              <span id="expiration-warning" className="acm-field-warning">
                {warnings.expiration}
              </span>
            )}
          </div>

          {/* CVV */}
          <div className="acm-field">
            <label htmlFor="cvv" className="acm-label">{MESSAGES.cvv}</label>
            <input
              ref={cvvRef}
              id="cvv"
              name="cvv"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={formData.cvv}
              onChange={(e) => handleInputChange("cvv", e.target.value)}
              onBlur={() => handleBlur("cvv")}
              onPaste={(e) => handlePaste("cvv", e)}
              onKeyDown={(e) => handleKeyDown("cvv", e)}
              className="acm-input"
              placeholder={MESSAGES.cvvPlaceholder}
              disabled={isSubmitting}
              autoComplete="cc-csc"
              data-testid="cvv-input"
              aria-invalid={Boolean(errors.cvv)}
              aria-describedby={errors.cvv ? "cvv-error" : undefined}
            />
            {errors.cvv && (
              <span id="cvv-error" className="acm-field-error" role="alert">
                {errors.cvv}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="acm-actions">
            <button
              type="button"
              onClick={handleClose}
              className="pc-btn pc-btn--ghost"
              disabled={isSubmitting}
              data-testid="add-card-cancel"
            >
              {MESSAGES.cancel}
            </button>
            <button
              type="submit"
              className="pc-btn pc-btn--primary"
              disabled={isSubmitting || !isFormValid}
              data-testid="add-card-submit"
            >
              <span className="acm-btn-content">
                {isSubmitting && <span className="acm-spinner" aria-hidden="true"></span>}
                {isSubmitting ? MESSAGES.saving : MESSAGES.saveCard}
              </span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}