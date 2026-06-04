const notificationRepo = require("../repositories/notificationRepository");
const { findUserByEmail } = require("./userService");
const { emitToUser } = require("../socket/socketManager");

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
  const row = await notificationRepo.insert(userId, type, title, message);

  emitToUser(userId, "notification", {
    id: String(row.id),
    type,
    title,
    message,
    isRead: false,
    page: null,
    createdAt: row.created_at,
  });
}

async function createNotificationForEmail(email, type, title, message) {
  const user = await findUserByEmail(email);

  if (!user) {
    return;
  }

  await createNotificationForUserId(user.id, type, title, message);
}

async function notifyRoles(roleNames, type, title, message) {
  const userIds = await notificationRepo.findUserIdsByRoles(roleNames);
  await Promise.all(userIds.map((id) => createNotificationForUserId(id, type, title, message)));
}

async function getUserNotifications(email) {
  const rows = await notificationRepo.findByUserEmail(email);
  return rows.map(formatNotification);
}

async function markNotificationRead(email, notificationId) {
  await notificationRepo.markRead(notificationId, email);
}

async function markAllNotificationsRead(email) {
  await notificationRepo.markAllRead(email);
}

async function deleteNotification(email, notificationId) {
  await notificationRepo.deleteOne(notificationId, email);
}

async function deleteReadNotifications(email) {
  await notificationRepo.deleteAllRead(email);
}

async function deleteAllNotifications(email) {
  await notificationRepo.deleteAll(email);
}

module.exports = {
  createNotificationForEmail,
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notifyRoles,
  deleteNotification,
  deleteReadNotifications,
  deleteAllNotifications,
};
