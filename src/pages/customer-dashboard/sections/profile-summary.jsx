import React, { useEffect } from 'react';

const ProfileSummary = ({ profile, onEditProfile }) => {
  useEffect(() => {
    if (profile && !profile.completionStatus.isComplete && window.analytics) {
      window.analytics.track('customer_profile_complete_prompt_shown', {
        missingFields: profile.completionStatus.missingFields
      });
    }
  }, [profile]);

  if (!profile) {
    return (
      <div className="dashboard-card profile-summary">
        <div className="card-header">
          <h2 className="card-title">Profile Summary</h2>
        </div>
        <div className="empty-state">
          <div className="empty-title">Profile Not Available</div>
          <div className="empty-description">
            Unable to load your profile information.
          </div>
          <button className="btn-primary" onClick={onEditProfile}>
            Edit Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-card profile-summary">
      <div className="card-header">
        <h2 className="card-title">Profile Summary</h2>
      </div>

      <div className="profile-info">
        <div className="profile-field">
          <span className="profile-label">Name:</span>
          <span className="profile-value">
            {profile.name || '—'}
          </span>
        </div>

        <div className="profile-field">
          <span className="profile-label">Email:</span>
          <span className="profile-value">
            {profile.email || '—'}
            {profile.verified.email && (
              <span className="verified-text">✓ Verified</span>
            )}
          </span>
        </div>

        <div className="profile-field">
          <span className="profile-label">Phone:</span>
          <span className="profile-value">
            {profile.phone || '—'}
            {profile.verified.phone && (
              <span className="verified-text">✓ Verified</span>
            )}
          </span>
        </div>

        <div className="profile-field">
          <span className="profile-label">Company:</span>
          <span className="profile-value">
            {profile.company || '—'}
          </span>
        </div>

        <div className="profile-field">
          <span className="profile-label">Address:</span>
          <span className="profile-value">
            {profile.address || '—'}
          </span>
        </div>
      </div>

      {!profile.completionStatus.isComplete && (
        <div className="profile-incomplete-note">
          <div style={{ marginBottom: '12px' }}>
            Complete your profile to speed up bookings.
          </div>
          <button className="btn-primary" onClick={onEditProfile}>
            Complete Profile
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileSummary;