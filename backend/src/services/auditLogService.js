const auditLogRepo = require("../repositories/auditLogRepository");
const settingsRepo = require("../repositories/settingsRepository");

function formatAuditLog(row) {
  return {
    id: `LOG-${row.id}`,
    action: row.action || "System event",
    module: row.entity || "System",
    user: row.user_name || row.email || "System",
    status: row.status || "Success",
    time: row.created_at || "Saved in database",
  };
}

function getAuditSummary(logs) {
  return {
    totalLogs: logs.length,
    successEvents: logs.filter((log) => log.status === "Success" || log.status === "Completed").length,
    reviewEvents: logs.filter((log) => log.status === "Review" || log.status === "Rejected").length,
    modules: [...new Set(logs.map((log) => log.module))],
  };
}

async function getAuditLogs() {
  const savedRows = await auditLogRepo.findSaved();
  let logs = savedRows.map(formatAuditLog);

  if (!logs.length) {
    const detectionRows = await auditLogRepo.findFromDetections();
    logs = detectionRows.map(formatAuditLog);
  }

  if (!logs.length) {
    const userRows = await auditLogRepo.findFromUsers();
    logs = userRows.map(formatAuditLog);
  }

  return {
    logs,
    summary: getAuditSummary(logs),
  };
}

async function isAuditLoggingEnabled(force) {
  if (force) return true;

  try {
    const rows = await settingsRepo.findAll();
    const setting = rows.find((row) => row.key === "auditLoggingEnabled");
    return setting ? setting.value === "true" : true;
  } catch {
    return true;
  }
}

async function recordAuditLog(entry, options = {}) {
  try {
    if (!(await isAuditLoggingEnabled(options.force))) {
      return null;
    }

    return auditLogRepo.insert({
      userId: entry.userId,
      action: entry.action || "System event",
      entity: entry.entity || "System",
      entityId: entry.entityId,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      ipAddress: entry.ipAddress,
    });
  } catch {
    return null;
  }
}

module.exports = { getAuditLogs, recordAuditLog };
