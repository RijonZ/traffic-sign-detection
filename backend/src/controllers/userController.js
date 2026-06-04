const { updateProfile, getProfileMeta } = require("../services/userService");
const { sendJson, readBody } = require("../utils/http");

async function getUserProfile(request, response, params) {
  const email = decodeURIComponent(params[0]);
  const meta = await getProfileMeta(email);
  if (!meta) {
    sendJson(response, 404, { message: "User not found." });
    return;
  }
  sendJson(response, 200, meta);
}

async function updateUserProfile(request, response, params) {
  const email = decodeURIComponent(params[0]);
  try {
    const { name, password } = await readBody(request);

    if (!name && !password) {
      sendJson(response, 400, { message: "Provide name or password to update." });
      return;
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (password !== undefined) updates.password = password;

    const result = await updateProfile(email, updates);
    if (!result.ok) {
      sendJson(response, 429, {
        message: result.message,
        field: result.field,
        lockedUntil: result.lockedUntil,
      });
      return;
    }

    sendJson(response, 200, { ok: true, user: result.user });
  } catch {
    sendJson(response, 400, { message: "Invalid request body." });
  }
}

module.exports = { getUserProfile, updateUserProfile };
