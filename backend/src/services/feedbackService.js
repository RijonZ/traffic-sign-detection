const feedbackRepo = require("../repositories/feedbackRepository");
const { findUserByEmail } = require("./userService");

async function submitFeedback(userEmail, requestId, rating, comment) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, message: "Rating must be between 1 and 5." };
  }

  const user = await findUserByEmail(userEmail);
  if (!user) return { ok: false, message: "User not found." };

  const inserted = await feedbackRepo.insert(user.id, requestId, rating, comment);
  if (!inserted) return { ok: false, message: "Detection result not found." };
  if (inserted === "already_rated") return { ok: false, message: "You have already rated this detection." };

  return { ok: true };
}

async function getDetectionFeedback(requestId) {
  return feedbackRepo.findByRequestId(requestId);
}

async function getUserFeedbacks(userEmail) {
  const user = await findUserByEmail(userEmail);
  if (!user) return [];

  const rows = await feedbackRepo.findByUserId(user.id);

  // Keep only the latest rating per detection (in case of re-ratings)
  const seen = new Set();
  return rows
    .filter((row) => {
      const key = String(row.request_id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((row) => ({
      requestId: String(row.request_id),
      rating: Number(row.rating),
    }));
}

async function getAllFeedbacks() {
  const rows = await feedbackRepo.findAll();
  return rows.map((row) => ({
    id: String(row.id),
    requestId: String(row.request_id),
    userEmail: row.user_email,
    userName: row.user_name || row.user_email,
    sign: row.sign_name || "Unknown",
    rating: Number(row.rating),
    comment: row.comment || "",
    createdAt: row.created_at,
  }));
}

module.exports = { submitFeedback, getDetectionFeedback, getUserFeedbacks, getAllFeedbacks };
