import { useState } from "react";
import Navbar from "../shared/Navbar";
import "../styles/auth.css";

function LoginPage({ currentUser, onLogin, onLogout, onNavigate, onSignUp }) {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [signupMessage, setSignupMessage] = useState("");

  async function handleLogin(event) {
    event.preventDefault();
    const result = await onLogin(loginEmail, loginPassword);

    if (!result.ok) {
      setLoginMessage(result.message);
    }
  }

  function handleSignUp(event) {
    event.preventDefault();
    const result = onSignUp(signupName, signupEmail, signupPassword);

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
          <form className="auth-card" onSubmit={handleLogin}>
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

          <form className="auth-card" onSubmit={handleSignUp}>
            <span className="eyebrow">New account</span>
            <h1>Sign up</h1>
            <p>Use an admin, manager, or regular email to choose the workspace role.</p>

            <label>
              Name
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

            <button className="secondary-btn full-width" type="submit">
              Create account
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default LoginPage;
