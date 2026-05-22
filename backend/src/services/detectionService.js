const { detections } = require("../data/store");

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

function getUserDetections(email) {
  return detections.filter((item) => item.userEmail.toLowerCase() === email.toLowerCase());
}

function addDetection(email, data) {
  const detection = {
    id: `REQ-${Date.now()}`,
    userEmail: email,
    fileName: data.fileName,
    sign: data.sign || "Pending",
    category: data.category || "Unknown",
    confidence: Number(data.confidence || 0),
    status: data.status || "Completed",
    box: data.box || "",
    fileSize: Number(data.fileSize || 0),
    fileType: data.fileType || "",
    detectedAt: new Date().toLocaleString(),
  };

  detections.unshift(detection);
  return detection;
}

function detectSign(email, file) {
  const validationMessage = validateImage(file);

  if (validationMessage) {
    const rejectedDetection = addDetection(email, {
      fileName: file?.fileName || "unknown-file",
      fileSize: file?.fileSize || 0,
      fileType: file?.fileType || "",
      sign: "Not detected",
      category: "Unknown",
      confidence: 0,
      status: "Rejected",
      box: "",
    });

    return {
      ok: false,
      message: validationMessage,
      workflow: ["Created", "Uploaded", "Validating", "Rejected"],
      detection: rejectedDetection,
      notification: "Image validation failed.",
    };
  }

  const prediction = predictTrafficSign(file.fileName);
  const detection = addDetection(email, {
    ...file,
    ...prediction,
    status: "Completed",
  });

  return {
    ok: true,
    workflow,
    detection,
    notification: "Detection completed and saved.",
  };
}

function getLatestDetection(email) {
  return getUserDetections(email)[0] || null;
}

function getDashboardSummary(email) {
  const userDetections = getUserDetections(email);
  const completed = userDetections.filter((item) => item.status === "Completed").length;
  const rejected = userDetections.filter((item) => item.status === "Rejected").length;
  const latest = getLatestDetection(email);

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
