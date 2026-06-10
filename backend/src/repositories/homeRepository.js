const { query } = require("../db/client");

async function getGlobalStats() {
  const result = await query(
    `
      SELECT
        (SELECT count(*) FROM users WHERE is_active = true) AS total_users,
        (SELECT count(*) FROM detection_requests) AS total_detections,
        (SELECT count(*) FROM detection_requests WHERE status = 'completed') AS completed_detections,
        (SELECT COALESCE(avg(confidence), 0) FROM detection_results) AS average_confidence,
        (
          SELECT ts.sign_name
          FROM detection_requests dr
          JOIN detection_results res ON res.request_id = dr.id
          LEFT JOIN traffic_signs ts ON ts.id = res.traffic_sign_id
          WHERE dr.status = 'completed'
          ORDER BY dr.requested_at DESC
          LIMIT 1
        ) AS latest_sign
    `
  );
  return result.rows[0];
}

async function getUserStats(email) {
  const result = await query(
    `
      SELECT
        u.id,
        u.email,
        trim(concat(u.first_name, ' ', u.last_name)) AS name,
        COALESCE(r.name, 'User') AS role,
        (SELECT count(*) FROM detection_requests dr WHERE dr.user_id = u.id) AS total_detections,
        (
          SELECT count(*)
          FROM detection_requests dr
          WHERE dr.user_id = u.id AND dr.status = 'completed'
        ) AS completed_detections,
        (
          SELECT COALESCE(avg(res.confidence), 0)
          FROM detection_requests dr
          JOIN detection_results res ON res.request_id = dr.id
          WHERE dr.user_id = u.id
        ) AS average_confidence,
        (
          SELECT s.plan_name
          FROM subscriptions s
          WHERE s.user_id = u.id AND s.is_active = true
          ORDER BY s.start_date DESC
          LIMIT 1
        ) AS active_plan,
        (
          SELECT ts.sign_name
          FROM detection_requests dr
          JOIN detection_results res ON res.request_id = dr.id
          LEFT JOIN traffic_signs ts ON ts.id = res.traffic_sign_id
          WHERE dr.user_id = u.id
          ORDER BY dr.requested_at DESC
          LIMIT 1
        ) AS latest_sign
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE lower(u.email) = lower($1)
      LIMIT 1
    `,
    [email]
  );
  return result.rows[0] || null;
}

async function findAllUserEmails() {
  const result = await query(`SELECT email FROM users ORDER BY created_at DESC`);
  return result.rows.map((row) => row.email);
}

module.exports = { getGlobalStats, getUserStats, findAllUserEmails };
