import React, { useEffect, useState } from 'react';
import FormSection from '../../../components/ui/form-section';
import './company-info.css';

export const phoneUtils = {
  format: (value) => {
    const phoneNumber = String(value || '').replace(/\D/g, '').slice(0, 10);
    if (phoneNumber.length === 0) return '';
    if (phoneNumber.length <= 3) return `(${phoneNumber}`;
    if (phoneNumber.length <= 6) return `(${phoneNumber.slice(0,3)}) ${phoneNumber.slice(3)}`;
    return `(${phoneNumber.slice(0,3)}) ${phoneNumber.slice(3,6)}-${phoneNumber.slice(6,10)}`;
  },
  getRawValue: (formattedValue) => String(formattedValue || '').replace(/\D/g, ''),
};

const CompanyInfo = ({
  formData,
  handleInputChange,
  errors = {},
  onSave,
  saving = false,
  message = null,
  isDirty = false,
}) => {
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (isDirty) setJustSaved(false);
  }, [isDirty]);

  const handleSaveClick = async () => {
    const hasErrors = Object.values(errors).some((e) => e && String(e).trim() !== '');
    if (hasErrors || !isDirty) return;
    setJustSaved(true);
    try {
      const ok = (await onSave?.()) ?? true;
      if (!ok) setJustSaved(false);
    } catch {
      setJustSaved(false);
    }
  };

  const handlePhoneChange = (e) => {
    const input = e.target;
    const val = input.value;
    const caret = input.selectionStart;
    const formatted = phoneUtils.format(phoneUtils.getRawValue(val));
    handleInputChange('phone', formatted);

    setTimeout(() => {
      if (input && document.activeElement === input) {
        let pos = caret;
        if (caret <= 1) pos = formatted.length > 0 ? 2 : 0;
        else if (caret === 5) pos = 7;
        else if (caret === 10) pos = 11;
        try { input.setSelectionRange(pos, pos); } catch {}
      }
    }, 0);
  };

  const handlePhonePaste = (e) => {
    e.preventDefault();
    const raw = phoneUtils.getRawValue(e.clipboardData.getData('text') || '');
    handleInputChange('phone', phoneUtils.format(raw));
  };

  const handlePhoneKeyDown = (e) => {
    const allowed = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
    const k = e.key;
    const combo = (e.ctrlKey || e.metaKey) && ['a','c','v','x'].includes(k.toLowerCase());
    if (allowed.includes(k) || combo) return;
    if (!/^[0-9]$/.test(k)) { e.preventDefault(); return; }
    const raw = phoneUtils.getRawValue(e.currentTarget.value);
    if (raw.length >= 10 && e.currentTarget.selectionStart === e.currentTarget.selectionEnd) e.preventDefault();
  };

  const handleEmailChange = (e) => handleInputChange('email', e.target.value);

  const handleZipChange = (e) => {
    const zip = e.target.value.replace(/[^\d-]/g, '');
    let formatted = zip;
    if (zip.length === 6 && !zip.includes('-')) formatted = zip.slice(0, 5) + '-' + zip.slice(5);
    if (formatted.length <= 10) handleInputChange('zipCode', formatted);
  };

  const sanitizeCity = (v) => String(v || '').replace(/[^A-Za-z\s.'-]/g, '');
  const handleCityChange = (e) => handleInputChange('city', sanitizeCity(e.target.value));
  const handleCityPaste = (e) => {
    e.preventDefault();
    handleInputChange('city', sanitizeCity(e.clipboardData.getData('text') || ''));
  };
  const handleLettersKeyDown = (e) => {
    const allowedNav = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
    const combo = (e.ctrlKey || e.metaKey) && ['a','c','v','x'].includes(e.key.toLowerCase());
    if (allowedNav.includes(e.key) || combo) return;
    if (!/^[A-Za-z\s.'-]$/.test(e.key)) e.preventDefault();
  };

  const safe = {
    companyName: '',
    phone: '',
    email: '',
    address: '',
    apt: '',
    city: '',
    state: '',
    zipCode: '',
    ...formData,
  };

  const hasErrors = Object.values(errors).some((e) => e && String(e).trim() !== '');

  return (
    <div className="profile-section">
      <div className="section-header"><h2>Company Information</h2></div>

      <div className="ci-vertical-layout">
        <div className="ci-field">
          <label htmlFor="company-name" className="ci-label">Company Name <span className="ci-required" aria-label="required">*</span></label>
          <input
            id="company-name"
            type="text"
            className={`ci-input ${errors.companyName ? 'ci-input-error' : ''}`}
            value={safe.companyName}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
            placeholder="Enter company name"
            autoComplete="organization"
            aria-required="true"
            aria-invalid={!!errors.companyName}
            aria-describedby={errors.companyName ? 'company-name-error' : undefined}
          />
          {errors.companyName && <span id="company-name-error" className="ci-error-message" role="alert">{errors.companyName}</span>}
        </div>

        <div className="ci-section-divider">Contact</div>

        <div className="ci-field">
          <label htmlFor="phone" className="ci-label">Phone <span className="ci-required" aria-label="required">*</span></label>
          <input
            id="phone"
            type="tel"
            className={`ci-input ${errors.phone ? 'ci-input-error' : ''}`}
            value={safe.phone}
            onChange={handlePhoneChange}
            onPaste={handlePhonePaste}
            onKeyDown={handlePhoneKeyDown}
            placeholder="Enter phone number"
            inputMode="tel"
            autoComplete="tel-national"
            aria-required="true"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
          />
          {errors.phone && <span id="phone-error" className="ci-error-message" role="alert">{errors.phone}</span>}
        </div>

        <div className="ci-field">
          <label htmlFor="email" className="ci-label">Email <span className="ci-required" aria-label="required">*</span></label>
          <input
            id="email"
            type="email"
            className={`ci-input ${errors.email ? 'ci-input-error' : ''}`}
            value={safe.email}
            onChange={handleEmailChange}
            placeholder="Enter email"
            autoComplete="email"
            aria-required="true"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && <span id="email-error" className="ci-error-message" role="alert">{errors.email}</span>}
        </div>

        <div className="ci-section-divider">Business Address</div>

        <div className="ci-field">
          <label htmlFor="street-address" className="ci-label">Street Address <span className="ci-required" aria-label="required">*</span></label>
          <input
            id="street-address"
            type="text"
            className={`ci-input ${errors.address ? 'ci-input-error' : ''}`}
            value={safe.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Enter address"
            autoComplete="address-line1"
            aria-required="true"
            aria-invalid={!!errors.address}
            aria-describedby={errors.address ? 'address-error' : undefined}
          />
          {errors.address && <span id="address-error" className="ci-error-message" role="alert">{errors.address}</span>}
        </div>

        <div className="ci-field">
          <label htmlFor="apt-suite" className="ci-label">Apt / Suite <span className="ci-optional">(optional)</span></label>
          <input
            id="apt-suite"
            type="text"
            className="ci-input"
            value={safe.apt}
            onChange={(e) => handleInputChange('apt', e.target.value)}
            placeholder="Enter apt / suite (optional)"
            autoComplete="address-line2"
          />
        </div>

        <div className="ci-field">
          <label htmlFor="city" className="ci-label">City <span className="ci-required" aria-label="required">*</span></label>
          <input
            id="city"
            type="text"
            className={`ci-input ${errors.city ? 'ci-input-error' : ''}`}
            value={safe.city}
            onChange={handleCityChange}
            onPaste={handleCityPaste}
            onKeyDown={handleLettersKeyDown}
            placeholder="Enter city"
            inputMode="text"
            autoComplete="address-level2"
            aria-required="true"
            aria-invalid={!!errors.city}
            aria-describedby={errors.city ? 'city-error' : undefined}
          />
          {errors.city && <span id="city-error" className="ci-error-message" role="alert">{errors.city}</span>}
        </div>

        <div className="ci-field">
          <label htmlFor="state" className="ci-label">State <span className="ci-required" aria-label="required">*</span></label>
          <div className="ci-select-wrap">
            <select
              id="state"
              className={`ci-select ${errors.state ? 'ci-input-error' : ''}`}
              value={safe.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
              autoComplete="address-level1"
              aria-required="true"
              aria-invalid={!!errors.state}
              aria-describedby={errors.state ? 'state-error' : undefined}
            >
              <option value="" disabled hidden>Select state</option>
              {['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {errors.state && <span id="state-error" className="ci-error-message" role="alert">{errors.state}</span>}
        </div>

        <div className="ci-field">
          <label htmlFor="zip-code" className="ci-label">ZIP Code <span className="ci-required" aria-label="required">*</span></label>
          <input
            id="zip-code"
            type="text"
            className={`ci-input ${errors.zipCode ? 'ci-input-error' : ''}`}
            value={safe.zipCode}
            onChange={handleZipChange}
            placeholder="Enter ZIP code"
            inputMode="numeric"
            maxLength={10}
            autoComplete="postal-code"
            aria-required="true"
            aria-invalid={!!errors.zipCode}
            aria-describedby={errors.zipCode ? 'zip-error' : undefined}
          />
          {errors.zipCode && <span id="zip-error" className="ci-error-message" role="alert">{errors.zipCode}</span>}
        </div>
      </div>

      <div className="section-actions">
        <button
          className={`btn btn-primary ${justSaved ? 'btn-saved' : ''} ${isDirty ? 'is-dirty' : ''}`}
          onClick={handleSaveClick}
          disabled={justSaved || hasErrors || !isDirty || saving}
          aria-live="polite"
        >
          {justSaved ? 'Saved' : saving ? 'Saving…' : 'Save Changes'}
        </button>
        <div className="section-status-container">
          {message?.text && <div className={`section-status ${message.type}`}>{message.text}</div>}
        </div>
      </div>
    </div>
  );
};

export default CompanyInfo;