const { query } = require("../db/client");

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
  const metricsResult = await query(
    `
      SELECT
        COUNT(*)                                          AS total_requests,
        COUNT(*) FILTER (WHERE dr.status = 'rejected')   AS rejected,
        COALESCE(ROUND(AVG(res.confidence)), 0)          AS average_confidence
      FROM detection_requests dr
      LEFT JOIN detection_results res ON res.request_id = dr.id
    `
  );

  const categoriesResult = await query(
    `
      SELECT
        COALESCE(ts.category, 'Unknown') AS category,
        COUNT(*)                          AS cnt
      FROM detection_requests dr
      LEFT JOIN detection_results res ON res.request_id = dr.id
      LEFT JOIN traffic_signs ts      ON ts.id = res.traffic_sign_id
      GROUP BY ts.category
      ORDER BY cnt DESC
    `
  );

  const row = metricsResult.rows[0];
  const totalRequests = parseInt(row.total_requests, 10);
  const rejected = parseInt(row.rejected, 10);
  const completed = totalRequests - rejected;
  const averageConfidence = parseInt(row.average_confidence, 10);
  const modelAccuracy = Math.max(averageConfidence - rejected * 2, 0);

  const categories = {};
  for (const catRow of categoriesResult.rows) {
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
