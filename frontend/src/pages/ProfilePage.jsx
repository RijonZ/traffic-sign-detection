import { useState, useEffect } from "react";
import Navbar from "../shared/Navbar";
import "../styles/profile.css";

const API_BASE_URL = "http://localhost:5000/api";

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function timeUntil(iso) {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(ms / 864e5);
  if (days > 1) return `Available in ${days} days`;
  const hours = Math.ceil(ms / 36e5);
  return `Available in ${hours} hour${hours !== 1 ? "s" : ""}`;
}

function roleBadgeClass(role) {
  if (role === "Administrator") return "profile-badge profile-badge--admin";
  if (role === "Manager") return "profile-badge profile-badge--manager";
  return "profile-badge profile-badge--user";
}

function ProfilePage({ currentUser, onLogout, onNavigate, onUpdateProfile }) {
  const [meta, setMeta] = useState(null);

  const [name, setName] = useState(currentUser?.name || "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passSaving, setPassSaving] = useState(false);
  const [passMsg, setPassMsg] = useState(null);

  useEffect(() => {
    if (!currentUser?.email) return;
    fetch(`${API_BASE_URL}/users/${encodeURIComponent(currentUser.email)}/profile`)
      .then((r) => r.json())
      .then(setMeta)
      .catch(() => {});
  }, [currentUser?.email]);

  if (!currentUser) {
    return (
      <div className="home">
        <Navbar onNavigate={onNavigate} />
        <main className="page-shell">
          <p style={{ padding: "32px" }}>Sign in required.</p>
        </main>
      </div>
    );
  }

  const nameLocked = meta?.nameLockedUntil ? new Date(meta.nameLockedUntil) > new Date() : false;
  const passLocked = meta?.passwordLockedUntil ? new Date(meta.passwordLockedUntil) > new Date() : false;

  function getLandingPage(role) {
    if (role === "Administrator") return "admin-dashboard";
    if (role === "Manager") return "dashboard-analytics";
    return "dashboard";
  }

  async function handleNameSave(e) {
    e.preventDefault();
    if (!name.trim() || name.trim() === currentUser.name) {
      setNameMsg({ type: "error", text: "Enter a different display name to save." });
      return;
    }
    setNameMsg(null);
    setNameSaving(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/users/${encodeURIComponent(currentUser.email)}/profile`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setNameMsg({ type: "error", text: data.message });
        if (data.lockedUntil) {
          setMeta((m) => ({ ...m, nameLockedUntil: data.lockedUntil }));
        }
      } else {
        onUpdateProfile(data.user);
        setMeta((m) => ({ ...m, nameLockedUntil: new Date(Date.now() + 90 * 864e5).toISOString() }));
        setNameMsg({ type: "success", text: "Display name updated." });
      }
    } catch {
      setNameMsg({ type: "error", text: "Could not connect to server." });
    } finally {
      setNameSaving(false);
    }
  }

  async function handlePasswordSave(e) {
    e.preventDefault();
    if (!password) {
      setPassMsg({ type: "error", text: "Enter a new password." });
      return;
    }
    if (password !== confirmPassword) {
      setPassMsg({ type: "error", text: "Passwords do not match." });
      return;
    }
    if (password.length < 6) {
      setPassMsg({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    setPassMsg(null);
    setPassSaving(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/users/${encodeURIComponent(currentUser.email)}/profile`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setPassMsg({ type: "error", text: data.message });
        if (data.lockedUntil) {
          setMeta((m) => ({ ...m, passwordLockedUntil: data.lockedUntil }));
        }
      } else {
        setPassword("");
        setConfirmPassword("");
        setMeta((m) => ({ ...m, passwordLockedUntil: new Date(Date.now() + 30 * 864e5).toISOString() }));
        setPassMsg({ type: "success", text: "Password changed successfully." });
      }
    } catch {
      setPassMsg({ type: "error", text: "Could not connect to server." });
    } finally {
      setPassSaving(false);
    }
  }

  return (
    <div className="home">
      <Navbar currentUser={currentUser} onLogout={onLogout} onNavigate={onNavigate} />

      <main className="page-shell">
        <section className="dashboard-header">
          <div>
            <span className="eyebrow">Account</span>
            <h1>My Profile</h1>
            <p>Manage your account information and security settings.</p>
          </div>
          <button
            className="secondary-btn"
            onClick={() => onNavigate(getLandingPage(currentUser.role))}
          >
            Back to Dashboard
          </button>
        </section>

        <div className="profile-layout">

          {/* ── Left: identity card ── */}
          <aside className="profile-identity-card">
            <div className="profile-avatar">
              {getInitials(currentUser.name)}
            </div>
            <p className="profile-identity-name">{currentUser.name}</p>
            <span className={roleBadgeClass(currentUser.role)}>{currentUser.role}</span>

            <dl className="profile-meta-list">
              <dt>Email</dt>
              <dd>{currentUser.email}</dd>

              <dt>Member since</dt>
              <dd>{formatDate(meta?.createdAt)}</dd>

              <dt>Name last changed</dt>
              <dd>
                {meta?.nameLockedUntil
                  ? formatDate(new Date(new Date(meta.nameLockedUntil).getTime() - 90 * 864e5).toISOString())
                  : "Never"}
              </dd>

              <dt>Password last changed</dt>
              <dd>
                {meta?.passwordLockedUntil
                  ? formatDate(new Date(new Date(meta.passwordLockedUntil).getTime() - 30 * 864e5).toISOString())
                  : "Never"}
              </dd>
            </dl>
          </aside>

          {/* ── Right: forms ── */}
          <div className="profile-forms">

            {/* Display name */}
            <div className="profile-section">
              <div className="profile-section-header">
                <div>
                  <h2>Display Name</h2>
                  <p>This name is visible throughout the application.</p>
                </div>
                {nameLocked && (
                  <span className="profile-lock-badge">
                    Locked · {timeUntil(meta.nameLockedUntil)}
                  </span>
                )}
              </div>

              {nameLocked ? (
                <div className="profile-locked-notice">
                  Display name can only be changed once every 3 months.
                  Next change allowed on <strong>{formatDate(meta.nameLockedUntil)}</strong>.
                </div>
              ) : (
                <form className="profile-form" onSubmit={handleNameSave}>
                  <label>
                    New display name
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={nameSaving}
                      placeholder={currentUser.name}
                    />
                  </label>
                  {nameMsg && (
                    <p className={nameMsg.type === "error" ? "profile-msg profile-msg--error" : "profile-msg profile-msg--success"}>
                      {nameMsg.text}
                    </p>
                  )}
                  <div className="profile-form-footer">
                    <button className="primary-btn" type="submit" disabled={nameSaving}>
                      {nameSaving ? "Saving…" : "Save name"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Password */}
            <div className="profile-section">
              <div className="profile-section-header">
                <div>
                  <h2>Password</h2>
                  <p>Use a strong password you don't use elsewhere.</p>
                </div>
                {passLocked && (
                  <span className="profile-lock-badge">
                    Locked · {timeUntil(meta.passwordLockedUntil)}
                  </span>
                )}
              </div>

              {passLocked ? (
                <div className="profile-locked-notice">
                  Password can only be changed once per month.
                  Next change allowed on <strong>{formatDate(meta.passwordLockedUntil)}</strong>.
                </div>
              ) : (
                <form className="profile-form" onSubmit={handlePasswordSave}>
                  <label>
                    New password
                    <input
                      type="password"
                      minLength="6"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={passSaving}
                      placeholder="Minimum 6 characters"
                    />
                  </label>
                  <label>
                    Confirm new password
                    <input
                      type="password"
                      minLength="6"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={passSaving}
                      placeholder="Repeat new password"
                    />
                  </label>
                  {passMsg && (
                    <p className={passMsg.type === "error" ? "profile-msg profile-msg--error" : "profile-msg profile-msg--success"}>
                      {passMsg.text}
                    </p>
                  )}
                  <div className="profile-form-footer">
                    <button className="primary-btn" type="submit" disabled={passSaving}>
                      {passSaving ? "Saving…" : "Change password"}
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
