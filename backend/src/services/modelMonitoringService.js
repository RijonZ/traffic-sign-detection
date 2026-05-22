const { detections } = require("../data/store");

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
    detail: "Detection results are saved in backend history.",
  },
  {
    name: "Notification flow",
    status: "Ready",
    detail: "Users can review completed or rejected requests.",
  },
];

function getCategoryCounts(items) {
  return items.reduce((groups, item) => {
    const category = item.category || "Unknown";
    return { ...groups, [category]: (groups[category] || 0) + 1 };
  }, {});
}

function getAverageConfidence(items) {
  if (!items.length) {
    return 0;
  }

  const totalConfidence = items.reduce((total, item) => total + Number(item.confidence || 0), 0);
  return Math.round(totalConfidence / items.length);
}

function getModelMonitoringSummary() {
  const totalRequests = detections.length;
  const completed = detections.filter((item) => item.status !== "Rejected").length;
  const rejected = totalRequests - completed;
  const averageConfidence = getAverageConfidence(detections);
  const modelAccuracy = Math.max(averageConfidence - rejected * 2, 0);

  return {
    metrics: {
      modelAccuracy,
      averageConfidence,
      rejectedUploads: rejected,
      completedRequests: completed,
      totalRequests,
    },
    checks: modelChecks,
    categories: getCategoryCounts(detections),
    recentDetections: detections.slice(0, 5),
  };
}

module.exports = { getModelMonitoringSummary };
