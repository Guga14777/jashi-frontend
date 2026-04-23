import React, { useEffect, useState } from 'react';
import './payout-settings.css';

const PayoutSettings = ({
  formData,
  handleInputChange,
  errors = {},
  onSave,
  saving = false,
  message = null,
  isDirty = false,
}) => {
  const [localErrors, setLocalErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [maskedAccount, setMaskedAccount] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => { if (isDirty) setJustSaved(false); }, [isDirty]);

  const validateRequired = (value) => (!value || value.trim() === '' ? 'This field is required' : '');
  const digitsOnly = (s = '') => s.replace(/\D/g, '');

  const maskAccountNumber = (v) => {
    if (!v || v.length < 4) return v || '';
    const last4 = v.slice(-4);
    return '•'.repeat(Math.max(0, v.length - 4)) + last4;
  };

  const handleFieldChange = (field, rawValue) => {
    setLocalErrors((p) => ({ ...p, [field]: '' }));
    let value = rawValue;
    if (field === 'routingNumber' || field === 'accountNumber') {
      value = digitsOnly(rawValue);
      if (field === 'accountNumber' && maskedAccount) setMaskedAccount(false);
    }
    handleInputChange(field, value);
  };

  const handleFieldBlur = (field, value) => {
    setTouched((p) => ({ ...p, [field]: true }));
    let error = '';
    switch (field) {
      case 'accountHolderFirst':
      case 'accountHolderLast':
      case 'accountType':
      case 'taxStatus':
        error = validateRequired(value);
        break;
      default:
        break;
    }
    if (error) setLocalErrors((p) => ({ ...p, [field]: error }));
  };

  const getFieldStatus = (field) => {
    const all = { ...errors, ...localErrors };
    if (all[field]) return 'error';
    if (touched[field] && !all[field] && formData[field]) return 'valid';
    return '';
  };

  const displayAccountNumber = () =>
    maskedAccount && formData.accountNumber
      ? maskAccountNumber(formData.accountNumber)
      : (formData.accountNumber || '');

  const allErrors = { ...errors, ...localErrors };
  const hasErrors = Object.values(allErrors).some((e) => e && e.trim() !== '');

  const handleSaveClick = async () => {
    if (hasErrors || !isDirty) return;
    setJustSaved(true);
    if (formData.accountNumber && formData.accountNumber.length >= 4) {
      setMaskedAccount(true);
    }
    try {
      const ok = (await onSave?.()) ?? true;
      if (!ok) setJustSaved(false);
    } catch {
      setJustSaved(false);
    }
  };

  return (
    <div className="profile-section">
      <div className="section-header">
        <h2>Payout Settings</h2>
      </div>

      <div className="payout-content">
        <div className="payout-group">
          <h3 className="group-title">Bank Account</h3>

          <div className="form-row two account-holder-vertical">
            <div className="form-group">
              <label htmlFor="accountHolderFirst">First Name <span className="req">*</span></label>
              <input
                id="accountHolderFirst"
                placeholder="First name (legal)"
                value={formData.accountHolderFirst || ''}
                onChange={(e) => handleFieldChange('accountHolderFirst', e.target.value)}
                onBlur={(e) => handleFieldBlur('accountHolderFirst', e.target.value)}
                className={getFieldStatus('accountHolderFirst')}
                autoComplete="given-name"
                disabled={saving}
                aria-required="true"
                aria-invalid={!!allErrors.accountHolderFirst}
              />
              {allErrors.accountHolderFirst && (
                <span className="error-text" role="alert">{allErrors.accountHolderFirst}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="accountHolderLast">Last Name <span className="req">*</span></label>
              <input
                id="accountHolderLast"
                placeholder="Last name (legal)"
                value={formData.accountHolderLast || ''}
                onChange={(e) => handleFieldChange('accountHolderLast', e.target.value)}
                onBlur={(e) => handleFieldBlur('accountHolderLast', e.target.value)}
                className={getFieldStatus('accountHolderLast')}
                autoComplete="family-name"
                disabled={saving}
                aria-required="true"
                aria-invalid={!!allErrors.accountHolderLast}
              />
              {allErrors.accountHolderLast && (
                <span className="error-text" role="alert">{allErrors.accountHolderLast}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="routingNumber">Routing Number <span className="required" aria-label="required">*</span></label>
            <input
              id="routingNumber"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              placeholder="Enter routing number"
              value={formData.routingNumber || ''}
              onChange={(e) => handleFieldChange('routingNumber', e.target.value)}
              onBlur={(e) => handleFieldBlur('routingNumber', e.target.value)}
              className={getFieldStatus('routingNumber')}
              aria-invalid={!!allErrors.routingNumber}
              aria-required="true"
              disabled={saving}
            />
            {allErrors.routingNumber && (
              <span className="error-text" role="alert">{allErrors.routingNumber}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="accountNumber">Account Number <span className="required" aria-label="required">*</span></label>
            <input
              id="accountNumber"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              placeholder="Enter bank account number"
              value={displayAccountNumber()}
              onChange={(e) => handleFieldChange('accountNumber', e.target.value)}
              onBlur={(e) => handleFieldBlur('accountNumber', e.target.value)}
              className={getFieldStatus('accountNumber')}
              aria-invalid={!!allErrors.accountNumber}
              aria-required="true"
              disabled={saving}
            />
            {allErrors.accountNumber && (
              <span className="error-text" role="alert">{allErrors.accountNumber}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="accountType">Account Type <span className="required" aria-label="required">*</span></label>
            <div className="ps-select-wrap">
              <select
                id="accountType"
                value={formData.accountType || ''}
                onChange={(e) => handleFieldChange('accountType', e.target.value)}
                onBlur={(e) => handleFieldBlur('accountType', e.target.value)}
                className={`ps-select ${getFieldStatus('accountType')}`}
                aria-invalid={!!allErrors.accountType}
                aria-required="true"
                disabled={saving}
              >
                <option value="">Select account type</option>
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            </div>
            {allErrors.accountType && (
              <span className="error-text" role="alert">{allErrors.accountType}</span>
            )}
          </div>
        </div>

        <div className="payout-group">
          <h3 className="group-title">Payout Preferences</h3>

          <div className="form-group">
            <label htmlFor="taxStatus">Tax Status <span className="required" aria-label="required">*</span></label>
            <div className="ps-select-wrap">
              <select
                id="taxStatus"
                value={formData.taxStatus || ''}
                onChange={(e) => handleFieldChange('taxStatus', e.target.value)}
                onBlur={(e) => handleFieldBlur('taxStatus', e.target.value)}
                className={`ps-select ${getFieldStatus('taxStatus')}`}
                aria-invalid={!!allErrors.taxStatus}
                aria-required="true"
                disabled={saving}
              >
                <option value="">Select tax status</option>
                <option value="llc">LLC</option>
                <option value="corporation">Corporation</option>
                <option value="sole_proprietor">Sole Proprietor</option>
                <option value="partnership">Partnership</option>
                <option value="other">Other</option>
              </select>
            </div>
            {allErrors.taxStatus && (
              <span className="error-text" role="alert">{allErrors.taxStatus}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="payoutCadence">Payout Cadence</label>
            <div className="ps-select-wrap">
              <select
                id="payoutCadence"
                value={formData.payoutCadence || ''}
                onChange={(e) => handleFieldChange('payoutCadence', e.target.value)}
                className="ps-select"
                disabled={saving}
              >
                <option value="">Select cadence</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly (Friday)</option>
                <option value="biweekly">Bi-weekly (Friday)</option>
                <option value="monthly">Monthly (last business day)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="section-actions">
        <button
          className={`btn btn-primary ${justSaved ? 'btn-saved' : ''} ${isDirty ? 'is-dirty' : ''}`}
          onClick={handleSaveClick}
          disabled={justSaved || hasErrors || !isDirty}
          aria-live="polite"
        >
          {justSaved ? 'Saved' : 'Save Changes'}
        </button>
        <div className="section-status-container">
          {message?.text && <div className={`section-status ${message.type}`}>{message.text}</div>}
        </div>
      </div>
    </div>
  );
};

export default PayoutSettings;