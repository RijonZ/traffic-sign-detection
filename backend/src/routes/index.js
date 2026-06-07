const fs = require("fs");
const path = require("path");
const express = require("express");
const { login, logout, signup, refresh, forgotPasswordHandler, resetPasswordHandler } = require("../controllers/authController");
const { sendMessage } = require("../controllers/chatController");
const {
  createAdminUser,
  downloadAdminReport,
  exportAdminReports,
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
  getAdminFeedbacks,
  exportAdminDataset,
  importAdminData,
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
  deleteOne,
  deleteRead,
  deleteAll,
} = require("../controllers/notificationController");
const { getHome } = require("../controllers/homeController");
const { getUserProfile, updateUserProfile } = require("../controllers/userController");
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
const { postFeedback, getFeedback, getMyFeedbacks } = require("../controllers/feedbackController");
const { getPermissionsForRole } = require("../services/permissionService");
const { findUserByEmail } = require("../services/userService");
const { sendJson } = require("../utils/http");

const router = express.Router();

// Health
router.get("/health", (req, res) => res.json({ ok: true }));

// Docs
router.get("/docs", (req, res) => {
  const html = fs.readFileSync(path.join(__dirname, "../../docs/swagger.html"), "utf8");
  res.set("Content-Type", "text/html; charset=utf-8").send(html);
});
router.get("/docs/spec", (req, res) => {
  const spec = fs.readFileSync(path.join(__dirname, "../../docs/openapi.json"), "utf8");
  res.set("Content-Type", "application/json").send(spec);
});

// Permissions
router.get("/permissions", async (req, res) => {
  const email = req.query.email || "";
  const user = await findUserByEmail(email);
  if (!user) {
    sendJson(res, 404, { error: "User not found." });
    return;
  }
  const permissions = await getPermissionsForRole(user.role);
  sendJson(res, 200, { email: user.email, role: user.role, permissions });
});

// Home
router.get("/home", getHome);

// Auth
router.post("/auth/login", login);
router.post("/auth/signup", signup);
router.post("/auth/logout", logout);
router.post("/auth/refresh", refresh);
router.post("/auth/forgot-password", forgotPasswordHandler);
router.post("/auth/reset-password", resetPasswordHandler);

// Chat
router.post("/chat", sendMessage);

// Payments
router.get("/payments/subscription", getSubscription);
router.post("/payments/basic-plan", activateBasicPlan);
router.post("/payments/demo-plan", activateDemoPlan);
router.post("/payments/create-checkout-session", createStripeCheckoutSession);
router.post("/payments/confirm-checkout-session", confirmStripeCheckoutSession);

// Detect Sign
router.get("/detect-sign", getDetectionHistory);
router.post("/detect-sign", createDetectSignRequest);
router.get("/detect-sign/feedbacks", getMyFeedbacks);
router.post("/detect-sign/:id/feedback", postFeedback);
router.get("/detect-sign/:id/feedback", getFeedback);

// Admin
router.get("/admin/model-monitoring", getModelMonitoring);
router.get("/admin/audit-logs", getAdminAuditLogs);
router.get("/admin/dashboard", getAdminDashboardSummary);
router.get("/admin/detections", getAdminDetections);
router.get("/admin/reports/export", exportAdminReports);
router.get("/admin/reports/:id/pdf", downloadAdminReport);
router.get("/admin/reports", getAdminReports);
router.get("/admin/users", getAdminUsers);
router.post("/admin/users", createAdminUser);
router.put("/admin/users/:id", updateAdminUser);
router.delete("/admin/users/:id", deleteAdminUser);
router.get("/admin/settings", getAdminSettings);
router.put("/admin/settings", updateAdminSettings);
router.get("/admin/feedbacks", getAdminFeedbacks);
router.get("/admin/export", exportAdminDataset);
router.post("/admin/import", importAdminData);

// Manager
router.get("/manager/dashboard-analytics", getDashboardAnalytics);
router.get("/manager/export-data", getManagerExportData);

// Users
router.get("/users/:email/profile", getUserProfile);
router.put("/users/:email/profile", updateUserProfile);
router.get("/users/:email/subscription", getUserSubscription);
router.delete("/users/:email/subscription", cancelUserSubscription);
router.get("/users/:email/dashboard", getDashboard);
router.get("/users/:email/detections", getDetections);
router.post("/users/:email/detections", createDetection);
router.get("/users/:email/reports/:id/pdf", downloadReport);
router.get("/users/:email/reports", getReports);
router.get("/users/:email/notifications", getNotifications);
router.post("/users/:email/notifications/read", markAsRead);
router.post("/users/:email/notifications/read-all", markAllAsRead);
router.delete("/users/:email/notifications/one", deleteOne);
router.delete("/users/:email/notifications/read", deleteRead);
router.delete("/users/:email/notifications/all", deleteAll);

module.exports = { router };
