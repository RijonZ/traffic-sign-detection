const { query } = require("../db/client");

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

async function getSavedAuditLogs() {
  const result = await query(
    `
      SELECT
        al.id,
        al.action,
        al.entity,
        al.created_at,
        u.email,
        trim(concat(u.first_name, ' ', u.last_name)) AS user_name
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT 25
    `
  );

  return result.rows.map(formatAuditLog);
}

async function getFallbackAuditLogs() {
  const result = await query(
    `
      SELECT
        dr.id,
        concat('Detection request ', dr.status) AS action,
        'Detection Request' AS entity,
        CASE
          WHEN dr.status = 'rejected' THEN 'Rejected'
          WHEN dr.status = 'processing' THEN 'Review'
          ELSE 'Success'
        END AS status,
        dr.requested_at AS created_at,
        u.email,
        trim(concat(u.first_name, ' ', u.last_name)) AS user_name
      FROM detection_requests dr
      JOIN users u ON u.id = dr.user_id
      ORDER BY dr.requested_at DESC
      LIMIT 10
    `
  );

  const detectionLogs = result.rows.map(formatAuditLog);

  if (detectionLogs.length) {
    return detectionLogs;
  }

  const userResult = await query(
    `
      SELECT
        u.id,
        'User account available' AS action,
        'Users' AS entity,
        'Success' AS status,
        u.created_at,
        u.email,
        trim(concat(u.first_name, ' ', u.last_name)) AS user_name
      FROM users u
      ORDER BY u.created_at DESC
      LIMIT 10
    `
  );

  return userResult.rows.map(formatAuditLog);
}

async function getAuditLogs() {
  const savedLogs = await getSavedAuditLogs();
  const logs = savedLogs.length ? savedLogs : await getFallbackAuditLogs();

  return {
    logs,
    summary: getAuditSummary(logs),
  };
}

module.exports = { getAuditLogs };
