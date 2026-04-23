import React, { useRef, useState, useEffect } from 'react';
import './input-otp.css';

/**
 * OTP Input Component
 * @param {Object} props
 * @param {number} props.length - Number of OTP digits (default: 6)
 * @param {Function} props.onChange - Callback with complete OTP value
 * @param {Function} props.onComplete - Callback when all digits are filled
 * @param {string} props.value - Controlled value
 * @param {boolean} props.disabled - Disable all inputs
 * @param {boolean} props.autoFocus - Auto-focus first input
 * @param {string} props.error - Error message to display
 * @param {string} props.className - Additional CSS classes
 */
const InputOTP = ({
  length = 6,
  onChange,
  onComplete,
  value = '',
  disabled = false,
  autoFocus = true,
  error = '',
  className = ''
}) => {
  const [otp, setOtp] = useState(new Array(length).fill(''));
  const inputRefs = useRef([]);

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Sync with external value prop
  useEffect(() => {
    if (value) {
      const valueArray = value.split('').slice(0, length);
      const newOtp = new Array(length).fill('');
      valueArray.forEach((digit, index) => {
        newOtp[index] = digit;
      });
      setOtp(newOtp);
    }
  }, [value, length]);

  // Auto-focus first input
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (element, index) => {
    const value = element.value;
    
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Take only last digit if multiple
    setOtp(newOtp);

    // Call onChange with the complete value
    const otpValue = newOtp.join('');
    if (onChange) {
      onChange(otpValue);
    }

    // Move to next input if current is filled
    if (value && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }

    // Call onComplete when all fields are filled
    if (otpValue.length === length && onComplete) {
      onComplete(otpValue);
    }
  };

  const handleKeyDown = (e, index) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newOtp = [...otp];
      
      if (otp[index]) {
        // Clear current field
        newOtp[index] = '';
        setOtp(newOtp);
        if (onChange) onChange(newOtp.join(''));
      } else if (index > 0) {
        // Move to previous field and clear it
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1].focus();
        if (onChange) onChange(newOtp.join(''));
      }
    }
    
    // Handle arrow keys
    else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1].focus();
    }
    else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }
    
    // Handle Enter key
    else if (e.key === 'Enter') {
      const otpValue = otp.join('');
      if (otpValue.length === length && onComplete) {
        onComplete(otpValue);
      }
    }
  };

  const handleFocus = (e) => {
    e.target.select();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').slice(0, length);
    
    // Only allow digits
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = new Array(length).fill('');
    pastedData.split('').forEach((digit, index) => {
      if (index < length) {
        newOtp[index] = digit;
      }
    });
    
    setOtp(newOtp);
    
    // Focus last filled input or last input if all filled
    const lastFilledIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[lastFilledIndex].focus();
    
    // Call onChange and onComplete
    const otpValue = newOtp.join('');
    if (onChange) onChange(otpValue);
    if (otpValue.length === length && onComplete) {
      onComplete(otpValue);
    }
  };

  const handleClick = (index) => {
    // Select the content when clicking on input
    inputRefs.current[index].select();
  };

  return (
    <div className={`input-otp-container ${className}`}>
      <div className="input-otp-wrapper">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="\d{1}"
            maxLength="1"
            value={digit}
            onChange={(e) => handleChange(e.target, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onFocus={handleFocus}
            onPaste={handlePaste}
            onClick={() => handleClick(index)}
            className={`input-otp-field ${digit ? 'filled' : ''} ${error ? 'error' : ''}`}
            disabled={disabled}
            autoComplete="one-time-code"
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>
      {error && <div className="input-otp-error">{error}</div>}
    </div>
  );
};

export default InputOTP;