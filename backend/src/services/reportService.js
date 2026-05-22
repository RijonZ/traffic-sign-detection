const { getUserDetections } = require("./detectionService");
const { detections, users } = require("../data/store");

function getRequesterName(email) {
  const user = users.find((item) => item.email.toLowerCase() === email.toLowerCase());
  return user ? user.name : email;
}

function formatReport(item) {
  return {
    id: `REP-${item.id}`,
    detectionId: item.id,
    fileName: item.fileName,
    requestedBy: getRequesterName(item.userEmail),
    userEmail: item.userEmail,
    sign: item.sign,
    category: item.category,
    confidence: item.confidence,
    status: item.status,
    createdAt: item.detectedAt,
  };
}

function getUserReports(email) {
  return getUserDetections(email).map(formatReport);
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

function getAllReports() {
  const reports = detections.map(formatReport);

  return {
    reports,
    summary: getReportsSummary(reports),
  };
}

module.exports = { getAllReports, getUserReports };
