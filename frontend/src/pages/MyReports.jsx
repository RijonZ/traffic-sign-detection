import { useEffect, useMemo, useState } from "react";
import Navbar from "../shared/Navbar";
import { downloadReportPdf } from "../utils/reportPdf";
import { statusPillClass } from "../utils/statusUtils";
import "../styles/auth.css";
import "../styles/dashboard.css";
import "../styles/history.css";
import "../styles/reports.css";

const HISTORY_KEY = "traffic-sign-detections";
const API_BASE_URL = "http://localhost:5000/api";

const sampleReports = [
  {
    id: "REP-1001",
    fileName: "road-crossing.jpg",
    sign: "Pedestrian Crossing",
    category: "Warning",
    confidence: 96,
    status: "Completed",
    createdAt: "2026-05-10",
  },
  {
    id: "REP-1002",
    fileName: "speed-limit.png",
    sign: "Speed Limit",
    category: "Regulatory",
    confidence: 91,
    status: "Completed",
    createdAt: "2026-05-11",
  },
  {
    id: "REP-1003",
    fileName: "blurred-upload.jpg",
    sign: "Not detected",
    category: "Unknown",
    confidence: 0,
    status: "Rejected",
    createdAt: "2026-05-13",
  },
];

function readReports() {
  const savedDetections = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");

  if (!savedDetections.length) {
    return sampleReports;
  }

  return savedDetections.map((item) => ({
    id: `REP-${item.id}`,
    fileName: item.fileName,
    sign: item.sign,
    category: item.category,
    confidence: item.confidence,
    status: "Completed",
    createdAt: item.detectedAt,
  }));
}

function MyReports({ currentUser, onLogout, onNavigate }) {
  const fallbackReports = useMemo(readReports, []);
  const [reports, setReports] = useState(fallbackReports);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setIsLoading(true);
    setStatusMessage("");

    fetch(`${API_BASE_URL}/users/${encodeURIComponent(currentUser.email)}/reports`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        const backendReports = data?.reports || [];
        setReports(backendReports);
      })
      .catch(() => {
        setReports(fallbackReports);
        setStatusMessage("Backend reports are not available, showing saved demo reports.");
      })
      .finally(() => setIsLoading(false));
  }, [currentUser, fallbackReports]);

  const completedCount = reports.filter((report) => report.status === "Completed").length;
  const averageConfidence = reports.length
    ? Math.round(
        reports.reduce((total, report) => total + Number(report.confidence || 0), 0) /
          reports.length
      )
    : 0;

  function downloadReport(report) {
    downloadReportPdf(
      { ...report, user: currentUser.name },
      `${report.id.toLowerCase()}-traffic-sign-report.pdf`
    );
  }

  if (!currentUser) {
    return (
      <div className="home">
        <Navbar onNavigate={onNavigate} />
        <main className="page-shell">
          <section className="auth-card">
            <h1>Sign in required</h1>
            <p>You need an account before opening your reports.</p>
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
      <Navbar currentUser={currentUser} onLogout={onLogout} onNavigate={onNavigate} />

      <main className="page-shell">
        <section className="dashboard-header">
          <div>
            <span className="eyebrow">User reports</span>
            <h1>My Reports</h1>
            <p>
              View saved detection reports, check confidence scores, and download the result when
              documentation is needed.
            </p>
          </div>
          <button className="primary-btn" onClick={() => onNavigate("detect")}>
            New Detection
          </button>
        </section>

        <section className="history-summary">
          <div className="dashboard-card">
            <h3>Total Reports</h3>
            <p>{reports.length}</p>
          </div>
          <div className="dashboard-card">
            <h3>Completed</h3>
            <p>{completedCount}</p>
          </div>
          <div className="dashboard-card">
            <h3>Average Confidence</h3>
            <p>{averageConfidence}%</p>
          </div>
        </section>

        {statusMessage && <p className="report-status-message">{statusMessage}</p>}

        <section className="history-table">
          <div className="report-row report-head">
            <p>Report ID</p>
            <p>Image</p>
            <p>Sign</p>
            <p>Status</p>
            <p>Action</p>
          </div>

          {isLoading && (
            <div className="report-row">
              <p>Loading</p>
              <p>Backend reports</p>
              <p>Please wait</p>
              <p><span className="status-pill">Loading</span></p>
              <p>-</p>
            </div>
          )}

          {!isLoading && reports.map((report) => (
            <div className="report-row" key={report.id}>
              <p>{report.id}</p>
              <p>{report.fileName}</p>
              <p>{report.sign}</p>
              <p>
                <span className={statusPillClass(report.status)}>{report.status}</span>
              </p>
              <button className="secondary-btn" onClick={() => setSelectedReport(report)}>
                View
              </button>
            </div>
          ))}

          {!isLoading && !reports.length && (
            <div className="report-row">
              <p>No reports</p>
              <p>-</p>
              <p>-</p>
              <p><span className="status-pill">Empty</span></p>
              <p>-</p>
            </div>
          )}
        </section>

        {selectedReport && (
          <div className="report-modal-overlay" onClick={() => setSelectedReport(null)}>
            <div className="report-modal" onClick={(e) => e.stopPropagation()}>
              <div className="report-modal-header">
                <span className="eyebrow">Report detail</span>
                <button className="report-modal-close" onClick={() => setSelectedReport(null)}>✕</button>
              </div>
              <h2>{selectedReport.id}</h2>
              <p><strong>Image:</strong> {selectedReport.fileName}</p>
              <p><strong>Detected sign:</strong> {selectedReport.sign}</p>
              <p><strong>Category:</strong> {selectedReport.category}</p>
              <p><strong>Confidence:</strong> {selectedReport.confidence}%</p>
              <p><strong>Status:</strong> <span className={statusPillClass(selectedReport.status)}>{selectedReport.status}</span></p>
              <p><strong>Date:</strong> {selectedReport.createdAt}</p>
              <button className="primary-btn" style={{ width: "100%", marginTop: "16px" }} onClick={() => downloadReport(selectedReport)}>
                Download Report
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default MyReports;
