const OpenAI = require("openai");

require("../db/client");

let openaiClient = null;

function getOpenAiClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

function getRoleHint(role) {
  if (role === "Administrator") {
    return "As an administrator, you can review users, detections, reports, audit logs, and model monitoring.";
  }

  if (role === "Manager") {
    return "As a manager, you can review analytics, reports, all detections, exports, and team-level subscription features.";
  }

  return "As a user, you can upload images, review detection history, download reports, and manage your subscription.";
}

function createFallbackReply(message, user = {}) {
  const text = String(message || "").toLowerCase();
  const role = user.role || "User";

  if (!text.trim()) {
    return "Please write a question about detections, reports, subscriptions, exports, or dashboards.";
  }

  if (text.includes("confidence")) {
    return "Confidence shows how sure the model is about a detected traffic sign. For example, 96% means the model is highly confident in that prediction.";
  }

  if (text.includes("reject") || text.includes("failed")) {
    return "A detection may be rejected when the image is blurry, too dark, too large, not an image file, or the sign is not visible enough.";
  }

  if (text.includes("report") || text.includes("pdf")) {
    return "Reports can be downloaded as structured PDF files. Users open My Reports, while admins and managers can review report modules.";
  }

  if (text.includes("subscription") || text.includes("payment") || text.includes("plan")) {
    return "The Subscription page contains Basic, Premium, and Team plans. It also shows payment status, paid date, and expiry date.";
  }

  if (text.includes("history")) {
    return "Detection History is connected to the backend and shows previous requests, image names, detected signs, confidence, status, and date.";
  }

  if (text.includes("export")) {
    return "Export Data is mainly for managers. It can export detection records as CSV or JSON for analysis or project documentation.";
  }

  if (text.includes("dashboard")) {
    return getRoleHint(role);
  }

  if (text.includes("admin")) {
    return "Admins manage system-level modules such as users, all detections, reports, model monitoring, and audit logs.";
  }

  if (text.includes("manager")) {
    return "Managers focus on analytics, reports, all detections, export data, and team-level decision making.";
  }

  return `${getRoleHint(role)} You can also ask me about confidence, rejected uploads, reports, subscription plans, detection history, and exports.`;
}

async function createChatReply(message, user = {}) {
  const text = String(message || "").trim();
  const role = user.role || "User";

  if (!text) {
    return {
      reply: createFallbackReply(message, user),
      source: "fallback",
    };
  }

  const client = getOpenAiClient();

  if (!client) {
    return {
      reply: createFallbackReply(message, user),
      source: "fallback",
    };
  }

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini",
      instructions: [
        "You are the AI assistant inside a Traffic Sign Detection web application.",
        "Help users with authentication, dashboards, traffic sign detection, detection history, reports, subscriptions, exports, admin users, and project workflow.",
        "If the user asks about app behavior, answer based on this app: React frontend, Node backend, CockroachDB/PostgreSQL database, and a demo traffic sign prediction flow.",
        `The current user's role is ${role}. Tailor guidance to that role.`,
        "Support both Albanian and English. Match the user's language: answer in Albanian when the user writes in Albanian, and answer in English when the user writes in English.",
        "Be concise, friendly, and practical. If a question is unrelated, still answer helpfully, but keep it brief.",
      ].join(" "),
      input: text,
    });

    return {
      reply: response.output_text || createFallbackReply(message, user),
      source: "openai",
    };
  } catch (error) {
    console.error("OpenAI chat failed:", error.message);
    return {
      reply: createFallbackReply(message, user),
      source: "fallback",
    };
  }
}

module.exports = { createChatReply };
