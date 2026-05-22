const { getModelMonitoringSummary } = require("../services/modelMonitoringService");
const { getAllReports } = require("../services/reportService");
const { findUserByEmail } = require("../services/userService");
const { sendJson } = require("../utils/http");

function getAdminUser(request) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const adminEmail = url.searchParams.get("adminEmail") || "";
  return findUserByEmail(adminEmail);
}

function ensureAdministrator(request, response) {
  const user = getAdminUser(request);
  if (!user || user.role !== "Administrator") {
    sendJson(response, 403, { message: "Administrator access required." });
    return false;
  }

  return true;
}

function getModelMonitoring(request, response) {
  if (!ensureAdministrator(request, response)) {
    return;
  }

  sendJson(response, 200, getModelMonitoringSummary());
}

function getAdminReports(request, response) {
  if (!ensureAdministrator(request, response)) {
    return;
  }

  sendJson(response, 200, getAllReports());
}

module.exports = { getAdminReports, getModelMonitoring };
