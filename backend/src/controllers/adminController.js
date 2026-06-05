const { getAuditLogs } = require("../services/auditLogService");
const { getAdminDashboard } = require("../services/adminDashboardService");
const { getAllDetections } = require("../services/detectionService");
const { getModelMonitoringSummary } = require("../services/modelMonitoringService");
const { exportReportsCsv, getAllReports, getAdminReportPdf } = require("../services/reportService");
const { findUserByEmail, getAllUsers, getUsersSummaryFromList, createUserByAdmin, updateUser, deleteUser, bulkImportUsers } = require("../services/userService");
const { getSettings, updateSettings } = require("../services/settingsService");
const { getAllFeedbacks } = require("../services/feedbackService");
const { recordAuditLog } = require("../services/auditLogService");
const { hasPermission } = require("../services/permissionService");
const { buildExport, DATASETS } = require("../services/exportDataService");
const { sendCsv, sendJson, readBody, sendPdf, sendFile } = require("../utils/http");

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

async function createAdminUser(request, response) {
  if (!(await checkPermission(request, response, "manage_users"))) return;

  try {
    const adminUser = await getAdminUser(request);
    const { name, email, password, role } = await readBody(request);
    if (!name || !email || !password) {
      sendJson(response, 400, { message: "name, email and password are required." });
      return;
    }
    const result = await createUserByAdmin(name, email, password, role, adminUser);
    if (!result.ok) {
      sendJson(response, 400, { message: result.message });
      return;
    }
    sendJson(response, 201, result.user);
  } catch {
    sendJson(response, 400, { message: "Invalid request body." });
  }
}

async function updateAdminUser(request, response, params) {
  if (!(await checkPermission(request, response, "manage_users"))) return;

  const userId = params[0];
  try {
    const adminUser = await getAdminUser(request);
    const { role, isActive } = await readBody(request);
    const result = await updateUser(userId, { role, isActive }, adminUser);
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
  const adminUser = await getAdminUser(request);
  const result = await deleteUser(userId, adminUser);
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
    const adminUser = await getAdminUser(request);
    const before = await getSettings();
    const result = await updateSettings(updates);
    if (!result.ok) {
      sendJson(response, 422, { message: result.errors[0], errors: result.errors });
      return;
    }
    await recordAuditLog(
      {
        userId: adminUser?.id,
        action: "Settings updated",
        entity: "Settings",
        oldValue: before,
        newValue: { ...result.settings, status: "Success" },
      },
      { force: true }
    );
    sendJson(response, 200, result.settings);
  } catch {
    sendJson(response, 400, { message: "Invalid request body." });
  }
}

async function getAdminFeedbacks(request, response) {
  if (!(await checkPermission(request, response, "view_feedbacks"))) return;
  sendJson(response, 200, { feedbacks: await getAllFeedbacks() });
}

async function exportAdminDataset(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const dataset = url.searchParams.get("dataset") || "";
  const format = url.searchParams.get("format") || "csv";

  const user = await getAdminUser(request);
  if (!user) {
    sendJson(response, 403, { message: "Insufficient permissions." });
    return;
  }

  const meta = DATASETS[dataset];
  if (!meta) {
    sendJson(response, 400, { message: `Unknown dataset: ${dataset}` });
    return;
  }
  if (!meta.roles.includes(user.role)) {
    sendJson(response, 403, { message: "You do not have access to this dataset." });
    return;
  }

  try {
    const { content, contentType, fileName } = await buildExport(dataset, format);
    sendFile(response, fileName, content, contentType);
  } catch (err) {
    sendJson(response, 500, { message: "Export failed. " + err.message });
  }
}

async function importAdminData(request, response) {
  if (!(await checkPermission(request, response, "manage_users"))) return;

  try {
    const { dataset, records } = await readBody(request);

    if (dataset !== "users") {
      sendJson(response, 400, { message: "Only user import is supported." });
      return;
    }
    if (!Array.isArray(records) || records.length === 0) {
      sendJson(response, 400, { message: "No records provided." });
      return;
    }
    if (records.length > 500) {
      sendJson(response, 400, { message: "Maximum 500 records per import." });
      return;
    }

    const actor = await getAdminUser(request);
    const results = await bulkImportUsers(records, actor);
    sendJson(response, 200, { ok: true, results });
  } catch {
    sendJson(response, 400, { message: "Invalid request body." });
  }
}

module.exports = {
  createAdminUser,
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
  exportAdminDataset,
  importAdminData,
};
