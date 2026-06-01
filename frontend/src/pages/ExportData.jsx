import { useEffect, useState } from "react";
import Navbar from "../shared/Navbar";
import { statusPillClass } from "../utils/statusUtils";
import "../styles/auth.css";
import "../styles/dashboard.css";
import "../styles/history.css";
import "../styles/reports.css";

const API_BASE_URL = "http://localhost:5000/api";

const emptySummary = {
  totalRecords: 0,
  completed: 0,
  rejected: 0,
};

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
  const [detections, setDetections] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [format, setFormat] = useState("csv");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!currentUser || currentUser.role !== "Manager") {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    fetch(
      `${API_BASE_URL}/manager/export-data?managerEmail=${encodeURIComponent(
        currentUser.email
      )}`
    )
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        setDetections(data.records || []);
        setSummary(data.summary || emptySummary);
      })
      .catch(() => {
        setDetections([]);
        setSummary(emptySummary);
        setErrorMessage("Could not load export data from the backend.");
      })
      .finally(() => setLoading(false));
  }, [currentUser]);

  function exportData() {
    if (!detections.length) {
      return;
    }

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
            <p>{loading ? "..." : summary.totalRecords}</p>
          </div>
          <div className="dashboard-card">
            <h3>Completed</h3>
            <p>{loading ? "..." : summary.completed}</p>
          </div>
          <div className="dashboard-card">
            <h3>Rejected</h3>
            <p>{loading ? "..." : summary.rejected}</p>
          </div>
        </section>

        {errorMessage && <p className="auth-error">{errorMessage}</p>}

        <section className="reports-layout">
          <div className="history-table">
            <div className="report-row report-head">
              <p>ID</p>
              <p>Image</p>
              <p>Detected Sign</p>
              <p>Status</p>
              <p>Confidence</p>
            </div>

            {!loading && detections.length === 0 && (
              <p style={{ padding: "24px 16px", color: "var(--muted, #888)" }}>
                No export records are available yet.
              </p>
            )}

            {detections.map((item) => (
              <div className="report-row" key={item.id}>
                <p>{item.id}</p>
                <p>{item.fileName}</p>
                <p>{item.sign}</p>
                <p><span className={statusPillClass(item.status)}>{item.status}</span></p>
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

            <button className="primary-btn full-width" onClick={exportData} disabled={!detections.length}>
              {detections.length ? "Export Data" : "No Data to Export"}
            </button>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default ExportData;
