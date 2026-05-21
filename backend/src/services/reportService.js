const { getUserDetections } = require("./detectionService");

function getUserReports(email) {
  return getUserDetections(email).map((item) => ({
    id: `REP-${item.id}`,
    detectionId: item.id,
    fileName: item.fileName,
    sign: item.sign,
    category: item.category,
    confidence: item.confidence,
    status: item.status,
    createdAt: item.detectedAt,
  }));
}

module.exports = { getUserReports };
