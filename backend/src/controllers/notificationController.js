const {
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
  deleteReadNotifications,
  deleteAllNotifications,
} = require("../services/notificationService");
const { findUserByEmail } = require("../services/userService");
const { readBody, sendJson } = require("../utils/http");

async function resolveUser(params, response) {
  const [email] = params;
  const user = await findUserByEmail(email);
  if (!user) {
    sendJson(response, 404, { message: "User not found." });
    return null;
  }
  return email;
}

async function getNotifications(_, response, params) {
  const email = await resolveUser(params, response);
  if (!email) return;
  sendJson(response, 200, { notifications: await getUserNotifications(email) });
}

async function markAsRead(request, response, params) {
  const email = await resolveUser(params, response);
  if (!email) return;
  try {
    const { notificationId } = await readBody(request);
    await markNotificationRead(email, notificationId);
    sendJson(response, 200, { ok: true });
  } catch {
    sendJson(response, 400, { message: "Invalid notification request." });
  }
}

async function markAllAsRead(_, response, params) {
  const email = await resolveUser(params, response);
  if (!email) return;
  await markAllNotificationsRead(email);
  sendJson(response, 200, { ok: true });
}

async function deleteOne(request, response, params) {
  const email = await resolveUser(params, response);
  if (!email) return;
  try {
    const { notificationId } = await readBody(request);
    if (!notificationId) {
      sendJson(response, 400, { message: "notificationId is required." });
      return;
    }
    await deleteNotification(email, notificationId);
    sendJson(response, 200, { ok: true });
  } catch {
    sendJson(response, 400, { message: "Invalid request." });
  }
}

async function deleteRead(_, response, params) {
  const email = await resolveUser(params, response);
  if (!email) return;
  await deleteReadNotifications(email);
  sendJson(response, 200, { ok: true });
}

async function deleteAll(_, response, params) {
  const email = await resolveUser(params, response);
  if (!email) return;
  await deleteAllNotifications(email);
  sendJson(response, 200, { ok: true });
}

module.exports = { getNotifications, markAllAsRead, markAsRead, deleteOne, deleteRead, deleteAll };
