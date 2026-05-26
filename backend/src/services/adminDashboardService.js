const { getAuditLogs } = require("./auditLogService");
const { getAllDetections } = require("./detectionService");
const { getUsersSummary } = require("./userService");

function formatActivity(log) {
  return `${log.user} - ${log.action}`;
}

async function getAdminDashboard() {
  const [usersSummary, detectionsData, auditData] = await Promise.all([
    getUsersSummary(),
    getAllDetections(),
    getAuditLogs(),
  ]);

  return {
    summary: {
      totalUsers: usersSummary.totalUsers,
      administrators: usersSummary.administrators,
      managers: usersSummary.managers,
      users: usersSummary.users,
      detections: detectionsData.summary.totalRequests,
      completedDetections: detectionsData.summary.completed,
      rejectedDetections: detectionsData.summary.rejected,
    },
    recentActivity: auditData.logs.slice(0, 3).map(formatActivity),
  };
}

module.exports = { getAdminDashboard };
