const { login, logout, signup } = require("../controllers/authController");
const { sendMessage } = require("../controllers/chatController");
const {
  getAdminAuditLogs,
  getAdminDashboardSummary,
  getAdminDetections,
  getAdminReports,
  getAdminUsers,
  getModelMonitoring,
} = require("../controllers/adminController");
const {
  createDetectSignRequest,
  getDetectionHistory,
} = require("../controllers/detectSignController");
const {
  getDashboard,
  getDetections,
  createDetection,
  getReports,
} = require("../controllers/dashboardController");
const {
  getNotifications,
  markAsRead,
} = require("../controllers/notificationController");
const { sendJson, sendOptions, notFound } = require("../utils/http");

const routes = [
  { method: "GET", path: /^\/api\/health$/, handler: (_, response) => sendJson(response, 200, { ok: true }) },
  { method: "POST", path: /^\/api\/auth\/login$/, handler: login },
  { method: "POST", path: /^\/api\/auth\/signup$/, handler: signup },
  { method: "POST", path: /^\/api\/auth\/logout$/, handler: logout },
  { method: "POST", path: /^\/api\/chat$/, handler: sendMessage },
  { method: "GET", path: /^\/api\/detect-sign$/, handler: getDetectionHistory },
  { method: "POST", path: /^\/api\/detect-sign$/, handler: createDetectSignRequest },
  { method: "GET", path: /^\/api\/admin\/model-monitoring$/, handler: getModelMonitoring },
  { method: "GET", path: /^\/api\/admin\/audit-logs$/, handler: getAdminAuditLogs },
  { method: "GET", path: /^\/api\/admin\/dashboard$/, handler: getAdminDashboardSummary },
  { method: "GET", path: /^\/api\/admin\/detections$/, handler: getAdminDetections },
  { method: "GET", path: /^\/api\/admin\/reports$/, handler: getAdminReports },
  { method: "GET", path: /^\/api\/admin\/users$/, handler: getAdminUsers },
  { method: "GET", path: /^\/api\/users\/([^/]+)\/dashboard$/, handler: getDashboard },
  { method: "GET", path: /^\/api\/users\/([^/]+)\/detections$/, handler: getDetections },
  { method: "POST", path: /^\/api\/users\/([^/]+)\/detections$/, handler: createDetection },
  { method: "GET", path: /^\/api\/users\/([^/]+)\/reports$/, handler: getReports },
  { method: "GET", path: /^\/api\/users\/([^/]+)\/notifications$/, handler: getNotifications },
  { method: "POST", path: /^\/api\/users\/([^/]+)\/notifications\/read$/, handler: markAsRead },
];

function handleRequest(request, response) {
  if (request.method === "OPTIONS") {
    sendOptions(response);
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host}`);
  const route = routes.find((item) => item.method === request.method && item.path.test(url.pathname));

  if (!route) {
    notFound(response);
    return;
  }

  const params = url.pathname.match(route.path).slice(1).map(decodeURIComponent);
  route.handler(request, response, params);
}

module.exports = { handleRequest };
