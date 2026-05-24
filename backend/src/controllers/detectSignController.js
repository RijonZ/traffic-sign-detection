const { detectSign, getUserDetections } = require("../services/detectionService");
const { findUserByEmail } = require("../services/userService");
const { readBody, sendJson } = require("../utils/http");

function getEmailFromQuery(request) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  return url.searchParams.get("userEmail") || "";
}

function sendUserNotFound(response) {
  sendJson(response, 404, { message: "User not found." });
}

async function getDetectionHistory(request, response) {
  const userEmail = getEmailFromQuery(request);

  if (!(await findUserByEmail(userEmail))) {
    sendUserNotFound(response);
    return;
  }

  sendJson(response, 200, {
    detections: await getUserDetections(userEmail),
  });
}

async function createDetectSignRequest(request, response) {
  try {
    const body = await readBody(request);
    const userEmail = body.userEmail || "";

    if (!(await findUserByEmail(userEmail))) {
      sendUserNotFound(response);
      return;
    }

    const result = await detectSign(userEmail, {
      fileName: body.fileName,
      fileType: body.fileType,
      fileSize: body.fileSize,
    });

    sendJson(response, result.ok ? 201 : 422, result);
  } catch (error) {
    sendJson(response, 400, { message: "Invalid request body." });
  }
}

module.exports = { createDetectSignRequest, getDetectionHistory };
