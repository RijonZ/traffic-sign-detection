import { useMemo, useState } from "react";
import Navbar from "../shared/Navbar";
import "../styles/auth.css";
import "../styles/dashboard.css";
import "../styles/history.css";
import "../styles/reports.css";

const HISTORY_KEY = "traffic-sign-detections";

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
  const reports = useMemo(readReports, []);
  const [selectedReport, setSelectedReport] = useState(reports[0]);

  const completedCount = reports.filter((report) => report.status === "Completed").length;
  const averageConfidence = Math.round(
    reports.reduce((total, report) => total + Number(report.confidence || 0), 0) / reports.length
  );

  function downloadReport(report) {
    const reportText = [
      "Traffic Sign Detection Report",
      `Report ID: ${report.id}`,
      `User: ${currentUser.name}`,
      `Image: ${report.fileName}`,
      `Detected sign: ${report.sign}`,
      `Category: ${report.category}`,
      `Confidence: ${report.confidence}%`,
      `Status: ${report.status}`,
      `Created at: ${report.createdAt}`,
    ].join("\n");

    const reportUrl = URL.createObjectURL(new Blob([reportText], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = reportUrl;
    link.download = `${report.id.toLowerCase()}-traffic-sign-report.txt`;
    link.click();
    URL.revokeObjectURL(reportUrl);
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

        <section className="reports-layout">
          <div className="history-table">
            <div className="report-row report-head">
              <p>Report ID</p>
              <p>Image</p>
              <p>Sign</p>
              <p>Status</p>
              <p>Action</p>
            </div>

            {reports.map((report) => (
              <div className="report-row" key={report.id}>
                <p>{report.id}</p>
                <p>{report.fileName}</p>
                <p>{report.sign}</p>
                <p>
                  <span className="status-pill">{report.status}</span>
                </p>
                <button className="secondary-btn" onClick={() => setSelectedReport(report)}>
                  View
                </button>
              </div>
            ))}
          </div>

          <aside className="report-detail">
            <span className="eyebrow">Selected report</span>
            <h2>{selectedReport.id}</h2>
            <p><strong>Image:</strong> {selectedReport.fileName}</p>
            <p><strong>Detected sign:</strong> {selectedReport.sign}</p>
            <p><strong>Category:</strong> {selectedReport.category}</p>
            <p><strong>Confidence:</strong> {selectedReport.confidence}%</p>
            <p><strong>Date:</strong> {selectedReport.createdAt}</p>
            <button className="primary-btn full-width" onClick={() => downloadReport(selectedReport)}>
              Download Report
            </button>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default MyReports;
