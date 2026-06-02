const { query } = require("../db/client");

async function findSaved() {
  const result = await query(
    `
      SELECT
        al.id,
        al.action,
        al.entity,
        al.created_at,
        u.email,
        trim(concat(u.first_name, ' ', u.last_name)) AS user_name
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT 25
    `
  );
  return result.rows;
}

async function findFromDetections() {
  const result = await query(
    `
      SELECT
        dr.id,
        concat('Detection request ', dr.status) AS action,
        'Detection Request' AS entity,
        CASE
          WHEN dr.status = 'rejected' THEN 'Rejected'
          WHEN dr.status = 'processing' THEN 'Review'
          ELSE 'Success'
        END AS status,
        dr.requested_at AS created_at,
        u.email,
        trim(concat(u.first_name, ' ', u.last_name)) AS user_name
      FROM detection_requests dr
      JOIN users u ON u.id = dr.user_id
      ORDER BY dr.requested_at DESC
      LIMIT 10
    `
  );
  return result.rows;
}

async function findFromUsers() {
  const result = await query(
    `
      SELECT
        u.id,
        'User account available' AS action,
        'Users' AS entity,
        'Success' AS status,
        u.created_at,
        u.email,
        trim(concat(u.first_name, ' ', u.last_name)) AS user_name
      FROM users u
      ORDER BY u.created_at DESC
      LIMIT 10
    `
  );
  return result.rows;
}

module.exports = { findSaved, findFromDetections, findFromUsers };
