import { useEffect, useMemo, useState } from "react";
import Navbar from "../shared/Navbar";
import { usePagination, Pagination } from "../shared/Pagination";
import { statusPillClass } from "../utils/statusUtils";
import "../styles/all-detections.css";
import "../styles/auth.css";
import "../styles/dashboard.css";
import "../styles/reports.css";

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
  const [actionError, setActionError] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState({
    sign: "",
    category: "",
    confidence: 0,
    status: "Completed",
  });
  const [savingId, setSavingId] = useState("");
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    status: "All",
    user: "",
  });

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

  function updateFilter(key, value) {
    setFilters((currentFilters) => ({ ...currentFilters, [key]: value }));
  }

  function resetFilters() {
    setFilters({ dateFrom: "", dateTo: "", status: "All", user: "" });
  }

  function startEditing(item) {
    setActionError("");
    setEditingId(item.id);
    setEditForm({
      sign: item.sign || "Not detected",
      category: item.category || "Unknown",
      confidence: Number(item.confidence || 0),
      status: item.status || "Completed",
    });
  }

  function updateEditForm(key, value) {
    setEditForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  function cancelEditing() {
    setEditingId("");
    setActionError("");
  }

  async function saveDetection(item) {
    setSavingId(item.id);
    setActionError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/detections/${encodeURIComponent(item.id)}?adminEmail=${encodeURIComponent(currentUser.email)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: item.fileName,
            fileSize: item.fileSize || 0,
            fileType: item.fileType || "image/unknown",
            box: item.box || "",
            ...editForm,
          }),
        }
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Detection could not be updated.");
      }

      setDetections((currentDetections) =>
        currentDetections.map((detection) =>
          detection.id === item.id ? data.detection : detection
        )
      );
      setEditingId("");
    } catch (error) {
      setActionError(error.message);
    } finally {
      setSavingId("");
    }
  }

  async function deleteDetection(item) {
    const confirmed = window.confirm(`Delete detection ${item.id}?`);
    if (!confirmed) return;

    setSavingId(item.id);
    setActionError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/detections/${encodeURIComponent(item.id)}?adminEmail=${encodeURIComponent(currentUser.email)}`,
        { method: "DELETE" }
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Detection could not be deleted.");
      }

      setDetections((currentDetections) =>
        currentDetections.filter((detection) => detection.id !== item.id)
      );
      if (editingId === item.id) {
        setEditingId("");
      }
    } catch (error) {
      setActionError(error.message);
    } finally {
      setSavingId("");
    }
  }

  const filteredDetections = useMemo(() => {
    const search = filters.user.trim().toLowerCase();
    const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
    const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : null;

    return detections.filter((item) => {
      const detectedAt = item.detectedAt ? new Date(item.detectedAt) : null;
      const matchesSearch = !search ||
        String(item.requestedBy || "").toLowerCase().includes(search) ||
        String(item.userEmail || "").toLowerCase().includes(search);
      const matchesStatus = filters.status === "All" || item.status === filters.status;
      const matchesFrom = !from || (detectedAt && detectedAt >= from);
      const matchesTo = !to || (detectedAt && detectedAt <= to);

      return matchesSearch && matchesStatus && matchesFrom && matchesTo;
    });
  }, [detections, filters]);

  const { page, setPage, totalPages, paginatedItems, pageSize } = usePagination(filteredDetections);
  const completed = filteredDetections.filter((item) => item.status === "Completed").length;
  const processing = filteredDetections.filter((item) => item.status === "Processing").length;
  const rejected = filteredDetections.filter((item) => item.status === "Rejected").length;

  useEffect(() => {
    setPage(1);
  }, [filters, setPage]);

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
            <p className="metric-value">{filteredDetections.length}</p>
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

        <section className="reports-filter-panel detections-filter-panel">
          <input
            placeholder="Filter by user or email"
            value={filters.user}
            onChange={(event) => updateFilter("user", event.target.value)}
          />
          <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
            <option value="All">All statuses</option>
            <option value="Completed">Completed</option>
            <option value="Rejected">Rejected</option>
            <option value="Processing">Processing</option>
            <option value="Failed">Failed</option>
          </select>
          <label className="reports-date-filter">
            <span>From date</span>
            <input
              aria-label="From date"
              type="date"
              value={filters.dateFrom}
              onChange={(event) => updateFilter("dateFrom", event.target.value)}
            />
          </label>
          <label className="reports-date-filter">
            <span>To date</span>
            <input
              aria-label="To date"
              type="date"
              value={filters.dateTo}
              onChange={(event) => updateFilter("dateTo", event.target.value)}
            />
          </label>
          <button className="secondary-btn" type="button" onClick={resetFilters}>
            Reset
          </button>
        </section>

        {actionError && (
          <p className="auth-error" style={{ marginTop: "16px" }}>{actionError}</p>
        )}

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
            <p>Actions</p>
          </div>

          {paginatedItems.map((item) => (
            <div className="detections-row" key={item.id}>
              <p>{item.id}</p>
              <p>{item.fileName}</p>
              <p>{item.requestedBy}</p>
              {editingId === item.id ? (
                <>
                  <div className="detection-edit-fields">
                    <input
                      aria-label="Detected sign"
                      value={editForm.sign}
                      onChange={(event) => updateEditForm("sign", event.target.value)}
                    />
                    <input
                      aria-label="Detection category"
                      value={editForm.category}
                      onChange={(event) => updateEditForm("category", event.target.value)}
                    />
                  </div>
                  <input
                    className="detection-confidence-input"
                    aria-label="Confidence"
                    min="0"
                    max="100"
                    type="number"
                    value={editForm.confidence}
                    onChange={(event) => updateEditForm("confidence", event.target.value)}
                  />
                  <select
                    className="role-select"
                    value={editForm.status}
                    onChange={(event) => updateEditForm("status", event.target.value)}
                  >
                    <option value="Completed">Completed</option>
                    <option value="Processing">Processing</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Failed">Failed</option>
                  </select>
                </>
              ) : (
                <>
                  <p>{item.sign}</p>
                  <p>{item.confidence}%</p>
                  <p>
                    <span className={statusPillClass(item.status)}>{item.status}</span>
                  </p>
                </>
              )}
              <div className="users-actions">
                {editingId === item.id ? (
                  <>
                    <button
                      className="action-btn action-btn-toggle"
                      disabled={savingId === item.id}
                      type="button"
                      onClick={() => saveDetection(item)}
                    >
                      {savingId === item.id ? "Saving" : "Save"}
                    </button>
                    <button
                      className="action-btn"
                      disabled={savingId === item.id}
                      type="button"
                      onClick={cancelEditing}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="action-btn action-btn-toggle"
                      disabled={Boolean(savingId)}
                      type="button"
                      onClick={() => startEditing(item)}
                    >
                      Edit
                    </button>
                    <button
                      className="action-btn action-btn-danger"
                      disabled={Boolean(savingId)}
                      type="button"
                      onClick={() => deleteDetection(item)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {!filteredDetections.length && (
            <div className="detections-row">
              <p>No requests</p>
              <p>-</p>
              <p>-</p>
              <p>-</p>
              <p>-</p>
              <p><span className="status-pill">Empty</span></p>
              <p>-</p>
            </div>
          )}
          <Pagination page={page} totalPages={totalPages} total={filteredDetections.length} pageSize={pageSize} onPage={setPage} />
        </section>
      </main>
    </div>
  );
}

export default AllDetections;
