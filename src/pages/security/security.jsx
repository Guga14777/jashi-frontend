import React, { useState } from "react";
import "./security.css";

const Security = () => {
  // local state for show/hide
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // controlled inputs (optional)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    // TODO: wire to your API
    console.log("Submit passwords", { newPassword, confirmPassword });
  };

  return (
    <div className="security-page">
      <form className="form-section" onSubmit={onSubmit} noValidate>
        <h2 className="section-title">Change Password</h2>

        {/* New Password */}
        <label className="field-label" htmlFor="newPassword">New Password</label>
        <div className="input-wrap has-eye">
          <input
            id="newPassword"
            name="newPassword"
            type={showNew ? "text" : "password"}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="text-input"
            placeholder=""
          />
          <button
            type="button"
            className="toggle-eye"
            aria-label={showNew ? "Hide password" : "Show password"}
            onClick={() => setShowNew((v) => !v)}
          >
            {/* Simple eye icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M1.5 12s3.75-6.5 10.5-6.5S22.5 12 22.5 12s-3.75 6.5-10.5 6.5S1.5 12 1.5 12Z" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
        </div>
        <p className="help">8+ chars, uppercase, lowercase, number, special character</p>

        {/* Confirm Password */}
        <label className="field-label" htmlFor="confirmPassword">Confirm New Password</label>
        <div className="input-wrap has-eye">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="text-input"
            placeholder=""
          />
          <button
            type="button"
            className="toggle-eye"
            aria-label={showConfirm ? "Hide password" : "Show password"}
            onClick={() => setShowConfirm((v) => !v)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M1.5 12s3.75-6.5 10.5-6.5S22.5 12 22.5 12s-3.75 6.5-10.5 6.5S1.5 12 1.5 12Z" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
        </div>

        <div className="actions">
          <button type="submit" className="primary-btn">Update Password</button>
        </div>
      </form>
    </div>
  );
};

export default Security;
