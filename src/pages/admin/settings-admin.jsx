// src/pages/admin/settings-admin.jsx
// Platform settings — detention thresholds, fees, alert windows.
// Reads allowed for all admins; writes gated at ADMIN_SUPER on the backend.

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/auth-context.jsx';
import { AdminSettingsAPI, AdminAutomationAPI } from '../../services/admin.api.js';
import { RefreshCw, Save, AlertCircle, Zap } from 'lucide-react';
import './settings-admin.css';

export default function SettingsAdmin() {
  const { token } = useAuth();
  const [settings, setSettings] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);
  const [scanningNow, setScanningNow] = useState(false);

  const fetchSettings = async () => {
    setLoading(true); setError(null);
    try {
      const data = await AdminSettingsAPI.list(token);
      setSettings(data.settings || []);
      const d = {};
      (data.settings || []).forEach((s) => { d[s.key] = s.value; });
      setDrafts(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchSettings(); }, [token]);

  const save = async (key) => {
    setSavingKey(key); setError(null); setFlash(null);
    try {
      await AdminSettingsAPI.update(key, drafts[key], token);
      setFlash(`${key} saved`);
      await fetchSettings();
      setTimeout(() => setFlash(null), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingKey(null);
    }
  };

  const runAutomationNow = async () => {
    setScanningNow(true); setError(null); setFlash(null);
    try {
      const { scanned, newlyFlagged } = await AdminAutomationAPI.runNow(token);
      setFlash(`Scanned ${scanned} open orders · ${newlyFlagged} new alert${newlyFlagged === 1 ? '' : 's'}`);
      setTimeout(() => setFlash(null), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setScanningNow(false);
    }
  };

  return (
    <div className="admin-page settings-page">
      <header className="admin-page-header">
        <div className="admin-page-title">
          <h1>Platform Settings</h1>
          <p>Thresholds and fees — writes require ADMIN_SUPER.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="setting-save"
            onClick={runAutomationNow}
            disabled={scanningNow}
            title="Scan all open orders for stuck/delayed/pricing alerts now"
          >
            <Zap size={14} /> {scanningNow ? 'Scanning…' : 'Run automation scan'}
          </button>
          <button className="refresh-btn" onClick={fetchSettings} title="Refresh">
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </header>

      {error && <div className="settings-error"><AlertCircle size={16} /> {error}</div>}
      {flash && <div className="settings-flash">{flash}</div>}

      {loading && settings.length === 0 ? (
        <div className="settings-loading"><RefreshCw className="spin" size={18} /> Loading…</div>
      ) : (
        <div className="settings-grid">
          {settings.map((s) => {
            const dirty = String(drafts[s.key] ?? '') !== String(s.value ?? '');
            return (
              <div key={s.key} className="setting-row">
                <div className="setting-info">
                  <div className="setting-key">
                    {s.key}
                    {s.isDefault && <span className="setting-default-pill">default</span>}
                  </div>
                  <div className="setting-desc">{s.description}</div>
                  {(s.min !== undefined || s.max !== undefined) && (
                    <div className="setting-range">
                      Range: {s.min ?? '–'} to {s.max ?? '–'}
                    </div>
                  )}
                  {s.updatedAt && (
                    <div className="setting-meta">
                      Last changed: {new Date(s.updatedAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="setting-control">
                  <input
                    type={s.type === 'number' ? 'number' : 'text'}
                    min={s.min}
                    max={s.max}
                    value={drafts[s.key] ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: s.type === 'number' ? Number(e.target.value) : e.target.value }))}
                  />
                  <button
                    type="button"
                    className="setting-save"
                    disabled={!dirty || savingKey === s.key}
                    onClick={() => save(s.key)}
                  >
                    <Save size={14} /> {savingKey === s.key ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
