const { createChatReply } = require("../services/chatService");
const { readBody, sendJson } = require("../utils/http");

async function sendMessage(request, response) {
  try {
    const { message, user } = await readBody(request);
    const reply = createChatReply(message, user);

    sendJson(response, 200, {
      reply,
      source: "backend",
    });
  } catch (error) {
    sendJson(response, 400, { message: "Invalid chat request." });
  }
}

module.exports = { sendMessage };
