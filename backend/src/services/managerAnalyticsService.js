const { getAllDetections } = require("./detectionService");

function countByCategory(detections) {
  return detections.reduce((groups, detection) => {
    const category = detection.category || "Unknown";
    groups[category] = (groups[category] || 0) + 1;
    return groups;
  }, {});
}

function getTopCategory(categoryCounts) {
  return Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0] || ["No data", 0];
}

async function getManagerDashboardAnalytics() {
  const { detections, summary } = await getAllDetections();
  const categoryCounts = countByCategory(detections);
  const [topCategory, topCategoryCount] = getTopCategory(categoryCounts);
  const totalDetections = detections.length;
  const completed = detections.filter((item) => item.status === "Completed").length;
  const rejected = detections.filter((item) => item.status === "Rejected").length;
  const averageConfidence = summary.averageConfidence || 0;

  return {
    metrics: {
      totalDetections,
      averageConfidence,
      rejectedUploads: rejected,
      completed,
      modelStatus: "Active",
      reviewNeeded: averageConfidence > 0 && averageConfidence < 85,
    },
    categoryCounts,
    recentDetections: detections.slice(0, 5),
    insight: totalDetections
      ? `${topCategory} signs are currently the most common category with ${topCategoryCount} detection${topCategoryCount === 1 ? "" : "s"}.`
      : "No detections are available yet. Upload traffic sign images to populate analytics.",
  };
}

module.exports = { getManagerDashboardAnalytics };
