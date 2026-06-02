const { query } = require("../db/client");

async function insert(userId, planName, detectionsUsed, month) {
  await query(
    `INSERT INTO rate_limit_logs (user_id, plan_name, detections_used, month)
     VALUES ($1, $2, $3, $4)`,
    [userId, planName, detectionsUsed, month]
  );
}

async function findByUserId(userId) {
  const result = await query(
    `SELECT id, plan_name, detections_used, month, limit_reached_at
     FROM rate_limit_logs
     WHERE user_id = $1
     ORDER BY limit_reached_at DESC`,
    [userId]
  );
  return result.rows;
}

module.exports = { insert, findByUserId };
