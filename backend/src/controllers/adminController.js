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
const { sendCsv, sendJson, sendPdf, sendFile } = require("../utils/http");

async function getAdminUser(req) {
  const adminEmail = req.query.adminEmail || "";
  return findUserByEmail(adminEmail);
}

async function checkPermission(req, res, permissionName) {
  const user = await getAdminUser(req);
  if (!user || !(await hasPermission(user.role, permissionName))) {
    sendJson(res, 403, { message: "Insufficient permissions." });
    return false;
  }
  return true;
}

function getReportFilters(req) {
  return {
    dateFrom: req.query.dateFrom || "",
    dateTo:   req.query.dateTo   || "",
    status:   req.query.status   || "",
    user:     req.query.user     || "",
  };
}

async function getModelMonitoring(req, res) {
  if (!(await checkPermission(req, res, "view_model_monitoring"))) return;
  sendJson(res, 200, await getModelMonitoringSummary());
}

async function getAdminReports(req, res) {
  if (!(await checkPermission(req, res, "view_reports"))) return;
  sendJson(res, 200, await getAllReports(getReportFilters(req)));
}

async function downloadAdminReport(req, res) {
  if (!(await checkPermission(req, res, "download_reports"))) return;

  const reportId = req.params.id;
  const reportPdf = await getAdminReportPdf(reportId, getReportFilters(req));

  if (!reportPdf) {
    sendJson(res, 404, { message: "Report not found." });
    return;
  }

  sendPdf(res, reportPdf.fileName, reportPdf.pdf);
}

async function exportAdminReports(req, res) {
  if (!(await checkPermission(req, res, "export_reports"))) return;
  const exportFile = await exportReportsCsv(getReportFilters(req));
  sendCsv(res, exportFile.fileName, exportFile.csv);
}

async function getAdminDetections(req, res) {
  if (!(await checkPermission(req, res, "view_admin_detections"))) return;
  sendJson(res, 200, await getAllDetections());
}

async function getAdminDashboardSummary(req, res) {
  if (!(await checkPermission(req, res, "view_admin_dashboard"))) return;
  sendJson(res, 200, await getAdminDashboard());
}

async function getAdminAuditLogs(req, res) {
  if (!(await checkPermission(req, res, "view_audit_logs"))) return;
  sendJson(res, 200, await getAuditLogs());
}

async function getAdminUsers(req, res) {
  if (!(await checkPermission(req, res, "manage_users"))) return;
  const users = await getAllUsers();
  sendJson(res, 200, { users, summary: getUsersSummaryFromList(users) });
}

async function createAdminUser(req, res) {
  if (!(await checkPermission(req, res, "manage_users"))) return;

  try {
    const adminUser = await getAdminUser(req);
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      sendJson(res, 400, { message: "name, email and password are required." });
      return;
    }
    const result = await createUserByAdmin(name, email, password, role, adminUser);
    if (!result.ok) {
      sendJson(res, 400, { message: result.message });
      return;
    }
    sendJson(res, 201, result.user);
  } catch {
    sendJson(res, 400, { message: "Invalid request body." });
  }
}

async function updateAdminUser(req, res) {
  if (!(await checkPermission(req, res, "manage_users"))) return;

  const userId = req.params.id;
  try {
    const adminUser = await getAdminUser(req);
    const { role, isActive } = req.body;
    const result = await updateUser(userId, { role, isActive }, adminUser);
    if (!result.ok) {
      sendJson(res, 400, { message: result.message });
      return;
    }
    sendJson(res, 200, { ok: true });
  } catch {
    sendJson(res, 400, { message: "Invalid request body." });
  }
}

async function deleteAdminUser(req, res) {
  if (!(await checkPermission(req, res, "manage_users"))) return;

  const userId = req.params.id;
  const adminUser = await getAdminUser(req);
  const result = await deleteUser(userId, adminUser);
  if (!result.ok) {
    sendJson(res, 400, { message: result.message });
    return;
  }
  sendJson(res, 200, { ok: true });
}

async function getAdminSettings(req, res) {
  if (!(await checkPermission(req, res, "manage_settings"))) return;
  sendJson(res, 200, await getSettings());
}

async function updateAdminSettings(req, res) {
  if (!(await checkPermission(req, res, "manage_settings"))) return;
  try {
    const updates = req.body;
    const adminUser = await getAdminUser(req);
    const before = await getSettings();
    const result = await updateSettings(updates);
    if (!result.ok) {
      sendJson(res, 422, { message: result.errors[0], errors: result.errors });
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
    sendJson(res, 200, result.settings);
  } catch {
    sendJson(res, 400, { message: "Invalid request body." });
  }
}

async function getAdminFeedbacks(req, res) {
  if (!(await checkPermission(req, res, "view_feedbacks"))) return;
  sendJson(res, 200, { feedbacks: await getAllFeedbacks() });
}

async function exportAdminDataset(req, res) {
  const dataset = req.query.dataset || "";
  const format = req.query.format || "csv";

  const user = await getAdminUser(req);
  if (!user) {
    sendJson(res, 403, { message: "Insufficient permissions." });
    return;
  }

  const meta = DATASETS[dataset];
  if (!meta) {
    sendJson(res, 400, { message: `Unknown dataset: ${dataset}` });
    return;
  }
  if (!meta.roles.includes(user.role)) {
    sendJson(res, 403, { message: "You do not have access to this dataset." });
    return;
  }

  try {
    const { content, contentType, fileName } = await buildExport(dataset, format);
    sendFile(res, fileName, content, contentType);
  } catch (err) {
    sendJson(res, 500, { message: "Export failed. " + err.message });
  }
}

async function importAdminData(req, res) {
  if (!(await checkPermission(req, res, "manage_users"))) return;

  try {
    const { dataset, records } = req.body;

    if (dataset !== "users") {
      sendJson(res, 400, { message: "Only user import is supported." });
      return;
    }
    if (!Array.isArray(records) || records.length === 0) {
      sendJson(res, 400, { message: "No records provided." });
      return;
    }
    if (records.length > 500) {
      sendJson(res, 400, { message: "Maximum 500 records per import." });
      return;
    }

    const actor = await getAdminUser(req);
    const results = await bulkImportUsers(records, actor);
    sendJson(res, 200, { ok: true, results });
  } catch {
    sendJson(res, 400, { message: "Invalid request body." });
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
