const { query } = require("../db/client");
const { findUserByEmail } = require("./userService");

function getNotificationPage(type, role) {
  if (type === "new-user") {
    return role === "Administrator" ? "users" : "dashboard";
  }

  if (type === "detection-completed" || type === "detection-rejected") {
    return role === "Administrator" || role === "Manager" ? "all-detections" : "history";
  }

  if (type === "account") {
    return role === "Administrator" ? "admin-dashboard" : "dashboard";
  }

  return "dashboard";
}

function formatNotification(row) {
  return {
    id: String(row.id),
    type: row.type,
    title: row.title,
    message: row.message,
    isRead: Boolean(row.is_read),
    page: getNotificationPage(row.type, row.role),
    createdAt: row.created_at,
  };
}

async function createNotificationForUserId(userId, type, title, message) {
  await query(
    `
      INSERT INTO notifications (user_id, type, title, message)
      VALUES ($1, $2, $3, $4)
    `,
    [userId, type, title, message]
  );
}

async function createNotificationForEmail(email, type, title, message) {
  const user = await findUserByEmail(email);

  if (!user) {
    return;
  }

  await createNotificationForUserId(user.id, type, title, message);
}

async function notifyRoles(roleNames, type, title, message) {
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

  await Promise.all(
    result.rows.map((row) => createNotificationForUserId(row.id, type, title, message))
  );
}

async function getUserNotifications(email) {
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

  return result.rows.map(formatNotification);
}

async function markNotificationRead(email, notificationId) {
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

module.exports = {
  createNotificationForEmail,
  getUserNotifications,
  markNotificationRead,
  notifyRoles,
};
