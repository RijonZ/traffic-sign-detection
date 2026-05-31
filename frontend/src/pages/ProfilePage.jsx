import { useState } from "react";
import Navbar from "../shared/Navbar";
import "../styles/auth.css";
import "../styles/dashboard.css";

const API_BASE_URL = "http://localhost:5000/api";

function ProfilePage({ currentUser, onLogout, onNavigate, onUpdateProfile }) {
  const [name, setName] = useState(currentUser?.name || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!currentUser) {
    return (
      <div className="home">
        <Navbar onNavigate={onNavigate} />
        <main className="page-shell">
          <section className="auth-card">
            <h1>Sign in required</h1>
            <p>You need to be signed in to view your profile.</p>
            <button className="primary-btn" onClick={() => onNavigate("login")}>
              Go to login
            </button>
          </section>
        </main>
      </div>
    );
  }

  async function handleSave(e) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password && password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (!name.trim() && !password) {
      setErrorMessage("Enter a new name or password to save changes.");
      return;
    }

    setSaving(true);
    try {
      const body = {};
      if (name.trim() && name.trim() !== currentUser.name) body.name = name.trim();
      if (password) body.password = password;

      if (!Object.keys(body).length) {
        setErrorMessage("No changes detected.");
        setSaving(false);
        return;
      }

      const res = await fetch(
        `${API_BASE_URL}/users/${encodeURIComponent(currentUser.email)}/profile`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || "Update failed.");
        return;
      }

      onUpdateProfile(data.user);
      setPassword("");
      setConfirmPassword("");
      setSuccessMessage("Profile updated successfully.");
    } catch {
      setErrorMessage("Could not connect to server.");
    } finally {
      setSaving(false);
    }
  }

  function getLandingPage(role) {
    if (role === "Administrator") return "admin-dashboard";
    if (role === "Manager") return "dashboard-analytics";
    return "dashboard";
  }

  return (
    <div className="home">
      <Navbar currentUser={currentUser} onLogout={onLogout} onNavigate={onNavigate} />

      <main className="page-shell">
        <section className="dashboard-header">
          <div>
            <span className="eyebrow">Account</span>
            <h1>My Profile</h1>
            <p>Update your display name or change your password.</p>
          </div>
          <button
            className="secondary-btn"
            onClick={() => onNavigate(getLandingPage(currentUser.role))}
          >
            Back to Dashboard
          </button>
        </section>

        <section className="auth-card" style={{ maxWidth: "480px", marginTop: "32px" }}>
          <div style={{ marginBottom: "24px" }}>
            <p className="auth-label">Email</p>
            <p style={{ marginTop: "4px", fontWeight: 500 }}>{currentUser.email}</p>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <p className="auth-label">Role</p>
            <p style={{ marginTop: "4px", fontWeight: 500 }}>{currentUser.role}</p>
          </div>

          <form onSubmit={handleSave}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="profile-name">
                Display Name
              </label>
              <input
                id="profile-name"
                className="auth-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                disabled={saving}
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="profile-password">
                New Password
              </label>
              <input
                id="profile-password"
                className="auth-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                disabled={saving}
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="profile-confirm">
                Confirm New Password
              </label>
              <input
                id="profile-confirm"
                className="auth-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                disabled={saving}
              />
            </div>

            {errorMessage && <p className="auth-error">{errorMessage}</p>}
            {successMessage && (
              <p className="auth-error" style={{ color: "var(--success, #22c55e)" }}>
                {successMessage}
              </p>
            )}

            <button className="primary-btn" type="submit" disabled={saving} style={{ width: "100%", marginTop: "8px" }}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default ProfilePage;
