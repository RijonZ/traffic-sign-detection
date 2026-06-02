const { query } = require("../db/client");

async function getMetrics() {
  const result = await query(
    `
      SELECT
        COUNT(*)                                          AS total_requests,
        COUNT(*) FILTER (WHERE dr.status = 'rejected')   AS rejected,
        COALESCE(ROUND(AVG(res.confidence)), 0)          AS average_confidence
      FROM detection_requests dr
      LEFT JOIN detection_results res ON res.request_id = dr.id
    `
  );
  return result.rows[0];
}

async function getCategories() {
  const result = await query(
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
  return result.rows;
}

module.exports = { getMetrics, getCategories };
