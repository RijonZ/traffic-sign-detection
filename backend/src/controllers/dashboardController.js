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

async function getDashboard(_, response, params) {
  const [email] = params;
  const user = await findUserByEmail(email);

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
    summary: await getDashboardSummary(email),
  });
}

async function getDetections(_, response, params) {
  const [email] = params;

  if (!(await findUserByEmail(email))) {
    sendUserNotFound(response);
    return;
  }

  sendJson(response, 200, { detections: await getUserDetections(email) });
}

async function createDetection(request, response, params) {
  const [email] = params;

  if (!(await findUserByEmail(email))) {
    sendUserNotFound(response);
    return;
  }

  try {
    const body = await readBody(request);
    const detection = await addDetection(email, body);
    sendJson(response, 201, { detection });
  } catch (error) {
    sendJson(response, 400, { message: "Invalid request body." });
  }
}

async function getReports(_, response, params) {
  const [email] = params;

  if (!(await findUserByEmail(email))) {
    sendUserNotFound(response);
    return;
  }

  sendJson(response, 200, { reports: await getUserReports(email) });
}

module.exports = { createDetection, getDashboard, getDetections, getReports };
