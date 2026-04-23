import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FormSection from '../../components/ui/form-section';
import Toast from '../../components/ui/toast';
import { Eye, EyeOff } from 'lucide-react';
import './settings.css';

/** Real API endpoints - replace URLs with your actual backend */
const settingsAPI = {
  fetchNotifications: async () => {
    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers if needed: 'Authorization': `Bearer ${token}`
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw new Error('Failed to load notification settings');
    }
  },

  saveNotifications: async (data) => {
    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers if needed
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to save notifications:', error);
      throw new Error('Failed to save notification settings');
    }
  },

  changePassword: async ({ current, next }) => {
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers if needed
        },
        body: JSON.stringify({ current, next }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 400) throw new Error(errorData.message || 'Password does not meet requirements');
        if (response.status === 401) throw new Error('Current password is incorrect');
        if (response.status === 429) throw new Error('Too many attempts. Please try again later.');
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to change password:', error);
      throw error;
    }
  },

  registerPushSubscription: async (subscription) => {
    try {
      const response = await fetch('/api/push/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers if needed
        },
        body: JSON.stringify(subscription),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to register push subscription:', error);
      throw new Error('Failed to register push notifications');
    }
  }
};

// Password validation rules
const validatePassword = (pwd) => (
  !!pwd &&
  pwd.length >= 8 &&
  /[A-Z]/.test(pwd) &&
  /[a-z]/.test(pwd) &&
  /\d/.test(pwd) &&
  /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
);

// Push notification permission handler
const requestPushPermission = async () => {
  if (!('Notification' in window)) {
    throw new Error('Push notifications not supported');
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    // Register service worker and create subscription
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY // Add your VAPID key
    });
    
    await settingsAPI.registerPushSubscription(subscription.toJSON());
    return true;
  }
  
  return false;
};

