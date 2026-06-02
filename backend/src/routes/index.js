const { login, logout, signup } = require("../controllers/authController");
const { sendMessage } = require("../controllers/chatController");
const {
  getAdminAuditLogs,
  getAdminDashboardSummary,
  getAdminDetections,
  getAdminReports,
  getAdminUsers,
  getModelMonitoring,
  updateAdminUser,
  deleteAdminUser,
  getAdminSettings,
  updateAdminSettings,
} = require("../controllers/adminController");
const {
  createDetectSignRequest,
  getDetectionHistory,
} = require("../controllers/detectSignController");
const {
  getDashboard,
  getDetections,
  createDetection,
  downloadReport,
  getReports,
} = require("../controllers/dashboardController");
const {
  getNotifications,
  markAllAsRead,
  markAsRead,
} = require("../controllers/notificationController");
const { getHome } = require("../controllers/homeController");
const { updateUserProfile } = require("../controllers/userController");
const {
  activateBasicPlan,
  activateDemoPlan,
  cancelUserSubscription,
  confirmStripeCheckoutSession,
  createStripeCheckoutSession,
  getUserSubscription,
  getSubscription,
} = require("../controllers/paymentController");
const {
  getDashboardAnalytics,
  getManagerExportData,
} = require("../controllers/managerController");
const { sendJson, sendOptions, notFound } = require("../utils/http");

const routes = [
  { method: "GET", path: /^\/api\/health$/, handler: (_, response) => sendJson(response, 200, { ok: true }) },
  { method: "GET", path: /^\/api\/home$/, handler: getHome },
  { method: "POST", path: /^\/api\/auth\/login$/, handler: login },
  { method: "POST", path: /^\/api\/auth\/signup$/, handler: signup },
  { method: "POST", path: /^\/api\/auth\/logout$/, handler: logout },
  { method: "POST", path: /^\/api\/chat$/, handler: sendMessage },
  { method: "GET", path: /^\/api\/payments\/subscription$/, handler: getSubscription },
  { method: "POST", path: /^\/api\/payments\/basic-plan$/, handler: activateBasicPlan },
  { method: "POST", path: /^\/api\/payments\/demo-plan$/, handler: activateDemoPlan },
  { method: "POST", path: /^\/api\/payments\/create-checkout-session$/, handler: createStripeCheckoutSession },
  { method: "POST", path: /^\/api\/payments\/confirm-checkout-session$/, handler: confirmStripeCheckoutSession },
  { method: "GET", path: /^\/api\/detect-sign$/, handler: getDetectionHistory },
  { method: "POST", path: /^\/api\/detect-sign$/, handler: createDetectSignRequest },
  { method: "GET", path: /^\/api\/admin\/model-monitoring$/, handler: getModelMonitoring },
  { method: "GET", path: /^\/api\/admin\/audit-logs$/, handler: getAdminAuditLogs },
  { method: "GET", path: /^\/api\/admin\/dashboard$/, handler: getAdminDashboardSummary },
  { method: "GET", path: /^\/api\/admin\/detections$/, handler: getAdminDetections },
  { method: "GET", path: /^\/api\/admin\/reports$/, handler: getAdminReports },
  { method: "GET", path: /^\/api\/admin\/users$/, handler: getAdminUsers },
  { method: "PUT", path: /^\/api\/admin\/users\/([^/]+)$/, handler: updateAdminUser },
  { method: "DELETE", path: /^\/api\/admin\/users\/([^/]+)$/, handler: deleteAdminUser },
  { method: "GET", path: /^\/api\/admin\/settings$/, handler: getAdminSettings },
  { method: "PUT", path: /^\/api\/admin\/settings$/, handler: updateAdminSettings },
  { method: "GET", path: /^\/api\/manager\/dashboard-analytics$/, handler: getDashboardAnalytics },
  { method: "GET", path: /^\/api\/manager\/export-data$/, handler: getManagerExportData },
  { method: "PUT", path: /^\/api\/users\/([^/]+)\/profile$/, handler: updateUserProfile },
  { method: "GET", path: /^\/api\/users\/([^/]+)\/subscription$/, handler: getUserSubscription },
  { method: "DELETE", path: /^\/api\/users\/([^/]+)\/subscription$/, handler: cancelUserSubscription },
  { method: "GET", path: /^\/api\/users\/([^/]+)\/dashboard$/, handler: getDashboard },
  { method: "GET", path: /^\/api\/users\/([^/]+)\/detections$/, handler: getDetections },
  { method: "POST", path: /^\/api\/users\/([^/]+)\/detections$/, handler: createDetection },
  { method: "GET", path: /^\/api\/users\/([^/]+)\/reports\/([^/]+)\/pdf$/, handler: downloadReport },
  { method: "GET", path: /^\/api\/users\/([^/]+)\/reports$/, handler: getReports },
  { method: "GET", path: /^\/api\/users\/([^/]+)\/notifications$/, handler: getNotifications },
  { method: "POST", path: /^\/api\/users\/([^/]+)\/notifications\/read$/, handler: markAsRead },
  { method: "POST", path: /^\/api\/users\/([^/]+)\/notifications\/read-all$/, handler: markAllAsRead },
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
