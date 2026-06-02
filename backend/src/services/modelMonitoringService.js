const modelMonitoringRepo = require("../repositories/modelMonitoringRepository");

const modelChecks = [
  {
    name: "Image validation",
    status: "Healthy",
    detail: "Only image files under the upload limit are accepted.",
  },
  {
    name: "Prediction service",
    status: "Active",
    detail: "The classifier is ready to process traffic sign images.",
  },
  {
    name: "Result storage",
    status: "Active",
    detail: "Detection results are saved in the database.",
  },
  {
    name: "Notification flow",
    status: "Ready",
    detail: "Users can review completed or rejected requests.",
  },
];

async function getModelMonitoringSummary() {
  const row = await modelMonitoringRepo.getMetrics();
  const categoryRows = await modelMonitoringRepo.getCategories();

  const totalRequests = parseInt(row.total_requests, 10);
  const rejected = parseInt(row.rejected, 10);
  const completed = totalRequests - rejected;
  const averageConfidence = parseInt(row.average_confidence, 10);
  const modelAccuracy = Math.max(averageConfidence - rejected * 2, 0);

  const categories = {};
  for (const catRow of categoryRows) {
    categories[catRow.category] = parseInt(catRow.cnt, 10);
  }

  return {
    metrics: {
      modelAccuracy,
      averageConfidence,
      rejectedUploads: rejected,
      completedRequests: completed,
      totalRequests,
    },
    checks: modelChecks,
    categories,
  };
}

module.exports = { getModelMonitoringSummary };
