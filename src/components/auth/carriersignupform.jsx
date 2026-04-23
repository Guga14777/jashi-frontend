// src/components/auth/carriersignupform.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../store/auth-context.jsx';
import './carrier-signup.css';

const PASSWORD_HELP_TEXT = '8+ characters, uppercase, lowercase, number, special character';

const CarrierSignupForm = ({ onSuccess, onSwitchToLogin, showTitle = true, inModal = false }) => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    dotNumber: '',
    mcNumber: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    hasCargoInsurance: false,
    agreeToTerms: false,
  });

  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!inModal) document.getElementById('firstName')?.focus();
  }, [inModal]);

  const isName = (s) => /^[a-zA-ZÀ-ÿ\s'-]+$/.test(s || '');
  const digitsOnly = (s) => (s || '').replace(/\D/g, '');
  const emailOk = (s) => /^\S+@\S+\.\S+$/.test((s || '').trim());
  const passwordValid = (p) =>
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*?_\-]).{8,}$/.test(p || '');

  const validateField = (name, value) => {
    let err = '';
    switch (name) {
      case 'firstName':
        if (!isName(value)) err = 'Enter your first name.';
        break;
      case 'lastName':
        if (!isName(value)) err = 'Enter your last name.';
        break;
      case 'companyName':
        if (!value?.trim()) err = 'Enter your company name.';
        break;
      case 'dotNumber':
        if (value && !/^\d+$/.test(value)) err = 'Digits only.';
        break;
      case 'mcNumber':
        if (!value) err = 'MC number is required.';
        else if (!/^\d+$/.test(value)) err = 'Digits only.';
        break;
      case 'phoneNumber':
        if (digitsOnly(value).length !== 10) err = 'Enter a valid 10-digit phone.';
        break;
      case 'email': {
        const trimmed = (value || '').trim();
        if (!trimmed || !emailOk(trimmed)) err = 'Enter a valid email address.';
        break;
      }
      case 'password':
        if (!value) err = 'Password is required.';
        else if (!passwordValid(value)) err = 'invalid';
        break;
      case 'confirmPassword':
        if (!value) err = 'Please confirm password.';
        else if (value !== form.password) err = "Passwords don't match.";
        break;
      case 'hasCargoInsurance':
        if (!value) err = 'You must certify that your company holds valid cargo insurance.';
        break;
      case 'agreeToTerms':
        if (!value) err = 'You must agree to the Terms & Privacy Policy.';
        break;
      default:
        break;
    }
    setErrors((prev) => ({ ...prev, [name]: err }));
    return !err;
  };

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;

    if (name === 'phoneNumber') {
      const d = digitsOnly(value).slice(0, 10);
      const pretty =
        d.length > 6
          ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
          : d.length > 3
          ? `(${d.slice(0, 3)}) ${d.slice(3)}`
          : d.length > 0
          ? `(${d}`
          : '';
      setForm((s) => ({ ...s, phoneNumber: pretty }));
      if (errors.phoneNumber) validateField('phoneNumber', pretty);
      return;
    }

    if (name === 'dotNumber' || name === 'mcNumber') {
      const d = digitsOnly(value);
      setForm((s) => ({ ...s, [name]: d }));
      if (errors[name]) validateField(name, d);
      return;
    }

    const nextVal = type === 'checkbox' ? checked : value;
    setForm((s) => ({ ...s, [name]: nextVal }));

    if (name === 'email') validateField('email', nextVal);
    if (errors[name] && name !== 'email') validateField(name, nextVal);
  };

  const handleBlur = (e) => {
    const { name, type, checked, value } = e.target;
    setTouched((s) => ({ ...s, [name]: true }));
    validateField(name, type === 'checkbox' ? checked : value);
  };

  const validateForm = () => {
    const fields = Object.keys(form);
    let ok = true;
    fields.forEach((f) => {
      const val = form[f];
      if (!validateField(f, val)) ok = false;
    });
    setTouched(Object.fromEntries(fields.map((f) => [f, true])));
    return ok;
  };

  const canSubmit =
    !isSubmitting &&
    isName(form.firstName) &&
    isName(form.lastName) &&
    form.companyName?.trim() &&
    (!form.dotNumber || /^\d+$/.test(form.dotNumber)) &&
    form.mcNumber &&
    /^\d+$/.test(form.mcNumber) &&
    digitsOnly(form.phoneNumber).length === 10 &&
    emailOk(form.email) &&
    passwordValid(form.password) &&
    form.password === form.confirmPassword &&
    form.hasCargoInsurance &&
    form.agreeToTerms;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, general: '', phoneNumber: '', email: '', password: '' }));

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        companyName: form.companyName.trim(),
        dotNumber: form.dotNumber || '',
        mcNumber: form.mcNumber,
        phone: digitsOnly(form.phoneNumber),
        email: form.email.trim(),
        password: form.password,
        hasCargoInsurance: form.hasCargoInsurance,
        role: 'carrier',
      };

      console.log('📤 [CARRIER SIGNUP] Submitting:', { ...payload, password: '***' });

      const res = await register(payload);

      if (res?.success) {
        console.log('✅ [CARRIER SIGNUP] Success!', { roleAdded: res.roleAdded });
        
        // ⭐ NEW: Show different success message if role was added
        if (res.roleAdded) {
          console.log('🎉 Carrier account added to existing shipper account!');
          // Optional: You can show a toast notification here
        }
        
        onSuccess?.();
        navigate('/carrier-dashboard', { replace: true });
      } else {
        const errorMsg = res?.error || 'Signup failed. Please try again.';
        
        console.log('❌ [CARRIER SIGNUP] Failed:', errorMsg);
        
        // ⭐ UPDATED: Better error handling for multi-role scenarios
        if (errorMsg.toLowerCase().includes('phone number already registered to a different account')) {
          setErrors((s) => ({
            ...s,
            phoneNumber: 'This phone number is registered to a different account',
            general: ''
          }));
          setTouched((s) => ({ ...s, phoneNumber: true }));
        } else if (errorMsg.toLowerCase().includes('phone')) {
          setErrors((s) => ({
            ...s,
            phoneNumber: 'This phone number is already registered',
            general: ''
          }));
          setTouched((s) => ({ ...s, phoneNumber: true }));
        } else if (errorMsg.toLowerCase().includes('email already registered to a different account')) {
          setErrors((s) => ({
            ...s,
            email: 'This email is registered to a different account',
            general: ''
          }));
          setTouched((s) => ({ ...s, email: true }));
        } else if (errorMsg.toLowerCase().includes('email')) {
          setErrors((s) => ({
            ...s,
            email: 'This email is already registered',
            general: ''
          }));
          setTouched((s) => ({ ...s, email: true }));
        } else if (errorMsg.toLowerCase().includes('password')) {
          // ⭐ NEW: Handle password mismatch when adding role
          setErrors((s) => ({
            ...s,
            password: 'Incorrect password for existing account',
            general: ''
          }));
          setTouched((s) => ({ ...s, password: true }));
        } else {
          setErrors((s) => ({ ...s, general: errorMsg }));
        }
      }
    } catch (err) {
      console.error('❌ [CARRIER SIGNUP] Exception:', err);
      const errorMsg = err.response?.data?.error || err.error || 'Unexpected error. Please try again.';
      
      // ⭐ UPDATED: Handle caught errors with field-specific mapping
      if (errorMsg.toLowerCase().includes('phone number already registered to a different account')) {
        setErrors((s) => ({
          ...s,
          phoneNumber: 'This phone number is registered to a different account',
          general: ''
        }));
        setTouched((s) => ({ ...s, phoneNumber: true }));
      } else if (errorMsg.toLowerCase().includes('phone')) {
        setErrors((s) => ({
          ...s,
          phoneNumber: 'This phone number is already registered',
          general: ''
        }));
        setTouched((s) => ({ ...s, phoneNumber: true }));
      } else if (errorMsg.toLowerCase().includes('email already registered to a different account')) {
        setErrors((s) => ({
          ...s,
          email: 'This email is registered to a different account',
          general: ''
        }));
        setTouched((s) => ({ ...s, email: true }));
      } else if (errorMsg.toLowerCase().includes('email')) {
        setErrors((s) => ({
          ...s,
          email: 'This email is already registered',
          general: ''
        }));
        setTouched((s) => ({ ...s, email: true }));
      } else if (errorMsg.toLowerCase().includes('password')) {
        setErrors((s) => ({
          ...s,
          password: 'Incorrect password for existing account',
          general: ''
        }));
        setTouched((s) => ({ ...s, password: true }));
      } else {
        setErrors((s) => ({ ...s, general: errorMsg }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const noShadowStyle = {
    boxShadow: 'none',
    WebkitBoxShadow: 'none',
    MozBoxShadow: 'none',
    filter: 'none',
    backgroundImage: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    appearance: 'none',
  };

  return (
    <div className="simple-login">
      {showTitle && (
        <>
          <h1 className="simple-title">Create Carrier Account</h1>
          <p className="simple-subtitle one-line">Get matched with loads from verified shippers.</p>
        </>
      )}

      <form className="simple-form" onSubmit={handleSubmit} noValidate>
        {errors.general && <div className="signup-error-banner" role="alert">{errors.general}</div>}

        <div className="simple-field">
          <label htmlFor="firstName">First Name</label>
          <input
            id="firstName" name="firstName" type="text" autoComplete="given-name"
            className={touched.firstName && errors.firstName ? 'error' : ''}
            placeholder="Enter first name"
            value={form.firstName}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={!!(touched.firstName && errors.firstName)}
            disabled={isSubmitting}
            style={noShadowStyle}
          />
          {touched.firstName && errors.firstName && <span className="field-error">{errors.firstName}</span>}
        </div>

        <div className="simple-field">
          <label htmlFor="lastName">Last Name</label>
          <input
            id="lastName" name="lastName" type="text" autoComplete="family-name"
            className={touched.lastName && errors.lastName ? 'error' : ''}
            placeholder="Enter last name"
            value={form.lastName}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={!!(touched.lastName && errors.lastName)}
            disabled={isSubmitting}
            style={noShadowStyle}
          />
          {touched.lastName && errors.lastName && <span className="field-error">{errors.lastName}</span>}
        </div>

        <div className="simple-field">
          <label htmlFor="companyName">Company Name</label>
          <input
            id="companyName" name="companyName" type="text" autoComplete="organization"
            className={touched.companyName && errors.companyName ? 'error' : ''}
            placeholder="Enter company name"
            value={form.companyName}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={!!(touched.companyName && errors.companyName)}
            disabled={isSubmitting}
            style={noShadowStyle}
          />
          {touched.companyName && errors.companyName && <span className="field-error">{errors.companyName}</span>}
        </div>

        <div className="simple-field">
          <label htmlFor="dotNumber">DOT Number (Optional)</label>
          <input
            id="dotNumber" name="dotNumber" inputMode="numeric" pattern="[0-9]*"
            className={touched.dotNumber && errors.dotNumber ? 'error' : ''}
            placeholder="Enter DOT number"
            value={form.dotNumber}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={!!(touched.dotNumber && errors.dotNumber)}
            disabled={isSubmitting}
            style={noShadowStyle}
          />
          {touched.dotNumber && errors.dotNumber && <span className="field-error">{errors.dotNumber}</span>}
        </div>

        <div className="simple-field">
          <label htmlFor="mcNumber">MC Number</label>
          <input
            id="mcNumber" name="mcNumber" inputMode="numeric" pattern="[0-9]*"
            className={touched.mcNumber && errors.mcNumber ? 'error' : ''}
            placeholder="Enter MC number"
            value={form.mcNumber}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={!!(touched.mcNumber && errors.mcNumber)}
            disabled={isSubmitting}
            style={noShadowStyle}
          />
          {touched.mcNumber && errors.mcNumber && <span className="field-error">{errors.mcNumber}</span>}
        </div>

        <div className="simple-field">
          <label htmlFor="phoneNumber">Phone</label>
          <input
            id="phoneNumber" name="phoneNumber" type="tel" autoComplete="tel"
            className={touched.phoneNumber && errors.phoneNumber ? 'error' : ''}
            placeholder="Enter phone number"
            value={form.phoneNumber}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={!!(touched.phoneNumber && errors.phoneNumber)}
            disabled={isSubmitting}
            style={noShadowStyle}
          />
          {touched.phoneNumber && errors.phoneNumber && <span className="field-error">{errors.phoneNumber}</span>}
        </div>

        <div className="simple-field">
          <label htmlFor="email">Email</label>
          <input
            id="email" name="email" type="email" autoComplete="email"
            className={touched.email && errors.email ? 'error' : ''}
            placeholder="Enter email address"
            value={form.email}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={!!(touched.email && errors.email)}
            disabled={isSubmitting}
            style={noShadowStyle}
          />
          {touched.email && errors.email && <span className="field-error">{errors.email}</span>}
        </div>

        <div className="simple-field">
          <label htmlFor="password">Password</label>
          <div className="simple-password">
            <input
              id="password" name="password" type={showPw ? 'text' : 'password'} autoComplete="new-password"
              className={touched.password && errors.password === 'invalid' ? 'error' : ''}
              placeholder="Enter password"
              value={form.password}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={!!(touched.password && errors.password)}
              aria-describedby="carrier-password-req"
              disabled={isSubmitting}
              style={noShadowStyle}
            />
            <button
              type="button"
              className="simple-toggle"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              disabled={isSubmitting}
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {touched.password &&
            (errors.password === 'invalid' ? (
              <span id="carrier-password-req" className="field-error">{PASSWORD_HELP_TEXT}</span>
            ) : (
              errors.password && errors.password !== 'invalid' && <span className="field-error">{errors.password}</span>
            ))}
        </div>

        <div className="simple-field">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <div className="simple-password">
            <input
              id="confirmPassword" name="confirmPassword" type={showPw2 ? 'text' : 'password'} autoComplete="new-password"
              className={touched.confirmPassword && errors.confirmPassword ? 'error' : ''}
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={!!(touched.confirmPassword && errors.confirmPassword)}
              disabled={isSubmitting}
              style={noShadowStyle}
            />
            <button
              type="button"
              className="simple-toggle"
              onClick={() => setShowPw2((v) => !v)}
              aria-label={showPw2 ? 'Hide password' : 'Show password'}
              disabled={isSubmitting}
            >
              {showPw2 ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {touched.confirmPassword && errors.confirmPassword && (
            <span className="field-error">{errors.confirmPassword}</span>
          )}
        </div>

        <div className="terms-row" style={{ marginTop: 4 }}>
          <label className="terms-label-click" htmlFor="hasCargoInsurance">
            <input
              type="checkbox" className="checkbox" id="hasCargoInsurance" name="hasCargoInsurance"
              checked={form.hasCargoInsurance}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
            />
            <span className="terms-text">I certify that my company holds valid cargo insurance.</span>
          </label>
          {touched.hasCargoInsurance && errors.hasCargoInsurance && (
            <span className="field-error">{errors.hasCargoInsurance}</span>
          )}
        </div>

        <div className="terms-row">
          <label className="terms-label-click" htmlFor="agreeToTerms">
            <input
              type="checkbox" className="checkbox" id="agreeToTerms" name="agreeToTerms"
              checked={form.agreeToTerms}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
            />
            <span className="terms-text">
              I agree to the{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Terms of Service</a>{' '}
              and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Privacy Policy</a>.
            </span>
          </label>
          {touched.agreeToTerms && errors.agreeToTerms && (
            <span className="field-error">{errors.agreeToTerms}</span>
          )}
        </div>

        <button
          type="submit"
          className={`simple-submit ${isSubmitting ? 'loading' : ''}`}
          disabled={!canSubmit}
          aria-label="Create Account"
        >
          {isSubmitting ? 'Creating...' : 'Create Account'}
        </button>
      </form>

      <div className="simple-footer">
        <p>
          Already have an account?{' '}
          <button type="button" onClick={onSwitchToLogin} disabled={isSubmitting}>
            Log In
          </button>
        </p>
      </div>
    </div>
  );
};

CarrierSignupForm.propTypes = {
  onSuccess: PropTypes.func,
  onSwitchToLogin: PropTypes.func,
  showTitle: PropTypes.bool,
  inModal: PropTypes.bool,
};

export default CarrierSignupForm;