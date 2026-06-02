const auditLogRepo = require("../repositories/auditLogRepository");

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

module.exports = { getAuditLogs };
