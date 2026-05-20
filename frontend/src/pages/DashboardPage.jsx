import Navbar from "../shared/Navbar";
import "../styles/auth.css";
import "../styles/dashboard.css";

function DashboardPage({ currentUser, onLogout, onNavigate }) {
  if (!currentUser) {
    return (
      <div className="home">
        <Navbar onNavigate={onNavigate} />
        <main className="page-shell">
          <section className="auth-card">
            <h1>Sign in required</h1>
            <p>You need an account before opening the dashboard.</p>
            <button className="primary-btn" onClick={() => onNavigate("login")}>
              Go to login
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="home">
      <Navbar
        currentUser={currentUser}
        onLogout={onLogout}
        onNavigate={onNavigate}
      />

      <main className="page-shell">
        <section className="dashboard-header">
          <div>
            <span className="eyebrow">Operations center</span>
            <h1>Detection Dashboard</h1>
            <p>Manage uploads, review predictions, and monitor account activity.</p>
          </div>
          <button className="primary-btn" onClick={() => onNavigate("detect")}>
            Upload Image
          </button>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-card">
            <h3>Current Status</h3>
            <p>Ready for the next image upload.</p>
          </div>

          <div className="dashboard-card">
            <h3>Latest Result</h3>
            <p>Prediction results will appear here after analysis.</p>
          </div>

          <div className="dashboard-card">
            <h3>Account Type</h3>
            <p>{currentUser.role}</p>
          </div>
        </section>

        <section className="activity-panel">
          <div>
            <h3>Recent Activity</h3>
            <p>No recent detections yet.</p>
          </div>
          <button className="secondary-btn" onClick={() => onNavigate("history")}>
            View History
          </button>
        </section>
      </main>
    </div>
  );
}

export default DashboardPage;
