const { query } = require("../db/client");

async function insert(userId, type, title, message) {
  const result = await query(
    `
      INSERT INTO notifications (user_id, type, title, message)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at
    `,
    [userId, type, title, message]
  );
  return result.rows[0];
}

async function findUserIdsByRoles(roleNames) {
  const result = await query(
    `
      SELECT DISTINCT u.id
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
      WHERE r.name = ANY($1)
        AND u.is_active = true
    `,
    [roleNames]
  );
  return result.rows.map((row) => row.id);
}

async function findByUserEmail(email) {
  const result = await query(
    `
      SELECT
        n.id,
        n.type,
        n.title,
        n.message,
        n.is_read,
        n.created_at,
        COALESCE(r.name, 'User') AS role
      FROM notifications n
      JOIN users u ON u.id = n.user_id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE lower(u.email) = lower($1)
      ORDER BY n.created_at DESC
      LIMIT 20
    `,
    [email]
  );
  return result.rows;
}

async function markRead(notificationId, email) {
  await query(
    `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1
        AND user_id = (
          SELECT id FROM users WHERE lower(email) = lower($2)
        )
    `,
    [notificationId, email]
  );
}

async function markAllRead(email) {
  await query(
    `
      UPDATE notifications
      SET is_read = true
      WHERE user_id = (
        SELECT id FROM users WHERE lower(email) = lower($1)
      )
        AND is_read = false
    `,
    [email]
  );
}

async function deleteOne(notificationId, email) {
  await query(
    `DELETE FROM notifications
     WHERE id = $1
       AND user_id = (SELECT id FROM users WHERE lower(email) = lower($2))`,
    [notificationId, email]
  );
}

async function deleteAllRead(email) {
  await query(
    `DELETE FROM notifications
     WHERE user_id = (SELECT id FROM users WHERE lower(email) = lower($1))
       AND is_read = true`,
    [email]
  );
}

async function deleteAll(email) {
  await query(
    `DELETE FROM notifications
     WHERE user_id = (SELECT id FROM users WHERE lower(email) = lower($1))`,
    [email]
  );
}

module.exports = { insert, findUserIdsByRoles, findByUserEmail, markRead, markAllRead, deleteOne, deleteAllRead, deleteAll };
