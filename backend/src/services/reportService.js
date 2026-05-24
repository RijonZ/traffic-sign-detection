const { getUserDetections } = require("./detectionService");
const { query } = require("../db/client");

function formatReport(item) {
  return {
    id: `REP-${item.id}`,
    detectionId: item.id,
    fileName: item.fileName,
    requestedBy: item.requestedBy || item.userEmail,
    userEmail: item.userEmail,
    sign: item.sign,
    category: item.category,
    confidence: item.confidence,
    status: item.status,
    createdAt: item.detectedAt,
  };
}

async function getUserReports(email) {
  const detections = await getUserDetections(email);
  return detections.map(formatReport);
}

function getReportsSummary(reports) {
  const completed = reports.filter((report) => report.status === "Completed").length;
  const rejected = reports.filter((report) => report.status === "Rejected").length;
  const averageConfidence = reports.length
    ? Math.round(
        reports.reduce((total, report) => total + Number(report.confidence || 0), 0) /
          reports.length
      )
    : 0;

  return {
    totalReports: reports.length,
    completed,
    rejected,
    averageConfidence,
  };
}

async function getAllReports() {
  const result = await query(
    `
      SELECT email
      FROM users
      ORDER BY created_at DESC
    `
  );
  const reportGroups = await Promise.all(
    result.rows.map(async (user) => {
      const detections = await getUserDetections(user.email);
      return detections.map((item) => formatReport({ ...item, requestedBy: user.email }));
    })
  );
  const reports = reportGroups.flat();

  return {
    reports,
    summary: getReportsSummary(reports),
  };
}

module.exports = { getAllReports, getUserReports };
