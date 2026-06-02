const { submitFeedback, getDetectionFeedback, getUserFeedbacks } = require("../services/feedbackService");
const { readBody, sendJson } = require("../utils/http");

async function postFeedback(request, response, params) {
  try {
    const requestId = params[0];
    const body = await readBody(request);
    const { userEmail, rating, comment } = body;

    const result = await submitFeedback(userEmail, requestId, Number(rating), comment);
    sendJson(response, result.ok ? 201 : 400, result);
  } catch {
    sendJson(response, 400, { message: "Invalid request body." });
  }
}

async function getFeedback(request, response, params) {
  const requestId = params[0];
  const feedback = await getDetectionFeedback(requestId);
  sendJson(response, 200, { feedback: feedback || null });
}

async function getMyFeedbacks(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const userEmail = url.searchParams.get("userEmail") || "";
  const feedbacks = await getUserFeedbacks(userEmail);
  sendJson(response, 200, { feedbacks });
}

module.exports = { postFeedback, getFeedback, getMyFeedbacks };
