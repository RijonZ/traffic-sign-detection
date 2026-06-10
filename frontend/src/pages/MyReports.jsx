import { useEffect, useState } from "react";
import Navbar from "../shared/Navbar";
import { usePagination, Pagination } from "../shared/Pagination";
import { downloadReportPdf } from "../utils/reportPdf";
import { statusPillClass } from "../utils/statusUtils";
import "../styles/auth.css";
import "../styles/dashboard.css";
import "../styles/history.css";
import "../styles/reports.css";

import { API_BASE_URL } from "../config/api";

function MyReports({ currentUser, onLogout, onNavigate }) {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!currentUser) return;

    setIsLoading(true);
    setStatusMessage("");

    fetch(`${API_BASE_URL}/users/${encodeURIComponent(currentUser.email)}/reports`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setReports(data?.reports || []))
      .catch(() => {
        setReports([]);
        setStatusMessage("Could not load reports. Make sure the backend is running.");
      })
      .finally(() => setIsLoading(false));
  }, [currentUser]);

  const { page, setPage, totalPages, paginatedItems: paginatedReports, pageSize } = usePagination(reports);
  const completedCount = reports.filter((report) => report.status === "Completed").length;
  const averageConfidence = reports.length
    ? Math.round(
        reports.reduce((total, report) => total + Number(report.confidence || 0), 0) /
          reports.length
      )
    : 0;

  function downloadReport(report) {
    fetch(
      `${API_BASE_URL}/users/${encodeURIComponent(currentUser.email)}/reports/${encodeURIComponent(
        report.id
      )}/pdf`
    )
      .then((response) => (response.ok ? response.blob() : Promise.reject()))
      .then((blob) => {
        const reportUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = reportUrl;
        link.download = `${report.id.toLowerCase()}-traffic-sign-report.pdf`;
        link.click();
        URL.revokeObjectURL(reportUrl);
      })
      .catch(() => {
        setStatusMessage("Backend PDF is not available, downloading a local report instead.");
        downloadReportPdf(
          { ...report, user: currentUser.name },
          `${report.id.toLowerCase()}-traffic-sign-report.pdf`
        );
      });
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

          {!isLoading && paginatedReports.map((report) => (
            <div className="report-row" key={report.id}>
              <p title={report.id}>{report.id}</p>
              <p title={report.fileName}>{report.fileName}</p>
              <p title={report.sign}>{report.sign}</p>
              <p>
                <span className={statusPillClass(report.status)}>{report.status}</span>
              </p>
              <button className="secondary-btn" onClick={() => setSelectedReport(report)}>
                View
              </button>
            </div>
          ))}

          {!isLoading && <Pagination page={page} totalPages={totalPages} total={reports.length} pageSize={pageSize} onPage={setPage} />}
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
                <button className="report-modal-close" onClick={() => setSelectedReport(null)}>x</button>
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
