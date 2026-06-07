import { useEffect, useState } from "react";
import Navbar from "../shared/Navbar";
import "../styles/analytics.css";
import "../styles/auth.css";
import "../styles/dashboard.css";

import { API_BASE_URL } from "../config/api";

const emptyAnalytics = {
  metrics: {
    totalDetections: 0,
    averageConfidence: 0,
    rejectedUploads: 0,
    completed: 0,
    modelStatus: "Active",
    reviewNeeded: false,
  },
  categoryCounts: {},
  insight: "No detections are available yet. Upload traffic sign images to populate analytics.",
};

function DashboardAnalytics({ currentUser, onLogout, onNavigate }) {
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!currentUser || currentUser.role !== "Manager") {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    fetch(
      `${API_BASE_URL}/manager/dashboard-analytics?managerEmail=${encodeURIComponent(
        currentUser.email
      )}`
    )
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setAnalytics(data))
      .catch(() => {
        setAnalytics(emptyAnalytics);
        setErrorMessage("Could not load analytics from the backend.");
      })
      .finally(() => setLoading(false));
  }, [currentUser]);

  const { metrics, categoryCounts, insight } = analytics;
  const totalDetections = metrics.totalDetections || 0;

  if (!currentUser) {
    return (
      <div className="home">
        <Navbar onNavigate={onNavigate} />
        <main className="page-shell">
          <section className="auth-card">
            <h1>Sign in required</h1>
            <p>You need a manager account before opening analytics.</p>
            <button className="primary-btn" onClick={() => onNavigate("login")}>
              Go to login
            </button>
          </section>
        </main>
      </div>
    );
  }

  if (currentUser.role !== "Manager") {
    return (
      <div className="home">
        <Navbar currentUser={currentUser} onLogout={onLogout} onNavigate={onNavigate} />
        <main className="page-shell">
          <section className="auth-card">
            <h1>Manager access only</h1>
            <p>This analytics dashboard is available for managers.</p>
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
            <span className="eyebrow">Manager overview</span>
            <h1>Dashboard Analytics</h1>
            <p>
              Track detection volume, model confidence, rejected uploads, and traffic sign
              categories from one simple manager dashboard.
            </p>
          </div>
          <button className="secondary-btn" onClick={() => onNavigate("reports")}>
            Open Reports
          </button>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-card">
            <h3>Total Detections</h3>
            <p className="metric-value">{loading ? "..." : totalDetections}</p>
          </div>
          <div className="dashboard-card">
            <h3>Average Confidence</h3>
            <p className="metric-value">{loading ? "..." : `${metrics.averageConfidence || 0}%`}</p>
          </div>
          <div className="dashboard-card">
            <h3>Rejected Uploads</h3>
            <p className="metric-value">{loading ? "..." : metrics.rejectedUploads || 0}</p>
          </div>
        </section>

        {errorMessage && <p className="auth-error">{errorMessage}</p>}

        <section className="analytics-layout">
          <div className="analytics-panel">
            <div className="panel-heading">
              <span className="eyebrow">Detection categories</span>
              <h2>Signs detected by type</h2>
            </div>

            {!Object.keys(categoryCounts).length && (
              <p className="analytics-empty">No category data available yet.</p>
            )}

            {Object.entries(categoryCounts).map(([category, count]) => (
              <div className="bar-row" key={category}>
                <div>
                  <strong>{category}</strong>
                  <span>{count} detections</span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${Math.max((count / totalDetections) * 100, 8)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="analytics-panel">
            <div className="panel-heading">
              <span className="eyebrow">Request quality</span>
              <h2>Processing summary</h2>
            </div>

            <div className="summary-list">
              <p><strong>Completed:</strong> {metrics.completed || 0}</p>
              <p><strong>Rejected:</strong> {metrics.rejectedUploads || 0}</p>
              <p><strong>Model status:</strong> {metrics.modelStatus || "Active"}</p>
              <p><strong>Review needed:</strong> {metrics.reviewNeeded ? "Yes" : "No"}</p>
            </div>
          </div>
        </section>

        <section className="activity-panel">
          <div>
            <h3>Recent Manager Insight</h3>
            <p>{insight}</p>
          </div>
          <button className="primary-btn" onClick={() => onNavigate("all-detections")}>
            View All Detections
          </button>
        </section>
      </main>
    </div>
  );
}

export default DashboardAnalytics;
