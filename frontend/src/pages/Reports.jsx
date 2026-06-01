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
    id: "REP-2001",
    fileName: "city-road-stop.jpg",
    requestedBy: "User",
    sign: "Stop Sign",
    category: "Regulatory",
    confidence: 96,
    status: "Completed",
    createdAt: "2026-05-18 10:24",
  },
  {
    id: "REP-2002",
    fileName: "school-crossing.png",
    requestedBy: "Manager",
    sign: "Pedestrian Crossing",
    category: "Warning",
    confidence: 89,
    status: "Completed",
    createdAt: "2026-05-18 12:10",
  },
  {
    id: "REP-2003",
    fileName: "blurred-night-image.jpg",
    requestedBy: "User",
    sign: "Not detected",
    category: "Unknown",
    confidence: 0,
    status: "Rejected",
    createdAt: "2026-05-19 14:42",
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
    requestedBy: item.requestedBy || "User",
    sign: item.sign,
    category: item.category || "Unknown",
    confidence: item.confidence || 0,
    status: item.status || "Completed",
    createdAt: item.detectedAt || "Saved locally",
  }));
}

function Reports({ currentUser, onLogout, onNavigate }) {
  const fallbackReports = useMemo(readReports, []);
  const [reports, setReports] = useState(fallbackReports);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "Administrator") {
      return;
    }

    fetch(`${API_BASE_URL}/admin/reports?adminEmail=${encodeURIComponent(currentUser.email)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.reports?.length) {
          setReports(data.reports);
        }
      })
      .catch(() => {
        setReports(fallbackReports);
      });
  }, [currentUser, fallbackReports]);

  const completed = reports.filter((report) => report.status === "Completed").length;
  const rejected = reports.filter((report) => report.status === "Rejected").length;
  const averageConfidence = reports.length
    ? Math.round(
        reports.reduce((total, report) => total + Number(report.confidence || 0), 0) /
          reports.length
      )
    : 0;

  function downloadReport(report) {
    downloadReportPdf(
      { ...report, user: report.requestedBy },
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
            <p>You need an administrator account before opening reports.</p>
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
            <p>Only administrators can view system reports.</p>
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
            <h1>Reports</h1>
            <p>
              Review generated detection reports, check model confidence, and download report
              files for project documentation.
            </p>
          </div>
          <button className="secondary-btn" onClick={() => onNavigate("admin-dashboard")}>
            Back to Admin Dashboard
          </button>
        </section>

        <section className="history-summary">
          <div className="dashboard-card">
            <h3>Total Reports</h3>
            <p>{reports.length}</p>
          </div>
          <div className="dashboard-card">
            <h3>Completed</h3>
            <p>{completed}</p>
          </div>
          <div className="dashboard-card">
            <h3>Average Confidence</h3>
            <p>{averageConfidence}%</p>
          </div>
        </section>

        <section className="history-table">
          <div className="admin-report-row admin-report-head">
            <p>Report ID</p>
            <p>Image</p>
            <p>User</p>
            <p>Sign</p>
            <p>Status</p>
            <p>Action</p>
          </div>

          {reports.map((report) => (
            <div className="admin-report-row" key={report.id}>
              <p>{report.id}</p>
              <p>{report.fileName}</p>
              <p>{report.requestedBy}</p>
              <p>{report.sign}</p>
              <p><span className={statusPillClass(report.status)}>{report.status}</span></p>
              <button className="secondary-btn" onClick={() => setSelectedReport(report)}>
                View
              </button>
            </div>
          ))}
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
              <p><strong>User:</strong> {selectedReport.requestedBy}</p>
              <p><strong>Detected sign:</strong> {selectedReport.sign}</p>
              <p><strong>Category:</strong> {selectedReport.category}</p>
              <p><strong>Confidence:</strong> {selectedReport.confidence}%</p>
              <p><strong>Status:</strong> {selectedReport.status}</p>
              <p><strong>Date:</strong> {selectedReport.createdAt}</p>
              <button
                className="primary-btn"
                style={{ width: "100%", marginTop: "16px" }}
                onClick={() => downloadReport(selectedReport)}
              >
                Download Report
              </button>
            </div>
          </div>
        )}

        <section className="activity-panel">
          <div>
            <h3>Report Summary</h3>
            <p>{completed} completed reports and {rejected} rejected reports are available.</p>
          </div>
          <button className="secondary-btn" onClick={() => onNavigate("all-detections")}>
            View All Detections
          </button>
        </section>
      </main>
    </div>
  );
}

export default Reports;
