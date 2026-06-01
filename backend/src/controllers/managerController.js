const { getExportData } = require("../services/exportDataService");
const { getManagerDashboardAnalytics } = require("../services/managerAnalyticsService");
const { findUserByEmail } = require("../services/userService");
const { sendJson } = require("../utils/http");

async function getManagerUser(request) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const managerEmail = url.searchParams.get("managerEmail") || "";
  return findUserByEmail(managerEmail);
}

async function ensureManager(request, response) {
  const user = await getManagerUser(request);
  if (!user || (user.role !== "Manager" && user.role !== "Administrator")) {
    sendJson(response, 403, { message: "Manager access required." });
    return false;
  }

  return true;
}

async function getDashboardAnalytics(request, response) {
  if (!(await ensureManager(request, response))) {
    return;
  }

  sendJson(response, 200, await getManagerDashboardAnalytics());
}

async function getManagerExportData(request, response) {
  if (!(await ensureManager(request, response))) {
    return;
  }

  sendJson(response, 200, await getExportData());
}

module.exports = { getDashboardAnalytics, getManagerExportData };
