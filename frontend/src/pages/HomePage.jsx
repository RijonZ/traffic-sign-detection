import Navbar from "../shared/Navbar";
import "../styles/home.css";

const roleActions = {
  Administrator: [
    { label: "Open Admin Dashboard", page: "admin-dashboard", type: "primary-btn" },
    { label: "View Users", page: "users", type: "secondary-btn" },
  ],
  Manager: [
    { label: "Open Analytics", page: "dashboard-analytics", type: "primary-btn" },
    { label: "Export Data", page: "export-data", type: "secondary-btn" },
  ],
  User: [
    { label: "Start Detection", page: "detect", type: "primary-btn" },
    { label: "My Reports", page: "my-reports", type: "secondary-btn" },
  ],
};

const roleCards = {
  Administrator: ["Manage users", "Review detections", "Check system reports"],
  Manager: ["Monitor analytics", "Review reports", "Export detection data"],
  User: ["Upload image", "Review prediction", "Download report"],
};

function HomePage({ currentUser, onLogout, onNavigate }) {
  const actions = currentUser ? roleActions[currentUser.role] || roleActions.User : [];
  const cardItems = currentUser ? roleCards[currentUser.role] || roleCards.User : [];

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
          <h1>{currentUser ? `Welcome, ${currentUser.name}` : "Traffic Sign Detection System"}</h1>

          <p>
            {currentUser
              ? `You are signed in as ${currentUser.role}. Continue from your project workspace.`
              : "Upload road images, classify traffic signs, and review prediction confidence from a focused detection dashboard."}
          </p>

          <div className="hero-buttons">
            {currentUser ? (
              actions.map((action) => (
                <button
                  className={action.type}
                  key={action.page}
                  onClick={() => onNavigate(action.page)}
                >
                  {action.label}
                </button>
              ))
            ) : (
              <>
                <button className="primary-btn" onClick={() => onNavigate("login")}>
                  Start Detection
                </button>
                <button className="secondary-btn" onClick={() => onNavigate("login")}>
                  Login / Sign Up
                </button>
              </>
            )}
          </div>
        </div>

        <div className="hero-card">
          <span className="status-pill">{currentUser ? currentUser.role : "Detection workflow"}</span>
          <h3>{currentUser ? "Your workspace" : "How it works"}</h3>
          {(currentUser ? cardItems : ["Upload a road image", "Review model prediction", "Track the result"]).map(
            (item, index) => <p key={item}>{index + 1}. {item}</p>
          )}
          <button
            className="secondary-btn full-width"
            onClick={() => onNavigate(currentUser ? actions[0].page : "history")}
          >
            {currentUser ? "Continue" : "View History"}
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