const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // URL tab handling
  const getTabFromURL = () => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    return ['notifications', 'security'].includes(tab) ? tab : 'notifications';
  };

  const [activeTab, setActiveTab] = useState(getTabFromURL());

  // Notifications state
  const [notifications, setNotifications] = useState({
    channels: { email: true, sms: false, push: false },
    types: { 
      newLoads: true, 
      paymentUpdates: true, 
      documentExpiry: true, 
      promotions: false, 
      weeklyReports: true 
    },
    muteAll: false
  });
  const [originalNotifications, setOriginalNotifications] = useState(null);
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Security state
  const [security, setSecurity] = useState({ 
    currentPassword: '', 
    newPassword: '', 
    confirmPassword: '' 
  });
  const [passwordVisibility, setPasswordVisibility] = useState({ 
    current: false, 
    new: false, 
    confirm: false 
  });

  // UI state
  const [loading, setLoading] = useState({ notifs: true });
  const [saving, setSaving] = useState({ notifs: false, password: false });
  const [errors, setErrors] = useState({ notifs: null, password: null });
  const [dirty, setDirty] = useState({ notifs: false, password: false });
  const [pushPermissionDenied, setPushPermissionDenied] = useState(false);

  // Toasts
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState('success');
  const [toastMessage, setToastMessage] = useState('');

  const toast = useCallback((msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, []);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // URL synchronization
  useEffect(() => {
    const tab = getTabFromURL();
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [location.search, activeTab]);

  // Load notifications on mount
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setLoading(s => ({ ...s, notifs: true }));
        const data = await settingsAPI.fetchNotifications();
        
        const notifState = {
          channels: data.channels,
          types: data.types,
          muteAll: data.muteAll
        };
        
        setNotifications(notifState);
        setOriginalNotifications(notifState);
        setPhoneVerified(data.phoneVerified);
        
        setErrors(e => ({ ...e, notifs: null }));
      } catch (error) {
        setErrors(e => ({ ...e, notifs: error.message }));
        toast('Failed to load notification settings', 'error');
      } finally {
        setLoading(s => ({ ...s, notifs: false }));
      }
    };

    loadNotifications();
  }, [toast]);

  // Beforeunload protection for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (dirty.notifs || dirty.password) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  // Tab switching with unsaved changes handling
  const handleTabSwitch = (nextTab) => {
    // Reset dirty state for current tab
    if (activeTab === 'notifications' && dirty.notifs && originalNotifications) {
      setNotifications(originalNotifications);
      setDirty(d => ({ ...d, notifs: false }));
    }
    
    if (activeTab === 'security' && dirty.password) {
      setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordVisibility({ current: false, new: false, confirm: false });
      setDirty(d => ({ ...d, password: false }));
    }

    // Clear errors and update URL
    setErrors({ notifs: null, password: null });
    setPushPermissionDenied(false);
    setActiveTab(nextTab);
    
    const url = new URL(window.location);
    url.searchParams.set('tab', nextTab);
    window.history.pushState({}, '', url);
  };

  // Notification handlers
  const handleChannelChange = async (channel, enabled) => {
    // Handle push notifications permission
    if (channel === 'push' && enabled) {
      try {
        const granted = await requestPushPermission();
        if (!granted) {
          setPushPermissionDenied(true);
          toast('Push notifications blocked. Please enable in browser settings.', 'error');
          return;
        }
        setPushPermissionDenied(false);
      } catch (error) {
        console.error('Push permission error:', error);
        toast('Failed to enable push notifications', 'error');
        return;
      }
    }

    setNotifications(n => ({ 
      ...n, 
      channels: { ...n.channels, [channel]: enabled } 
    }));
    setDirty(d => ({ ...d, notifs: true }));
    setErrors(e => ({ ...e, notifs: null }));
  };

  const handleTypeChange = (type, enabled) => {
    setNotifications(n => ({ 
      ...n, 
      types: { ...n.types, [type]: enabled } 
    }));
    setDirty(d => ({ ...d, notifs: true }));
  };

  const handleMuteAllChange = (enabled) => {
    setNotifications(n => ({ ...n, muteAll: enabled }));
    setDirty(d => ({ ...d, notifs: true }));
  };

  const saveNotifications = async () => {
    if (!dirty.notifs) return;
    
    setSaving(s => ({ ...s, notifs: true }));
    try {
      await settingsAPI.saveNotifications(notifications);
      setOriginalNotifications(notifications);
      setDirty(d => ({ ...d, notifs: false }));
      setErrors(e => ({ ...e, notifs: null }));
      toast('Notification settings saved');
    } catch (error) {
      setErrors(e => ({ ...e, notifs: error.message }));
      toast('Failed to save notification settings', 'error');
    } finally {
      setSaving(s => ({ ...s, notifs: false }));
    }
  };

  // Password handlers
  const handlePasswordChange = (field, value) => {
    setSecurity(s => ({ ...s, [field]: value }));
    setDirty(d => ({ ...d, password: true }));
    setErrors(e => ({ ...e, password: null }));
  };
  
  const togglePasswordVisibility = (field) => {
    setPasswordVisibility(p => ({ ...p, [field]: !p[field] }));
  };

  // Password validation
  const passwordIsValid = validatePassword(security.newPassword);
  const passwordsMatch = security.newPassword === security.confirmPassword;
  const hasAllPasswordFields = security.currentPassword && security.newPassword && security.confirmPassword;
  const canChangePassword = hasAllPasswordFields && passwordIsValid && passwordsMatch && !saving.password;

  const showPasswordHelper = security.newPassword && !passwordIsValid;
  const showPasswordMismatch = security.confirmPassword && !passwordsMatch;

  const changePassword = async () => {
    if (!canChangePassword) return;
    
    setSaving(s => ({ ...s, password: true }));
    try {
      await settingsAPI.changePassword({ 
        current: security.currentPassword, 
        next: security.newPassword 
      });
      
      setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordVisibility({ current: false, new: false, confirm: false });
      setDirty(d => ({ ...d, password: false }));
      setErrors(e => ({ ...e, password: null }));
      toast('Password changed successfully');
    } catch (error) {
      setErrors(e => ({ ...e, password: error.message }));
      toast('Failed to change password', 'error');
    } finally {
      setSaving(s => ({ ...s, password: false }));
    }
  };

  // Computed values for notifications
  const allChannelsOff = !notifications.channels.email && 
                         !notifications.channels.sms && 
                         !notifications.channels.push;
  const showAllChannelsOffWarning = !notifications.muteAll && allChannelsOff;

  // Error retry handler
  const retryLoadNotifications = () => {
    const loadNotifications = async () => {
      try {
        setLoading(s => ({ ...s, notifs: true }));
        setErrors(e => ({ ...e, notifs: null }));
        
        const data = await settingsAPI.fetchNotifications();
        const notifState = {
          channels: data.channels,
          types: data.types,
          muteAll: data.muteAll
        };
        
        setNotifications(notifState);
        setOriginalNotifications(notifState);
        setPhoneVerified(data.phoneVerified);
      } catch (error) {
        setErrors(e => ({ ...e, notifs: error.message }));
        toast('Failed to load notification settings', 'error');
      } finally {
        setLoading(s => ({ ...s, notifs: false }));
      }
    };

    loadNotifications();
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        <h1>Settings</h1>

        <div className="settings-tabs" role="tablist" aria-label="Settings sections">
          <button 
            className={`tab ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('notifications')}
            role="tab"
            aria-selected={activeTab === 'notifications'}
            aria-controls="notifications-panel"
            id="notifications-tab"
          >
            Notifications
          </button>
          <button 
            className={`tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('security')}
            role="tab"
            aria-selected={activeTab === 'security'}
            aria-controls="security-panel"
            id="security-tab"
          >
            Security
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'notifications' && (
            <div 
              className="notifications-section" 
              role="tabpanel" 
              aria-labelledby="notifications-tab"
              id="notifications-panel"
            >
              {loading.notifs ? (
                <div className="settings-skeleton" aria-label="Loading notification settings">
                  <div className="skeleton-line" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line" />
                </div>
              ) : errors.notifs ? (
                <div className="error-state">
                  <div className="error-message" role="alert">
                    {errors.notifs}
                  </div>
                  <button 
                    className="retry-btn" 
                    onClick={retryLoadNotifications}
                    aria-label="Retry loading notification settings"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  {/* Mute All Toggle */}
                  <label className="toggle-setting toggle-setting-primary">
                    <input 
                      type="checkbox" 
                      checked={notifications.muteAll} 
                      onChange={(e) => handleMuteAllChange(e.target.checked)}
                      aria-describedby={notifications.muteAll ? "mute-all-status" : undefined}
                    />
                    <span>Mute all notifications</span>
                  </label>
                  
                  {notifications.muteAll && (
                    <div 
                      className="warning-message" 
                      role="status" 
                      aria-live="polite"
                      id="mute-all-status"
                    >
                      All notifications are muted.
                    </div>
                  )}

                  {/* Notification Channels */}
                  <FormSection title="Notification Channels">
                    <label className={`toggle-setting ${notifications.muteAll ? 'disabled' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={notifications.channels.email} 
                        disabled={notifications.muteAll} 
                        onChange={(e) => handleChannelChange('email', e.target.checked)}
                        aria-describedby="email-channel-desc"
                      />
                      <span id="email-channel-desc">Email notifications</span>
                    </label>

                    <label className={`toggle-setting ${notifications.muteAll ? 'disabled' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={notifications.channels.sms} 
                        disabled={notifications.muteAll} 
                        onChange={(e) => handleChannelChange('sms', e.target.checked)}
                        aria-describedby="sms-channel-desc"
                      />
                      <span id="sms-channel-desc">SMS notifications</span>
                    </label>

                    {/* SMS Verification Warning */}
                    {notifications.channels.sms && !phoneVerified && (
                      <div className="inline-warning" role="alert">
                        <p>⚠️ Phone number not verified. SMS won't send until verified.</p>
                        <button 
                          className="verify-phone-btn" 
                          onClick={() => navigate('/profile')}
                          aria-label="Go to profile page to verify phone number"
                        >
                          Verify phone
                        </button>
                      </div>
                    )}

                    <label className={`toggle-setting ${notifications.muteAll ? 'disabled' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={notifications.channels.push} 
                        disabled={notifications.muteAll} 
                        onChange={(e) => handleChannelChange('push', e.target.checked)}
                        aria-describedby="push-channel-desc"
                      />
                      <span id="push-channel-desc">Push notifications</span>
                    </label>

                    {/* Push Permission Denied Warning */}
                    {pushPermissionDenied && (
                      <div className="inline-warning" role="alert">
                        <p>⚠️ Push notifications are blocked. Please enable them in your browser settings.</p>
                      </div>
                    )}

                    {/* All Channels Off Warning */}
                    {showAllChannelsOffWarning && (
                      <div className="warning-message" role="alert" aria-live="polite">
                        You won't receive any notifications with all channels off.
                      </div>
                    )}
                  </FormSection>

                  {/* Notification Types */}
                  <FormSection title="Notification Types">
                    <label className={`toggle-setting ${notifications.muteAll ? 'disabled' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={notifications.types.newLoads} 
                        disabled={notifications.muteAll} 
                        onChange={(e) => handleTypeChange('newLoads', e.target.checked)}
                      />
                      <span>New loads matching my criteria</span>
                    </label>

                    <label className={`toggle-setting ${notifications.muteAll ? 'disabled' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={notifications.types.paymentUpdates} 
                        disabled={notifications.muteAll} 
                        onChange={(e) => handleTypeChange('paymentUpdates', e.target.checked)}
                      />
                      <span>Payment updates</span>
                    </label>

                    <label className={`toggle-setting ${notifications.muteAll ? 'disabled' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={notifications.types.documentExpiry} 
                        disabled={notifications.muteAll} 
                        onChange={(e) => handleTypeChange('documentExpiry', e.target.checked)}
                      />
                      <span>Document expiry reminders</span>
                    </label>

                    <label className={`toggle-setting ${notifications.muteAll ? 'disabled' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={notifications.types.promotions} 
                        disabled={notifications.muteAll} 
                        onChange={(e) => handleTypeChange('promotions', e.target.checked)}
                      />
                      <span>Promotions and offers</span>
                    </label>

                    <label className={`toggle-setting ${notifications.muteAll ? 'disabled' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={notifications.types.weeklyReports} 
                        disabled={notifications.muteAll} 
                        onChange={(e) => handleTypeChange('weeklyReports', e.target.checked)}
                      />
                      <span>Weekly performance reports</span>
                    </label>
                  </FormSection>

                  {/* Inline Errors */}
                  {errors.notifs && (
                    <div className="error-message" role="alert">
                      {errors.notifs}
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="form-actions center">
                    <button 
                      className="save-btn" 
                      onClick={saveNotifications} 
                      disabled={!dirty.notifs || saving.notifs}
                      aria-describedby={dirty.notifs ? "save-notifs-desc" : undefined}
                    >
                      {saving.notifs ? (
                        <>
                          <span className="spinner" aria-hidden="true" />
                          Saving…
                        </>
                      ) : (
                        'Save Notification Settings'
                      )}
                    </button>
                    {dirty.notifs && (
                      <span id="save-notifs-desc" className="sr-only">
                        You have unsaved changes
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <div 
              className="security-section"
              role="tabpanel" 
              aria-labelledby="security-tab"
              id="security-panel"
            >
              <FormSection title="Change Password">
                {/* Current Password */}
                <div className="form-group">
                  <label htmlFor="current-password">Current password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="current-password"
                      type={passwordVisibility.current ? 'text' : 'password'}
                      value={security.currentPassword}
                      onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                      placeholder="Enter current password"
                      className="password-input"
                      autoComplete="current-password"
                      aria-describedby="current-password-desc"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => togglePasswordVisibility('current')}
                      aria-pressed={passwordVisibility.current}
                      aria-label={passwordVisibility.current ? 'Hide current password' : 'Show current password'}
                      tabIndex={0}
                    >
                      {passwordVisibility.current ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <span id="current-password-desc" className="sr-only">
                    Enter your current password to verify your identity
                  </span>
                </div>

                {/* New Password */}
                <div className="form-group">
                  <label htmlFor="new-password">New password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="new-password"
                      type={passwordVisibility.new ? 'text' : 'password'}
                      value={security.newPassword}
                      onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                      placeholder="Enter new password"
                      className={`password-input ${showPasswordHelper ? 'has-error' : ''}`}
                      autoComplete="new-password"
                      aria-describedby={showPasswordHelper ? "new-password-help" : "new-password-desc"}
                      aria-invalid={showPasswordHelper}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => togglePasswordVisibility('new')}
                      aria-pressed={passwordVisibility.new}
                      aria-label={passwordVisibility.new ? 'Hide new password' : 'Show new password'}
                      tabIndex={0}
                    >
                      {passwordVisibility.new ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {showPasswordHelper && (
                    <div className="field-helper-text" role="alert" id="new-password-help">
                      Password must have min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
                    </div>
                  )}
                  <span id="new-password-desc" className="sr-only">
                    Choose a strong password with at least 8 characters
                  </span>
                </div>

                {/* Confirm Password */}
                <div className="form-group">
                  <label htmlFor="confirm-password">Confirm new password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="confirm-password"
                      type={passwordVisibility.confirm ? 'text' : 'password'}
                      value={security.confirmPassword}
                      onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                      placeholder="Confirm new password"
                      className={`password-input ${showPasswordMismatch ? 'has-error' : ''}`}
                      autoComplete="new-password"
                      aria-describedby={showPasswordMismatch ? "confirm-password-error" : "confirm-password-desc"}
                      aria-invalid={showPasswordMismatch}
                      onPaste={(e) => e.preventDefault()} // Prevent paste for manual confirmation
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => togglePasswordVisibility('confirm')}
                      aria-pressed={passwordVisibility.confirm}
                      aria-label={passwordVisibility.confirm ? 'Hide confirm password' : 'Show confirm password'}
                      tabIndex={0}
                    >
                      {passwordVisibility.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {showPasswordMismatch && (
                    <div className="field-error-text" role="alert" id="confirm-password-error">
                      Passwords don't match
                    </div>
                  )}
                  <span id="confirm-password-desc" className="sr-only">
                    Re-enter your new password to confirm
                  </span>
                </div>

                {/* Password Change Errors */}
                {errors.password && (
                  <div className="error-message" role="alert">
                    {errors.password}
                  </div>
                )}

                {/* Change Password Button */}
                <div className="form-actions center">
                  <button 
                    className="save-btn" 
                    type="button" 
                    onClick={changePassword} 
                    disabled={!canChangePassword}
                    aria-describedby="change-password-status"
                  >
                    {saving.password ? (
                      <>
                        <span className="spinner" aria-hidden="true" />
                        Changing…
                      </>
                    ) : (
                      'Change Password'
                    )}
                  </button>
                  <div id="change-password-status" className="sr-only">
                    {!hasAllPasswordFields && "Please fill all password fields"}
                    {hasAllPasswordFields && !passwordIsValid && "New password doesn't meet requirements"}
                    {hasAllPasswordFields && passwordIsValid && !passwordsMatch && "Passwords don't match"}
                    {canChangePassword && "Ready to change password"}
                  </div>
                </div>
              </FormSection>
            </div>
          )}
        </div>
      </div>

      {/* Success/Error Toasts */}
      {showToast && (
        <Toast 
          message={toastMessage} 
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Screen reader only content */}
      <div className="sr-only" aria-live="polite" role="status">
        {loading.notifs && "Loading notification settings"}
        {saving.notifs && "Saving notification settings"}
        {saving.password && "Changing password"}
      </div>
    </div>
  );
};

export default Settings;