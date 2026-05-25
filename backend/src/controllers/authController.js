const { createUserAccount, revokeLoginSession, validateLogin } = require("../services/userService");
const { readBody, sendJson } = require("../utils/http");

async function login(request, response) {
  try {
    const { email, password } = await readBody(request);
    const user = await validateLogin(email || "", password || "");

    if (!user) {
      sendJson(response, 401, { message: "Invalid email or password." });
      return;
    }

    sendJson(response, 200, { user });
  } catch (error) {
    sendJson(response, 400, { message: "Invalid request body." });
  }
}

async function signup(request, response) {
  try {
    const { name, email, password } = await readBody(request);

    if (!name || !email || !password) {
      sendJson(response, 400, { message: "Name, email, and password are required." });
      return;
    }

    const result = await createUserAccount(name, email, password);

    if (!result.ok) {
      sendJson(response, 409, { message: result.message });
      return;
    }

    sendJson(response, 201, { user: result.user });
  } catch (error) {
    sendJson(response, 400, { message: "Invalid request body." });
  }
}

async function logout(request, response) {
  try {
    const { sessionToken } = await readBody(request);
    await revokeLoginSession(sessionToken || "");
    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 400, { message: "Invalid request body." });
  }
}

module.exports = { login, logout, signup };
