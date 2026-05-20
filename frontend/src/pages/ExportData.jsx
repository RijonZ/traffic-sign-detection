import { useMemo, useState } from "react";
import Navbar from "../shared/Navbar";
import "../styles/auth.css";
import "../styles/dashboard.css";
import "../styles/history.css";
import "../styles/reports.css";

const HISTORY_KEY = "traffic-sign-detections";

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
    fileName: "blurred-night-image.jpg",
    requestedBy: "User",
    sign: "Not detected",
    category: "Unknown",
    confidence: 0,
    status: "Rejected",
    detectedAt: "2026-05-19 14:42",
  },
];

function readDetections() {
  const savedDetections = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  return savedDetections.length ? savedDetections : sampleDetections;
}

function downloadFile(fileName, content, type) {
  const fileUrl = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = fileUrl;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(fileUrl);
}

function toCsv(items) {
  const columns = ["id", "fileName", "requestedBy", "sign", "category", "confidence", "status", "detectedAt"];
  const rows = items.map((item) =>
    columns.map((column) => `"${String(item[column] ?? "").replaceAll('"', '""')}"`).join(",")
  );

  return [columns.join(","), ...rows].join("\n");
}

function ExportData({ currentUser, onLogout, onNavigate }) {
  const detections = useMemo(readDetections, []);
  const [format, setFormat] = useState("csv");
  const completed = detections.filter((item) => item.status !== "Rejected").length;

  function exportData() {
    if (format === "json") {
      downloadFile("traffic-sign-detections.json", JSON.stringify(detections, null, 2), "application/json");
      return;
    }

    downloadFile("traffic-sign-detections.csv", toCsv(detections), "text/csv");
  }

  if (!currentUser) {
    return (
      <div className="home">
        <Navbar onNavigate={onNavigate} />
        <main className="page-shell">
          <section className="auth-card">
            <h1>Sign in required</h1>
            <p>You need a manager account before exporting data.</p>
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
            <p>Only managers can export detection data.</p>
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
            <span className="eyebrow">Manager module</span>
            <h1>Export Data</h1>
            <p>Download detection records for reports, analysis, or project documentation.</p>
          </div>
          <button className="secondary-btn" onClick={() => onNavigate("dashboard-analytics")}>
            Back to Analytics
          </button>
        </section>

        <section className="history-summary">
          <div className="dashboard-card">
            <h3>Total Records</h3>
            <p>{detections.length}</p>
          </div>
          <div className="dashboard-card">
            <h3>Completed</h3>
            <p>{completed}</p>
          </div>
          <div className="dashboard-card">
            <h3>Rejected</h3>
            <p>{detections.length - completed}</p>
          </div>
        </section>

        <section className="reports-layout">
          <div className="history-table">
            <div className="report-row report-head">
              <p>ID</p>
              <p>Image</p>
              <p>Detected Sign</p>
              <p>Status</p>
              <p>Confidence</p>
            </div>

            {detections.map((item) => (
              <div className="report-row" key={item.id}>
                <p>{item.id}</p>
                <p>{item.fileName}</p>
                <p>{item.sign}</p>
                <p><span className="status-pill">{item.status}</span></p>
                <p>{item.confidence}%</p>
              </div>
            ))}
          </div>

          <aside className="report-detail">
            <span className="eyebrow">Export format</span>
            <h2>Download file</h2>
            <p>Choose a simple format and export the records shown in the table.</p>

            <label className="field-label" htmlFor="export-format">Format</label>
            <select id="export-format" value={format} onChange={(event) => setFormat(event.target.value)}>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>

            <button className="primary-btn full-width" onClick={exportData}>
              Export Data
            </button>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default ExportData;
