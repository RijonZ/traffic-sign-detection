import { useMemo } from "react";
import Navbar from "../shared/Navbar";
import "../styles/admin-dashboard.css";
import "../styles/auth.css";
import "../styles/dashboard.css";

const USERS_KEY = "traffic-sign-users";
const HISTORY_KEY = "traffic-sign-detections";

const sampleUsers = [
  { name: "Admin", email: "admin@trafficsign.ai", role: "Administrator" },
  { name: "Manager", email: "manager@trafficsign.ai", role: "Manager" },
  { name: "User", email: "user@trafficsign.ai", role: "User" },
];

const sampleActivity = [
  "Manager reviewed detection reports",
  "User completed a new sign detection",
  "Model monitoring status checked",
];

function readUsers() {
  const savedUsers = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  return savedUsers.length ? savedUsers : sampleUsers;
}

function readDetections() {
  return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
}

function AdminDashboard({ currentUser, onLogout, onNavigate }) {
  const users = useMemo(readUsers, []);
  const detections = useMemo(readDetections, []);
  const managers = users.filter((user) => user.role === "Manager").length;
  const regularUsers = users.filter((user) => user.role === "User").length;

  if (!currentUser) {
    return (
      <div className="home">
        <Navbar onNavigate={onNavigate} />
        <main className="page-shell">
          <section className="auth-card">
            <h1>Sign in required</h1>
            <p>You need an administrator account before opening this dashboard.</p>
            <button className="primary-btn" onClick={() => onNavigate("login")}>
              Go to login
            </button>
          </section>
        </main>
      </div>
    );
  }

  if (currentUser.role !== "Administrator") {
    return (
      <div className="home">
        <Navbar currentUser={currentUser} onLogout={onLogout} onNavigate={onNavigate} />
        <main className="page-shell">
          <section className="auth-card">
            <h1>Admin access only</h1>
            <p>This dashboard is available only for administrators.</p>
            <button className="secondary-btn" onClick={() => onNavigate("home")}>
              Back home
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="home">
      <Navbar currentUser={currentUser} onLogout={onLogout} onNavigate={onNavigate} />

      <main className="page-shell">
        <section className="dashboard-header">
          <div>
            <span className="eyebrow">Administrator workspace</span>
            <h1>Admin Dashboard</h1>
            <p>
              Monitor users, detections, reports, model status, and audit activity from one
              focused control page.
            </p>
          </div>
          <button className="primary-btn" onClick={() => onNavigate("users")}>
            Manage Users
          </button>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-card">
            <h3>Total Users</h3>
            <p className="metric-value">{users.length}</p>
          </div>
          <div className="dashboard-card">
            <h3>Managers</h3>
            <p className="metric-value">{managers}</p>
          </div>
          <div className="dashboard-card">
            <h3>Detections</h3>
            <p className="metric-value">{detections.length}</p>
          </div>
        </section>

        <section className="admin-layout">
          <div className="admin-panel">
            <div className="panel-title">
              <span className="eyebrow">System modules</span>
              <h2>Quick actions</h2>
            </div>

            <div className="admin-actions">
              <button className="secondary-btn" onClick={() => onNavigate("all-detections")}>
                All Detections
              </button>
              <button className="secondary-btn" onClick={() => onNavigate("reports")}>
                Reports
              </button>
              <button className="secondary-btn" onClick={() => onNavigate("model-monitoring")}>
                Model Monitoring
              </button>
              <button className="secondary-btn" onClick={() => onNavigate("audit-logs")}>
                Audit Logs
              </button>
              <button className="secondary-btn" onClick={() => onNavigate("settings")}>
                Settings
              </button>
            </div>
          </div>

          <div className="admin-panel">
            <div className="panel-title">
              <span className="eyebrow">Account overview</span>
              <h2>Users by role</h2>
            </div>

            <div className="role-counts">
              <p><strong>Administrators:</strong> {users.length - managers - regularUsers}</p>
              <p><strong>Managers:</strong> {managers}</p>
              <p><strong>Users:</strong> {regularUsers}</p>
            </div>
          </div>
        </section>

        <section className="activity-panel">
          <div>
            <h3>Recent Admin Activity</h3>
            {sampleActivity.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
          <button className="secondary-btn" onClick={() => onNavigate("audit-logs")}>
            View Audit Logs
          </button>
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;
