const { query } = require("../db/client");
const { findUserByEmail } = require("./userService");

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const samplePredictions = [
  { sign: "Stop Sign", category: "Regulatory", confidence: 96, box: "x: 124, y: 88, w: 210, h: 210" },
  { sign: "Speed Limit", category: "Regulatory", confidence: 92, box: "x: 98, y: 74, w: 180, h: 180" },
  { sign: "Pedestrian Crossing", category: "Warning", confidence: 89, box: "x: 140, y: 102, w: 195, h: 170" },
  { sign: "No Entry", category: "Prohibition", confidence: 94, box: "x: 110, y: 90, w: 205, h: 205" },
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

function predictTrafficSign(fileName) {
  return samplePredictions[String(fileName).length % samplePredictions.length];
}

function formatDetection(row) {
  return {
    id: String(row.request_id),
    userEmail: row.user_email,
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

async function getTrafficSignId(sign, category) {
  const result = await query(
    `
      INSERT INTO traffic_signs (sign_name, category)
      VALUES ($1, $2)
      ON CONFLICT (sign_name) DO UPDATE SET category = excluded.category
      RETURNING id
    `,
    [sign, category || "Unknown"]
  );

  return result.rows[0].id;
}

async function getUserDetections(email) {
  const result = await query(
    `
      SELECT
        dr.id AS request_id,
        dr.status,
        dr.requested_at,
        dr.completed_at,
        u.email AS user_email,
        f.filename,
        f.file_size,
        f.entity AS file_type,
        ts.sign_name,
        ts.category,
        res.confidence,
        res.bounding_box,
        res.detected_at
      FROM detection_requests dr
      JOIN users u ON u.id = dr.user_id
      LEFT JOIN files f ON f.id = dr.file_id
      LEFT JOIN detection_results res ON res.request_id = dr.id
      LEFT JOIN traffic_signs ts ON ts.id = res.traffic_sign_id
      WHERE lower(u.email) = lower($1)
      ORDER BY dr.requested_at DESC
    `,
    [email]
  );

  return result.rows.map(formatDetection);
}

async function addDetection(email, data) {
  const user = await findUserByEmail(email);

  if (!user) {
    return null;
  }

  const status = normalizeStatus(data.status || "Completed");
  const fileResult = await query(
    `
      INSERT INTO files (entity, filename, file_path, file_size, uploaded_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
    [
      data.fileType || "image/unknown",
      data.fileName || "unknown-file",
      data.fileName || "unknown-file",
      Number(data.fileSize || 0),
      user.id,
    ]
  );
  const fileId = fileResult.rows[0].id;

  const requestResult = await query(
    `
      INSERT INTO detection_requests (user_id, file_id, status, completed_at)
      VALUES ($1, $2, $3, now())
      RETURNING id
    `,
    [user.id, fileId, status]
  );
  const requestId = requestResult.rows[0].id;
  const trafficSignId = await getTrafficSignId(data.sign || "Not detected", data.category || "Unknown");

  await query(
    `
      INSERT INTO detection_results (request_id, traffic_sign_id, confidence, bounding_box)
      VALUES ($1, $2, $3, $4)
    `,
    [requestId, trafficSignId, Number(data.confidence || 0), data.box || ""]
  );

  const [detection] = await getUserDetections(email);
  return detection;
}

async function detectSign(email, file) {
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

  const prediction = predictTrafficSign(file.fileName);
  const detection = await addDetection(email, {
    ...file,
    ...prediction,
    status: "Completed",
  });
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
  getDashboardSummary,
  getUserDetections,
};
