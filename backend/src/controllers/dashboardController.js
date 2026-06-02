const {
  addDetection,
  getDashboardSummary,
  getUserDetections,
} = require("../services/detectionService");
const { getUserReportPdf, getUserReports } = require("../services/reportService");
const { findUserByEmail } = require("../services/userService");
const { readBody, sendJson, sendPdf } = require("../utils/http");

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

async function downloadReport(_, response, params) {
  const [email, reportId] = params;

  if (!(await findUserByEmail(email))) {
    sendUserNotFound(response);
    return;
  }

  const reportPdf = await getUserReportPdf(email, reportId);

  if (!reportPdf) {
    sendJson(response, 404, { message: "Report not found." });
    return;
  }

  sendPdf(response, reportPdf.fileName, reportPdf.pdf);
}

module.exports = { createDetection, downloadReport, getDashboard, getDetections, getReports };
