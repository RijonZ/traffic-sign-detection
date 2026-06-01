import { useEffect, useState } from "react";
import Navbar from "../shared/Navbar";
import { statusPillClass } from "../utils/statusUtils";
import "../styles/auth.css";
import "../styles/dashboard.css";
import "../styles/history.css";

const API_BASE_URL = "http://localhost:5000/api";

const sampleDetections = [
  {
    id: "REQ-1001",
    imageName: "road-crossing.jpg",
    sign: "Pedestrian crossing",
    confidence: "96%",
    status: "Completed",
    date: "2026-05-10",
  },
  {
    id: "REQ-1002",
    imageName: "speed-limit.png",
    sign: "Speed limit 50",
    confidence: "91%",
    status: "Completed",
    date: "2026-05-11",
  },
  {
    id: "REQ-1003",
    imageName: "night-road.jpg",
    sign: "Stop sign",
    confidence: "88%",
    status: "Completed",
    date: "2026-05-12",
  },
  {
    id: "REQ-1004",
    imageName: "blurred-upload.jpg",
    sign: "Not detected",
    confidence: "-",
    status: "Rejected",
    date: "2026-05-13",
  },
];

function formatDetection(item) {
  return {
    id: item.id,
    imageName: item.imageName || item.fileName,
    sign: item.sign,
    confidence: item.confidence === 0 ? "-" : `${item.confidence}%`,
    status: item.status,
    date: item.date || item.detectedAt,
  };
}

function DetectionHistory({ currentUser, onLogout, onNavigate }) {
  const [detections, setDetections] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    fetch(`${API_BASE_URL}/users/${encodeURIComponent(currentUser.email)}/detections`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        setDetections(data?.detections ? data.detections.map(formatDetection) : []);
      })
      .catch(() => setDetections([]));
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="home">
        <Navbar onNavigate={onNavigate} />
        <main className="page-shell">
          <section className="auth-card">
            <h1>Sign in required</h1>
            <p>You need an account before opening detection history.</p>
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
            <span className="eyebrow">Saved detections</span>
            <h1>Detection History</h1>
            <p>
              Review previous image uploads, detected traffic signs, confidence
              score, and request status.
            </p>
          </div>
          <button className="secondary-btn" onClick={() => onNavigate("dashboard")}>
            Back to Dashboard
          </button>
        </section>

        <section className="history-summary">
          <div className="dashboard-card">
            <h3>Total Requests</h3>
            <p>{detections ? detections.length : "—"}</p>
          </div>

          <div className="dashboard-card">
            <h3>Completed</h3>
            <p>{detections ? detections.filter((item) => item.status === "Completed").length : "—"}</p>
          </div>

          <div className="dashboard-card">
            <h3>Rejected</h3>
            <p>{detections ? detections.filter((item) => item.status === "Rejected").length : "—"}</p>
          </div>
        </section>

        <section className="history-table">
          <div className="history-row history-head">
            <p>Request ID</p>
            <p>Image</p>
            <p>Detected Sign</p>
            <p>Confidence</p>
            <p>Status</p>
            <p>Date</p>
          </div>

          {detections === null && (
            <p style={{ padding: "24px 16px", color: "var(--muted, #888)" }}>Loading…</p>
          )}

          {detections !== null && detections.length === 0 && (
            <p style={{ padding: "24px 16px", color: "var(--muted, #888)" }}>
              No detections yet. Upload an image to get started.
            </p>
          )}

          {detections !== null && detections.map((detection) => (
            <div className="history-row" key={detection.id}>
              <p>{detection.id}</p>
              <p>{detection.imageName}</p>
              <p>{detection.sign}</p>
              <p>{detection.confidence}</p>
              <p>
                <span className={statusPillClass(detection.status)}>{detection.status}</span>
              </p>
              <p>{detection.date}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default DetectionHistory;
