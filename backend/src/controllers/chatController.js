const { createChatReply } = require("../services/chatService");
const { sendJson } = require("../utils/http");

async function sendMessage(req, res) {
  try {
    const { message, user } = req.body;
    const result = await createChatReply(message, user);

    sendJson(res, 200, {
      reply: result.reply,
      source: result.source,
    });
  } catch {
    sendJson(res, 400, { message: "Invalid chat request." });
  }
}

module.exports = { sendMessage };
