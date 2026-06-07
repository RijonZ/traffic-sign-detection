const { query } = require("../db/client");

const DETECTION_SELECT = `
  SELECT
    dr.id AS request_id,
    dr.status,
    dr.requested_at,
    dr.completed_at,
    f.id AS file_id,
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

async function findById(requestId) {
  const result = await query(
    `${DETECTION_SELECT}
     WHERE dr.id = $1
     LIMIT 1`,
    [requestId]
  );
  return result.rows[0] || null;
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

async function updateRequest(requestId, status) {
  await query(
    `
      UPDATE detection_requests
      SET status = $1,
          completed_at = CASE
            WHEN $1 IN ('completed', 'rejected', 'failed') THEN COALESCE(completed_at, now())
            ELSE completed_at
          END
      WHERE id = $2
    `,
    [status, requestId]
  );
}

async function updateFile(fileId, filename, fileSize, fileType) {
  await query(
    `
      UPDATE files
      SET filename = $1,
          file_path = $1,
          file_size = $2,
          entity = $3
      WHERE id = $4
    `,
    [filename, fileSize, fileType, fileId]
  );
}

async function updateResult(requestId, trafficSignId, confidence, boundingBox) {
  const result = await query(
    `
      UPDATE detection_results
      SET traffic_sign_id = $1,
          confidence = $2,
          bounding_box = $3,
          detected_at = now()
      WHERE request_id = $4
      RETURNING id
    `,
    [trafficSignId, confidence, boundingBox, requestId]
  );

  if (!result.rows.length) {
    await insertResult(requestId, trafficSignId, confidence, boundingBox);
  }
}

async function deleteById(requestId) {
  await query(`DELETE FROM detection_requests WHERE id = $1`, [requestId]);
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
  findById,
  upsertTrafficSign,
  insertFile,
  insertRequest,
  insertResult,
  updateRequest,
  updateFile,
  updateResult,
  deleteById,
  findActivePlanByUserId,
};
