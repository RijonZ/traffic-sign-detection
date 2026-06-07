import { useEffect, useMemo, useState } from "react";
import Navbar from "../shared/Navbar";
import { usePagination, Pagination } from "../shared/Pagination";
import { statusPillClass } from "../utils/statusUtils";
import "../styles/audit-logs.css";
import "../styles/auth.css";
import "../styles/dashboard.css";
import "../styles/reports.css";

const USERS_KEY = "traffic-sign-users";
const HISTORY_KEY = "traffic-sign-detections";
import { API_BASE_URL } from "../config/api";

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
  const [filters, setFilters] = useState({
    module: "All",
    status: "All",
    user: "",
  });

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

  const modules = [...new Set(logs.map((log) => log.module))];
  const statuses = [...new Set(logs.map((log) => log.status))];
  const filteredLogs = useMemo(() => {
    const search = filters.user.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesSearch = !search ||
        String(log.user || "").toLowerCase().includes(search) ||
        String(log.action || "").toLowerCase().includes(search) ||
        String(log.module || "").toLowerCase().includes(search);
      const matchesModule = filters.module === "All" || log.module === filters.module;
      const matchesStatus = filters.status === "All" || log.status === filters.status;

      return matchesSearch && matchesModule && matchesStatus;
    });
  }, [filters, logs]);
  const { page, setPage, totalPages, paginatedItems: paginatedLogs, pageSize } = usePagination(filteredLogs);
  const successLogs = filteredLogs.filter((log) => log.status === "Success" || log.status === "Completed").length;
  const reviewLogs = filteredLogs.filter((log) => log.status === "Review" || log.status === "Rejected").length;

  useEffect(() => {
    setPage(1);
  }, [filters, setPage]);

  function updateFilter(key, value) {
    setFilters((currentFilters) => ({ ...currentFilters, [key]: value }));
  }

  function resetFilters() {
    setFilters({ module: "All", status: "All", user: "" });
  }

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
            <p className="metric-value">{filteredLogs.length}</p>
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

        <section className="reports-filter-panel audit-filter-panel">
          <input
            placeholder="Filter by user, action, or module"
            value={filters.user}
            onChange={(event) => updateFilter("user", event.target.value)}
          />
          <select value={filters.module} onChange={(event) => updateFilter("module", event.target.value)}>
            <option value="All">All modules</option>
            {modules.map((module) => (
              <option value={module} key={module}>{module}</option>
            ))}
          </select>
          <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
            <option value="All">All statuses</option>
            {statuses.map((status) => (
              <option value={status} key={status}>{status}</option>
            ))}
          </select>
          <button className="secondary-btn" type="button" onClick={resetFilters}>
            Reset
          </button>
        </section>

        <section className="audit-table">
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
              <p title={log.id}>{log.id}</p>
              <p title={log.action}>{log.action}</p>
              <p title={log.module}>{log.module}</p>
              <p title={log.user}>{log.user}</p>
              <p><span className={statusPillClass(log.status)}>{log.status}</span></p>
              <p title={log.time}>{log.time}</p>
            </div>
          ))}
          {!filteredLogs.length && (
            <div className="audit-row">
              <p>No logs</p>
              <p>-</p>
              <p>-</p>
              <p>-</p>
              <p><span className="status-pill">Empty</span></p>
              <p>-</p>
            </div>
          )}
          <Pagination page={page} totalPages={totalPages} total={filteredLogs.length} pageSize={pageSize} onPage={setPage} />
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
