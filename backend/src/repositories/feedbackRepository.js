const { query } = require("../db/client");

async function insert(userId, requestId, rating, comment) {
  const res = await query(
    `SELECT id FROM detection_results WHERE request_id = $1 LIMIT 1`,
    [requestId]
  );
  const resultId = res.rows[0]?.id;
  if (!resultId) return null;

  // Block duplicate: one feedback per user per detection
  const existing = await query(
    `SELECT id FROM detection_feedback WHERE user_id = $1 AND detection_result_id = $2 LIMIT 1`,
    [userId, resultId]
  );
  if (existing.rows.length > 0) return "already_rated";

  await query(
    `INSERT INTO detection_feedback (user_id, detection_result_id, rating, comment)
     VALUES ($1, $2, $3, $4)`,
    [userId, resultId, rating, comment || null]
  );
  return true;
}

async function findByRequestId(requestId) {
  const result = await query(
    `SELECT df.rating, df.comment, df.created_at
     FROM detection_feedback df
     JOIN detection_results dr ON dr.id = df.detection_result_id
     WHERE dr.request_id = $1
     ORDER BY df.created_at DESC
     LIMIT 1`,
    [requestId]
  );
  return result.rows[0] || null;
}

async function findByUserId(userId) {
  const result = await query(
    `SELECT df.id, df.rating, df.comment, df.created_at,
            dr.request_id, ts.sign_name
     FROM detection_feedback df
     JOIN detection_results dr ON dr.id = df.detection_result_id
     LEFT JOIN traffic_signs ts ON ts.id = dr.traffic_sign_id
     WHERE df.user_id = $1
     ORDER BY df.created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function findAll() {
  const result = await query(
    `SELECT df.id, df.rating, df.comment, df.created_at,
            dr.request_id, ts.sign_name,
            u.email AS user_email,
            trim(concat(u.first_name, ' ', u.last_name)) AS user_name
     FROM detection_feedback df
     JOIN detection_results dr ON dr.id = df.detection_result_id
     JOIN users u ON u.id = df.user_id
     LEFT JOIN traffic_signs ts ON ts.id = dr.traffic_sign_id
     ORDER BY df.created_at DESC`
  );
  return result.rows;
}

module.exports = { insert, findByRequestId, findByUserId, findAll };
