import { useState } from "react";
import Navbar from "../shared/Navbar";
import "../styles/auth.css";

const API_BASE_URL = "http://localhost:5000/api";

function LoginPage({ currentUser, onLogin, onLogout, onNavigate, onSignUp, initialMode, resetToken }) {
  const [mode, setMode] = useState(initialMode || "login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [signupMessage, setSignupMessage] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function showLogin() {
    setMode("login");
    setLoginMessage("");
    setSignupMessage("");
    setForgotMessage("");
    setForgotSuccess(false);
  }

  function showSignup() {
    setMode("signup");
    setLoginMessage("");
    setSignupMessage("");
  }

  function showForgot() {
    setMode("forgot");
    setLoginMessage("");
    setForgotMessage("");
    setForgotSuccess(false);
  }

  async function handleLogin(event) {
    event.preventDefault();
    const result = await onLogin(loginEmail, loginPassword);
    if (!result.ok) setLoginMessage(result.message);
  }

  async function handleSignUp(event) {
    event.preventDefault();
    const result = await onSignUp(signupName, signupEmail, signupPassword);
    if (!result.ok) setSignupMessage(result.message);
  }

  async function handleForgot(event) {
    event.preventDefault();
    setForgotMessage("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      if (res.ok) {
        setForgotSuccess(true);
      } else {
        const data = await res.json();
        setForgotMessage(data.message || "Something went wrong. Try again.");
      }
    } catch {
      setForgotMessage("Cannot connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(event) {
    event.preventDefault();
    setResetMessage("");
    if (resetPassword !== resetConfirm) {
      setResetMessage("Passwords do not match.");
      return;
    }
    if (resetPassword.length < 6) {
      setResetMessage("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password: resetPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetSuccess(true);
      } else {
        setResetMessage(data.message || "Something went wrong. Try again.");
      }
    } catch {
      setResetMessage("Cannot connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="home">
      <Navbar currentUser={currentUser} onLogout={onLogout} onNavigate={onNavigate} />

      <main className="page-shell">
        <section className="auth-page">
          <div className="auth-card auth-card-centered">

            {/* ── Forgot password ── */}
            {mode === "forgot" && (
              <>
                <button className="auth-back-btn" onClick={showLogin} type="button">
                  ← Back to sign in
                </button>

                {forgotSuccess ? (
                  <>
                    <span className="eyebrow">Check your inbox</span>
                    <h1>Email sent</h1>
                    <div className="auth-success">
                      If an account exists for <strong>{forgotEmail}</strong>, a password reset link has been sent. Check your inbox and spam folder.
                    </div>
                    <button className="primary-btn full-width" onClick={showLogin} type="button">
                      Back to sign in
                    </button>
                  </>
                ) : (
                  <form onSubmit={handleForgot}>
                    <span className="eyebrow">Account recovery</span>
                    <h1>Forgot password?</h1>
                    <p>Enter your account email and we'll send you a link to reset your password.</p>

                    <label>
                      Email
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        autoFocus
                      />
                    </label>

                    {forgotMessage && <p className="auth-error">{forgotMessage}</p>}

                    <button className="primary-btn full-width" type="submit" disabled={loading}>
                      {loading ? "Sending…" : "Send reset link"}
                    </button>
                  </form>
                )}
              </>
            )}

            {/* ── Reset password (from email link) ── */}
            {mode === "reset" && (
              <>
                {resetSuccess ? (
                  <>
                    <span className="eyebrow">All done</span>
                    <h1>Password updated</h1>
                    <div className="auth-success">
                      Your password has been changed successfully. You can now sign in with your new password.
                    </div>
                    <button
                      className="primary-btn full-width"
                      onClick={() => { showLogin(); onNavigate("login"); }}
                      type="button"
                    >
                      Go to sign in
                    </button>
                  </>
                ) : (
                  <form onSubmit={handleReset}>
                    <span className="eyebrow">Account recovery</span>
                    <h1>Set new password</h1>
                    <p>Choose a strong new password for your account.</p>

                    <label>
                      New password
                      <input
                        type="password"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        minLength="6"
                        required
                        autoFocus
                      />
                    </label>

                    <label>
                      Confirm password
                      <input
                        type="password"
                        value={resetConfirm}
                        onChange={(e) => setResetConfirm(e.target.value)}
                        minLength="6"
                        required
                      />
                    </label>

                    {resetMessage && <p className="auth-error">{resetMessage}</p>}

                    <button className="primary-btn full-width" type="submit" disabled={loading}>
                      {loading ? "Saving…" : "Set new password"}
                    </button>
                  </form>
                )}
              </>
            )}

            {/* ── Login / Signup ── */}
            {(mode === "login" || mode === "signup") && (
              <>
                <div className="auth-tabs" role="tablist" aria-label="Account action">
                  <button
                    aria-selected={mode === "login"}
                    className={mode === "login" ? "auth-tab active" : "auth-tab"}
                    onClick={showLogin}
                    role="tab"
                    type="button"
                  >
                    Sign in
                  </button>
                  <button
                    aria-selected={mode === "signup"}
                    className={mode === "signup" ? "auth-tab active" : "auth-tab"}
                    onClick={showSignup}
                    role="tab"
                    type="button"
                  >
                    Create account
                  </button>
                </div>

                {mode === "login" ? (
                  <form onSubmit={handleLogin}>
                    <span className="eyebrow">Account access</span>
                    <h1>Welcome back</h1>
                    <p>Sign in with your account email to open the right workspace.</p>

                    <label>
                      Email
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </label>

                    <label>
                      Password
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                    </label>

                    <button className="auth-forgot-link" onClick={showForgot} type="button">
                      Forgot password?
                    </button>

                    {loginMessage && <p className="auth-error">{loginMessage}</p>}

                    <button className="primary-btn full-width" type="submit">
                      Sign in
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSignUp}>
                    <span className="eyebrow">New account</span>
                    <h1>Create account</h1>
                    <p>Use your email and password to create a workspace account.</p>

                    <label>
                      Full name
                      <input
                        type="text"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        required
                      />
                    </label>

                    <label>
                      Email
                      <input
                        type="email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                      />
                    </label>

                    <label>
                      Password
                      <input
                        minLength="6"
                        type="password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                      />
                    </label>

                    {signupMessage && <p className="auth-error">{signupMessage}</p>}

                    <button className="primary-btn full-width" type="submit">
                      Create account
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default LoginPage;
