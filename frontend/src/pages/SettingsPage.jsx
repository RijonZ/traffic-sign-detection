import { useMemo, useState } from "react";
import Navbar from "../shared/Navbar";
import "../styles/auth.css";
import "../styles/dashboard.css";
import "../styles/settings.css";

const SETTINGS_KEY = "traffic-sign-settings";

const defaultSettings = {
  maxUploadSize: "5",
  acceptedFormats: "JPG, PNG, WEBP",
  retentionDays: "90",
  confidenceThreshold: "80",
  notificationsEnabled: true,
  auditLoggingEnabled: true,
  maintenanceMode: false,
};

function readSettings() {
  return {
    ...defaultSettings,
    ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"),
  };
}

function SettingsPage({ currentUser, onLogout, onNavigate }) {
  const initialSettings = useMemo(readSettings, []);
  const [settings, setSettings] = useState(initialSettings);
  const [message, setMessage] = useState("");

  function updateSetting(key, value) {
    setSettings((currentSettings) => ({ ...currentSettings, [key]: value }));
    setMessage("");
  }

  function saveSettings(event) {
    event.preventDefault();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setMessage("Settings saved for this demo workspace.");
  }

  function resetSettings() {
    setSettings(defaultSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
    setMessage("Default settings restored.");
  }

  if (!currentUser) {
    return (
      <div className="home">
        <Navbar onNavigate={onNavigate} />
        <main className="page-shell">
          <section className="auth-card">
            <h1>Sign in required</h1>
            <p>You need an administrator account before opening system settings.</p>
            <button className="primary-btn" onClick={() => onNavigate("login")}>
              Go to login
            </button>
          </section>
        </main>
      </div>
    );
  }

  if (currentUser.role !== "Administrator") {
    return (
      <div className="home">
        <Navbar currentUser={currentUser} onLogout={onLogout} onNavigate={onNavigate} />
        <main className="page-shell">
          <section className="auth-card">
            <h1>Admin access only</h1>
            <p>Only administrators can update system settings.</p>
            <button className="secondary-btn" onClick={() => onNavigate("home")}>
              Back home
            </button>
          </section>
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
            <p>Configure application defaults for uploads, retention, notifications, and audit behavior.</p>
          </div>
          <button className="secondary-btn" onClick={() => onNavigate("admin-dashboard")}>
            Back to Admin Dashboard
          </button>
        </section>

        <form className="settings-layout" onSubmit={saveSettings}>
          <section className="settings-panel">
            <div className="panel-title">
              <h2>Detection Defaults</h2>
            </div>

            <label htmlFor="max-upload-size">Maximum upload size</label>
            <div className="settings-input-row">
              <input
                id="max-upload-size"
                min="1"
                max="50"
                type="number"
                value={settings.maxUploadSize}
                onChange={(event) => updateSetting("maxUploadSize", event.target.value)}
              />
              <span>MB</span>
            </div>

            <label htmlFor="accepted-formats">Accepted image formats</label>
            <input
              id="accepted-formats"
              value={settings.acceptedFormats}
              onChange={(event) => updateSetting("acceptedFormats", event.target.value)}
            />

            <label htmlFor="confidence-threshold">Minimum confidence threshold</label>
            <div className="settings-input-row">
              <input
                id="confidence-threshold"
                min="0"
                max="100"
                type="number"
                value={settings.confidenceThreshold}
                onChange={(event) => updateSetting("confidenceThreshold", event.target.value)}
              />
              <span>%</span>
            </div>
          </section>

          <section className="settings-panel">
            <div className="panel-title">
              <h2>System Behavior</h2>
            </div>

            <label htmlFor="retention-days">Detection history retention</label>
            <div className="settings-input-row">
              <input
                id="retention-days"
                min="1"
                type="number"
                value={settings.retentionDays}
                onChange={(event) => updateSetting("retentionDays", event.target.value)}
              />
              <span>days</span>
            </div>

            <div className="settings-toggle">
              <div>
                <strong>Notifications</strong>
                <p>Show system notifications in the sidebar menu.</p>
              </div>
              <input
                checked={settings.notificationsEnabled}
                type="checkbox"
                onChange={(event) => updateSetting("notificationsEnabled", event.target.checked)}
              />
            </div>

            <div className="settings-toggle">
              <div>
                <strong>Audit logging</strong>
                <p>Record important admin and detection events.</p>
              </div>
              <input
                checked={settings.auditLoggingEnabled}
                type="checkbox"
                onChange={(event) => updateSetting("auditLoggingEnabled", event.target.checked)}
              />
            </div>

            <div className="settings-toggle">
              <div>
                <strong>Maintenance mode</strong>
                <p>Temporarily pause user-facing detection actions.</p>
              </div>
              <input
                checked={settings.maintenanceMode}
                type="checkbox"
                onChange={(event) => updateSetting("maintenanceMode", event.target.checked)}
              />
            </div>
          </section>

          <section className="settings-panel settings-summary">
            <div className="panel-title">
              <h2>Current Values</h2>
            </div>
            <p><strong>Upload limit:</strong> {settings.maxUploadSize} MB</p>
            <p><strong>Formats:</strong> {settings.acceptedFormats}</p>
            <p><strong>Retention:</strong> {settings.retentionDays} days</p>
            <p><strong>Confidence:</strong> {settings.confidenceThreshold}%</p>
            <p><strong>Notifications:</strong> {settings.notificationsEnabled ? "Enabled" : "Disabled"}</p>
            <p><strong>Audit logs:</strong> {settings.auditLoggingEnabled ? "Enabled" : "Disabled"}</p>
            <p><strong>Maintenance:</strong> {settings.maintenanceMode ? "Enabled" : "Disabled"}</p>
          </section>

          <section className="settings-actions">
            <div>
              <h3>Apply Configuration</h3>
              <p>These values represent the future records from the `settings` table.</p>
            </div>
            <div className="settings-buttons">
              <button className="secondary-btn" type="button" onClick={resetSettings}>
                Reset Defaults
              </button>
              <button className="primary-btn" type="submit">
                Save Settings
              </button>
            </div>
          </section>
        </form>

        {message && <p className="settings-message">{message}</p>}
      </main>
    </div>
  );
}

export default SettingsPage;
