function getRoleHint(role) {
  if (role === "Administrator") {
    return "As an administrator, you can review users, detections, reports, audit logs, and model monitoring.";
  }

  if (role === "Manager") {
    return "As a manager, you can review analytics, reports, all detections, exports, and team-level subscription features.";
  }

  return "As a user, you can upload images, review detection history, download reports, and manage your subscription.";
}

function createChatReply(message, user = {}) {
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

module.exports = { createChatReply };
