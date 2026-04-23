// src/components/auth/customersignupform.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../store/auth-context";
import "./customer-signup.css";

const PASSWORD_HELP_TEXT =
  "8+ characters, uppercase, lowercase, number, special character";

const CustomerSignupForm = ({
  onSuccess,
  onSwitchToLogin,
  showTitle = true,
  inModal = false,
}) => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });

  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!inModal) {
      document.getElementById("firstName")?.focus();
    }
  }, [inModal]);

  const isValidName = (str) => /^[a-zA-ZÀ-ÿ\s'-]+$/.test(str || "");
  const extractDigits = (str) => (str || "").replace(/\D/g, "");
  const isValidEmail = (str) => /^\S+@\S+\.\S+$/.test((str || "").trim());
  const isValidPassword = (pwd) =>
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*?_\-]).{8,}$/.test(pwd || "");

  const validateField = (name, value) => {
    let error = "";

    switch (name) {
      case "firstName":
        if (!isValidName(value)) error = "Enter your first name.";
        break;
      case "lastName":
        if (!isValidName(value)) error = "Enter your last name.";
        break;
      case "phoneNumber":
        if (extractDigits(value).length !== 10)
          error = "Enter a valid 10-digit phone.";
        break;
      case "email":
        if (!isValidEmail(value)) error = "Enter a valid email address.";
        break;
      case "password":
        if (!value) error = "Password is required.";
        else if (!isValidPassword(value)) error = "invalid";
        break;
      case "confirmPassword":
        if (!value) error = "Please confirm password.";
        else if (value !== formData.password) error = "Passwords don't match.";
        break;
      case "agreeToTerms":
        if (!value) error = "You must agree to Terms & Privacy Policy.";
        break;
      default:
        break;
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
    return !error;
  };

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;

    if (name === "phoneNumber") {
      const digits = extractDigits(value).slice(0, 10);
      const formatted =
        digits.length > 6
          ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
          : digits.length > 3
          ? `(${digits.slice(0, 3)}) ${digits.slice(3)}`
          : digits.length > 0
          ? `(${digits}`
          : "";
      setFormData((prev) => ({ ...prev, phoneNumber: formatted }));
      if (errors.phoneNumber) validateField("phoneNumber", formatted);
      return;
    }

    const nextValue = type === "checkbox" ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: nextValue }));

    if (name === "email") validateField("email", nextValue);
    if (errors[name] && name !== "email") validateField(name, nextValue);
  };

  const handleBlur = (e) => {
    const { name, type, checked, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, type === "checkbox" ? checked : value);
  };

  const validateForm = () => {
    const fields = Object.keys(formData);
    let ok = true;
    fields.forEach((field) => {
      if (!validateField(field, formData[field])) ok = false;
    });
    setTouched(Object.fromEntries(fields.map((f) => [f, true])));
    return ok;
  };

  const canSubmit =
    !isSubmitting &&
    isValidName(formData.firstName) &&
    isValidName(formData.lastName) &&
    extractDigits(formData.phoneNumber).length === 10 &&
    isValidEmail(formData.email) &&
    isValidPassword(formData.password) &&
    formData.password === formData.confirmPassword &&
    formData.agreeToTerms;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, general: "", phoneNumber: "", email: "" }));

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: extractDigits(formData.phoneNumber),
        email: formData.email.trim(),
        password: formData.password,
        role: "customer",
      };

      console.log('📤 [CUSTOMER SIGNUP] Submitting:', { ...payload, password: '***' });

      const result = await register(payload);

      if (result?.success) {
        console.log('✅ [CUSTOMER SIGNUP] Success!', { roleAdded: result.roleAdded });
        
        // ⭐ NEW: Show different success message if role was added
        if (result.roleAdded) {
          console.log('🎉 Shipper account added to existing carrier account!');
          // Optional: You can show a toast notification here
        }
        
        onSuccess?.();
        if (!inModal) {
          navigate("/dashboard", { replace: true });
        }
      } else {
        const errorMsg = result?.error || "Signup failed. Please try again.";
        
        console.log('❌ [CUSTOMER SIGNUP] Failed:', errorMsg);
        
        // ⭐ UPDATED: Better error handling for multi-role scenarios
        if (errorMsg.toLowerCase().includes('phone number already registered to a different account')) {
          setErrors((prev) => ({
            ...prev,
            phoneNumber: 'This phone number is registered to a different account',
            general: ''
          }));
          setTouched((prev) => ({ ...prev, phoneNumber: true }));
        } else if (errorMsg.toLowerCase().includes('phone')) {
          setErrors((prev) => ({
            ...prev,
            phoneNumber: 'This phone number is already registered',
            general: ''
          }));
          setTouched((prev) => ({ ...prev, phoneNumber: true }));
        } else if (errorMsg.toLowerCase().includes('email already registered to a different account')) {
          setErrors((prev) => ({
            ...prev,
            email: 'This email is registered to a different account',
            general: ''
          }));
          setTouched((prev) => ({ ...prev, email: true }));
        } else if (errorMsg.toLowerCase().includes('email')) {
          setErrors((prev) => ({
            ...prev,
            email: 'This email is already registered',
            general: ''
          }));
          setTouched((prev) => ({ ...prev, email: true }));
        } else if (errorMsg.toLowerCase().includes('password')) {
          // ⭐ NEW: Handle password mismatch when adding role
          setErrors((prev) => ({
            ...prev,
            password: 'Incorrect password for existing account',
            general: ''
          }));
          setTouched((prev) => ({ ...prev, password: true }));
        } else {
          setErrors((prev) => ({
            ...prev,
            general: errorMsg
          }));
        }
      }
    } catch (err) {
      console.error('❌ [CUSTOMER SIGNUP] Exception:', err);
      const errorMsg = err.response?.data?.error || err.error || 'Unexpected error. Please try again.';
      
      // ⭐ UPDATED: Handle caught errors with field-specific mapping
      if (errorMsg.toLowerCase().includes('phone number already registered to a different account')) {
        setErrors((prev) => ({
          ...prev,
          phoneNumber: 'This phone number is registered to a different account',
          general: ''
        }));
        setTouched((prev) => ({ ...prev, phoneNumber: true }));
      } else if (errorMsg.toLowerCase().includes('phone')) {
        setErrors((prev) => ({
          ...prev,
          phoneNumber: 'This phone number is already registered',
          general: ''
        }));
        setTouched((prev) => ({ ...prev, phoneNumber: true }));
      } else if (errorMsg.toLowerCase().includes('email already registered to a different account')) {
        setErrors((prev) => ({
          ...prev,
          email: 'This email is registered to a different account',
          general: ''
        }));
        setTouched((prev) => ({ ...prev, email: true }));
      } else if (errorMsg.toLowerCase().includes('email')) {
        setErrors((prev) => ({
          ...prev,
          email: 'This email is already registered',
          general: ''
        }));
        setTouched((prev) => ({ ...prev, email: true }));
      } else if (errorMsg.toLowerCase().includes('password')) {
        setErrors((prev) => ({
          ...prev,
          password: 'Incorrect password for existing account',
          general: ''
        }));
        setTouched((prev) => ({ ...prev, password: true }));
      } else {
        setErrors((prev) => ({
          ...prev,
          general: errorMsg
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const noShadowStyle = {
    boxShadow: "none",
    WebkitBoxShadow: "none",
    MozBoxShadow: "none",
    filter: "none",
    backgroundImage: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    appearance: "none",
  };

  return (
    <div className="simple-login">
      {showTitle && (
        <>
          <h1 className="simple-title">Create Shipper Account</h1>
          <p className="simple-subtitle one-line">
            Post your shipment and get connected with trusted carriers instantly.
          </p>
        </>
      )}

      <form className="simple-form" onSubmit={handleSubmit} noValidate>
        {errors.general && (
          <div className="signup-error-banner" role="alert">
            {errors.general}
          </div>
        )}

        <div className="simple-field">
          <label htmlFor="firstName">First Name</label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            className={touched.firstName && errors.firstName ? "error" : ""}
            placeholder="Enter first name"
            value={formData.firstName}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isSubmitting}
            aria-invalid={!!(touched.firstName && errors.firstName)}
            style={noShadowStyle}
          />
          {touched.firstName && errors.firstName && (
            <span className="field-error">{errors.firstName}</span>
          )}
        </div>

        <div className="simple-field">
          <label htmlFor="lastName">Last Name</label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            className={touched.lastName && errors.lastName ? "error" : ""}
            placeholder="Enter last name"
            value={formData.lastName}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isSubmitting}
            aria-invalid={!!(touched.lastName && errors.lastName)}
            style={noShadowStyle}
          />
          {touched.lastName && errors.lastName && (
            <span className="field-error">{errors.lastName}</span>
          )}
        </div>

        <div className="simple-field">
          <label htmlFor="phoneNumber">Phone</label>
          <input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            className={touched.phoneNumber && errors.phoneNumber ? "error" : ""}
            placeholder="Enter phone number"
            value={formData.phoneNumber}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isSubmitting}
            aria-invalid={!!(touched.phoneNumber && errors.phoneNumber)}
            style={noShadowStyle}
          />
          {touched.phoneNumber && errors.phoneNumber && (
            <span className="field-error">{errors.phoneNumber}</span>
          )}
        </div>

        <div className="simple-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            className={touched.email && errors.email ? "error" : ""}
            placeholder="Enter email address"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isSubmitting}
            aria-invalid={!!(touched.email && errors.email)}
            style={noShadowStyle}
          />
          {touched.email && errors.email && (
            <span className="field-error">{errors.email}</span>
          )}
        </div>

        <div className="simple-field">
          <label htmlFor="password">Password</label>
          <div className="simple-password">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              className={touched.password && errors.password === "invalid" ? "error" : ""}
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
              aria-invalid={!!(touched.password && errors.password)}
              aria-describedby="password-requirements"
              style={noShadowStyle}
            />
            <button
              type="button"
              className="simple-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              disabled={isSubmitting}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {touched.password && errors.password === "invalid" && (
            <span id="password-requirements" className="field-error" aria-live="polite">
              {PASSWORD_HELP_TEXT}
            </span>
          )}
          {touched.password && errors.password && errors.password !== "invalid" && (
            <span className="field-error">{errors.password}</span>
          )}
        </div>

        <div className="simple-field">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <div className="simple-password">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              className={touched.confirmPassword && errors.confirmPassword ? "error" : ""}
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
              aria-invalid={!!(touched.confirmPassword && errors.confirmPassword)}
              style={noShadowStyle}
            />
            <button
              type="button"
              className="simple-toggle"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              disabled={isSubmitting}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {touched.confirmPassword && errors.confirmPassword && (
            <span className="field-error">{errors.confirmPassword}</span>
          )}
        </div>

        <div className="terms-row">
          <label className="terms-label-click" htmlFor="agreeToTerms">
            <input
              type="checkbox"
              className="checkbox"
              id="agreeToTerms"
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
            />
            <span className="terms-text">
              I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Privacy Policy</a>.
            </span>
          </label>
        </div>
        {touched.agreeToTerms && errors.agreeToTerms && (
          <span className="field-error">{errors.agreeToTerms}</span>
        )}

        <button
          type="submit"
          className={`simple-submit ${isSubmitting ? "loading" : ""}`}
          disabled={!canSubmit}
          aria-label="Create Account"
        >
          {isSubmitting ? "Creating..." : "Create Account"}
        </button>

        {inModal && onSwitchToLogin && (
          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
            <span style={{ color: '#666' }}>Already have an account? </span>
            <button
              type="button"
              onClick={onSwitchToLogin}
              disabled={isSubmitting}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563EB',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
                font: 'inherit',
                fontSize: '14px',
              }}
            >
              Log in
            </button>
          </div>
        )}
      </form>

      {!inModal && (
        <div className="simple-footer">
          <p>
            Already have an account?{" "}
            <button type="button" onClick={onSwitchToLogin} disabled={isSubmitting}>
              Log In
            </button>
          </p>
        </div>
      )}
    </div>
  );
};

CustomerSignupForm.propTypes = {
  onSuccess: PropTypes.func,
  onSwitchToLogin: PropTypes.func,
  showTitle: PropTypes.bool,
  inModal: PropTypes.bool,
};

export default CustomerSignupForm;