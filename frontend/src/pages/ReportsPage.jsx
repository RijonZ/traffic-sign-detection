import DashboardLayout from "../shared/DashboardLayout";
import Navbar from "../shared/Navbar";

function ReportsPage({ currentUser, onLogout, onNavigate }) {
  if (!currentUser) {
    return (
      <div className="home">
        <Navbar onNavigate={onNavigate} />
        <main className="page-shell">
          <section className="auth-card">
            <h1>Sign in required</h1>
            <p>You need an account before opening reports.</p>
            <button className="primary-btn" onClick={() => onNavigate("login")}>
              Go to login
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <DashboardLayout
      activePage="reports"
      currentUser={currentUser}
      onLogout={onLogout}
      onNavigate={onNavigate}
    >
      <section className="dashboard-header">
        <div>
          <span className="eyebrow">Reports</span>
          <h1>Detection Reports</h1>
          <p>Prepare exports, review report-ready detections, and track reporting status.</p>
        </div>
        <button className="primary-btn" onClick={() => onNavigate("detect")}>
          New Detection
        </button>
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Available Reports</h3>
          <p>4</p>
        </div>
        <div className="dashboard-card">
          <h3>Ready to Export</h3>
          <p>3</p>
        </div>
        <div className="dashboard-card">
          <h3>Needs Review</h3>
          <p>1</p>
        </div>
      </section>

      <section className="activity-panel report-panel">
        <div>
          <h3>Latest Report Package</h3>
          <p>Traffic sign detections with request ID, sign label, confidence, and status.</p>
        </div>
        <button className="secondary-btn" onClick={() => onNavigate("history")}>
          View History
        </button>
      </section>
    </DashboardLayout>
  );
}

export default ReportsPage;
