import { useState } from "react";
import Navbar from "../shared/Navbar";
import "../styles/auth.css";

function LoginPage({ currentUser, onLogin, onLogout, onNavigate, onSignUp }) {
  const [mode, setMode] = useState("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [signupMessage, setSignupMessage] = useState("");

  function showLogin() {
    setMode("login");
    setLoginMessage("");
    setSignupMessage("");
  }

  function showSignup() {
    setMode("signup");
    setLoginMessage("");
    setSignupMessage("");
  }

  async function handleLogin(event) {
    event.preventDefault();
    const result = await onLogin(loginEmail, loginPassword);

    if (!result.ok) {
      setLoginMessage(result.message);
    }
  }

  async function handleSignUp(event) {
    event.preventDefault();
    const result = await onSignUp(signupName, signupEmail, signupPassword);

    if (!result.ok) {
      setSignupMessage(result.message);
    }
  }

  return (
    <div className="home">
      <Navbar
        currentUser={currentUser}
        onLogout={onLogout}
        onNavigate={onNavigate}
      />

      <main className="page-shell">
        <section className="auth-page">
          <div className="auth-card auth-card-centered">
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
                    onChange={(event) => setLoginEmail(event.target.value)}
                    required
                  />
                </label>

                <label>
                  Password
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    required
                  />
                </label>

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
                    onChange={(event) => setSignupName(event.target.value)}
                    required
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(event) => setSignupEmail(event.target.value)}
                    required
                  />
                </label>

                <label>
                  Password
                  <input
                    minLength="6"
                    type="password"
                    value={signupPassword}
                    onChange={(event) => setSignupPassword(event.target.value)}
                    required
                  />
                </label>

                {signupMessage && <p className="auth-error">{signupMessage}</p>}

                <button className="primary-btn full-width" type="submit">
                  Create account
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default LoginPage;
