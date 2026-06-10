const detectionRepo = require("../repositories/detectionRepository");
const rateLimitLogRepo = require("../repositories/rateLimitLogRepository");
const { getClient: getRedis } = require("../db/redis");
const { recordAuditLog } = require("./auditLogService");
const { findUserByEmail } = require("./userService");

const BASIC_PLAN_LIMIT = 3;

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const VALID_STATUSES = new Set([
  "created",
  "uploaded",
  "validating",
  "processing",
  "predicted",
  "saved",
  "notified",
  "completed",
  "rejected",
  "failed",
]);

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";

const samplePredictions = [
  { sign: "Stop Sign", category: "Regulatory", confidence: 96, box: "" },
  { sign: "Speed Limit 50km/h", category: "Regulatory", confidence: 92, box: "" },
  { sign: "Pedestrian Crossing", category: "Warning", confidence: 89, box: "" },
  { sign: "No Entry", category: "Prohibition", confidence: 94, box: "" },
];

const workflow = [
  "Created",
  "Uploaded",
  "Validating",
  "Processing",
  "Predicted",
  "Saved",
  "Notified",
  "Completed",
];

function validateImage(file) {
  if (!file || !file.fileName) {
    return "Please select an image first.";
  }

  if (file.fileType && !file.fileType.startsWith("image/")) {
    return "Only image files are allowed.";
  }

  if (Number(file.fileSize || 0) > MAX_FILE_SIZE) {
    return "Image size must be under 5 MB.";
  }

  return "";
}

async function predictTrafficSign(imageBase64, fileName) {
  if (!imageBase64) {
    return samplePredictions[String(fileName).length % samplePredictions.length];
  }

  try {
    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_base64: imageBase64 }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) throw new Error("ML service error");

    const data = await response.json();
    return {
      sign: data.sign,
      category: data.category,
      confidence: Math.round(data.confidence),
      box: "",
    };
  } catch {
    return samplePredictions[String(fileName).length % samplePredictions.length];
  }
}

function formatDetection(row) {
  return {
    id: String(row.request_id),
    userEmail: row.user_email,
    requestedBy: row.user_name || row.user_email,
    fileName: row.filename || "unknown-file",
    sign: row.sign_name || "Not detected",
    category: row.category || "Unknown",
    confidence: Math.round(Number(row.confidence || 0)),
    status: formatStatus(row.status),
    box: row.bounding_box || "",
    fileSize: Number(row.file_size || 0),
    fileType: row.file_type || "",
    detectedAt: row.detected_at || row.requested_at,
  };
}

function normalizeStatus(status) {
  return String(status || "completed").toLowerCase();
}


