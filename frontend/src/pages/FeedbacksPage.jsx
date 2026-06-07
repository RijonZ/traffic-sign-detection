import { useEffect, useMemo, useState } from "react";
import Navbar from "../shared/Navbar";
import { usePagination, Pagination } from "../shared/Pagination";
import "../styles/auth.css";
import "../styles/dashboard.css";
import "../styles/history.css";
import "../styles/reports.css";

const API_BASE_URL = "http://localhost:5000/api";

function Stars({ rating }) {
  return (
    <span style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ fontSize: "15px", color: rating >= s ? "#f59e0b" : "#d1d5db" }}>
          ★
        </span>
      ))}
    </span>
  );
}

function formatDate(raw) {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(raw);
  }
}

function FeedbacksPage({ currentUser, onLogout, onNavigate }) {
  const [feedbacks, setFeedbacks] = useState(null);
  const [filters, setFilters] = useState({
    comments: "All",
    rating: "All",
    user: "",
  });

  useEffect(() => {
    if (!currentUser || currentUser.role !== "Administrator") return;

    fetch(
      `${API_BASE_URL}/admin/feedbacks?adminEmail=${encodeURIComponent(currentUser.email)}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setFeedbacks(data?.feedbacks ?? []))
      .catch(() => setFeedbacks([]));
  }, [currentUser]);

  function updateFilter(key, value) {
    setFilters((currentFilters) => ({ ...currentFilters, [key]: value }));
  }

  function resetFilters() {
    setFilters({ comments: "All", rating: "All", user: "" });
  }

  const filteredFeedbacks = useMemo(() => {
    const search = filters.user.trim().toLowerCase();

    return (feedbacks ?? []).filter((feedback) => {
      const hasComment = Boolean(String(feedback.comment || "").trim());
      const matchesSearch = !search ||
        String(feedback.userName || "").toLowerCase().includes(search) ||
        String(feedback.userEmail || "").toLowerCase().includes(search) ||
        String(feedback.sign || "").toLowerCase().includes(search);
      const matchesRating = filters.rating === "All" || Number(feedback.rating) === Number(filters.rating);
      const matchesComments =
        filters.comments === "All" ||
        (filters.comments === "With comments" && hasComment) ||
        (filters.comments === "No comments" && !hasComment);

      return matchesSearch && matchesRating && matchesComments;
    });
  }, [feedbacks, filters]);

  const { page, setPage, totalPages, paginatedItems: paginatedFeedbacks, pageSize } = usePagination(filteredFeedbacks);
  const avgRating =
    filteredFeedbacks.length
      ? (filteredFeedbacks.reduce((sum, f) => sum + f.rating, 0) / filteredFeedbacks.length).toFixed(1)
      : "—";

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
            <p>You need an administrator account to view feedbacks.</p>
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
            <p>Only administrators can view detection feedbacks.</p>
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
            <h1>Detection Feedbacks</h1>
            <p>Review ratings and comments submitted by users for their completed detections.</p>
          </div>
          <button className="secondary-btn" onClick={() => onNavigate("admin-dashboard")}>
            Back to Admin Dashboard
          </button>
        </section>

        <section className="history-summary">
          <div className="dashboard-card">
            <h3>Total Feedbacks</h3>
            <p>{feedbacks ? filteredFeedbacks.length : "—"}</p>
          </div>
          <div className="dashboard-card">
            <h3>Average Rating</h3>
            <p>{feedbacks ? avgRating : "—"}</p>
          </div>
          <div className="dashboard-card">
            <h3>With Comments</h3>
            <p>{feedbacks ? filteredFeedbacks.filter((f) => f.comment).length : "—"}</p>
          </div>
        </section>

        <section className="reports-filter-panel feedbacks-filter-panel">
          <input
            placeholder="Filter by user, email, or sign"
            value={filters.user}
            onChange={(event) => updateFilter("user", event.target.value)}
          />
          <select value={filters.rating} onChange={(event) => updateFilter("rating", event.target.value)}>
            <option value="All">All ratings</option>
            <option value="5">5 stars</option>
            <option value="4">4 stars</option>
            <option value="3">3 stars</option>
            <option value="2">2 stars</option>
            <option value="1">1 star</option>
          </select>
          <select value={filters.comments} onChange={(event) => updateFilter("comments", event.target.value)}>
            <option value="All">All comments</option>
            <option value="With comments">With comments</option>
            <option value="No comments">No comments</option>
          </select>
          <button className="secondary-btn" type="button" onClick={resetFilters}>
            Reset
          </button>
        </section>

        <section className="history-table">
          <div className="history-row history-head" style={{ gridTemplateColumns: "1.6fr 1.4fr 1.2fr 1fr 2fr 1fr" }}>
            <p>User</p>
            <p>Detected Sign</p>
            <p>Rating</p>
            <p>Score</p>
            <p>Comment</p>
            <p>Date</p>
          </div>

          {feedbacks === null && (
            <p style={{ padding: "24px 16px", color: "#888" }}>Loading…</p>
          )}

          {feedbacks !== null && filteredFeedbacks.length === 0 && (
            <p style={{ padding: "24px 16px", color: "#888" }}>
              No feedbacks found.
            </p>
          )}

          {feedbacks !== null &&
            paginatedFeedbacks.map((fb) => (
              <div
                className="history-row"
                key={fb.id}
                style={{ gridTemplateColumns: "1.6fr 1.4fr 1.2fr 1fr 2fr 1fr" }}
              >
                <p style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <strong style={{ fontSize: "13px" }}>{fb.userName}</strong>
                  <span style={{ fontSize: "12px", color: "#9ca3af" }}>{fb.userEmail}</span>
                </p>
                <p>{fb.sign}</p>
                <p><Stars rating={fb.rating} /></p>
                <p style={{ fontWeight: 600, color: "#f59e0b" }}>{fb.rating} / 5</p>
                <p style={{ color: fb.comment ? "#374151" : "#9ca3af", fontStyle: fb.comment ? "normal" : "italic" }}>
                  {fb.comment || "No comment"}
                </p>
                <p>{formatDate(fb.createdAt)}</p>
              </div>
            ))}
          <Pagination page={page} totalPages={totalPages} total={filteredFeedbacks.length} pageSize={pageSize} onPage={setPage} />
        </section>
      </main>
    </div>
  );
}

export default FeedbacksPage;
