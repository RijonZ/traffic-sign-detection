const { getAuditLogs } = require("../services/auditLogService");
const { getAdminDashboard } = require("../services/adminDashboardService");
const { getAllDetections } = require("../services/detectionService");
const { getModelMonitoringSummary } = require("../services/modelMonitoringService");
const { getAllReports } = require("../services/reportService");
const { findUserByEmail, getAllUsers, getUsersSummaryFromList, updateUser, deleteUser } = require("../services/userService");
const { sendJson, readBody } = require("../utils/http");

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

async function getAdminDetections(request, response) {
  if (!(await ensureAdministrator(request, response))) {
    return;
  }

  sendJson(response, 200, await getAllDetections());
}

async function getAdminDashboardSummary(request, response) {
  if (!(await ensureAdministrator(request, response))) {
    return;
  }

  sendJson(response, 200, await getAdminDashboard());
}

async function getAdminAuditLogs(request, response) {
  if (!(await ensureAdministrator(request, response))) {
    return;
  }

  sendJson(response, 200, await getAuditLogs());
}

async function getAdminUsers(request, response) {
  if (!(await ensureAdministrator(request, response))) {
    return;
  }
  const users = await getAllUsers();

  sendJson(response, 200, {
    users,
    summary: getUsersSummaryFromList(users),
  });
}

async function updateAdminUser(request, response, params) {
  if (!(await ensureAdministrator(request, response))) return;

  const userId = params[0];
  try {
    const { role, isActive } = await readBody(request);
    const result = await updateUser(userId, { role, isActive });
    if (!result.ok) {
      sendJson(response, 400, { message: result.message });
      return;
    }
    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 400, { message: "Invalid request body." });
  }
}

async function deleteAdminUser(request, response, params) {
  if (!(await ensureAdministrator(request, response))) return;

  const userId = params[0];
  const result = await deleteUser(userId);
  if (!result.ok) {
    sendJson(response, 400, { message: result.message });
    return;
  }
  sendJson(response, 200, { ok: true });
}

module.exports = {
  getAdminAuditLogs,
  getAdminDashboardSummary,
  getAdminDetections,
  getAdminReports,
  getAdminUsers,
  getModelMonitoring,
  updateAdminUser,
  deleteAdminUser,
};
