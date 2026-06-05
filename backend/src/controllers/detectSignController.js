const { detectSign, getUserDetections } = require("../services/detectionService");
const { findUserByEmail } = require("../services/userService");
const { sendJson } = require("../utils/http");

function sendUserNotFound(res) {
  sendJson(res, 404, { message: "User not found." });
}

async function getDetectionHistory(req, res) {
  const userEmail = req.query.userEmail || "";

  if (!(await findUserByEmail(userEmail))) {
    sendUserNotFound(res);
    return;
  }

  sendJson(res, 200, {
    detections: await getUserDetections(userEmail),
  });
}

async function createDetectSignRequest(req, res) {
  try {
    const { userEmail, fileName, fileType, fileSize } = req.body;

    if (!(await findUserByEmail(userEmail || ""))) {
      sendUserNotFound(res);
      return;
    }

    const result = await detectSign(userEmail, { fileName, fileType, fileSize });
    sendJson(res, result.ok ? 201 : 422, result);
  } catch {
    sendJson(res, 400, { message: "Invalid request body." });
  }
}

module.exports = { createDetectSignRequest, getDetectionHistory };
