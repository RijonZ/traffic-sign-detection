const { query } = require("../db/client");

const DETECTION_SELECT = `
  SELECT
    dr.id AS request_id,
    dr.status,
    dr.requested_at,
    dr.completed_at,
    trim(concat(u.first_name, ' ', u.last_name)) AS user_name,
    u.email AS user_email,
    f.filename,
    f.file_size,
    f.entity AS file_type,
    ts.sign_name,
    ts.category,
    res.confidence,
    res.bounding_box,
    res.detected_at
  FROM detection_requests dr
  JOIN users u ON u.id = dr.user_id
  LEFT JOIN files f ON f.id = dr.file_id
  LEFT JOIN detection_results res ON res.request_id = dr.id
  LEFT JOIN traffic_signs ts ON ts.id = res.traffic_sign_id
`;

async function findByUserEmail(email) {
  const result = await query(
    `${DETECTION_SELECT}
     WHERE lower(u.email) = lower($1)
     ORDER BY dr.requested_at DESC`,
    [email]
  );
  return result.rows;
}

async function findAll() {
  const result = await query(
    `${DETECTION_SELECT}
     ORDER BY dr.requested_at DESC`
  );
  return result.rows;
}

async function upsertTrafficSign(signName, category) {
  const result = await query(
    `
      INSERT INTO traffic_signs (sign_name, category)
      VALUES ($1, $2)
      ON CONFLICT (sign_name) DO UPDATE SET category = excluded.category
      RETURNING id
    `,
    [signName, category || "Unknown"]
  );
  return result.rows[0].id;
}

async function insertFile(entity, filename, filePath, fileSize, uploadedBy) {
  const result = await query(
    `
      INSERT INTO files (entity, filename, file_path, file_size, uploaded_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
    [entity, filename, filePath, fileSize, uploadedBy]
  );
  return result.rows[0].id;
}

async function insertRequest(userId, fileId, status) {
  const result = await query(
    `
      INSERT INTO detection_requests (user_id, file_id, status, completed_at)
      VALUES ($1, $2, $3, now())
      RETURNING id
    `,
    [userId, fileId, status]
  );
  return result.rows[0].id;
}

async function insertResult(requestId, trafficSignId, confidence, boundingBox) {
  await query(
    `
      INSERT INTO detection_results (request_id, traffic_sign_id, confidence, bounding_box)
      VALUES ($1, $2, $3, $4)
    `,
    [requestId, trafficSignId, confidence, boundingBox]
  );
}

async function findActivePlanByUserId(userId) {
  const result = await query(
    `SELECT plan_name FROM subscriptions
     WHERE user_id = $1 AND is_active = true
     ORDER BY start_date DESC LIMIT 1`,
    [userId]
  );
  return result.rows[0]?.plan_name || "Basic";
}

module.exports = {
  findByUserEmail,
  findAll,
  upsertTrafficSign,
  insertFile,
  insertRequest,
  insertResult,
  findActivePlanByUserId,
};
