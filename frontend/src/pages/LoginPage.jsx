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
            <p>Use the sample role emails or sign in with any other email as a normal user.</p>

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

            <button className="text-btn" type="button" onClick={() => onNavigate("signup")}>
              Request access
            </button>
          </form>

          <div className="info-card">
            <span className="status-pill">Secure workspace</span>
            <h3>Dashboard access by role</h3>
            <p>
              After signing in, each account opens a workspace tailored to its
              permissions and responsibilities.
            </p>
            <p>
              Users can focus on detections, managers can review operational
              data, and admins can oversee the full system.
            </p>
            <div className="mini-list">
              <p>Personalized navigation</p>
              <p>Protected dashboard pages</p>
              <p>Clear access boundaries</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LoginPage;
