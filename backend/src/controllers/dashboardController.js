const {
  addDetection,
  getDashboardSummary,
  getUserDetections,
} = require("../services/detectionService");
const { getUserReportPdf, getUserReports } = require("../services/reportService");
const { findUserByEmail } = require("../services/userService");
const { sendJson, sendPdf } = require("../utils/http");

function sendUserNotFound(res) {
  sendJson(res, 404, { message: "User not found." });
}

async function getDashboard(req, res) {
  const email = decodeURIComponent(req.params.email);
  const user = await findUserByEmail(email);

  if (!user) {
    sendUserNotFound(res);
    return;
  }

  sendJson(res, 200, {
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
    summary: await getDashboardSummary(email),
  });
}

async function getDetections(req, res) {
  const email = decodeURIComponent(req.params.email);

  if (!(await findUserByEmail(email))) {
    sendUserNotFound(res);
    return;
  }

  sendJson(res, 200, { detections: await getUserDetections(email) });
}

async function createDetection(req, res) {
  const email = decodeURIComponent(req.params.email);

  if (!(await findUserByEmail(email))) {
    sendUserNotFound(res);
    return;
  }

  try {
    const detection = await addDetection(email, req.body);
    sendJson(res, 201, { detection });
  } catch {
    sendJson(res, 400, { message: "Invalid request body." });
  }
}

async function getReports(req, res) {
  const email = decodeURIComponent(req.params.email);

  if (!(await findUserByEmail(email))) {
    sendUserNotFound(res);
    return;
  }

  sendJson(res, 200, { reports: await getUserReports(email) });
}

async function downloadReport(req, res) {
  const email = decodeURIComponent(req.params.email);
  const reportId = req.params.id;

  if (!(await findUserByEmail(email))) {
    sendUserNotFound(res);
    return;
  }

  const reportPdf = await getUserReportPdf(email, reportId);

  if (!reportPdf) {
    sendJson(res, 404, { message: "Report not found." });
    return;
  }

  sendPdf(res, reportPdf.fileName, reportPdf.pdf);
}

module.exports = { createDetection, downloadReport, getDashboard, getDetections, getReports };
