import { useEffect, useMemo, useState } from "react";
import Navbar from "../shared/Navbar";
import "../styles/admin-dashboard.css";
import "../styles/auth.css";
import "../styles/dashboard.css";

const USERS_KEY = "traffic-sign-users";
const HISTORY_KEY = "traffic-sign-detections";
const API_BASE_URL = "http://localhost:5000/api";
const ADMIN_REFRESH_INTERVAL = 2000;

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

function formatDateTime(value) {
  if (!value) return "Not available";
  try {
    return new Date(value).toLocaleString("en-GB", {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

function AdminDashboard({ currentUser, onLogout, onNavigate }) {
  const fallbackUsers = useMemo(readUsers, []);
  const [users, setUsers] = useState(fallbackUsers);
  const fallbackDetections = useMemo(readDetections, []);
  const [detections, setDetections] = useState(fallbackDetections);
  const [feedbacks, setFeedbacks] = useState([]);
  const [modelMetrics, setModelMetrics] = useState(null);
  const [dashboardSummary, setDashboardSummary] = useState({
    detections: fallbackDetections.length,
  });
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [recentActivity, setRecentActivity] = useState(sampleActivity);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "Administrator") {
      return;
    }

    function loadUsers() {
      fetch(`${API_BASE_URL}/admin/users?adminEmail=${encodeURIComponent(currentUser.email)}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (data?.users?.length) {
            setUsers(data.users);
          }
        })
        .catch(() => setUsers(fallbackUsers));
    }

    function loadDashboard() {
      fetch(`${API_BASE_URL}/admin/dashboard?adminEmail=${encodeURIComponent(currentUser.email)}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (data?.summary) {
            setDashboardSummary(data.summary);
          }

          if (data?.recentActivity?.length) {
            setRecentActivity(data.recentActivity);
          }
        })
        .catch(() => {
          setDashboardSummary({ detections: fallbackDetections.length });
          setRecentActivity(sampleActivity);
        })
        .finally(() => {
          setLastUpdated(new Date());
          setLoadingDashboard(false);
        });
    }

    function loadDetections() {
      fetch(`${API_BASE_URL}/admin/detections?adminEmail=${encodeURIComponent(currentUser.email)}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (data?.detections) {
            setDetections(data.detections);
          }
        })
        .catch(() => setDetections(fallbackDetections));
    }

    function loadFeedbacks() {
      fetch(`${API_BASE_URL}/admin/feedbacks?adminEmail=${encodeURIComponent(currentUser.email)}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => setFeedbacks(data?.feedbacks || []))
        .catch(() => setFeedbacks([]));
    }

    function loadModelMonitoring() {
      fetch(`${API_BASE_URL}/admin/model-monitoring?adminEmail=${encodeURIComponent(currentUser.email)}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => setModelMetrics(data?.metrics || null))
        .catch(() => setModelMetrics(null));
    }

    setLoadingDashboard(true);
    loadUsers();
    loadDashboard();
    loadDetections();
    loadFeedbacks();
    loadModelMonitoring();
    window.addEventListener("focus", loadUsers);
    window.addEventListener("focus", loadDashboard);
    window.addEventListener("focus", loadDetections);
    window.addEventListener("focus", loadFeedbacks);
    window.addEventListener("focus", loadModelMonitoring);
    const refreshTimer = window.setInterval(loadUsers, ADMIN_REFRESH_INTERVAL);
    const dashboardRefreshTimer = window.setInterval(loadDashboard, ADMIN_REFRESH_INTERVAL);

    return () => {
      window.removeEventListener("focus", loadUsers);
      window.removeEventListener("focus", loadDashboard);
      window.removeEventListener("focus", loadDetections);
      window.removeEventListener("focus", loadFeedbacks);
      window.removeEventListener("focus", loadModelMonitoring);
      window.clearInterval(refreshTimer);
      window.clearInterval(dashboardRefreshTimer);
    };
  }, [currentUser, fallbackDetections.length, refreshKey]);

  const managers = users.filter((user) => user.role === "Manager").length;
  const regularUsers = users.filter((user) => user.role === "User").length;
  const activeUsers = users.filter((user) => user.status !== "Inactive").length;
  const inactiveUsers = users.filter((user) => user.status === "Inactive").length;
  const rejectedDetections = detections.filter((item) => item.status === "Rejected").length;
  const completedDetections = detections.filter((item) => item.status === "Completed").length;
  const feedbacksWithComments = feedbacks.filter((feedback) => feedback.comment).length;
  const lowRatingFeedbacks = feedbacks.filter((feedback) => Number(feedback.rating || 0) <= 2).length;
  const averageRating = feedbacks.length
    ? (feedbacks.reduce((sum, feedback) => sum + Number(feedback.rating || 0), 0) / feedbacks.length).toFixed(1)
    : "-";
  const modelAccuracy = modelMetrics?.modelAccuracy ?? "-";
  const averageConfidence = modelMetrics?.averageConfidence ?? "-";
  const latestDetections = detections.slice(0, 4);
  const latestFeedbacks = feedbacks.slice(0, 4);
  const needsAttention = [
    rejectedDetections > 0 && {
      label: `${rejectedDetections} rejected detection${rejectedDetections === 1 ? "" : "s"}`,
      detail: "Review upload quality, limits, or model confidence.",
      page: "all-detections",
    },
    inactiveUsers > 0 && {
      label: `${inactiveUsers} inactive user${inactiveUsers === 1 ? "" : "s"}`,
      detail: "Check accounts that may need reactivation or follow-up.",
      page: "users",
    },
    feedbacksWithComments > 0 && {
      label: `${feedbacksWithComments} feedback comment${feedbacksWithComments === 1 ? "" : "s"}`,
      detail: "Read user feedback and spot repeated issues.",
      page: "feedbacks",
    },
    lowRatingFeedbacks > 0 && {
      label: `${lowRatingFeedbacks} low rating${lowRatingFeedbacks === 1 ? "" : "s"}`,
      detail: "Prioritize clients who had a poor experience.",
      page: "feedbacks",
    },
  ].filter(Boolean);
  const quickActions = [
    { label: "Review Detections", detail: "Check rejected or completed requests.", page: "all-detections" },
    { label: "Manage Users", detail: "Find clients and update account access.", page: "users" },
    { label: "Open Reports", detail: "Download and filter generated reports.", page: "reports" },
    { label: "Read Feedbacks", detail: "Review ratings and user comments.", page: "feedbacks" },
    { label: "Audit Logs", detail: "Trace important admin and system events.", page: "audit-logs" },
    { label: "Settings", detail: "Adjust upload and system defaults.", page: "settings" },
  ];

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
          <div className="admin-header-actions">
            <button className="secondary-btn" onClick={() => setRefreshKey((key) => key + 1)}>
              {loadingDashboard ? "Refreshing..." : "Refresh"}
            </button>
            <button className="primary-btn" onClick={() => onNavigate("users")}>
              Manage Users
            </button>
          </div>
        </section>

        <section className="admin-status-strip">
          <span>System status: Active</span>
          <span>Last updated: {lastUpdated ? formatDateTime(lastUpdated) : "Loading..."}</span>
        </section>

        <section className="dashboard-grid admin-metrics-grid">
          <div className="dashboard-card">
            <h3>Total Users</h3>
            <p className="metric-value">{users.length}</p>
            <span className="admin-card-note">{activeUsers} active accounts</span>
          </div>
          <div className="dashboard-card">
            <h3>Detections</h3>
            <p className="metric-value">{dashboardSummary.detections}</p>
            <span className="admin-card-note">{completedDetections} completed</span>
          </div>
          <div className="dashboard-card">
            <h3>Avg Feedback</h3>
            <p className="metric-value">{averageRating}</p>
            <span className="admin-card-note">{feedbacks.length} feedbacks received</span>
          </div>
          <div className="dashboard-card">
            <h3>Model Health</h3>
            <p className="metric-value">{modelAccuracy}{modelAccuracy === "-" ? "" : "%"}</p>
            <span className="admin-card-note">{averageConfidence}{averageConfidence === "-" ? "" : "%"} average confidence</span>
          </div>
        </section>

        <section className="admin-alert-panel">
          <div className="panel-title">
            <span className="eyebrow">Daily check</span>
            <h2>Needs attention</h2>
          </div>

          <div className="admin-alert-list">
            {needsAttention.length ? (
              needsAttention.map((item) => (
                <button className="admin-alert-item" key={item.label} onClick={() => onNavigate(item.page)}>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </button>
              ))
            ) : (
              <div className="admin-alert-empty">
                <strong>No urgent items</strong>
                <span>Users, detections, and feedbacks look clear right now.</span>
              </div>
            )}
          </div>
        </section>

        <section className="admin-layout">
          <div className="admin-panel">
            <div className="panel-title">
              <span className="eyebrow">System modules</span>
              <h2>Quick actions</h2>
            </div>

            <div className="admin-actions">
              {quickActions.map((action) => (
                <button className="admin-action-card" key={action.page} onClick={() => onNavigate(action.page)}>
                  <strong>{action.label}</strong>
                  <span>{action.detail}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="admin-panel">
            <div className="panel-title">
              <span className="eyebrow">System snapshot</span>
              <h2>Key totals</h2>
            </div>

            <div className="role-counts">
              <p><strong>Administrators:</strong> {users.length - managers - regularUsers}</p>
              <p><strong>Managers:</strong> {managers}</p>
              <p><strong>Users:</strong> {regularUsers}</p>
              <p><strong>Inactive:</strong> {inactiveUsers}</p>
              <p><strong>Rejected detections:</strong> {rejectedDetections}</p>
              <p><strong>Low ratings:</strong> {lowRatingFeedbacks}</p>
            </div>
          </div>
        </section>

        <section className="admin-layout">
          <div className="admin-panel">
            <div className="panel-title">
              <span className="eyebrow">Recent work</span>
              <h2>Latest detections</h2>
            </div>
            <div className="admin-mini-list">
              {latestDetections.length ? latestDetections.map((item) => (
                <button className="admin-mini-item" key={item.id || item.fileName} onClick={() => onNavigate("all-detections")}>
                  <strong>{item.sign || "Not detected"}</strong>
                  <span>{item.requestedBy || item.userEmail || "Unknown user"} - {item.status || "Unknown"} - {formatDateTime(item.detectedAt)}</span>
                </button>
              )) : (
                <div className="admin-mini-empty">No detections yet.</div>
              )}
            </div>
          </div>

          <div className="admin-panel">
            <div className="panel-title">
              <span className="eyebrow">Client voice</span>
              <h2>Latest feedbacks</h2>
            </div>
            <div className="admin-mini-list">
              {latestFeedbacks.length ? latestFeedbacks.map((feedback) => (
                <button className="admin-mini-item" key={feedback.id} onClick={() => onNavigate("feedbacks")}>
                  <strong>{feedback.rating || 0} / 5 - {feedback.userName || feedback.userEmail}</strong>
                  <span>{feedback.comment || feedback.sign || "No comment"}</span>
                </button>
              )) : (
                <div className="admin-mini-empty">No feedbacks yet.</div>
              )}
            </div>
          </div>
        </section>

        <section className="activity-panel">
          <div>
            <h3>Recent Admin Activity</h3>
            {recentActivity.map((item) => (
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
