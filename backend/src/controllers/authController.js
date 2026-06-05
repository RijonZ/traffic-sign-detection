const { createUserAccount, revokeLoginSession, refreshSession, validateLogin, forgotPassword, resetPassword } = require("../services/userService");
const { sendJson } = require("../utils/http");

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await validateLogin(email || "", password || "");

    if (!result) {
      sendJson(res, 401, { message: "Invalid email or password." });
      return;
    }

    sendJson(res, 200, { user: result });
  } catch {
    sendJson(res, 400, { message: "Invalid request body." });
  }
}

async function signup(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      sendJson(res, 400, { message: "Name, email, and password are required." });
      return;
    }

    const result = await createUserAccount(name, email, password);

    if (!result.ok) {
      sendJson(res, 409, { message: result.message });
      return;
    }

    sendJson(res, 201, { user: result.user });
  } catch {
    sendJson(res, 400, { message: "Invalid request body." });
  }
}

async function logout(req, res) {
  try {
    const { refreshToken } = req.body;
    await revokeLoginSession(refreshToken || "");
    sendJson(res, 200, { ok: true });
  } catch {
    sendJson(res, 400, { message: "Invalid request body." });
  }
}

async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;
    const result = await refreshSession(refreshToken || "");

    if (!result) {
      sendJson(res, 401, { message: "Invalid or expired refresh token." });
      return;
    }

    sendJson(res, 200, result);
  } catch {
    sendJson(res, 400, { message: "Invalid request body." });
  }
}

async function forgotPasswordHandler(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      sendJson(res, 400, { message: "Email is required." });
      return;
    }
    const result = await forgotPassword(email);
    if (!result.ok) {
      sendJson(res, 404, { message: result.message });
      return;
    }
    sendJson(res, 200, { ok: true, message: "Reset link sent. Check your inbox." });
  } catch (err) {
    console.error("[forgotPassword]", err.message);
    sendJson(res, 500, { message: "Could not send reset email. Try again later." });
  }
}

async function resetPasswordHandler(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      sendJson(res, 400, { message: "Token and new password are required." });
      return;
    }
    if (password.length < 6) {
      sendJson(res, 400, { message: "Password must be at least 6 characters." });
      return;
    }
    const result = await resetPassword(token, password);
    if (!result.ok) {
      sendJson(res, 400, { message: result.message });
      return;
    }
    sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error("[resetPassword]", err.message);
    sendJson(res, 500, { message: "Could not reset password. Try again later." });
  }
}

module.exports = { login, logout, signup, refresh, forgotPasswordHandler, resetPasswordHandler };
