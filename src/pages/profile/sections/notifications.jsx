import React from 'react';
import FormSection from '../../../components/ui/form-section';
import './notifications.css';

const Notifications = ({ formData, handleInputChange, disabled, hasPhoneNumber = true }) => {
  const notificationSettings = [
    {
      id: 'load-updates',
      title: 'Load Updates',
      description: 'Get notified about new loads and status changes',
      emailKey: 'loadUpdateEmail',
      smsKey: 'loadUpdateSMS',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
      )
    },
    {
      id: 'payout-updates',
      title: 'Payout Updates',
      description: 'Receive alerts about payments and transactions',
      emailKey: 'payoutUpdateEmail',
      smsKey: 'payoutUpdateSMS',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      )
    },
    {
      id: 'document-expiry',
      title: 'Document Expiry Reminders',
      description: 'Get reminded before compliance documents expire',
      emailKey: 'documentExpiryEmail',
      smsKey: null,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      )
    }
  ];

  return (
    <FormSection title="Notifications">
      <p id="notifications-subtitle" className="notifications-subtitle">
        Choose how you'd like to be notified about important updates
      </p>

      {disabled && (
        <div className="admin-hint">Some settings are managed by your administrator.</div>
      )}

      <div className="notification-settings" role="group" aria-labelledby="notifications-subtitle">
        {notificationSettings.map((setting) => (
          <div key={setting.id} className="notification-card">
            <div className="notification-icon">{setting.icon}</div>

            <div className="notification-content">
              <div className="notification-info">
                <h4 className="notification-title" id={`${setting.id}-title`}>{setting.title}</h4>
                <p className="notification-desc" id={`${setting.id}-desc`}>{setting.description}</p>
              </div>

              <div className="notification-toggles" role="group" aria-labelledby={`${setting.id}-title`}>
                {setting.emailKey && (
                  <div className="toggle-group">
                    <label htmlFor={`${setting.id}-email`} className="toggle-label-text">Email</label>
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        id={`${setting.id}-email`}
                        checked={!!formData[setting.emailKey]}
                        onChange={(e) => handleInputChange(setting.emailKey, e.target.checked)}
                        disabled={disabled}
                        role="switch"
                        aria-checked={!!formData[setting.emailKey]}
                        aria-label={`Email notifications for ${setting.title.toLowerCase()}`}
                        aria-describedby={`${setting.id}-desc`}
                      />
                      <span className="toggle-slider" aria-hidden="true"></span>
                      <span className="sr-only">{formData[setting.emailKey] ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  </div>
                )}

                {setting.smsKey && (
                  <div className="toggle-group">
                    {hasPhoneNumber ? (
                      <>
                        <label htmlFor={`${setting.id}-sms`} className="toggle-label-text">SMS</label>
                        <div className="toggle-switch">
                          <input
                            type="checkbox"
                            id={`${setting.id}-sms`}
                            checked={!!formData[setting.smsKey]}
                            onChange={(e) => handleInputChange(setting.smsKey, e.target.checked)}
                            disabled={disabled}
                            role="switch"
                            aria-checked={!!formData[setting.smsKey]}
                            aria-label={`SMS notifications for ${setting.title.toLowerCase()}`}
                            aria-describedby={`${setting.id}-desc`}
                          />
                          <span className="toggle-slider" aria-hidden="true"></span>
                          <span className="sr-only">{formData[setting.smsKey] ? 'Enabled' : 'Disabled'}</span>
                        </div>
                      </>
                    ) : (
                      <div className="sms-unavailable">
                        <span className="sms-hint">Add a mobile number in Company Information to enable SMS.</span>
                        <button type="button" className="link-button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                          Go to Company Information
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </FormSection>
  );
};

export default Notifications;
