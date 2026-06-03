function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(data));
}

function sendPdf(response, fileName, content) {
  const body = Buffer.isBuffer(content) ? content : Buffer.from(content);

  response.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Content-Length": body.length,
    "Content-Type": "application/pdf",
  });
  response.end(body);
}

function sendCsv(response, fileName, content) {
  const body = Buffer.from(content);

  response.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Content-Length": body.length,
    "Content-Type": "text/csv",
  });
  response.end(body);
}

function sendOptions(response) {
  sendJson(response, 204, {});
}

function notFound(response) {
  sendJson(response, 404, { message: "Route not found." });
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

module.exports = { sendJson, sendOptions, notFound, readBody, sendCsv, sendPdf };
