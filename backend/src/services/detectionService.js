const { detections } = require("../data/store");

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
    detectedAt: new Date().toLocaleString(),
  };

  detections.unshift(detection);
  return detection;
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

module.exports = { addDetection, getDashboardSummary, getUserDetections };
