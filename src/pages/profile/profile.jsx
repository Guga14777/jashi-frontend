// src/pages/profile/profile.jsx
import React from "react";

// OPTION A: if you have the @ alias set in vite.config.js
import { useAuth } from "@/store/auth-context.jsx";

// OPTION B (use this if OPTION A throws “Failed to resolve import”):
// import { useAuth } from "../../store/auth-context.jsx";

import "./profile.css";

export default function CustomerProfile() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="profile-page">
        <h1>Profile</h1>
        <p>You’re not logged in.</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <h1>Profile</h1>

      <div className="profile-card">
        <div className="profile-row">
          <div className="profile-label">First name</div>
          <div className="profile-value">{user.firstName || "—"}</div>
        </div>

        <div className="profile-row">
          <div className="profile-label">Last name</div>
          <div className="profile-value">{user.lastName || "—"}</div>
        </div>

        <div className="profile-row">
          <div className="profile-label">Email</div>
          <div className="profile-value">{user.email}</div>
        </div>

        <div className="profile-row">
          <div className="profile-label">Phone</div>
          <div className="profile-value">{user.phone || "—"}</div>
        </div>

        <div className="profile-row">
          <div className="profile-label">Role</div>
          <div className="profile-value">{user.role || "customer"}</div>
        </div>
      </div>
    </div>
  );
}
