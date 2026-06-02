import { useEffect, useState } from "react";
import Navbar from "../shared/Navbar";
import { usePagination, Pagination } from "../shared/Pagination";
import "../styles/auth.css";
import "../styles/dashboard.css";
import "../styles/history.css";

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

  useEffect(() => {
    if (!currentUser || currentUser.role !== "Administrator") return;

    fetch(
      `${API_BASE_URL}/admin/feedbacks?adminEmail=${encodeURIComponent(currentUser.email)}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setFeedbacks(data?.feedbacks ?? []))
      .catch(() => setFeedbacks([]));
  }, [currentUser]);

  const { page, setPage, totalPages, paginatedItems: paginatedFeedbacks, pageSize } = usePagination(feedbacks ?? []);
  const avgRating =
    feedbacks?.length
      ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
      : "—";

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
            <p>{feedbacks ? feedbacks.length : "—"}</p>
          </div>
          <div className="dashboard-card">
            <h3>Average Rating</h3>
            <p>{feedbacks ? avgRating : "—"}</p>
          </div>
          <div className="dashboard-card">
            <h3>With Comments</h3>
            <p>{feedbacks ? feedbacks.filter((f) => f.comment).length : "—"}</p>
          </div>
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

          {feedbacks !== null && feedbacks.length === 0 && (
            <p style={{ padding: "24px 16px", color: "#888" }}>
              No feedbacks submitted yet.
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
          <Pagination page={page} totalPages={totalPages} total={(feedbacks ?? []).length} pageSize={pageSize} onPage={setPage} />
        </section>
      </main>
    </div>
  );
}

export default FeedbacksPage;
