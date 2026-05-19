import { useState } from "react";
import Navbar from "../shared/Navbar";

function SignUpPage({ currentUser, onLogout, onNavigate, onSignUp }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const result = onSignUp(name, email, password);

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
            <span className="eyebrow">New workspace</span>
            <h1>Create your account</h1>
            <p>Start a detection workspace for image uploads, predictions, and results.</p>

            <label>
              Name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>

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
                minLength="6"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {message && <p className="auth-error">{message}</p>}

            <button className="primary-btn full-width" type="submit">
              Sign up
            </button>

            <button
              className="text-btn"
              type="button"
              onClick={() => onNavigate("login")}
            >
              Already have an account?
            </button>
          </form>

          <div className="info-card">
            <span className="status-pill">Team-ready setup</span>
            <h3>Built for traffic sign review</h3>
            <p>
              Create an account area for detection tasks, confidence results,
              and operational history.
            </p>
            <div className="mini-list">
              <p>Centralized dashboard</p>
              <p>Prediction result tracking</p>
              <p>Account-based access</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default SignUpPage;
