const {
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} = require("../services/notificationService");
const { findUserByEmail } = require("../services/userService");
const { readBody, sendJson } = require("../utils/http");

async function getNotifications(_, response, params) {
  const [email] = params;

  if (!(await findUserByEmail(email))) {
    sendJson(response, 404, { message: "User not found." });
    return;
  }

  sendJson(response, 200, {
    notifications: await getUserNotifications(email),
  });
}

async function markAsRead(request, response, params) {
  const [email] = params;

  if (!(await findUserByEmail(email))) {
    sendJson(response, 404, { message: "User not found." });
    return;
  }

  try {
    const { notificationId } = await readBody(request);
    await markNotificationRead(email, notificationId);
    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 400, { message: "Invalid notification request." });
  }
}

async function markAllAsRead(_, response, params) {
  const [email] = params;

  if (!(await findUserByEmail(email))) {
    sendJson(response, 404, { message: "User not found." });
    return;
  }

  await markAllNotificationsRead(email);
  sendJson(response, 200, { ok: true });
}

module.exports = { getNotifications, markAllAsRead, markAsRead };
