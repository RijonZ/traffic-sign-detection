const { getExportData } = require("../services/exportDataService");
const { getManagerDashboardAnalytics } = require("../services/managerAnalyticsService");
const { findUserByEmail } = require("../services/userService");
const { hasPermission } = require("../services/permissionService");
const { sendJson } = require("../utils/http");

async function getManagerUser(request) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const managerEmail = url.searchParams.get("managerEmail") || "";
  return findUserByEmail(managerEmail);
}

async function checkPermission(request, response, permissionName) {
  const user = await getManagerUser(request);
  if (!user || !(await hasPermission(user.role, permissionName))) {
    sendJson(response, 403, { message: "Insufficient permissions." });
    return false;
  }
  return true;
}

async function getDashboardAnalytics(request, response) {
  if (!(await checkPermission(request, response, "view_analytics"))) return;
  sendJson(response, 200, await getManagerDashboardAnalytics());
}

async function getManagerExportData(request, response) {
  if (!(await checkPermission(request, response, "export_data"))) return;
  sendJson(response, 200, await getExportData());
}

module.exports = { getDashboardAnalytics, getManagerExportData };
