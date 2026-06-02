import { useEffect, useMemo, useState } from "react";
import Navbar from "../shared/Navbar";
import { usePagination, Pagination } from "../shared/Pagination";
import "../styles/audit-logs.css";
import "../styles/auth.css";
import "../styles/dashboard.css";

const USERS_KEY = "traffic-sign-users";
const HISTORY_KEY = "traffic-sign-detections";
const API_BASE_URL = "http://localhost:5000/api";

const sampleLogs = [
  {
    id: "LOG-1001",
    action: "Admin login",
    module: "Authentication",
    user: "Admin",
    status: "Success",
    time: "2026-05-21 09:10",
  },
  {
    id: "LOG-1002",
    action: "Detection reviewed",
    module: "All Detections",
    user: "Admin",
    status: "Success",
    time: "2026-05-21 09:24",
  },
  {
    id: "LOG-1003",
    action: "Report downloaded",
    module: "Reports",
    user: "Manager",
    status: "Success",
    time: "2026-05-21 10:02",
  },
  {
    id: "LOG-1004",
    action: "Rejected upload checked",
    module: "Model Monitoring",
    user: "Admin",
    status: "Review",
    time: "2026-05-21 10:30",
  },
];

function readUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
}

function readDetections() {
  return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
}

function buildAuditLogs() {
  const users = readUsers();
  const detections = readDetections();

  if (!users.length && !detections.length) {
    return sampleLogs;
  }

  const userLogs = users.slice(0, 4).map((user, index) => ({
    id: `LOG-U${index + 1}`,
    action: "User account available",
    module: "Users",
    user: user.name,
    status: "Success",
    time: "Saved locally",
  }));

  const detectionLogs = detections.slice(0, 4).map((item, index) => ({
    id: `LOG-D${index + 1}`,
    action: `${item.sign} detection ${item.status || "Completed"}`,
    module: "Detection Request",
    user: item.requestedBy || "User",
    status: item.status || "Success",
    time: item.detectedAt || "Saved locally",
  }));

  return [...detectionLogs, ...userLogs, ...sampleLogs].slice(0, 8);
}

function AuditLogs({ currentUser, onLogout, onNavigate }) {
  const fallbackLogs = useMemo(buildAuditLogs, []);
  const [logs, setLogs] = useState(fallbackLogs);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "Administrator") {
      return;
    }

    fetch(`${API_BASE_URL}/admin/audit-logs?adminEmail=${encodeURIComponent(currentUser.email)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.logs?.length) {
          setLogs(data.logs);
        }
      })
      .catch(() => setLogs(fallbackLogs));
  }, [currentUser, fallbackLogs]);

  const { page, setPage, totalPages, paginatedItems: paginatedLogs, pageSize } = usePagination(logs);
  const successLogs = logs.filter((log) => log.status === "Success" || log.status === "Completed").length;
  const reviewLogs = logs.filter((log) => log.status === "Review" || log.status === "Rejected").length;
  const modules = [...new Set(logs.map((log) => log.module))];

  if (!currentUser) {
    return (
      <div className="home">
        <Navbar onNavigate={onNavigate} />
        <main className="page-shell">
          <section className="auth-card">
            <h1>Sign in required</h1>
            <p>You need an administrator account before viewing audit logs.</p>
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
            <p>Only administrators can view system audit logs.</p>
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
            <h1>Audit Logs</h1>
            <p>
              Track important system activity such as user access, detection review,
              report downloads, and model monitoring checks.
            </p>
          </div>
          <button className="secondary-btn" onClick={() => onNavigate("admin-dashboard")}>
            Back to Admin Dashboard
          </button>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-card">
            <h3>Total Logs</h3>
            <p className="metric-value">{logs.length}</p>
          </div>
          <div className="dashboard-card">
            <h3>Success Events</h3>
            <p className="metric-value">{successLogs}</p>
          </div>
          <div className="dashboard-card">
            <h3>Review Events</h3>
            <p className="metric-value">{reviewLogs}</p>
          </div>
        </section>

        <section className="audit-layout">
          <div className="audit-table">
            <div className="audit-row audit-head">
              <p>Log ID</p>
              <p>Action</p>
              <p>Module</p>
              <p>User</p>
              <p>Status</p>
              <p>Time</p>
            </div>

            {paginatedLogs.map((log) => (
              <div className="audit-row" key={log.id}>
                <p>{log.id}</p>
                <p>{log.action}</p>
                <p>{log.module}</p>
                <p>{log.user}</p>
                <p><span className="status-pill">{log.status}</span></p>
                <p>{log.time}</p>
              </div>
            ))}
            <Pagination page={page} totalPages={totalPages} total={logs.length} pageSize={pageSize} onPage={setPage} />
          </div>

          <aside className="audit-panel">
            <span className="eyebrow">Tracked modules</span>
            <h2>System coverage</h2>
            {modules.map((module) => (
              <p key={module}>{module}</p>
            ))}
          </aside>
        </section>

        <section className="activity-panel">
          <div>
            <h3>Audit Summary</h3>
            <p>Recent activity is recorded for admin review and project traceability.</p>
          </div>
          <button className="secondary-btn" onClick={() => onNavigate("reports")}>
            Open Reports
          </button>
        </section>
      </main>
    </div>
  );
}

export default AuditLogs;
