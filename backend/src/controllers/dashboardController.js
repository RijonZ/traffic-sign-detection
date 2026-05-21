const {
  addDetection,
  getDashboardSummary,
  getUserDetections,
} = require("../services/detectionService");
const { getUserReports } = require("../services/reportService");
const { findUserByEmail } = require("../services/userService");
const { readBody, sendJson } = require("../utils/http");

function sendUserNotFound(response) {
  sendJson(response, 404, { message: "User not found." });
}

function getDashboard(_, response, params) {
  const [email] = params;
  const user = findUserByEmail(email);

  if (!user) {
    sendUserNotFound(response);
    return;
  }

  sendJson(response, 200, {
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
    summary: getDashboardSummary(email),
  });
}

function getDetections(_, response, params) {
  const [email] = params;

  if (!findUserByEmail(email)) {
    sendUserNotFound(response);
    return;
  }

  sendJson(response, 200, { detections: getUserDetections(email) });
}

async function createDetection(request, response, params) {
  const [email] = params;

  if (!findUserByEmail(email)) {
    sendUserNotFound(response);
    return;
  }

  try {
    const body = await readBody(request);
    const detection = addDetection(email, body);
    sendJson(response, 201, { detection });
  } catch (error) {
    sendJson(response, 400, { message: "Invalid request body." });
  }
}

function getReports(_, response, params) {
  const [email] = params;

  if (!findUserByEmail(email)) {
    sendUserNotFound(response);
    return;
  }

  sendJson(response, 200, { reports: getUserReports(email) });
}

module.exports = { createDetection, getDashboard, getDetections, getReports };
