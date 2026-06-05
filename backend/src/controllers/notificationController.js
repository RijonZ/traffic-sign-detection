const {
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
  deleteReadNotifications,
  deleteAllNotifications,
} = require("../services/notificationService");
const { findUserByEmail } = require("../services/userService");
const { sendJson } = require("../utils/http");

async function resolveUser(req, res) {
  const email = decodeURIComponent(req.params.email);
  const user = await findUserByEmail(email);
  if (!user) {
    sendJson(res, 404, { message: "User not found." });
    return null;
  }
  return email;
}

async function getNotifications(req, res) {
  const email = await resolveUser(req, res);
  if (!email) return;
  sendJson(res, 200, { notifications: await getUserNotifications(email) });
}

async function markAsRead(req, res) {
  const email = await resolveUser(req, res);
  if (!email) return;
  try {
    const { notificationId } = req.body;
    await markNotificationRead(email, notificationId);
    sendJson(res, 200, { ok: true });
  } catch {
    sendJson(res, 400, { message: "Invalid notification request." });
  }
}

async function markAllAsRead(req, res) {
  const email = await resolveUser(req, res);
  if (!email) return;
  await markAllNotificationsRead(email);
  sendJson(res, 200, { ok: true });
}

async function deleteOne(req, res) {
  const email = await resolveUser(req, res);
  if (!email) return;
  try {
    const { notificationId } = req.body;
    if (!notificationId) {
      sendJson(res, 400, { message: "notificationId is required." });
      return;
    }
    await deleteNotification(email, notificationId);
    sendJson(res, 200, { ok: true });
  } catch {
    sendJson(res, 400, { message: "Invalid request." });
  }
}

async function deleteRead(req, res) {
  const email = await resolveUser(req, res);
  if (!email) return;
  await deleteReadNotifications(email);
  sendJson(res, 200, { ok: true });
}

async function deleteAll(req, res) {
  const email = await resolveUser(req, res);
  if (!email) return;
  await deleteAllNotifications(email);
  sendJson(res, 200, { ok: true });
}

module.exports = { getNotifications, markAllAsRead, markAsRead, deleteOne, deleteRead, deleteAll };
