import { useEffect, useMemo, useState } from "react";
import Navbar from "../shared/Navbar";
import "../styles/all-detections.css";
import "../styles/auth.css";
import "../styles/dashboard.css";

const HISTORY_KEY = "traffic-sign-detections";
const API_BASE_URL = "http://localhost:5000/api";

const sampleDetections = [
  {
    id: "DET-1001",
    fileName: "city-road-stop.jpg",
    requestedBy: "User",
    sign: "Stop Sign",
    category: "Regulatory",
    confidence: 96,
    status: "Completed",
    detectedAt: "2026-05-18 10:24",
  },
  {
    id: "DET-1002",
    fileName: "school-crossing.png",
    requestedBy: "Manager",
    sign: "Pedestrian Crossing",
    category: "Warning",
    confidence: 89,
    status: "Completed",
    detectedAt: "2026-05-18 12:10",
  },
  {
    id: "DET-1003",
    fileName: "speed-limit-road.jpg",
    requestedBy: "User",
    sign: "Speed Limit",
    category: "Regulatory",
    confidence: 92,
    status: "Processing",
    detectedAt: "2026-05-19 09:35",
  },
  {
    id: "DET-1004",
    fileName: "blurred-night-image.jpg",
    requestedBy: "User",
    sign: "Not detected",
    category: "Unknown",
    confidence: 0,
    status: "Rejected",
    detectedAt: "2026-05-19 14:42",
  },
];

const workflowSteps = [
  "Image uploaded",
  "Image validated",
  "Model processed image",
  "Prediction saved",
  "User notified",
];

function readDetections() {
  const savedDetections = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");

  if (!savedDetections.length) {
    return sampleDetections;
  }

  return savedDetections.map((item) => ({
    id: item.id,
    fileName: item.fileName,
    requestedBy: item.requestedBy || "User",
    sign: item.sign,
    category: item.category || "Unknown",
    confidence: item.confidence || 0,
    status: item.status || "Completed",
    detectedAt: item.detectedAt || "Saved locally",
  }));
}

function AllDetections({ currentUser, onLogout, onNavigate }) {
  const fallbackDetections = useMemo(readDetections, []);
  const [detections, setDetections] = useState(fallbackDetections);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "Administrator") {
      return;
    }

    fetch(`${API_BASE_URL}/admin/detections?adminEmail=${encodeURIComponent(currentUser.email)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.detections?.length) {
          setDetections(data.detections);
        }
      })
      .catch(() => setDetections(fallbackDetections));
  }, [currentUser, fallbackDetections]);

  const completed = detections.filter((item) => item.status === "Completed").length;
  const processing = detections.filter((item) => item.status === "Processing").length;
  const rejected = detections.filter((item) => item.status === "Rejected").length;

  if (!currentUser) {
    return (
      <div className="home">
        <Navbar onNavigate={onNavigate} />
        <main className="page-shell">
          <section className="auth-card">
            <h1>Sign in required</h1>
            <p>You need an administrator account before viewing all detections.</p>
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
            <p>Only administrators can view all detection requests.</p>
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
            <h1>All Detections</h1>
            <p>
              Review traffic sign detection requests, model results, confidence scores,
              and processing status from the admin area.
            </p>
          </div>
          <button className="secondary-btn" onClick={() => onNavigate("admin-dashboard")}>
            Back to Admin Dashboard
          </button>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-card">
            <h3>Total Requests</h3>
            <p className="metric-value">{detections.length}</p>
          </div>
          <div className="dashboard-card">
            <h3>Completed</h3>
            <p className="metric-value">{completed}</p>
          </div>
          <div className="dashboard-card">
            <h3>Rejected</h3>
            <p className="metric-value">{rejected}</p>
          </div>
        </section>

        <section className="detections-layout">
          <div className="detections-panel">
            <div className="panel-title">
              <span className="eyebrow">Detection flow</span>
              <h2>Request pipeline</h2>
            </div>

            <div className="detections-flow-list">
              {workflowSteps.map((step, index) => (
                <div className="detections-flow-step" key={step}>
                  <span>{index + 1}</span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="detections-panel">
            <div className="panel-title">
              <span className="eyebrow">Model summary</span>
              <h2>Current status</h2>
            </div>

            <div className="detections-summary">
              <p><strong>Model:</strong> Traffic Sign Classifier</p>
              <p><strong>Status:</strong> Active</p>
              <p><strong>Processing:</strong> {processing}</p>
              <p><strong>Review needed:</strong> {rejected ? "Yes" : "No"}</p>
            </div>
          </div>
        </section>

        <section className="detections-table">
          <div className="detections-row detections-head">
            <p>Request</p>
            <p>Image</p>
            <p>User</p>
            <p>Detected Sign</p>
            <p>Confidence</p>
            <p>Status</p>
          </div>

          {detections.map((item) => (
            <div className="detections-row" key={item.id}>
              <p>{item.id}</p>
              <p>{item.fileName}</p>
              <p>{item.requestedBy}</p>
              <p>{item.sign}</p>
              <p>{item.confidence}%</p>
              <p><span className="status-pill">{item.status}</span></p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default AllDetections;
