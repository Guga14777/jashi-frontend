import React, { useEffect, useMemo, useState } from 'react';
import './contacts.css';
import { phoneUtils } from './company-info.jsx';

const roleOptions = [
  { value: '', label: 'Select role' },
  { value: 'Owner', label: 'Owner' },
  { value: 'Dispatcher', label: 'Dispatcher' },
  { value: 'Driver', label: 'Driver' },
  { value: 'Accounting', label: 'Accounting' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Other', label: 'Other' },
];

const emailOk = (v = '') => /^\S+@\S+\.\S+$/.test(String(v).trim());
const digits = (v = '') => String(v).replace(/\D/g, '');

export default function Contacts({
  formData,
  handleInputChange,
  errors = {},
  onSave,
  saving = false,
  isDirty = false,
  message = null,
}) {
  const [localErrors, setLocalErrors] = useState({});
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => { if (isDirty) setJustSaved(false); }, [isDirty]);

  const validate = (fd) => {
    const e = {};
    if (!fd.primaryFirstName?.trim()) e.primaryFirstName = 'First name is required';
    if (!fd.primaryLastName?.trim()) e.primaryLastName = 'Last name is required';
    if (!fd.primaryContactRole?.trim()) e.primaryContactRole = 'Role is required';
    if (!fd.primaryContactPhone?.trim()) e.primaryContactPhone = 'Phone is required';
    else if (digits(fd.primaryContactPhone).length !== 10) e.primaryContactPhone = 'Phone must be 10 digits';
    if (!fd.primaryContactEmail?.trim() || !emailOk(fd.primaryContactEmail)) e.primaryContactEmail = 'Valid email is required';

    if (!fd.dispatchUsePrimary) {
      const anyDispatch = fd.dispatchFirstName?.trim() || fd.dispatchLastName?.trim() || fd.dispatchContactRole?.trim() || fd.dispatchContactPhone?.trim() || fd.dispatchContactEmail?.trim();
      if (anyDispatch) {
        if (!fd.dispatchFirstName?.trim()) e.dispatchFirstName = 'First name is required';
        if (!fd.dispatchLastName?.trim()) e.dispatchLastName = 'Last name is required';
        if (!fd.dispatchContactRole?.trim()) e.dispatchContactRole = 'Role is required';
        if (!fd.dispatchContactPhone?.trim()) e.dispatchContactPhone = 'Phone is required';
        else if (digits(fd.dispatchContactPhone).length !== 10) e.dispatchContactPhone = 'Phone must be 10 digits';
        if (!fd.dispatchContactEmail?.trim() || !emailOk(fd.dispatchContactEmail)) e.dispatchContactEmail = 'Valid email is required';
      }
    }
    return e;
  };

  const mergedErrors = useMemo(() => ({ ...errors, ...localErrors }), [errors, localErrors]);
  const hasErrors = useMemo(() => Object.values(mergedErrors).some((e) => e && String(e).trim() !== ''), [mergedErrors]);

  const onFieldChange = (field, value) => {
    setLocalErrors((p) => ({ ...p, [field]: '' }));
    handleInputChange(field, value);
  };

  const handlePhoneChange = (field) => (e) => {
    const input = e.target;
    const caret = input.selectionStart;
    const formatted = phoneUtils.format(phoneUtils.getRawValue(input.value));
    onFieldChange(field, formatted);
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

  const handlePhonePaste = (field) => (e) => {
    e.preventDefault();
    const raw = phoneUtils.getRawValue(e.clipboardData.getData('text') || '');
    onFieldChange(field, phoneUtils.format(raw));
  };

  const handlePhoneKeyDown = (field) => (e) => {
    const k = e.key;
    const allow = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    const combo = (e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(k.toLowerCase());
    if (allow.includes(k) || combo) return;
    if (!/^[0-9]$/.test(k)) { e.preventDefault(); return; }
    const raw = phoneUtils.getRawValue(e.currentTarget.value);
    if (raw.length >= 10 && e.currentTarget.selectionStart === e.currentTarget.selectionEnd) e.preventDefault();
  };

  const toggleUsePrimary = (checked) => {
    onFieldChange('dispatchUsePrimary', checked);
    if (checked) {
      onFieldChange('dispatchFirstName', '');
      onFieldChange('dispatchLastName', '');
      onFieldChange('dispatchContactRole', '');
      onFieldChange('dispatchContactPhone', '');
      onFieldChange('dispatchContactEmail', '');
    }
  };

  const handleSaveClick = async () => {
    const e = validate(formData);
    setLocalErrors(e);
    if (Object.values(e).some(Boolean)) return;
    if (!isDirty) return;
    setJustSaved(true);
    try {
      const ok = (await onSave?.()) ?? true;
      if (!ok) setJustSaved(false);
    } catch {
      setJustSaved(false);
    }
  };

  return (
    <div className="profile-section">
      <div className="section-header"><h2>Contacts</h2></div>

      <div className="ct-grid">
        <div className="ct-card">
          <div className="ct-card-title">Primary Contact</div>
          <div className="ct-field">
            <label htmlFor="primaryFirstName">First name <span className="ct-req">*</span></label>
            <input id="primaryFirstName" type="text" placeholder="Enter first name" value={formData.primaryFirstName || ''} onChange={(e) => onFieldChange('primaryFirstName', e.target.value)} className={mergedErrors.primaryFirstName ? 'ct-input ct-error' : 'ct-input'} aria-invalid={!!mergedErrors.primaryFirstName} />
            {mergedErrors.primaryFirstName && <span className="ct-error-text">{mergedErrors.primaryFirstName}</span>}
          </div>
          <div className="ct-field">
            <label htmlFor="primaryLastName">Last name <span className="ct-req">*</span></label>
            <input id="primaryLastName" type="text" placeholder="Enter last name" value={formData.primaryLastName || ''} onChange={(e) => onFieldChange('primaryLastName', e.target.value)} className={mergedErrors.primaryLastName ? 'ct-input ct-error' : 'ct-input'} aria-invalid={!!mergedErrors.primaryLastName} />
            {mergedErrors.primaryLastName && <span className="ct-error-text">{mergedErrors.primaryLastName}</span>}
          </div>
          <div className="ct-field">
            <label htmlFor="primaryContactRole">Role <span className="ct-req">*</span></label>
            <div className="ct-select-wrap">
              <select id="primaryContactRole" value={formData.primaryContactRole || ''} onChange={(e) => onFieldChange('primaryContactRole', e.target.value)} className={mergedErrors.primaryContactRole ? 'ct-select ct-error' : 'ct-select'} aria-invalid={!!mergedErrors.primaryContactRole}>
                {roleOptions.map((o) => <option key={o.value} value={o.value} disabled={o.value === ''}>{o.label}</option>)}
              </select>
            </div>
            {mergedErrors.primaryContactRole && <span className="ct-error-text">{mergedErrors.primaryContactRole}</span>}
          </div>
          <div className="ct-field">
            <label htmlFor="primaryContactPhone">Phone <span className="ct-req">*</span></label>
            <input id="primaryContactPhone" type="tel" placeholder="(123) 456-7890" value={formData.primaryContactPhone || ''} onChange={handlePhoneChange('primaryContactPhone')} onPaste={handlePhonePaste('primaryContactPhone')} onKeyDown={handlePhoneKeyDown('primaryContactPhone')} className={mergedErrors.primaryContactPhone ? 'ct-input ct-error' : 'ct-input'} inputMode="tel" autoComplete="tel-national" aria-invalid={!!mergedErrors.primaryContactPhone} />
            {mergedErrors.primaryContactPhone && <span className="ct-error-text">{mergedErrors.primaryContactPhone}</span>}
          </div>
          <div className="ct-field">
            <label htmlFor="primaryContactEmail">Email <span className="ct-req">*</span></label>
            <input id="primaryContactEmail" type="email" placeholder="name@gmail.com" value={formData.primaryContactEmail || ''} onChange={(e) => onFieldChange('primaryContactEmail', e.target.value)} className={mergedErrors.primaryContactEmail ? 'ct-input ct-error' : 'ct-input'} autoComplete="email" aria-invalid={!!mergedErrors.primaryContactEmail} />
            {mergedErrors.primaryContactEmail && <span className="ct-error-text">{mergedErrors.primaryContactEmail}</span>}
          </div>
        </div>

        <div className="ct-card">
          <div className="ct-card-title ct-title-row">
            <span>Dispatch Contact</span>
            <label className="ct-checkbox">
              <input type="checkbox" checked={!!formData.dispatchUsePrimary} onChange={(e) => toggleUsePrimary(e.target.checked)} />
              <span>Use Primary Contact</span>
            </label>
          </div>
          <div className={`ct-muted ${formData.dispatchUsePrimary ? 'show' : ''}`}>Using primary contact details.</div>
          <fieldset className="ct-fieldset" disabled={!!formData.dispatchUsePrimary} aria-disabled={!!formData.dispatchUsePrimary}>
            <div className="ct-field">
              <label htmlFor="dispatchFirstName">First name</label>
              <input id="dispatchFirstName" type="text" placeholder="Enter first name" value={formData.dispatchFirstName || ''} onChange={(e) => onFieldChange('dispatchFirstName', e.target.value)} className={mergedErrors.dispatchFirstName ? 'ct-input ct-error' : 'ct-input'} aria-invalid={!!mergedErrors.dispatchFirstName} />
              {mergedErrors.dispatchFirstName && <span className="ct-error-text">{mergedErrors.dispatchFirstName}</span>}
            </div>
            <div className="ct-field">
              <label htmlFor="dispatchLastName">Last name</label>
              <input id="dispatchLastName" type="text" placeholder="Enter last name" value={formData.dispatchLastName || ''} onChange={(e) => onFieldChange('dispatchLastName', e.target.value)} className={mergedErrors.dispatchLastName ? 'ct-input ct-error' : 'ct-input'} aria-invalid={!!mergedErrors.dispatchLastName} />
              {mergedErrors.dispatchLastName && <span className="ct-error-text">{mergedErrors.dispatchLastName}</span>}
            </div>
            <div className="ct-field">
              <label htmlFor="dispatchContactRole">Role</label>
              <div className="ct-select-wrap">
                <select id="dispatchContactRole" value={formData.dispatchContactRole || ''} onChange={(e) => onFieldChange('dispatchContactRole', e.target.value)} className={mergedErrors.dispatchContactRole ? 'ct-select ct-error' : 'ct-select'} aria-invalid={!!mergedErrors.dispatchContactRole}>
                  {roleOptions.map((o) => <option key={o.value} value={o.value} disabled={o.value === ''}>{o.label}</option>)}
                </select>
              </div>
              {mergedErrors.dispatchContactRole && <span className="ct-error-text">{mergedErrors.dispatchContactRole}</span>}
            </div>
            <div className="ct-field">
              <label htmlFor="dispatchContactPhone">Phone</label>
              <input id="dispatchContactPhone" type="tel" placeholder="(123) 456-7890" value={formData.dispatchContactPhone || ''} onChange={handlePhoneChange('dispatchContactPhone')} onPaste={handlePhonePaste('dispatchContactPhone')} onKeyDown={handlePhoneKeyDown('dispatchContactPhone')} className={mergedErrors.dispatchContactPhone ? 'ct-input ct-error' : 'ct-input'} inputMode="tel" autoComplete="tel-national" aria-invalid={!!mergedErrors.dispatchContactPhone} />
              {mergedErrors.dispatchContactPhone && <span className="ct-error-text">{mergedErrors.dispatchContactPhone}</span>}
            </div>
            <div className="ct-field">
              <label htmlFor="dispatchContactEmail">Email</label>
              <input id="dispatchContactEmail" type="email" placeholder="name@gmail.com" value={formData.dispatchContactEmail || ''} onChange={(e) => onFieldChange('dispatchContactEmail', e.target.value)} className={mergedErrors.dispatchContactEmail ? 'ct-input ct-error' : 'ct-input'} autoComplete="email" aria-invalid={!!mergedErrors.dispatchContactEmail} />
              {mergedErrors.dispatchContactEmail && <span className="ct-error-text">{mergedErrors.dispatchContactEmail}</span>}
            </div>
          </fieldset>
        </div>
      </div>

      <div className="section-actions ct-actions">
        <button className={`btn btn-primary ${justSaved ? 'btn-saved' : ''} ${isDirty ? 'is-dirty' : ''}`} onClick={handleSaveClick} disabled={justSaved || hasErrors || !isDirty || saving} aria-live="polite">
          {justSaved ? 'Saved' : saving ? 'Saving…' : 'Save Changes'}
        </button>
        <div className="section-status-container">
          {message?.text && <div className={`section-status ${message.type}`}>{message.text}</div>}
        </div>
      </div>
    </div>
  );
}