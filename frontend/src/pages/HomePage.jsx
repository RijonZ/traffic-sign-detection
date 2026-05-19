import Navbar from "../shared/Navbar";

function HomePage({ currentUser, onLogout, onNavigate }) {
  return (
    <div className="home">
      <Navbar
        currentUser={currentUser}
        onLogout={onLogout}
        onNavigate={onNavigate}
      />

      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Computer vision for road safety</span>
          <h1>Traffic Sign Detection System</h1>

          <p>
            Upload road images, classify traffic signs, and review prediction
            confidence from a focused detection dashboard.
          </p>

          <div className="hero-buttons">
            <button
              className="primary-btn"
              onClick={() => onNavigate(currentUser ? "dashboard" : "login")}
            >
              Start Detection
            </button>
            <button className="secondary-btn" onClick={() => onNavigate("signup")}>
              Request Access
            </button>
          </div>
        </div>

        <div className="hero-card">
          <span className="status-pill">Detection workflow</span>
          <h3>How it works</h3>
          <p>1. Upload a road image</p>
          <p>2. Review model prediction</p>
          <p>3. Track the result</p>
          <button
            className="secondary-btn full-width"
            onClick={() => onNavigate("history")}
          >
            View History
          </button>
        </div>
      </section>

      <section className="features" id="features">
        <div>
          <h3>Fast Detection</h3>
          <p>Run traffic sign predictions from a clean upload workflow.</p>
        </div>

        <div>
          <h3>Prediction Result</h3>
          <p>Review detected sign labels with confidence score context.</p>
        </div>

        <div>
          <h3>Detection History</h3>
          <p>Keep previous detection requests available for follow-up review.</p>
          <button className="text-btn" onClick={() => onNavigate("history")}>
            Open history
          </button>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
