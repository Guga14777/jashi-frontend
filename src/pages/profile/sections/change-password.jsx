import React, { useState } from 'react';
import './change-password.css';

export default function ChangePasswordSection() {
  const [password, setPassword] = useState({ new: '', confirm: '' });
  const [touched, setTouched] = useState({ new: false, confirm: false });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const validatePassword = (pwd) => {
    const okLen = pwd.length >= 8;
    const up = /[A-Z]/.test(pwd);
    const lo = /[a-z]/.test(pwd);
    const num = /\d/.test(pwd);
    const sp = /[^A-Za-z0-9]/.test(pwd);
    return okLen && up && lo && num && sp;
  };

  const handleChange = (field, value) => {
    setPassword((p) => ({ ...p, [field]: value }));
    if (field === 'new' && touched.new) {
      setErrors((e) => ({ ...e, new: validatePassword(value) ? '' : 'Must be 8+ chars with uppercase, lowercase, number, and special character' }));
    }
    if (field === 'confirm' && touched.confirm) {
      setErrors((e) => ({ ...e, confirm: value === password.new ? '' : 'Passwords do not match' }));
    }
  };

  const handleBlur = (field) => {
    setTouched((t) => ({ ...t, [field]: true }));
    if (field === 'new') {
      setErrors((e) => ({ ...e, new: validatePassword(password.new) ? '' : 'Must be 8+ chars with uppercase, lowercase, number, and special character' }));
    }
    if (field === 'confirm') {
      setErrors((e) => ({ ...e, confirm: password.confirm === password.new ? '' : 'Passwords do not match' }));
    }
  };

  const handleSaveClick = async () => {
    const nextErrors = {};
    if (!validatePassword(password.new)) {
      nextErrors.new = 'Must be 8+ chars with uppercase, lowercase, number, and special character';
    }
    if (password.confirm !== password.new) {
      nextErrors.confirm = 'Passwords do not match';
    }
    if (Object.keys(nextErrors).length) {
      setTouched({ new: true, confirm: true });
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    setJustSaved(false);
    
    try {
      // TODO: Call your actual API here
      // const res = await updatePassword(password.new);
      
      // INSTANT feedback - NO 800ms delay
      setJustSaved(true);
      setPassword({ new: '', confirm: '' });
      setTouched({ new: false, confirm: false });
      setErrors({});
      
      setTimeout(() => setJustSaved(false), 2500);
    } catch (err) {
      console.error('Password change failed:', err);
      setSaving(false);
    } finally {
      setSaving(false);
    }
  };

  const canSave =
    password.new.length > 0 &&
    password.confirm.length > 0 &&
    validatePassword(password.new) &&
    password.new === password.confirm &&
    !saving;

  return (
    <div className="profile-section change-password-section">
      <div className="section-header"><h2>Change Password</h2></div>

      <div className="form-vertical">
        <div className="form-group">
          <label htmlFor="newPassword">New Password</label>
          <input
            id="newPassword"
            type="password"
            placeholder="Enter new password"
            value={password.new}
            onChange={(e) => handleChange('new', e.target.value)}
            onBlur={() => handleBlur('new')}
            className={errors.new ? 'error' : ''}
            disabled={saving}
          />
          <div className="field-feedback" aria-live="polite" role="status">
            {errors.new ? (
              <span className="field-error">{errors.new}</span>
            ) : touched.new && password.new ? (
              <span className="field-note">Strong password ✔️</span>
            ) : (
              <span className="field-note">&nbsp;</span>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Re-enter password"
            value={password.confirm}
            onChange={(e) => handleChange('confirm', e.target.value)}
            onBlur={() => handleBlur('confirm')}
            className={errors.confirm ? 'error' : ''}
            disabled={saving}
          />
          <div className="field-feedback" aria-live="polite" role="status">
            {errors.confirm ? (
              <span className="field-error">{errors.confirm}</span>
            ) : (
              <span className="field-note">&nbsp;</span>
            )}
          </div>
        </div>
      </div>

      <div className="section-actions">
        <button 
          className={`btn btn-primary ${justSaved ? 'saved' : ''}`} 
          disabled={!canSave} 
          onClick={handleSaveClick}
          aria-live="polite"
        >
          {saving ? 'Saving…' : justSaved ? 'Saved' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}