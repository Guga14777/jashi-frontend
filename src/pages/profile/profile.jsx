// src/pages/profile/profile.jsx
//
// Carrier portal profile page (rendered for /profile under CarrierLayout).
//
// Mirrors the shipper profile (src/pages/dashboard/profile/profile.jsx)
// section-for-section so the two pages stay visually consistent. The only
// substantive differences:
//   1. Two extra inputs in Personal Information (MC Number, DOT Number).
//   2. Notification rows reframed for carriers ("Load Status Updates",
//      payouts copy, offer activity copy).
//
// Reuses the dashboard profile.css so all the "rich" styling (notifications
// grid, password input wrapper, action cards, deactivated banner) lights up
// here too.

import React, { useEffect, useRef, useState } from 'react';
import { Truck, FileText, Tag, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../store/auth-context.jsx';
import ConfirmModal from '../../components/ui/confirm-modal.jsx';
import LiveChat from '../../components/live-chat/live-chat.jsx';
import { validateEmail } from '../../utils/validation.js';
import { deactivateAccount, deleteAccount } from '../../services/profile.api';

import './profile.css';
// Pull in the shipper profile styles so notifications grid + password
// toggle + action cards + deactivated banner all render correctly here.
import '../dashboard/profile/profile.css';

const formatPhoneInput = (v) => {
  const d = (v || '').replace(/\D/g, '');
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
};

const onlyDigits = (v, max = 12) => (v || '').replace(/\D/g, '').slice(0, max);

const validatePassword = (pwd) => {
  const okLen = pwd.length >= 8;
  const up = /[A-Z]/.test(pwd);
  const lo = /[a-z]/.test(pwd);
  const sp = /[^A-Za-z0-9]/.test(pwd);
  return { okLen, up, lo, sp, ok: okLen && up && lo && sp };
};

const buildPwdErrors = (newPwd, confirmPwd) => {
  const errs = {};
  const v = validatePassword(newPwd || '');
  if ((newPwd ?? '').length > 0 && !v.ok) {
    errs.newPassword =
      'At least 8 characters, 1 uppercase, 1 lowercase, 1 special character.';
  }
  if ((confirmPwd ?? '').length > 0 && confirmPwd !== newPwd) {
    errs.confirmPassword = 'Passwords do not match';
  }
  return errs;
};

const CarrierProfile = () => {
  const { user, updateProfile, updatePassword, logout } = useAuth();

  const personalRevertTimerRef = useRef(null);
  const passwordRevertTimerRef = useRef(null);
  const notificationsSavedTimerRef = useRef(null);
  const isPersonalSavedRef = useRef(false);
  const isPasswordSavedRef = useRef(false);
  const typingTimerRef = useRef({ new: null, confirm: null });

  // ----- Personal info (with carrier-specific MC / DOT) -----
  const initialPersonal = {
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    mcNumber: user?.mcNumber || '',
    dotNumber: user?.dotNumber || '',
  };
  const [formData, setFormData] = useState(initialPersonal);
  const [lastSavedData, setLastSavedData] = useState(initialPersonal);
  const [formErrors, setFormErrors] = useState({});
  const [hasPersonalChanges, setHasPersonalChanges] = useState(false);
  const [personalButtonState, setPersonalButtonState] = useState('default');
  const [personalErrorMsg, setPersonalErrorMsg] = useState(null);

  // ----- Password -----
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [pwdTouched, setPwdTouched] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordButtonState, setPasswordButtonState] = useState('default');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState(null);

  // ----- Notifications -----
  const initialNotifs = {
    shipment: {
      email:
        user?.preferences?.notifications?.shipment?.email ??
        user?.preferences?.emailNotifications ??
        false,
      sms:
        user?.preferences?.notifications?.shipment?.sms ??
        user?.preferences?.smsNotifications ??
        false,
    },
    payments: {
      email:
        user?.preferences?.notifications?.payments?.email ??
        user?.preferences?.emailNotifications ??
        false,
      sms:
        user?.preferences?.notifications?.payments?.sms ??
        user?.preferences?.smsNotifications ??
        false,
    },
    quotes: {
      email:
        user?.preferences?.notifications?.quotes?.email ??
        user?.preferences?.emailNotifications ??
        false,
      sms:
        user?.preferences?.notifications?.quotes?.sms ??
        user?.preferences?.smsNotifications ??
        false,
    },
  };
  const [notifications, setNotifications] = useState(initialNotifs);
  const [notificationsSaving, setNotificationsSaving] = useState({});
  const [notificationsErrorMsg, setNotificationsErrorMsg] = useState(null);
  const [notificationsSavedMsg, setNotificationsSavedMsg] = useState(false);

  // ----- Account management -----
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deactivateModalMsg, setDeactivateModalMsg] = useState(null);
  const [deleteModalMsg, setDeleteModalMsg] = useState(null);
  const isDeactivated = user?.status === 'deactivated';

  // hydrate when user loads
  useEffect(() => {
    if (!user) return;
    const next = {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      mcNumber: user.mcNumber || '',
      dotNumber: user.dotNumber || '',
    };
    setFormData(next);
    setLastSavedData(next);
    setNotifications(initialNotifs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // dirty tracking
  useEffect(() => {
    setHasPersonalChanges(
      JSON.stringify(formData) !== JSON.stringify(lastSavedData)
    );
  }, [formData, lastSavedData]);

  useEffect(() => {
    return () => {
      clearTimeout(personalRevertTimerRef.current);
      clearTimeout(passwordRevertTimerRef.current);
      clearTimeout(notificationsSavedTimerRef.current);
      clearTimeout(typingTimerRef.current.new);
      clearTimeout(typingTimerRef.current.confirm);
    };
  }, []);

  const autoHide = (setter, ms = 5000) => setTimeout(() => setter(null), ms);

  // ---------- Personal handlers ----------
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let v = value;
    if (name === 'phone') v = formatPhoneInput(value);
    if (name === 'mcNumber' || name === 'dotNumber') v = onlyDigits(value, 12);
    setFormData((prev) => ({ ...prev, [name]: v }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleInputBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'phone' && value) {
      const d = value.replace(/\D/g, '');
      if (d.length > 0 && d.length !== 10) {
        setFormErrors((p) => ({
          ...p,
          phone: 'Please enter a complete 10-digit phone number',
        }));
      }
    }
  };

  const validatePersonalInfo = () => {
    const err = {};
    if (!formData.firstName.trim()) err.firstName = 'First name is required';
    if (!formData.lastName.trim()) err.lastName = 'Last name is required';
    if (!formData.email.trim()) err.email = 'Email is required';
    else if (!validateEmail(formData.email))
      err.email = 'Please enter a valid email address';
    if (formData.phone) {
      const d = formData.phone.replace(/\D/g, '');
      if (d.length !== 10)
        err.phone = 'Please enter a complete 10-digit phone number';
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
        mcNumber: formData.mcNumber || null,
        dotNumber: formData.dotNumber || null,
      });
      if (result?.success !== false) {
        setLastSavedData(formData);
        clearTimeout(personalRevertTimerRef.current);
        personalRevertTimerRef.current = setTimeout(() => {
          setPersonalButtonState('default');
          isPersonalSavedRef.current = false;
        }, 3000);
      } else {
        throw new Error(result?.error || 'Failed to update profile');
      }
    } catch (e) {
      setPersonalButtonState('default');
      isPersonalSavedRef.current = false;
      setPersonalErrorMsg({
        type: 'error',
        text: e.message || 'Could not save personal info. Please try again.',
      });
      autoHide(setPersonalErrorMsg);
    }
  };

  // ---------- Password handlers ----------
  const schedulePwdValidation = (nextNew, nextConfirm, which) => {
    clearTimeout(typingTimerRef.current[which]);
    typingTimerRef.current[which] = setTimeout(() => {
      setPasswordErrors(buildPwdErrors(nextNew, nextConfirm));
    }, 600);
  };

  const handleCurrentPasswordChange = (e) => {
    setPwdTouched((t) => ({ ...t, current: true }));
    setPassword((prev) => ({ ...prev, currentPassword: e.target.value }));
    if (passwordErrors.currentPassword)
      setPasswordErrors((p) => ({ ...p, currentPassword: '' }));
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

  const pwdValid = validatePassword(password.newPassword).ok;
  const pwdMatch =
    password.newPassword &&
    password.confirmPassword &&
    password.newPassword === password.confirmPassword;
  const pwdDirty =
    !!password.currentPassword ||
    !!password.newPassword ||
    !!password.confirmPassword;

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    const v = validatePassword(password.newPassword);
    if (!password.currentPassword)
      errs.currentPassword = 'Current password is required';
    if (!password.newPassword) errs.newPassword = 'New password is required';
    else if (!v.ok)
      errs.newPassword =
        'At least 8 characters, 1 uppercase, 1 lowercase, 1 special character.';
    if (!password.confirmPassword)
      errs.confirmPassword = 'Please confirm your password';
    else if (password.confirmPassword !== password.newPassword)
      errs.confirmPassword = 'Passwords do not match';
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
      if (result?.success !== false) {
        setPassword({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setPasswordErrors({});
        setPwdTouched({ current: false, new: false, confirm: false });
        clearTimeout(passwordRevertTimerRef.current);
        passwordRevertTimerRef.current = setTimeout(() => {
          setPasswordButtonState('default');
          isPasswordSavedRef.current = false;
        }, 3000);
      } else {
        throw new Error(result?.error || 'Failed to update password');
      }
    } catch (err) {
      setPasswordButtonState('default');
      isPasswordSavedRef.current = false;
      setPasswordErrorMsg({
        type: 'error',
        text: err.message || 'Could not save password. Please try again.',
      });
      autoHide(setPasswordErrorMsg);
    }
  };

  // ---------- Notifications handler ----------
  const scheduleNotificationsSavedHide = () => {
    clearTimeout(notificationsSavedTimerRef.current);
    setNotificationsSavedMsg(true);
    notificationsSavedTimerRef.current = setTimeout(
      () => setNotificationsSavedMsg(false),
      1200
    );
  };

  const handleNotificationChange = (category, channel, checked) => {
    const toggleKey = `${category}.${channel}`;
    setNotifications((prev) => ({
      ...prev,
      [category]: { ...prev[category], [channel]: checked },
    }));
    setNotificationsSaving((prev) => ({ ...prev, [toggleKey]: true }));
    setNotificationsErrorMsg(null);

    updateProfile({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      mcNumber: user.mcNumber || null,
      dotNumber: user.dotNumber || null,
      preferences: {
        ...user.preferences,
        notifications: {
          ...user.preferences?.notifications,
          [category]: {
            ...(user.preferences?.notifications?.[category] || {}),
            [channel]: checked,
          },
        },
      },
    })
      .then(() => scheduleNotificationsSavedHide())
      .catch(() => {
        setNotifications((prev) => ({
          ...prev,
          [category]: { ...prev[category], [channel]: !checked },
        }));
        setNotificationsErrorMsg({
          type: 'error',
          text: 'Could not save notification preference. Please try again.',
        });
        autoHide(setNotificationsErrorMsg);
      })
      .finally(() => {
        setNotificationsSaving((prev) => ({ ...prev, [toggleKey]: false }));
      });
  };

  const isBusy = (id, channel) =>
    !!notificationsSaving[`${id}.${channel}`] || isDeactivated;

  // ---------- Account management ----------
  const handleDeactivate = async () => {
    setIsDeactivating(true);
    setDeactivateModalMsg(null);
    try {
      const result = await deactivateAccount();
      if (result.ok) {
        setDeactivateModalMsg({
          type: 'success',
          text: 'Account deactivated successfully. Logging out…',
        });
        setTimeout(() => {
          localStorage.removeItem('authToken');
          localStorage.removeItem('token');
          if (logout) logout();
          window.location.href = '/login';
        }, 2000);
      } else {
        setDeactivateModalMsg({
          type: 'error',
          text: result.error || 'Failed to deactivate account.',
        });
        setIsDeactivating(false);
      }
    } catch (e) {
      setDeactivateModalMsg({
        type: 'error',
        text: 'An unexpected error occurred. Please try again.',
      });
      setIsDeactivating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteModalMsg(null);
    try {
      const result = await deleteAccount();
      if (result.ok) {
        setDeleteModalMsg({
          type: 'success',
          text: result.message || 'Account deleted. Redirecting…',
        });
        setTimeout(() => {
          localStorage.removeItem('authToken');
          localStorage.removeItem('token');
          if (logout) logout();
          window.location.href = '/login';
        }, 2000);
      } else {
        setDeleteModalMsg({
          type: 'error',
          text: result.error || 'Failed to delete account.',
        });
        setIsDeleting(false);
      }
    } catch (e) {
      setDeleteModalMsg({
        type: 'error',
        text: 'An unexpected error occurred. Please try again.',
      });
      setIsDeleting(false);
    }
  };

  const initials =
    `${(lastSavedData.firstName || '').charAt(0)}${(lastSavedData.lastName || '').charAt(0)}`.toUpperCase() ||
    'U';

  const personalButtonDisplay =
    isPersonalSavedRef.current || personalButtonState === 'saved'
      ? 'saved'
      : 'default';
  const passwordButtonDisplay =
    isPasswordSavedRef.current || passwordButtonState === 'saved'
      ? 'saved'
      : 'default';

  const notificationRows = [
    {
      id: 'shipment',
      icon: Truck,
      title: 'Load Status Updates',
      description:
        "Get notified about new loads, status changes, and pickup/delivery events.",
      channels: ['email', 'sms'],
    },
    {
      id: 'payments',
      icon: FileText,
      title: 'Payment & Receipts',
      description:
        'Receive payout confirmations and receipt emails.',
      channels: ['email', 'sms'],
    },
    {
      id: 'quotes',
      icon: Tag,
      title: 'Quote & Offer Updates',
      description: "Get alerts when there's activity on your offers.",
      channels: ['email', 'sms'],
    },
  ];

  if (!user) {
    return (
      <div className="customer-profile">
        <div className="error-state">
          <h2 className="error-title">You're not logged in</h2>
          <p className="error-message">Sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="customer-profile">
        <div className="profile-header">
          <div className="profile-info">
            <div className="avatar">{initials}</div>
            <div className="user-details">
              <h1 className="user-name">
                {lastSavedData.firstName} {lastSavedData.lastName}
                {isDeactivated && (
                  <span className="deactivated-badge">• Deactivated</span>
                )}
              </h1>
              <p className="user-email">{lastSavedData.email}</p>
            </div>
          </div>
        </div>

        {isDeactivated && (
          <div className="deactivated-banner">
            Your account is deactivated. Log in again to reactivate.
          </div>
        )}

        <div className="profile-content">
          {/* ===== Personal Information ===== */}
          <div className="profile-section">
            <div className="section-header">
              <h2>Personal Information</h2>
            </div>
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
                {formErrors.firstName && (
                  <span className="field-error">{formErrors.firstName}</span>
                )}
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
                {formErrors.lastName && (
                  <span className="field-error">{formErrors.lastName}</span>
                )}
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
                {formErrors.phone && (
                  <span className="field-error">{formErrors.phone}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="disabled"
                />
                <span className="field-note">
                  Contact support to change your email.
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="mcNumber">MC Number</label>
                <input
                  id="mcNumber"
                  name="mcNumber"
                  inputMode="numeric"
                  placeholder="e.g. 1234567"
                  value={formData.mcNumber}
                  onChange={handleInputChange}
                  disabled={personalButtonDisplay === 'saved' || isDeactivated}
                />
              </div>

              <div className="form-group">
                <label htmlFor="dotNumber">DOT Number</label>
                <input
                  id="dotNumber"
                  name="dotNumber"
                  inputMode="numeric"
                  placeholder="e.g. 12345678"
                  value={formData.dotNumber}
                  onChange={handleInputChange}
                  disabled={personalButtonDisplay === 'saved' || isDeactivated}
                />
              </div>
            </div>

            <div className="section-actions">
              <button
                className="btn btn-primary"
                data-state={personalButtonDisplay}
                onClick={handleSavePersonalInfo}
                disabled={
                  (personalButtonDisplay === 'default' && !hasPersonalChanges) ||
                  isDeactivated
                }
                style={
                  personalButtonDisplay === 'saved'
                    ? {
                        background: '#10b981',
                        borderColor: '#10b981',
                        color: 'white',
                        pointerEvents: 'none',
                      }
                    : {}
                }
              >
                {personalButtonDisplay === 'saved'
                  ? '✓ Saved'
                  : 'Save Changes'}
              </button>
              <div className="section-status-container">
                {personalErrorMsg?.text && (
                  <div
                    className={`section-status ${personalErrorMsg.type || ''}`}
                  >
                    {personalErrorMsg.text}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===== Change Password ===== */}
          <div className="profile-section">
            <div className="section-header">
              <h2>Change Password</h2>
            </div>
            <form onSubmit={handlePasswordSubmit} noValidate>
              <div className="form-vertical">
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <div className="simple-password">
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={password.currentPassword}
                      onChange={handleCurrentPasswordChange}
                      disabled={
                        passwordButtonDisplay === 'saved' || isDeactivated
                      }
                      autoComplete="current-password"
                      className={passwordErrors.currentPassword ? 'error' : ''}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      className="simple-toggle"
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                      aria-label={
                        showCurrentPassword ? 'Hide password' : 'Show password'
                      }
                      tabIndex={-1}
                    >
                      {showCurrentPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                  {pwdTouched.current && passwordErrors.currentPassword && (
                    <span className="field-error">
                      {passwordErrors.currentPassword}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <div className="simple-password">
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={password.newPassword}
                      onChange={handleNewPasswordChange}
                      disabled={
                        passwordButtonDisplay === 'saved' || isDeactivated
                      }
                      autoComplete="new-password"
                      className={passwordErrors.newPassword ? 'error' : ''}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      className="simple-toggle"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={
                        showNewPassword ? 'Hide password' : 'Show password'
                      }
                      tabIndex={-1}
                    >
                      {showNewPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                  {pwdTouched.new && passwordErrors.newPassword && (
                    <span className="field-error">
                      {passwordErrors.newPassword}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <div className="simple-password">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={password.confirmPassword}
                      onChange={handleConfirmPasswordChange}
                      disabled={
                        passwordButtonDisplay === 'saved' || isDeactivated
                      }
                      autoComplete="new-password"
                      className={passwordErrors.confirmPassword ? 'error' : ''}
                      placeholder="Re-enter new password"
                    />
                    <button
                      type="button"
                      className="simple-toggle"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      aria-label={
                        showConfirmPassword ? 'Hide password' : 'Show password'
                      }
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                  {pwdTouched.confirm && passwordErrors.confirmPassword && (
                    <span className="field-error">
                      {passwordErrors.confirmPassword}
                    </span>
                  )}
                </div>
              </div>

              <div className="section-actions">
                <button
                  className={`btn btn-primary ${pwdDirty ? 'is-dirty' : ''}`}
                  data-state={passwordButtonDisplay}
                  type="submit"
                  disabled={
                    (passwordButtonDisplay === 'default' &&
                      (!pwdValid || !pwdMatch || !password.currentPassword)) ||
                    isDeactivated
                  }
                  style={
                    passwordButtonDisplay === 'saved'
                      ? {
                          background: '#10b981',
                          borderColor: '#10b981',
                          color: 'white',
                          pointerEvents: 'none',
                        }
                      : {}
                  }
                >
                  {passwordButtonDisplay === 'saved'
                    ? '✓ Saved'
                    : 'Save Changes'}
                </button>
                <div className="section-status-container">
                  {passwordErrorMsg?.text && (
                    <div
                      className={`section-status ${passwordErrorMsg.type || ''}`}
                    >
                      {passwordErrorMsg.text}
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* ===== Notifications ===== */}
          <div className="profile-section">
            <div className="section-header">
              <h2>
                Notifications
                {notificationsSavedMsg && (
                  <span className="notifications-saved-indicator">
                    ✓ Saved
                  </span>
                )}
              </h2>
              <p className="section-subtitle">
                Choose how you'd like to be notified about important updates.
              </p>
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
                  <div
                    key={row.id}
                    className="notifications-row notifications-grid"
                  >
                    <div className="notifications-row-icon">
                      <row.icon
                        className="notification-icon"
                        size={18}
                        strokeWidth={1.6}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="notifications-row-content">
                      <h4 className="notifications-row-title">{row.title}</h4>
                      <p className="notifications-row-description">
                        {row.description}
                      </p>
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
                          if (!isBusy(row.id, 'email'))
                            handleNotificationChange(
                              row.id,
                              'email',
                              e.target.checked
                            );
                        }}
                        aria-hidden="true"
                        tabIndex={-1}
                      />
                      <span className="toggle-slider" />
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
                          if (!isBusy(row.id, 'sms'))
                            handleNotificationChange(
                              row.id,
                              'sms',
                              e.target.checked
                            );
                        }}
                        aria-hidden="true"
                        tabIndex={-1}
                      />
                      <span className="toggle-slider" />
                      <span className="mobile-label">SMS</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {notificationsErrorMsg?.text && (
              <div className="section-status-container">
                <div
                  className={`section-status ${notificationsErrorMsg.type || ''}`}
                >
                  {notificationsErrorMsg.text}
                </div>
              </div>
            )}
          </div>

          {/* ===== Account Management ===== */}
          <div className="profile-section">
            <div className="section-header">
              <h2>Account Management</h2>
            </div>
            <div className="account-actions">
              <div className="action-card">
                <div className="action-content">
                  <h4>Deactivate Account</h4>
                  <p>
                    Temporarily disable your account. You can reactivate it
                    later by logging in.
                  </p>
                </div>
                <div className="action-cta">
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowDeactivateModal(true)}
                    disabled={isDeactivated}
                  >
                    {isDeactivated
                      ? 'Account Deactivated'
                      : 'Deactivate Account'}
                  </button>
                </div>
              </div>

              <div className="action-card">
                <div className="action-content">
                  <h4>Delete Account</h4>
                  <p>
                    Permanently delete your account and all data. This action
                    cannot be undone.
                  </p>
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

        <ConfirmModal
          open={showDeactivateModal}
          onClose={() => {
            setShowDeactivateModal(false);
            setDeactivateModalMsg(null);
          }}
          onConfirm={handleDeactivate}
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

        <ConfirmModal
          open={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeleteModalMsg(null);
          }}
          onConfirm={handleDelete}
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

      <LiveChat />
    </>
  );
};

export default CarrierProfile;
