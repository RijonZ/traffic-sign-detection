const { getExportData } = require("../services/exportDataService");
const { getManagerDashboardAnalytics } = require("../services/managerAnalyticsService");
const { findUserByEmail } = require("../services/userService");
const { hasPermission } = require("../services/permissionService");
const { sendJson } = require("../utils/http");

async function getManagerUser(req) {
  const managerEmail = req.query.managerEmail || "";
  return findUserByEmail(managerEmail);
}

async function checkPermission(req, res, permissionName) {
  const user = await getManagerUser(req);
  if (!user || !(await hasPermission(user.role, permissionName))) {
    sendJson(res, 403, { message: "Insufficient permissions." });
    return false;
  }
  return true;
}

async function getDashboardAnalytics(req, res) {
  if (!(await checkPermission(req, res, "view_analytics"))) return;
  sendJson(res, 200, await getManagerDashboardAnalytics());
}

async function getManagerExportData(req, res) {
  if (!(await checkPermission(req, res, "export_data"))) return;
  sendJson(res, 200, await getExportData());
}

module.exports = { getDashboardAnalytics, getManagerExportData };
