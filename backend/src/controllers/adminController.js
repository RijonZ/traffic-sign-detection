const { getAuditLogs } = require("../services/auditLogService");
const { getAdminDashboard } = require("../services/adminDashboardService");
const { getAllDetections } = require("../services/detectionService");
const { getModelMonitoringSummary } = require("../services/modelMonitoringService");
const { exportReportsCsv, getAllReports, getAdminReportPdf } = require("../services/reportService");
const { findUserByEmail, getAllUsers, getUsersSummaryFromList, updateUser, deleteUser } = require("../services/userService");
const { getSettings, updateSettings } = require("../services/settingsService");
const { getAllFeedbacks } = require("../services/feedbackService");
const { hasPermission } = require("../services/permissionService");
const { sendCsv, sendJson, readBody, sendPdf } = require("../utils/http");

async function getAdminUser(request) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const adminEmail = url.searchParams.get("adminEmail") || "";
  return findUserByEmail(adminEmail);
}

async function checkPermission(request, response, permissionName) {
  const user = await getAdminUser(request);
  if (!user || !(await hasPermission(user.role, permissionName))) {
    sendJson(response, 403, { message: "Insufficient permissions." });
    return false;
  }
  return true;
}

function getReportFilters(request) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  return {
    dateFrom: url.searchParams.get("dateFrom") || "",
    dateTo:   url.searchParams.get("dateTo")   || "",
    status:   url.searchParams.get("status")   || "",
    user:     url.searchParams.get("user")     || "",
  };
}

async function getModelMonitoring(request, response) {
  if (!(await checkPermission(request, response, "view_model_monitoring"))) return;
  sendJson(response, 200, await getModelMonitoringSummary());
}

async function getAdminReports(request, response) {
  if (!(await checkPermission(request, response, "view_reports"))) return;
  sendJson(response, 200, await getAllReports(getReportFilters(request)));
}

async function downloadAdminReport(request, response, params) {
  if (!(await checkPermission(request, response, "download_reports"))) return;

  const [reportId] = params;
  const reportPdf = await getAdminReportPdf(reportId, getReportFilters(request));

  if (!reportPdf) {
    sendJson(response, 404, { message: "Report not found." });
    return;
  }

  sendPdf(response, reportPdf.fileName, reportPdf.pdf);
}

async function exportAdminReports(request, response) {
  if (!(await checkPermission(request, response, "export_reports"))) return;
  const exportFile = await exportReportsCsv(getReportFilters(request));
  sendCsv(response, exportFile.fileName, exportFile.csv);
}

async function getAdminDetections(request, response) {
  if (!(await checkPermission(request, response, "view_admin_detections"))) return;
  sendJson(response, 200, await getAllDetections());
}

async function getAdminDashboardSummary(request, response) {
  if (!(await checkPermission(request, response, "view_admin_dashboard"))) return;
  sendJson(response, 200, await getAdminDashboard());
}

async function getAdminAuditLogs(request, response) {
  if (!(await checkPermission(request, response, "view_audit_logs"))) return;
  sendJson(response, 200, await getAuditLogs());
}

async function getAdminUsers(request, response) {
  if (!(await checkPermission(request, response, "manage_users"))) return;
  const users = await getAllUsers();
  sendJson(response, 200, { users, summary: getUsersSummaryFromList(users) });
}

async function updateAdminUser(request, response, params) {
  if (!(await checkPermission(request, response, "manage_users"))) return;

  const userId = params[0];
  try {
    const { role, isActive } = await readBody(request);
    const result = await updateUser(userId, { role, isActive });
    if (!result.ok) {
      sendJson(response, 400, { message: result.message });
      return;
    }
    sendJson(response, 200, { ok: true });
  } catch {
    sendJson(response, 400, { message: "Invalid request body." });
  }
}

async function deleteAdminUser(request, response, params) {
  if (!(await checkPermission(request, response, "manage_users"))) return;

  const userId = params[0];
  const result = await deleteUser(userId);
  if (!result.ok) {
    sendJson(response, 400, { message: result.message });
    return;
  }
  sendJson(response, 200, { ok: true });
}

async function getAdminSettings(request, response) {
  if (!(await checkPermission(request, response, "manage_settings"))) return;
  sendJson(response, 200, await getSettings());
}

async function updateAdminSettings(request, response) {
  if (!(await checkPermission(request, response, "manage_settings"))) return;
  try {
    const updates = await readBody(request);
    const saved = await updateSettings(updates);
    sendJson(response, 200, saved);
  } catch {
    sendJson(response, 400, { message: "Invalid request body." });
  }
}

async function getAdminFeedbacks(request, response) {
  if (!(await checkPermission(request, response, "view_feedbacks"))) return;
  sendJson(response, 200, { feedbacks: await getAllFeedbacks() });
}

module.exports = {
  downloadAdminReport,
  exportAdminReports,
  getAdminAuditLogs,
  getAdminDashboardSummary,
  getAdminDetections,
  getAdminReports,
  getAdminUsers,
  getModelMonitoring,
  updateAdminUser,
  deleteAdminUser,
  getAdminSettings,
  updateAdminSettings,
  getAdminFeedbacks,
};
