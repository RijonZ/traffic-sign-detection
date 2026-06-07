import { useEffect, useState } from "react";
import Navbar from "../shared/Navbar";
import "../styles/settings.css";

import { API_BASE_URL } from "../config/api";

const DEFAULT_SETTINGS = {
  maxUploadSize: "5",
  acceptedFormats: "JPG, PNG, WEBP",
  retentionDays: "90",
  confidenceThreshold: "80",
  notificationsEnabled: true,
  auditLoggingEnabled: true,
  maintenanceMode: false,
};

function Toggle({ checked, onChange, id, danger }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      className={`settings-toggle-switch${checked ? " settings-toggle-switch--on" : ""}${danger && checked ? " settings-toggle-switch--danger" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="settings-toggle-thumb" />
    </button>
  );
}

function SettingsPage({ currentUser, onLogout, onNavigate }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: "success"|"error", text }
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(saved);

  useEffect(() => {
    if (!currentUser?.email) return;
    fetch(`${API_BASE_URL}/admin/settings?adminEmail=${encodeURIComponent(currentUser.email)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSettings(data);
          setSaved(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentUser?.email]);

  function update(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setFeedback(null);
  }

  function validateFrontend() {
    const mb = Number(settings.maxUploadSize);
    if (!Number.isFinite(mb) || mb < 1 || mb > 100)
      return "Upload size must be between 1 and 100 MB.";
    const ct = Number(settings.confidenceThreshold);
    if (!Number.isFinite(ct) || ct < 0 || ct > 100)
      return "Confidence threshold must be between 0 and 100.";
    const rd = Number(settings.retentionDays);
    if (!Number.isInteger(rd) || rd < 1 || rd > 3650)
      return "Retention days must be a whole number between 1 and 3650.";
    if (!String(settings.acceptedFormats).trim())
      return "Accepted formats cannot be empty.";
    return null;
  }

  async function handleSave(e) {
    e.preventDefault();
    const err = validateFrontend();
    if (err) { setFeedback({ type: "error", text: err }); return; }

    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/settings?adminEmail=${encodeURIComponent(currentUser.email)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: data.message || "Could not save settings." });
        return;
      }
      setSettings(data);
      setSaved(data);
      setFeedback({ type: "success", text: "Settings saved successfully." });
    } catch {
      setFeedback({ type: "error", text: "Could not connect to server." });
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setShowResetConfirm(false);
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/settings?adminEmail=${encodeURIComponent(currentUser.email)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(DEFAULT_SETTINGS),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: data.message || "Could not reset settings." });
        return;
      }
      setSettings(data);
      setSaved(data);
      setFeedback({ type: "success", text: "Settings reset to defaults." });
    } catch {
      setSettings(DEFAULT_SETTINGS);
      setSaved(DEFAULT_SETTINGS);
      setFeedback({ type: "success", text: "Settings reset to defaults (local)." });
    } finally {
      setSaving(false);
    }
  }

  if (!currentUser || currentUser.role !== "Administrator") {
    return (
      <div className="home">
        <Navbar currentUser={currentUser} onLogout={onLogout} onNavigate={onNavigate} />
        <main className="page-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "48px", marginBottom: "16px" }}>🔒</p>
            <h2 style={{ margin: "0 0 8px" }}>Admin access only</h2>
            <p style={{ color: "#64748b", marginBottom: "24px" }}>Only administrators can manage system settings.</p>
            <button className="secondary-btn" onClick={() => onNavigate("home")}>Go home</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="home">
      <Navbar currentUser={currentUser} onLogout={onLogout} onNavigate={onNavigate} />

      <main className="page-shell">
        <section className="dashboard-header">
          <div>
            <span className="eyebrow">Administration</span>
            <h1>Settings</h1>
            <p>Configure application defaults for uploads, detection, and system behavior.</p>
          </div>
          <button className="secondary-btn" onClick={() => onNavigate("admin-dashboard")}>
            Back to Admin Dashboard
          </button>
        </section>

        {loading ? (
          <div className="settings-loading">Loading current settings…</div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="settings-grid">

              {/* ── Detection Defaults ── */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-icon settings-card-icon--blue">
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </div>
                  <div>
                    <h2>Detection Defaults</h2>
                    <p>File upload and model inference settings.</p>
                  </div>
                </div>

                <div className="settings-field">
                  <label htmlFor="maxUploadSize">
                    Maximum upload size
                    <span className="settings-field-hint">1 – 100 MB</span>
                  </label>
                  <div className="settings-input-addon">
                    <input
                      id="maxUploadSize"
                      type="number"
                      min="1"
                      max="100"
                      value={settings.maxUploadSize}
                      onChange={(e) => update("maxUploadSize", e.target.value)}
                    />
                    <span>MB</span>
                  </div>
                </div>

                <div className="settings-field">
                  <label htmlFor="acceptedFormats">
                    Accepted image formats
                    <span className="settings-field-hint">Comma-separated (e.g. JPG, PNG)</span>
                  </label>
                  <input
                    id="acceptedFormats"
                    type="text"
                    value={settings.acceptedFormats}
                    onChange={(e) => update("acceptedFormats", e.target.value)}
                    placeholder="JPG, PNG, WEBP"
                  />
                </div>

                <div className="settings-field">
                  <label htmlFor="confidenceThreshold">
                    Minimum confidence threshold
                    <span className="settings-field-hint">0 – 100%</span>
                  </label>
                  <div className="settings-input-addon">
                    <input
                      id="confidenceThreshold"
                      type="number"
                      min="0"
                      max="100"
                      value={settings.confidenceThreshold}
                      onChange={(e) => update("confidenceThreshold", e.target.value)}
                    />
                    <span>%</span>
                  </div>
                  <div className="settings-range-bar">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.confidenceThreshold}
                      onChange={(e) => update("confidenceThreshold", e.target.value)}
                    />
                    <div className="settings-range-labels">
                      <span>0%</span><span>50%</span><span>100%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── System Behavior ── */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-icon settings-card-icon--purple">
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <div>
                    <h2>System Behavior</h2>
                    <p>Data retention and operational controls.</p>
                  </div>
                </div>

                <div className="settings-field">
                  <label htmlFor="retentionDays">
                    Detection history retention
                    <span className="settings-field-hint">Days before auto-deletion</span>
                  </label>
                  <div className="settings-input-addon">
                    <input
                      id="retentionDays"
                      type="number"
                      min="1"
                      max="3650"
                      value={settings.retentionDays}
                      onChange={(e) => update("retentionDays", e.target.value)}
                    />
                    <span>days</span>
                  </div>
                </div>

                <div className="settings-toggles">
                  <div className="settings-toggle-row">
                    <div className="settings-toggle-info">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                      <div>
                        <strong>Notifications</strong>
                        <p>Show system notifications in the sidebar menu.</p>
                      </div>
                    </div>
                    <Toggle
                      id="notificationsEnabled"
                      checked={settings.notificationsEnabled}
                      onChange={(v) => update("notificationsEnabled", v)}
                    />
                  </div>

                  <div className="settings-toggle-row">
                    <div className="settings-toggle-info">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>
                      <div>
                        <strong>Audit logging</strong>
                        <p>Record important admin and detection events.</p>
                      </div>
                    </div>
                    <Toggle
                      id="auditLoggingEnabled"
                      checked={settings.auditLoggingEnabled}
                      onChange={(v) => update("auditLoggingEnabled", v)}
                    />
                  </div>

                  <div className="settings-toggle-row settings-toggle-row--danger">
                    <div className="settings-toggle-info">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      <div>
                        <strong>Maintenance mode</strong>
                        <p>Pauses all user-facing detection. Users will see a downtime notice.</p>
                      </div>
                    </div>
                    <Toggle
                      id="maintenanceMode"
                      checked={settings.maintenanceMode}
                      onChange={(v) => update("maintenanceMode", v)}
                      danger
                    />
                  </div>

                  {settings.maintenanceMode && (
                    <div className="settings-warning">
                      Maintenance mode is active. Users cannot submit new detections.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Footer bar ── */}
            <div className="settings-footer">
              <div className="settings-footer-left">
                {hasChanges && !feedback && (
                  <span className="settings-unsaved">Unsaved changes</span>
                )}
                {feedback && (
                  <span className={`settings-feedback settings-feedback--${feedback.type}`}>
                    {feedback.text}
                  </span>
                )}
              </div>
              <div className="settings-footer-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={saving}
                  onClick={() => setShowResetConfirm(true)}
                >
                  Reset to defaults
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={saving || !hasChanges}
                >
                  {saving ? "Saving…" : "Save settings"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ── Confirm reset modal ── */}
        {showResetConfirm && (
          <div className="report-modal-overlay" onClick={() => setShowResetConfirm(false)}>
            <div className="report-modal" style={{ maxWidth: "400px" }} onClick={(e) => e.stopPropagation()}>
              <div className="report-modal-header">
                <h3 className="report-modal-title">Reset to defaults?</h3>
              </div>
              <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 24px" }}>
                This will overwrite all current settings with the original default values.
                This action cannot be undone.
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button className="secondary-btn" onClick={() => setShowResetConfirm(false)}>
                  Cancel
                </button>
                <button className="primary-btn" style={{ background: "#dc2626" }} onClick={handleReset}>
                  Yes, reset
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default SettingsPage;
