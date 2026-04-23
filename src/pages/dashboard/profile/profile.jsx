import React, { useState, useEffect, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, FileText, Tag, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../../store/auth-context.jsx';
import ConfirmModal from '../../../components/ui/confirm-modal.jsx';
import CustomerDashboardFooter from '../../../components/footer/customer-dashboard-footer.jsx';
import LiveChat from '../../../components/live-chat/live-chat.jsx';
import { validateEmail } from '../../../utils/validation.js';
import { deactivateAccount, deleteAccount } from '../../../services/profile.api';
import './profile.css';

const CustomerProfile = () => {
  const { user, updateProfile, updatePassword, logout } = useAuth();
  const navigate = useNavigate();

  // Refs for buttons
  const personalButtonRef = useRef(null);
  const passwordButtonRef = useRef(null);

  // ✅ Refs to lock the saved state
  const isPersonalSavedRef = useRef(false);
  const isPasswordSavedRef = useRef(false);

  // ✅ Password visibility state
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ---------- Personal info ----------
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    originalEmail: user?.email || ''
  });

  const [lastSavedData, setLastSavedData] = useState(formData);
  const [formErrors, setFormErrors] = useState({});
  const [personalButtonState, setPersonalButtonState] = useState('default');
  const [hasPersonalChanges, setHasPersonalChanges] = useState(false);
  const [personalErrorMsg, setPersonalErrorMsg] = useState(null);

  // ---------- Notifications ----------
  const [notifications, setNotifications] = useState({
    shipment: {
      email: user?.preferences?.notifications?.shipment?.email ?? user?.preferences?.emailNotifications ?? false,
      sms: user?.preferences?.notifications?.shipment?.sms ?? user?.preferences?.smsNotifications ?? false,
    },
    payments: {
      email: user?.preferences?.notifications?.payments?.email ?? user?.preferences?.emailNotifications ?? false,
      sms: user?.preferences?.notifications?.payments?.sms ?? user?.preferences?.smsNotifications ?? false,
    },
    quotes: {
      email: user?.preferences?.notifications?.quotes?.email ?? user?.preferences?.emailNotifications ?? false,
      sms: user?.preferences?.notifications?.quotes?.sms ?? user?.preferences?.smsNotifications ?? false,
    }
  });

  const [notificationsBaseline, setNotificationsBaseline] = useState(notifications);
  const [notificationsSaving, setNotificationsSaving] = useState({});
  const [notificationsErrorMsg, setNotificationsErrorMsg] = useState(null);
  const [notificationsSavedMsg, setNotificationsSavedMsg] = useState(false);

  // ---------- Account state ----------
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deactivateModalMsg, setDeactivateModalMsg] = useState(null);
  const [deleteModalMsg, setDeleteModalMsg] = useState(null);

  const isDeactivated = user?.status === 'deactivated';

  // ---------- Change password ----------
  const [password, setPassword] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordButtonState, setPasswordButtonState] = useState('default');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState(null);
  const [pwdTouched, setPwdTouched] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Debounce for password validation
  const DEBOUNCE_MS = 600;
  const typingTimerRef = useRef({ new: null, confirm: null });

  // Auto-revert timers
  const personalRevertTimerRef = useRef(null);
  const passwordRevertTimerRef = useRef(null);
  const notificationsSavedTimerRef = useRef(null);

  // helpers
  const autoHideError = (setter) => setTimeout(() => setter(null), 5000);

  const formatPhoneInput = (v) => {
    const d = v.replace(/\D/g, '');
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`;
    return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6,10)}`;
  };

  // Auto-hide notifications saved message
  const scheduleNotificationsSavedHide = () => {
    clearTimeout(notificationsSavedTimerRef.current);
    setNotificationsSavedMsg(true);
    notificationsSavedTimerRef.current = setTimeout(() => {
      setNotificationsSavedMsg(false);
    }, 1200);
  };

  // Password validation helpers
  const validatePassword = (pwd) => {
    const okLen = pwd.length >= 8;
    const up = /[A-Z]/.test(pwd);
    const lo = /[a-z]/.test(pwd);
    const sp = /[^A-Za-z0-9]/.test(pwd);
    return { okLen, up, lo, sp, ok: okLen && up && lo && sp };
  };

  const buildPwdErrors = (newPwd, confirmPwd) => {
    const errs = {};
    const v = validatePassword(newPwd || "");
    if ((newPwd ?? "").length > 0 && !v.ok) {
      errs.newPassword = "At least 8 characters, 1 uppercase, 1 lowercase, 1 special character.";
    }
    if ((confirmPwd ?? "").length > 0 && confirmPwd !== newPwd) {
      errs.confirmPassword = "Passwords do not match";
    }
    return errs;
  };

  const runPwdValidationNow = (nextNew, nextConfirm) => {
    setPasswordErrors(buildPwdErrors(nextNew, nextConfirm));
  };

  const schedulePwdValidation = (nextNew, nextConfirm, which) => {
    clearTimeout(typingTimerRef.current[which]);
    typingTimerRef.current[which] = setTimeout(() => {
      runPwdValidationNow(nextNew, nextConfirm);
    }, DEBOUNCE_MS);
  };

  // Password computed states
  const pwdValid = validatePassword(password.newPassword).ok;
  const pwdMatch = password.newPassword && password.confirmPassword && (password.newPassword === password.confirmPassword);
  const pwdDirty = !!password.currentPassword || !!password.newPassword || !!password.confirmPassword;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(typingTimerRef.current.new);
      clearTimeout(typingTimerRef.current.confirm);
      clearTimeout(personalRevertTimerRef.current);
      clearTimeout(passwordRevertTimerRef.current);
      clearTimeout(notificationsSavedTimerRef.current);
    };
  }, []);

  // Hydrate form ONCE when component mounts
  useEffect(() => {
    if (!user) return;

    const userData = {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      originalEmail: user.email || ''
    };

    setFormData(userData);
    setLastSavedData(userData);

    const notifs = {
      shipment: {
        email: user?.preferences?.notifications?.shipment?.email ?? user?.preferences?.emailNotifications ?? false,
        sms: user?.preferences?.notifications?.shipment?.sms ?? user?.preferences?.smsNotifications ?? false,
      },
      payments: {
        email: user?.preferences?.notifications?.payments?.email ?? user?.preferences?.emailNotifications ?? false,
        sms: user?.preferences?.notifications?.payments?.sms ?? user?.preferences?.smsNotifications ?? false,
      },
      quotes: {
        email: user?.preferences?.notifications?.quotes?.email ?? user?.preferences?.emailNotifications ?? false,
        sms: user?.preferences?.notifications?.quotes?.sms ?? user?.preferences?.smsNotifications ?? false,
      }
    };

    setNotifications(notifs);
    setNotificationsBaseline(notifs);
    
    console.log('🔷 Initial notifications loaded:', notifs);
  }, []);

  useEffect(() => {
    setHasPersonalChanges(JSON.stringify(formData) !== JSON.stringify(lastSavedData));
  }, [formData, lastSavedData]);

  useEffect(() => {
    if (hasPersonalChanges && personalButtonState === 'saved' && !isPersonalSavedRef.current) {
      setPersonalButtonState('default');
      clearTimeout(personalRevertTimerRef.current);
    }
  }, [hasPersonalChanges, personalButtonState]);

  useEffect(() => {
    if (pwdDirty && passwordButtonState === 'saved' && !isPasswordSavedRef.current) {
      setPasswordButtonState('default');
      clearTimeout(passwordRevertTimerRef.current);
    }
  }, [pwdDirty, passwordButtonState]);

  // ---------- handlers: personal ----------
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const v = name === 'phone' ? formatPhoneInput(value) : value;
    setFormData((p) => ({ ...p, [name]: v }));
    if (formErrors[name]) setFormErrors((p) => ({ ...p, [name]: '' }));
  };

  const handleInputBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'phone' && value) {
      const d = value.replace(/\D/g, '');
      if (d.length > 0 && d.length !== 10) {
        setFormErrors((p) => ({ ...p, phone: 'Please enter a complete 10-digit phone number' }));
      }
    }
  };

  const validatePersonalInfo = () => {
    const err = {};
    if (!formData.firstName.trim()) err.firstName = 'First name is required';
    if (!formData.lastName.trim()) err.lastName = 'Last name is required';
    if (!formData.email.trim()) err.email = 'Email is required';
    else if (!validateEmail(formData.email)) err.email = 'Please enter a valid email address';
    if (formData.phone) {
      const d = formData.phone.replace(/\D/g, '');
      if (d.length !== 10) err.phone = 'Please enter a complete 10-digit phone number';
    }
    return err;
  };

  const handleSavePersonalInfo = async () => {
    const errs = validatePersonalInfo();
    if (Object.keys(errs).length) {
      setFormErrors(errs);
      return;
    }

    setPersonalErrorMsg(null);
    isPersonalSavedRef.current = true;
    setPersonalButtonState('saved');

    try {
      const result = await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
      });

      if (result.success) {
        setLastSavedData({ ...formData, originalEmail: formData.email });
        setFormData((p) => ({ ...p, originalEmail: p.email }));
        
        clearTimeout(personalRevertTimerRef.current);
        personalRevertTimerRef.current = setTimeout(() => {
          setPersonalButtonState('default');
          isPersonalSavedRef.current = false;
        }, 3000);
      } else {
        setPersonalButtonState('default');
        isPersonalSavedRef.current = false;
        throw new Error(result.error || 'Failed to update profile');
      }
    } catch (e) {
      setPersonalButtonState('default');
      isPersonalSavedRef.current = false;
      clearTimeout(personalRevertTimerRef.current);
      setPersonalErrorMsg({
        type: 'error',
        text: e.message || 'Could not save personal info. Please try again.'
      });
      autoHideError(setPersonalErrorMsg);
    }
  };

  // ---------- handlers: notifications ----------
  const handleNotificationChange = (category, channel, checked) => {
    console.log('🔵 handleNotificationChange called:', { category, channel, checked });
    
    const toggleKey = `${category}.${channel}`;

    // Update state immediately - no conditions
    setNotifications(prev => {
      const updated = {
        ...prev,
        [category]: {
          ...prev[category],
          [channel]: checked
        }
      };
      console.log('🟢 Setting new notification state:', updated);
      return updated;
    });

    setNotificationsSaving(prev => ({
      ...prev,
      [toggleKey]: true
    }));

    setNotificationsErrorMsg(null);

    // Save to backend
    updateProfile({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      preferences: {
        ...user.preferences,
        notifications: {
          ...user.preferences?.notifications,
          [category]: {
            ...(user.preferences?.notifications?.[category] || {}),
            [channel]: checked
          }
        }
      }
    })
    .then(() => {
      console.log('✅ API save successful');
      // Update baseline on success
      setNotificationsBaseline(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [channel]: checked
        }
      }));
      scheduleNotificationsSavedHide();
    })
    .catch((err) => {
      console.error('❌ API save failed:', err);
      // Revert on error
      setNotifications(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [channel]: !checked
        }
      }));

      setNotificationsErrorMsg({
        type: 'error',
        text: 'Could not save notification preference. Please try again.'
      });
      autoHideError(setNotificationsErrorMsg);
    })
    .finally(() => {
      setNotificationsSaving(prev => ({
        ...prev,
        [toggleKey]: false
      }));
    });
  };

  // ---------- handlers: password ----------
  const handleCurrentPasswordChange = (e) => {
    const val = e.target.value;
    setPwdTouched((t) => ({ ...t, current: true }));
    setPassword((prev) => ({ ...prev, currentPassword: val }));
    if (passwordErrors.currentPassword) {
      setPasswordErrors((prev) => ({ ...prev, currentPassword: '' }));
    }
  };

  const handleNewPasswordChange = (e) => {
    const val = e.target.value;
    setPwdTouched((t) => ({ ...t, new: true }));
    setPassword((prev) => {
      const next = { ...prev, newPassword: val };
      schedulePwdValidation(next.newPassword, next.confirmPassword, 'new');
      return next;
    });
  };

  const handleConfirmPasswordChange = (e) => {
    const val = e.target.value;
    setPwdTouched((t) => ({ ...t, confirm: true }));
    setPassword((prev) => {
      const next = { ...prev, confirmPassword: val };
      schedulePwdValidation(next.newPassword, next.confirmPassword, 'confirm');
      return next;
    });
  };

  const handleNewPasswordBlur = () => {
    setPwdTouched((t) => ({ ...t, new: true }));
    runPwdValidationNow(password.newPassword, password.confirmPassword);
  };

  const handleConfirmPasswordBlur = () => {
    setPwdTouched((t) => ({ ...t, confirm: true }));
    runPwdValidationNow(password.newPassword, password.confirmPassword);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    const errs = {};
    const v = validatePassword(password.newPassword);

    if (!password.currentPassword) errs.currentPassword = 'Current password is required';
    if (!password.newPassword) errs.newPassword = 'New password is required';
    else if (!v.ok) errs.newPassword = 'At least 8 characters, 1 uppercase, 1 lowercase, 1 special character.';

    if (!password.confirmPassword) errs.confirmPassword = 'Please confirm your password';
    else if (password.confirmPassword !== password.newPassword) errs.confirmPassword = 'Passwords do not match';

    if (Object.keys(errs).length) {
      setPasswordErrors(errs);
      return;
    }

    setPasswordErrorMsg(null);
    isPasswordSavedRef.current = true;
    setPasswordButtonState('saved');

    try {
      const result = await updatePassword({
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });

      if (result.success) {
        setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordErrors({});
        setPwdTouched({ current: false, new: false, confirm: false });
        
        clearTimeout(passwordRevertTimerRef.current);
        passwordRevertTimerRef.current = setTimeout(() => {
          setPasswordButtonState('default');
          isPasswordSavedRef.current = false;
        }, 3000);
      } else {
        setPasswordButtonState('default');
        isPasswordSavedRef.current = false;
        throw new Error(result.error || 'Failed to update password');
      }
    } catch (e2) {
      setPasswordButtonState('default');
      isPasswordSavedRef.current = false;
      clearTimeout(passwordRevertTimerRef.current);
      setPasswordErrorMsg({
        type: 'error',
        text: e2.message || 'Could not save password. Please try again.'
      });
      autoHideError(setPasswordErrorMsg);
    }
  };

  // ---------- handlers: account ----------
  const handleDeactivateAccount = async () => {
    console.log('🔴 Deactivating account...');
    setIsDeactivating(true);
    setDeactivateModalMsg(null);
    
    try {
      const result = await deactivateAccount();
      console.log('📡 Deactivate result:', result);
      
      if (result.ok) {
        setDeactivateModalMsg({
          type: 'success',
          text: 'Account deactivated successfully. Logging out...'
        });
        
        // Wait 2 seconds then logout and redirect
        setTimeout(() => {
          localStorage.removeItem('authToken');
          localStorage.removeItem('token');
          if (logout) logout();
          window.location.href = '/login';
        }, 2000);
      } else {
        setDeactivateModalMsg({
          type: 'error',
          text: result.error || 'Failed to deactivate account. Please try again.'
        });
        setIsDeactivating(false);
      }
    } catch (error) {
      console.error('❌ Deactivate error:', error);
      setDeactivateModalMsg({
        type: 'error',
        text: 'An unexpected error occurred. Please try again.'
      });
      setIsDeactivating(false);
    }
  };

  // ⭐ FIXED: No password required
  const handleDeleteAccount = async () => {
    console.log('🔴 Deleting account...');
    setIsDeleting(true);
    setDeleteModalMsg(null);
    
    try {
      const result = await deleteAccount();  // ⭐ No password needed
      console.log('📡 Delete result:', result);
      
      if (result.ok) {
        setDeleteModalMsg({
          type: 'success',
          text: result.message || 'Account deleted. Redirecting...'
        });
        
        // Wait 2 seconds then logout and redirect
        setTimeout(() => {
          localStorage.removeItem('authToken');
          localStorage.removeItem('token');
          if (logout) logout();
          window.location.href = '/login';
        }, 2000);
      } else {
        setDeleteModalMsg({
          type: 'error',
          text: result.error || 'Failed to delete account. Please try again.'
        });
        setIsDeleting(false);
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      setDeleteModalMsg({
        type: 'error',
        text: 'An unexpected error occurred. Please try again.'
      });
      setIsDeleting(false);
    }
  };

  const initials = `${(lastSavedData.firstName || '').charAt(0)}${(lastSavedData.lastName || '').charAt(0)}`.toUpperCase() || 'U';

  const isBusy = (id, channel) => !!notificationsSaving[`${id}.${channel}`] || isDeactivated;

  const notificationRows = [
    {
      id: 'shipment',
      icon: Truck,
      title: 'Shipment Status Updates',
      description: 'Get notified about pickup, in-transit, ETA, and delivery updates.',
      channels: ['email', 'sms']
    },
    {
      id: 'payments',
      icon: FileText,
      title: 'Payment & Receipts',
      description: 'Receive payment confirmations and receipt emails.',
      channels: ['email', 'sms']
    },
    {
      id: 'quotes',
      icon: Tag,
      title: 'Quote & Offer Updates',
      description: "Get alerts when there's activity on your quote.",
      channels: ['email', 'sms']
    }
  ];

  const personalButtonDisplay = isPersonalSavedRef.current || personalButtonState === 'saved' ? 'saved' : 'default';
  const passwordButtonDisplay = isPasswordSavedRef.current || passwordButtonState === 'saved' ? 'saved' : 'default';

  return (
    <>
      <div className="customer-profile">
        <div className="profile-header">
          <div className="profile-info">
            <div className="avatar">{initials}</div>
            <div className="user-details">
              <h1 className="user-name">
                {lastSavedData.firstName} {lastSavedData.lastName}
                {isDeactivated && <span className="deactivated-badge">• Deactivated</span>}
              </h1>
              <p className="user-email">{lastSavedData.email}</p>
            </div>
          </div>
        </div>

        {isDeactivated && (
          <div className="deactivated-banner">Your account is deactivated. Log in again to reactivate.</div>
        )}

        <div className="profile-content">
          {/* Personal Information */}
          <div className="profile-section">
            <div className="section-header"><h2>Personal Information</h2></div>
            <div className="form-vertical">
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  disabled={personalButtonDisplay === 'saved' || isDeactivated}
                  className={formErrors.firstName ? 'error' : ''}
                />
                {formErrors.firstName && <span className="field-error">{formErrors.firstName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  disabled={personalButtonDisplay === 'saved' || isDeactivated}
                  className={formErrors.lastName ? 'error' : ''}
                />
                {formErrors.lastName && <span className="field-error">{formErrors.lastName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="(123) 456-7890"
                  value={formData.phone}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  disabled={personalButtonDisplay === 'saved' || isDeactivated}
                  className={formErrors.phone ? 'error' : ''}
                />
                {formErrors.phone && <span className="field-error">{formErrors.phone}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={personalButtonDisplay === 'saved' || isDeactivated}
                  className={formErrors.email ? 'error' : ''}
                />
                {formErrors.email && <span className="field-error">{formErrors.email}</span>}
              </div>
            </div>

            <div className="section-actions">
              <button
                ref={personalButtonRef}
                className="btn btn-primary"
                data-state={personalButtonDisplay}
                onClick={handleSavePersonalInfo}
                disabled={(personalButtonDisplay === 'default' && !hasPersonalChanges) || isDeactivated}
                style={
                  personalButtonDisplay === 'saved' 
                    ? { 
                        background: '#10b981 !important', 
                        borderColor: '#10b981 !important', 
                        color: 'white !important',
                        pointerEvents: 'none',
                        opacity: '1 !important'
                      } 
                    : {}
                }
              >
                {personalButtonDisplay === 'saved' ? '✓ Saved' : 'Save Changes'}
              </button>
              <div className="section-status-container">
                {personalErrorMsg?.text && (
                  <div className={`section-status ${personalErrorMsg.type || ''}`}>{personalErrorMsg.text}</div>
                )}
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="profile-section">
            <div className="section-header"><h2>Change Password</h2></div>
            <form onSubmit={handlePasswordSubmit} noValidate>
              <div className="form-vertical">
                {/* Current Password */}
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <div className="simple-password">
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={password.currentPassword}
                      onChange={handleCurrentPasswordChange}
                      disabled={passwordButtonDisplay === 'saved' || isDeactivated}
                      autoComplete="current-password"
                      className={passwordErrors.currentPassword ? 'error' : ''}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      className="simple-toggle"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                      disabled={passwordButtonDisplay === 'saved' || isDeactivated}
                      tabIndex={-1}
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {pwdTouched.current && passwordErrors.currentPassword && (
                    <span className="field-error">{passwordErrors.currentPassword}</span>
                  )}
                </div>

                {/* New Password */}
                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <div className="simple-password">
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={password.newPassword}
                      onChange={handleNewPasswordChange}
                      onBlur={handleNewPasswordBlur}
                      disabled={passwordButtonDisplay === 'saved' || isDeactivated}
                      autoComplete="new-password"
                      className={passwordErrors.newPassword ? 'error' : ''}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      className="simple-toggle"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                      disabled={passwordButtonDisplay === 'saved' || isDeactivated}
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {pwdTouched.new && passwordErrors.newPassword && (
                    <span className="field-error">{passwordErrors.newPassword}</span>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <div className="simple-password">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={password.confirmPassword}
                      onChange={handleConfirmPasswordChange}
                      onBlur={handleConfirmPasswordBlur}
                      disabled={passwordButtonDisplay === 'saved' || isDeactivated}
                      autoComplete="new-password"
                      className={passwordErrors.confirmPassword ? 'error' : ''}
                      placeholder="Re-enter new password"
                    />
                    <button
                      type="button"
                      className="simple-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      disabled={passwordButtonDisplay === 'saved' || isDeactivated}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {pwdTouched.confirm && passwordErrors.confirmPassword && (
                    <span className="field-error">{passwordErrors.confirmPassword}</span>
                  )}
                </div>
              </div>

              <div className="section-actions">
                <button
                  ref={passwordButtonRef}
                  className={`btn btn-primary ${pwdDirty ? 'is-dirty' : ''}`}
                  data-state={passwordButtonDisplay}
                  type="submit"
                  disabled={(passwordButtonDisplay === 'default' && (!pwdValid || !pwdMatch || !password.currentPassword)) || isDeactivated}
                  style={
                    passwordButtonDisplay === 'saved' 
                      ? { 
                          background: '#10b981 !important', 
                          borderColor: '#10b981 !important', 
                          color: 'white !important',
                          pointerEvents: 'none',
                          opacity: '1 !important'
                        } 
                      : {}
                  }
                >
                  {passwordButtonDisplay === 'saved' ? '✓ Saved' : 'Save Changes'}
                </button>
                <div className="section-status-container">
                  {passwordErrorMsg?.text && (
                    <div className={`section-status ${passwordErrorMsg.type || ''}`}>{passwordErrorMsg.text}</div>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Notifications */}
          <div className="profile-section">
            <div className="section-header">
              <h2>
                Notifications
                {notificationsSavedMsg && <span className="notifications-saved-indicator">✓ Saved</span>}
              </h2>
              <p className="section-subtitle">Choose how you'd like to be notified about important updates.</p>
            </div>

            <div className="notifications-content">
              <div className="notifications-card-list">
                <div className="notifications-headers notifications-grid">
                  <div />
                  <div />
                  <span className="notifications-header">Email</span>
                  <span className="notifications-header">SMS</span>
                </div>

                {notificationRows.map((row) => (
                  <div key={row.id} className="notifications-row notifications-grid">
                    <div className="notifications-row-icon">
                      <row.icon className="notification-icon" size={18} strokeWidth={1.6} aria-hidden="true" />
                    </div>
                    <div className="notifications-row-content">
                      <h4 className="notifications-row-title">{row.title}</h4>
                      <p className="notifications-row-description">{row.description}</p>
                    </div>

                    <label
                      className="notifications-toggle-label"
                      role="switch"
                      aria-checked={notifications[row.id]?.email || false}
                      aria-disabled={isBusy(row.id, 'email')}
                      data-busy={isBusy(row.id, 'email')}
                    >
                      <input
                        type="checkbox"
                        checked={notifications[row.id]?.email || false}
                        onChange={(e) => {
                          if (!isBusy(row.id, 'email')) handleNotificationChange(row.id, 'email', e.target.checked);
                        }}
                        aria-hidden="true"
                        tabIndex={-1}
                      />
                      <span className="toggle-slider"></span>
                      <span className="mobile-label">Email</span>
                    </label>

                    <label
                      className="notifications-toggle-label"
                      role="switch"
                      aria-checked={notifications[row.id]?.sms || false}
                      aria-disabled={isBusy(row.id, 'sms')}
                      data-busy={isBusy(row.id, 'sms')}
                    >
                      <input
                        type="checkbox"
                        checked={notifications[row.id]?.sms || false}
                        onChange={(e) => {
                          if (!isBusy(row.id, 'sms')) handleNotificationChange(row.id, 'sms', e.target.checked);
                        }}
                        aria-hidden="true"
                        tabIndex={-1}
                      />
                      <span className="toggle-slider"></span>
                      <span className="mobile-label">SMS</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {notificationsErrorMsg?.text && (
              <div className="section-status-container">
                <div className={`section-status ${notificationsErrorMsg.type || ''}`}>{notificationsErrorMsg.text}</div>
              </div>
            )}
          </div>

          {/* Account Management */}
          <div className="profile-section">
            <div className="section-header"><h2>Account Management</h2></div>
            <div className="account-actions">
              <div className="action-card">
                <div className="action-content">
                  <h4>Deactivate Account</h4>
                  <p>Temporarily disable your account. You can reactivate it later by logging in.</p>
                </div>
                <div className="action-cta">
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowDeactivateModal(true)}
                    disabled={isDeactivated}
                  >
                    {isDeactivated ? 'Account Deactivated' : 'Deactivate Account'}
                  </button>
                </div>
              </div>

              <div className="action-card">
                <div className="action-content">
                  <h4>Delete Account</h4>
                  <p>Permanently delete your account and all data. This action cannot be undone.</p>
                </div>
                <div className="action-cta">
                  <button
                    className="btn btn-danger"
                    onClick={() => setShowDeleteModal(true)}
                    disabled={isDeactivated}
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Deactivate Modal - No password required */}
        <ConfirmModal
          open={showDeactivateModal}
          onClose={() => {
            setShowDeactivateModal(false);
            setDeactivateModalMsg(null);
          }}
          onConfirm={handleDeactivateAccount}
          title="Deactivate Account"
          description="Your account will be temporarily disabled. You can reactivate it anytime by logging in again."
          confirmLabel="Deactivate Account"
          cancelLabel="Cancel"
          variant="primary"
          loading={isDeactivating}
          message={deactivateModalMsg}
          hideActionsOnMessage={true}
          actionType="deactivating"
          requirePassword={false}
        />

        {/* Delete Modal - No password required */}
        <ConfirmModal
          open={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeleteModalMsg(null);
          }}
          onConfirm={handleDeleteAccount}
          title="Delete Account"
          description="This will permanently delete your account and all associated data. This action cannot be undone."
          confirmLabel="Delete Account"
          cancelLabel="Cancel"
          variant="danger"
          loading={isDeleting}
          message={deleteModalMsg}
          hideActionsOnMessage={true}
          actionType="deleting"
          requirePassword={false}
        />
      </div>

      <CustomerDashboardFooter />
      <LiveChat />
    </>
  );
};

export default memo(CustomerProfile);