const { validateLogin } = require("../services/userService");
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

module.exports = { login };
