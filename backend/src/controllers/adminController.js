const { getModelMonitoringSummary } = require("../services/modelMonitoringService");
const { getAllReports } = require("../services/reportService");
const { findUserByEmail, getAllUsers, getUsersSummary } = require("../services/userService");
const { sendJson } = require("../utils/http");

async function getAdminUser(request) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const adminEmail = url.searchParams.get("adminEmail") || "";
  return findUserByEmail(adminEmail);
}

async function ensureAdministrator(request, response) {
  const user = await getAdminUser(request);
  if (!user || user.role !== "Administrator") {
    sendJson(response, 403, { message: "Administrator access required." });
    return false;
  }

  return true;
}

async function getModelMonitoring(request, response) {
  if (!(await ensureAdministrator(request, response))) {
    return;
  }

  sendJson(response, 200, getModelMonitoringSummary());
}

async function getAdminReports(request, response) {
  if (!(await ensureAdministrator(request, response))) {
    return;
  }

  sendJson(response, 200, await getAllReports());
}

async function getAdminUsers(request, response) {
  if (!(await ensureAdministrator(request, response))) {
    return;
  }

  sendJson(response, 200, {
    users: await getAllUsers(),
    summary: await getUsersSummary(),
  });
}

module.exports = { getAdminReports, getAdminUsers, getModelMonitoring };
