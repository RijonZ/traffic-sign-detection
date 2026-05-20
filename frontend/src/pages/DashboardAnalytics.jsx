import { useMemo } from "react";
import Navbar from "../shared/Navbar";
import "../styles/analytics.css";
import "../styles/auth.css";
import "../styles/dashboard.css";

const HISTORY_KEY = "traffic-sign-detections";

const sampleDetections = [
  { id: 1, sign: "Stop Sign", category: "Regulatory", confidence: 96, status: "Completed" },
  { id: 2, sign: "Speed Limit", category: "Regulatory", confidence: 91, status: "Completed" },
  { id: 3, sign: "Pedestrian Crossing", category: "Warning", confidence: 89, status: "Completed" },
  { id: 4, sign: "No Entry", category: "Prohibition", confidence: 94, status: "Completed" },
  { id: 5, sign: "Not detected", category: "Unknown", confidence: 0, status: "Rejected" },
];

function readDetections() {
  const savedDetections = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  return savedDetections.length ? savedDetections : sampleDetections;
}

function countByCategory(detections) {
  return detections.reduce((groups, detection) => {
    const category = detection.category || "Unknown";
    return { ...groups, [category]: (groups[category] || 0) + 1 };
  }, {});
}

function DashboardAnalytics({ currentUser, onLogout, onNavigate }) {
  const detections = useMemo(readDetections, []);
  const categoryCounts = countByCategory(detections);
  const completed = detections.filter((item) => item.status !== "Rejected").length;
  const rejected = detections.length - completed;
  const averageConfidence = Math.round(
    detections.reduce((total, item) => total + Number(item.confidence || 0), 0) / detections.length
  );

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
            <p className="metric-value">{detections.length}</p>
          </div>
          <div className="dashboard-card">
            <h3>Average Confidence</h3>
            <p className="metric-value">{averageConfidence}%</p>
          </div>
          <div className="dashboard-card">
            <h3>Rejected Uploads</h3>
            <p className="metric-value">{rejected}</p>
          </div>
        </section>

        <section className="analytics-layout">
          <div className="analytics-panel">
            <div className="panel-heading">
              <span className="eyebrow">Detection categories</span>
              <h2>Signs detected by type</h2>
            </div>

            {Object.entries(categoryCounts).map(([category, count]) => (
              <div className="bar-row" key={category}>
                <div>
                  <strong>{category}</strong>
                  <span>{count} detections</span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${Math.max((count / detections.length) * 100, 8)}%` }}
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
              <p><strong>Completed:</strong> {completed}</p>
              <p><strong>Rejected:</strong> {rejected}</p>
              <p><strong>Model status:</strong> Active</p>
              <p><strong>Review needed:</strong> {averageConfidence < 85 ? "Yes" : "No"}</p>
            </div>
          </div>
        </section>

        <section className="activity-panel">
          <div>
            <h3>Recent Manager Insight</h3>
            <p>
              Regulatory signs are the most common category, while rejected uploads should be
              reviewed when image quality is low.
            </p>
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
