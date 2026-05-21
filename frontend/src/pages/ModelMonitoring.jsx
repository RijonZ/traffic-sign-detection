import { useMemo } from "react";
import Navbar from "../shared/Navbar";
import "../styles/auth.css";
import "../styles/dashboard.css";
import "../styles/model-monitoring.css";

const HISTORY_KEY = "traffic-sign-detections";

const sampleDetections = [
  { sign: "Stop Sign", confidence: 96, status: "Completed", category: "Regulatory" },
  { sign: "Pedestrian Crossing", confidence: 89, status: "Completed", category: "Warning" },
  { sign: "Speed Limit", confidence: 92, status: "Completed", category: "Regulatory" },
  { sign: "Not detected", confidence: 0, status: "Rejected", category: "Unknown" },
];

const modelChecks = [
  {
    name: "Image validation",
    status: "Healthy",
    detail: "Only image files under the upload limit are accepted.",
  },
  {
    name: "Prediction service",
    status: "Active",
    detail: "The classifier is ready to process traffic sign images.",
  },
  {
    name: "Result storage",
    status: "Active",
    detail: "Detection results are saved in local history.",
  },
  {
    name: "Notification flow",
    status: "Ready",
    detail: "Users can review completed or rejected requests.",
  },
];

function readDetections() {
  const savedDetections = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  return savedDetections.length ? savedDetections : sampleDetections;
}

function getCategoryCounts(detections) {
  return detections.reduce((groups, item) => {
    const category = item.category || "Unknown";
    return { ...groups, [category]: (groups[category] || 0) + 1 };
  }, {});
}

function ModelMonitoring({ currentUser, onLogout, onNavigate }) {
  const detections = useMemo(readDetections, []);
  const categories = getCategoryCounts(detections);
  const completed = detections.filter((item) => item.status !== "Rejected").length;
  const rejected = detections.length - completed;
  const averageConfidence = Math.round(
    detections.reduce((total, item) => total + Number(item.confidence || 0), 0) / detections.length
  );
  const modelAccuracy = Math.max(averageConfidence - rejected * 2, 0);

  if (!currentUser) {
    return (
      <div className="home">
        <Navbar onNavigate={onNavigate} />
        <main className="page-shell">
          <section className="auth-card">
            <h1>Sign in required</h1>
            <p>You need an administrator account before opening model monitoring.</p>
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
            <p>Only administrators can monitor the traffic sign model.</p>
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
            <span className="eyebrow">Administrator module</span>
            <h1>Model Monitoring</h1>
            <p>
              Monitor traffic sign classifier health, prediction confidence, rejected uploads,
              and request categories from one simple admin page.
            </p>
          </div>
          <button className="secondary-btn" onClick={() => onNavigate("admin-dashboard")}>
            Back to Admin Dashboard
          </button>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-card">
            <h3>Model Accuracy</h3>
            <p className="metric-value">{modelAccuracy}%</p>
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

        <section className="monitoring-layout">
          <div className="monitoring-panel">
            <div className="panel-title">
              <span className="eyebrow">Model health</span>
              <h2>Pipeline checks</h2>
            </div>

            <div className="monitoring-checks">
              {modelChecks.map((check) => (
                <div className="monitoring-check" key={check.name}>
                  <div>
                    <strong>{check.name}</strong>
                    <p>{check.detail}</p>
                  </div>
                  <span className="status-pill">{check.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="monitoring-panel">
            <div className="panel-title">
              <span className="eyebrow">Detection categories</span>
              <h2>Model output summary</h2>
            </div>

            <div className="monitoring-bars">
              {Object.entries(categories).map(([category, count]) => (
                <div className="monitoring-bar-row" key={category}>
                  <div>
                    <strong>{category}</strong>
                    <span>{count} requests</span>
                  </div>
                  <div className="monitoring-bar-track">
                    <div
                      className="monitoring-bar-fill"
                      style={{ width: `${Math.max((count / detections.length) * 100, 8)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="activity-panel">
          <div>
            <h3>Monitoring Summary</h3>
            <p>
              The model is active with {completed} completed requests and {rejected} rejected
              uploads available for review.
            </p>
          </div>
          <button className="secondary-btn" onClick={() => onNavigate("all-detections")}>
            View All Detections
          </button>
        </section>
      </main>
    </div>
  );
}

export default ModelMonitoring;
