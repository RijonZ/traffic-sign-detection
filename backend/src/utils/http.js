function sendJson(res, statusCode, data) {
  res.status(statusCode).json(data);
}

function sendPdf(res, fileName, content) {
  const body = Buffer.isBuffer(content) ? content : Buffer.from(content);
  res.set({
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Content-Length": body.length,
    "Content-Type": "application/pdf",
  }).send(body);
}

function sendCsv(res, fileName, content) {
  const body = Buffer.from(content);
  res.set({
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Content-Length": body.length,
    "Content-Type": "text/csv",
  }).send(body);
}

function sendFile(res, fileName, content, contentType) {
  const body = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  res.set({
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Content-Length": body.length,
    "Content-Type": contentType,
  }).send(body);
}

module.exports = { sendJson, sendCsv, sendPdf, sendFile };
