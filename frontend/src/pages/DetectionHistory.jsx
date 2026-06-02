import { useEffect, useState } from "react";
import Navbar from "../shared/Navbar";
import { usePagination, Pagination } from "../shared/Pagination";
import { statusPillClass } from "../utils/statusUtils";
import "../styles/auth.css";
import "../styles/dashboard.css";
import "../styles/history.css";

const API_BASE_URL = "http://localhost:5000/api";

const RATING_LABELS = {
  0: "Select a rating",
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

function formatDetection(item) {
  return {
    id: item.id,
    imageName: item.imageName || item.fileName,
    sign: item.sign,
    confidence: item.confidence === 0 ? "-" : `${item.confidence}%`,
    status: item.status,
    date: item.date || item.detectedAt,
  };
}

function FeedbackCard({ detection, userEmail, onClose, onSubmitted }) {
  const [hovered, setHovered] = useState(0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const display = hovered || rating;
  const label = RATING_LABELS[display] || RATING_LABELS[0];

  async function handleSubmit() {
    if (!rating) return;
    setSubmitting(true);
    try {
      await fetch(`${API_BASE_URL}/detect-sign/${detection.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail, rating, comment }),
      });
      onSubmitted(detection.id, rating);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="feedback-card">
      <div className="feedback-card-header">
        <h4>Rate this detection</h4>
        <button className="feedback-close-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <div className="feedback-star-row">
        <div className="feedback-big-stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              className={`star-btn${display >= star ? " star-filled" : ""}`}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              aria-label={`Rate ${star} stars`}
            >
              ★
            </button>
          ))}
        </div>
        <span className={`rating-label${!display ? " empty" : ""}`}>{label}</span>
      </div>

      <textarea
        rows={2}
        placeholder="Optional comment…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      <div className="feedback-card-footer">
        <button
          className="submit-feedback-btn"
          disabled={!rating || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Saving…" : "Submit feedback"}
        </button>
      </div>
    </div>
  );
}

function DetectionHistory({ currentUser, onLogout, onNavigate }) {
  const [detections, setDetections] = useState(null);
  const [openFeedback, setOpenFeedback] = useState(null);
  const [submitted, setSubmitted] = useState({});
  const { page, setPage, totalPages, paginatedItems, pageSize } = usePagination(detections ?? []);

  useEffect(() => {
    if (!currentUser) return;

    const email = encodeURIComponent(currentUser.email);

    Promise.all([
      fetch(`${API_BASE_URL}/users/${email}/detections`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_BASE_URL}/detect-sign/feedbacks?userEmail=${email}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([detectData, feedbackData]) => {
        setDetections(detectData?.detections ? detectData.detections.map(formatDetection) : []);

        if (feedbackData?.feedbacks) {
          const map = {};
          feedbackData.feedbacks.forEach((fb) => {
            map[fb.requestId] = fb.rating;
          });
          setSubmitted(map);
        }
      })
      .catch(() => setDetections([]));
  }, [currentUser]);

  function handleSubmitted(detectionId, rating) {
    setSubmitted((prev) => ({ ...prev, [detectionId]: rating }));
    setOpenFeedback(null);
  }

  function handlePageChange(n) {
    setOpenFeedback(null);
    setPage(n);
  }

  if (!currentUser) {
    return (
      <div className="home">
        <Navbar onNavigate={onNavigate} />
        <main className="page-shell">
          <section className="auth-card">
            <h1>Sign in required</h1>
            <p>You need an account before opening detection history.</p>
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
            <span className="eyebrow">Saved detections</span>
            <h1>Detection History</h1>
            <p>
              Review previous image uploads, detected traffic signs, confidence
              score, and request status.
            </p>
          </div>
          <button className="secondary-btn" onClick={() => onNavigate("dashboard")}>
            Back to Dashboard
          </button>
        </section>

        <section className="history-summary">
          <div className="dashboard-card">
            <h3>Total Requests</h3>
            <p>{detections ? detections.length : "—"}</p>
          </div>
          <div className="dashboard-card">
            <h3>Completed</h3>
            <p>{detections ? detections.filter((d) => d.status === "Completed").length : "—"}</p>
          </div>
          <div className="dashboard-card">
            <h3>Rejected</h3>
            <p>{detections ? detections.filter((d) => d.status === "Rejected").length : "—"}</p>
          </div>
        </section>

        <section className="history-table">
          <div className="history-row history-head">
            <p>Request ID</p>
            <p>Image</p>
            <p>Detected Sign</p>
            <p>Confidence</p>
            <p>Status</p>
            <p>Date</p>
            <p>Feedback</p>
          </div>

          {detections === null && (
            <p style={{ padding: "24px 16px", color: "var(--muted, #888)" }}>Loading…</p>
          )}

          {detections !== null && detections.length === 0 && (
            <p style={{ padding: "24px 16px", color: "var(--muted, #888)" }}>
              No detections yet. Upload an image to get started.
            </p>
          )}

          {detections !== null &&
            paginatedItems.map((detection) => {
              const isCompleted = detection.status === "Completed";
              const isFeedbackOpen = openFeedback === detection.id;
              const ratingGiven = submitted[detection.id];

              return (
                <div key={detection.id}>
                  <div className="history-row">
                    <p>{detection.id}</p>
                    <p>{detection.imageName}</p>
                    <p>{detection.sign}</p>
                    <p>{detection.confidence}</p>
                    <p>
                      <span className={statusPillClass(detection.status)}>
                        {detection.status}
                      </span>
                    </p>
                    <p>{detection.date}</p>
                    <p>
                      {!isCompleted ? (
                        <span style={{ color: "#9ca3af", fontSize: "13px" }}>—</span>
                      ) : ratingGiven ? (
                        <span className="feedback-stars-inline">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span key={s} className="star-inline">
                              {ratingGiven >= s ? "★" : "☆"}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <button
                          className="secondary-btn"
                          style={{ padding: "4px 12px", fontSize: "12px" }}
                          onClick={() =>
                            setOpenFeedback(isFeedbackOpen ? null : detection.id)
                          }
                        >
                          {isFeedbackOpen ? "Cancel" : "Rate"}
                        </button>
                      )}
                    </p>
                  </div>

                  {isFeedbackOpen && (
                    <FeedbackCard
                      detection={detection}
                      userEmail={currentUser.email}
                      onClose={() => setOpenFeedback(null)}
                      onSubmitted={handleSubmitted}
                    />
                  )}
                </div>
              );
            })}
          <Pagination page={page} totalPages={totalPages} total={(detections ?? []).length} pageSize={pageSize} onPage={handlePageChange} />
        </section>
      </main>
    </div>
  );
}

export default DetectionHistory;
