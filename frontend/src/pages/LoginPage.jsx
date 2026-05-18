import { useState } from "react";
import Navbar from "../shared/Navbar";

function LoginPage({ currentUser, onLogin, onLogout, onNavigate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const result = onLogin(email, password);

    if (!result.ok) {
      setMessage(result.message);
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
          <form className="auth-card" onSubmit={handleSubmit}>
            <span className="eyebrow">Account access</span>
            <h1>Welcome back</h1>
            <p>Sign in to manage traffic sign detection requests and review results.</p>

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {message && <p className="auth-error">{message}</p>}

            <button className="primary-btn full-width" type="submit">
              Sign in
            </button>

            <button
              className="text-btn"
              type="button"
              onClick={() => onNavigate("signup")}
            >
              Request access
            </button>
          </form>

          <div className="info-card">
            <span className="status-pill">Protected workspace</span>
            <h3>Detection operations, organized</h3>
            <p>
              Access uploaded images, review prediction confidence, and keep
              detection activity in one dashboard.
            </p>
            <div className="mini-list">
              <p>Role-based account area</p>
              <p>Detection history ready</p>
              <p>Secure sign-in experience</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LoginPage;