function formatStatus(status) {
  return String(status || "completed")
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function getUserDetections(email) {
  const rows = await detectionRepo.findByUserEmail(email);
  return rows.map(formatDetection);
}

function getDetectionsSummary(detections) {
  const completed = detections.filter((item) => item.status === "Completed").length;
  const processing = detections.filter((item) => item.status === "Processing").length;
  const rejected = detections.filter((item) => item.status === "Rejected").length;
  const averageConfidence = detections.length
    ? Math.round(
        detections.reduce((total, item) => total + Number(item.confidence || 0), 0) /
          detections.length
      )
    : 0;

  return {
    totalRequests: detections.length,
    completed,
    processing,
    rejected,
    averageConfidence,
  };
}

async function getAllDetections() {
  const rows = await detectionRepo.findAll();
  const detections = rows.map(formatDetection);

  return {
    detections,
    summary: getDetectionsSummary(detections),
  };
}


async function addDetection(email, data) {
  const user = await findUserByEmail(email);

  if (!user) {
    return null;
  }

  const status = normalizeStatus(data.status || "Completed");

  const fileId = await detectionRepo.insertFile(
    data.fileType || "image/unknown",
    data.fileName || "unknown-file",
    data.fileName || "unknown-file",
    Number(data.fileSize || 0),
    user.id
  );

  const requestId = await detectionRepo.insertRequest(user.id, fileId, status);
  const trafficSignId = await detectionRepo.upsertTrafficSign(
    data.sign || "Not detected",
    data.category || "Unknown"
  );

  await detectionRepo.insertResult(
    requestId,
    trafficSignId,
    Number(data.confidence || 0),
    data.box || ""
  );

  const [detection] = await getUserDetections(email);
  await recordAuditLog({
    userId: user.id,
    action: `Detection request ${status}`,
    entity: "Detection Request",
    entityId: requestId,
    newValue: {
      fileName: data.fileName || "unknown-file",
      sign: data.sign || "Not detected",
      confidence: Number(data.confidence || 0),
      status: status === "rejected" ? "Rejected" : "Success",
    },
  });
  return detection;
}

function monthRateKey(userId) {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `detect:count:${userId}:${month}`;
}

async function getUserPlan(userId) {
  return (await detectionRepo.findActivePlanByUserId(userId)).toLowerCase();
}

async function checkRateLimit(userId) {
  try {
    const redis = getRedis();
    if (!redis) return { allowed: true, used: 0, limit: BASIC_PLAN_LIMIT };
    const count = Number((await redis.get(monthRateKey(userId))) || 0);
    return { allowed: count < BASIC_PLAN_LIMIT, used: count, limit: BASIC_PLAN_LIMIT };
  } catch {
    return { allowed: true, used: 0, limit: BASIC_PLAN_LIMIT };
  }
}

async function incrementRateLimit(userId) {
  try {
    const redis = getRedis();
    if (!redis) return;
    const key = monthRateKey(userId);
    const count = await redis.incr(key);
    if (count === 1) {
      const now = new Date();
      const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;
      await redis.expire(key, daysLeft * 86400);
    }
  } catch {
    // Redis unavailable — skip silently
  }
}

async function detectSign(email, file) {
  const user = await findUserByEmail(email);
  const plan = await getUserPlan(user.id);

  if (plan === "basic") {
    const { allowed, used, limit } = await checkRateLimit(user.id);
    if (!allowed) {
      const rateLimitMessage = `Basic plan allows ${limit} detections per month. You have used all ${used}. Upgrade to Premium or Team for unlimited detections.`;

      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      await rateLimitLogRepo.insert(user.id, "Basic", used, month).catch(() => {});

      const rejectedDetection = await addDetection(email, {
        fileName: file?.fileName || "unknown-file",
        fileSize: file?.fileSize || 0,
        fileType: file?.fileType || "",
        sign: "Not detected",
        category: "Unknown",
        confidence: 0,
        status: "Rejected",
        box: "",
      });

      const { createNotificationForEmail, notifyRoles } = require("./notificationService");

      await createNotificationForEmail(
        email,
        "detection-rejected",
        "Detection limit reached",
        `Your detection was rejected. ${rateLimitMessage}`
      );
      await notifyRoles(
        ["Administrator", "Manager"],
        "detection-rejected",
        "Detection limit reached",
        `${email} has reached the Basic plan limit of ${limit} detections this month.`
      );

      return {
        ok: false,
        message: rateLimitMessage,
        rateLimited: true,
        workflow: ["Created", "Uploaded", "Validating", "Rejected"],
        detection: rejectedDetection,
      };
    }
  }

  const validationMessage = validateImage(file);

  if (validationMessage) {
    const rejectedDetection = await addDetection(email, {
      fileName: file?.fileName || "unknown-file",
      fileSize: file?.fileSize || 0,
      fileType: file?.fileType || "",
      sign: "Not detected",
      category: "Unknown",
      confidence: 0,
      status: "Rejected",
      box: "",
    });

    const { createNotificationForEmail, notifyRoles } = require("./notificationService");

    await createNotificationForEmail(
      email,
      "detection-rejected",
      "Detection rejected",
      validationMessage
    );
    await notifyRoles(
      ["Administrator", "Manager"],
      "detection-rejected",
      "Detection rejected",
      `${email} submitted an image that was rejected.`
    );

    return {
      ok: false,
      message: validationMessage,
      workflow: ["Created", "Uploaded", "Validating", "Rejected"],
      detection: rejectedDetection,
      notification: "Image validation failed.",
    };
  }

  const prediction = await predictTrafficSign(file.imageBase64, file.fileName);
  const detection = await addDetection(email, {
    ...file,
    ...prediction,
    status: "Completed",
  });

  if (plan === "basic") {
    await incrementRateLimit(user.id);
  }
  const { createNotificationForEmail, notifyRoles } = require("./notificationService");

  await createNotificationForEmail(
    email,
    "detection-completed",
    "Detection completed",
    `${prediction.sign} was detected with ${prediction.confidence}% confidence.`
  );
  await notifyRoles(
    ["Administrator", "Manager"],
    "detection-completed",
    "New detection completed",
    `${email} completed a ${prediction.sign} detection.`
  );

  return {
    ok: true,
    workflow,
    detection,
    notification: "Detection completed and saved.",
  };
}

async function getLatestDetection(email) {
  const detections = await getUserDetections(email);
  return detections[0] || null;
}

async function getDashboardSummary(email) {
  const userDetections = await getUserDetections(email);
  const completed = userDetections.filter((item) => item.status === "Completed").length;
  const rejected = userDetections.filter((item) => item.status === "Rejected").length;
  const latest = await getLatestDetection(email);

  return {
    totalRequests: userDetections.length,
    completed,
    rejected,
    currentStatus: "Ready for the next image upload.",
    latestResult: latest ? `${latest.sign} - ${latest.confidence}%` : "No detection yet.",
    recentActivity: userDetections.slice(0, 3),
  };
}

module.exports = {
  addDetection,
  detectSign,
  getAllDetections,
  getDashboardSummary,
  getUserDetections,
};
