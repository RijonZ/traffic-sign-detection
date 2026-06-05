const { submitFeedback, getDetectionFeedback, getUserFeedbacks } = require("../services/feedbackService");
const { sendJson } = require("../utils/http");

async function postFeedback(req, res) {
  try {
    const requestId = req.params.id;
    const { userEmail, rating, comment } = req.body;
    const result = await submitFeedback(userEmail, requestId, Number(rating), comment);
    sendJson(res, result.ok ? 201 : 400, result);
  } catch {
    sendJson(res, 400, { message: "Invalid request body." });
  }
}

async function getFeedback(req, res) {
  const requestId = req.params.id;
  const feedback = await getDetectionFeedback(requestId);
  sendJson(res, 200, { feedback: feedback || null });
}

async function getMyFeedbacks(req, res) {
  const userEmail = req.query.userEmail || "";
  const feedbacks = await getUserFeedbacks(userEmail);
  sendJson(res, 200, { feedbacks });
}

module.exports = { postFeedback, getFeedback, getMyFeedbacks };
