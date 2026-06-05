const { updateProfile, getProfileMeta } = require("../services/userService");
const { sendJson } = require("../utils/http");

async function getUserProfile(req, res) {
  const email = decodeURIComponent(req.params.email);
  const meta = await getProfileMeta(email);
  if (!meta) {
    sendJson(res, 404, { message: "User not found." });
    return;
  }
  sendJson(res, 200, meta);
}

async function updateUserProfile(req, res) {
  const email = decodeURIComponent(req.params.email);
  try {
    const { name, password } = req.body;

    if (!name && !password) {
      sendJson(res, 400, { message: "Provide name or password to update." });
      return;
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (password !== undefined) updates.password = password;

    const result = await updateProfile(email, updates);
    if (!result.ok) {
      sendJson(res, 429, {
        message: result.message,
        field: result.field,
        lockedUntil: result.lockedUntil,
      });
      return;
    }

    sendJson(res, 200, { ok: true, user: result.user });
  } catch {
    sendJson(res, 400, { message: "Invalid request body." });
  }
}

module.exports = { getUserProfile, updateUserProfile };
