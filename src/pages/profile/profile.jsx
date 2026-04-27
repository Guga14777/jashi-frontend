// src/pages/profile/profile.jsx
// Carrier portal profile page (rendered for /profile under CarrierLayout).
// Uses the .carrier-profile / .profile-section / .form-group system that
// the rest of the app already styles in profile.css.

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../store/auth-context.jsx";
import { API_BASE } from "../../lib/api-url.js";
import "./profile.css";

const initialsOf = (firstName, lastName, email) => {
  const a = (firstName || "").trim().charAt(0);
  const b = (lastName || "").trim().charAt(0);
  if (a || b) return `${a}${b}`.toUpperCase();
  return (email || "?").trim().charAt(0).toUpperCase();
};

export default function CarrierProfile() {
  const { user, token, refreshUser } = useAuth();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!user) return;
    setForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      phone: user.phone || "",
    });
  }, [user]);

  const isDirty = useMemo(() => {
    if (!user) return false;
    return (
      form.firstName !== (user.firstName || "") ||
      form.lastName !== (user.lastName || "") ||
      form.phone !== (user.phone || "")
    );
  }, [form, user]);

  if (!user) {
    return (
      <div className="carrier-profile">
        <div className="error-state">
          <h2 className="error-title">You're not logged in</h2>
          <p className="error-message">Sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  const handleChange = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleCancel = () => {
    setForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      phone: user.phone || "",
    });
    setEditing(false);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!isDirty) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`${API_BASE}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || data.message || `Save failed (${response.status})`);
      }
      if (typeof refreshUser === "function") {
        await refreshUser();
      }
      setEditing(false);
      setMessage({ type: "success", text: "Profile updated." });
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Could not save." });
    } finally {
      setSaving(false);
    }
  };

  const initials = initialsOf(user.firstName, user.lastName, user.email);
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  return (
    <div className="carrier-profile">
      <div className="profile-header">
        <div className="profile-info">
          <div className="avatar" aria-hidden="true">{initials}</div>
          <div className="user-details">
            <h1 className="page-title">My Profile</h1>
            <p className="page-subtitle">Manage your carrier account info</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`message ${message.type}`} role="status">
          <span>{message.text}</span>
          <button
            type="button"
            className="message-close"
            onClick={() => setMessage(null)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <div className="profile-content">
        <section className="profile-section">
          <div className="section-header">
            <h2>Account details</h2>
          </div>

          <div className="form-vertical">
            <div
              className="form-group"
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
            >
              <div>
                <label htmlFor="profile-first-name">First name</label>
                <input
                  id="profile-first-name"
                  type="text"
                  value={form.firstName}
                  onChange={handleChange("firstName")}
                  disabled={!editing || saving}
                  className={editing ? "" : "disabled"}
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label htmlFor="profile-last-name">Last name</label>
                <input
                  id="profile-last-name"
                  type="text"
                  value={form.lastName}
                  onChange={handleChange("lastName")}
                  disabled={!editing || saving}
                  className={editing ? "" : "disabled"}
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="profile-email">Email</label>
              <input
                id="profile-email"
                type="email"
                value={form.email}
                disabled
                className="disabled"
                autoComplete="email"
              />
              <p className="field-note">Contact support to change your email.</p>
            </div>

            <div className="form-group">
              <label htmlFor="profile-phone">Phone</label>
              <input
                id="profile-phone"
                type="tel"
                value={form.phone}
                onChange={handleChange("phone")}
                disabled={!editing || saving}
                className={editing ? "" : "disabled"}
                autoComplete="tel"
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  border: "1px solid var(--border-light, #e5e7eb)",
                  borderRadius: 999,
                  background: "#f5f9ff",
                  color: "#0a58ff",
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: 0.4,
                  width: "fit-content",
                }}
              >
                CARRIER
              </div>
            </div>
          </div>

          <div className="section-actions">
            <div className="section-status-container" aria-hidden="true" />
            {editing ? (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
