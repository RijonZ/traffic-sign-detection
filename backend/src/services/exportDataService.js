const { getAllDetections } = require("./detectionService");
const { getAllUsers } = require("./userService");
const { getAllReports } = require("./reportService");
const { getAuditLogs } = require("./auditLogService");
const { getAllFeedbacks } = require("./feedbackService");

const DATASETS = {
  detections: {
    label: "Detections",
    columns: ["ID", "File Name", "Requested By", "Sign", "Category", "Confidence (%)", "Status", "Detected At"],
    keys: ["id", "fileName", "requestedBy", "sign", "category", "confidence", "status", "detectedAt"],
    roles: ["Administrator", "Manager"],
  },
  users: {
    label: "Users",
    columns: ["ID", "Name", "Email", "Role", "Status"],
    keys: ["id", "name", "email", "role", "status"],
    roles: ["Administrator"],
  },
  reports: {
    label: "Reports",
    columns: ["Report ID", "Detection ID", "File Name", "Requested By", "Sign", "Category", "Confidence (%)", "Status", "Created At"],
    keys: ["id", "detectionId", "fileName", "requestedBy", "sign", "category", "confidence", "status", "createdAt"],
    roles: ["Administrator", "Manager"],
  },
  "audit-logs": {
    label: "Audit Logs",
    columns: ["ID", "Action", "Module", "User", "Status", "Time"],
    keys: ["id", "action", "module", "user", "status", "time"],
    roles: ["Administrator"],
  },
  feedbacks: {
    label: "Feedbacks",
    columns: ["ID", "Request ID", "User Email", "User Name", "Sign", "Rating", "Comment", "Created At"],
    keys: ["id", "requestId", "userEmail", "userName", "sign", "rating", "comment", "createdAt"],
    roles: ["Administrator", "Manager"],
  },
};

async function getDataRows(dataset) {
  switch (dataset) {
    case "detections": {
      const { detections } = await getAllDetections();
      return detections;
    }
    case "users":
      return getAllUsers();
    case "reports": {
      const { reports } = await getAllReports();
      return reports;
    }
    case "audit-logs": {
      const { logs } = await getAuditLogs();
      return logs;
    }
    case "feedbacks":
      return getAllFeedbacks();
    default:
      return [];
  }
}

function escapeXml(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toExcel(columns, keys, rows) {
  const headerCells = columns
    .map((c) => `<Cell><Data ss:Type="String">${escapeXml(c)}</Data></Cell>`)
    .join("");

  const dataRows = rows
    .map((row) => {
      const cells = keys.map((k) => {
        const val = row[k] ?? "";
        const type = typeof val === "number" ? "Number" : "String";
        return `<Cell><Data ss:Type="${type}">${escapeXml(val)}</Data></Cell>`;
      });
      return `<Row>${cells.join("")}</Row>`;
    })
    .join("\n      ");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
    '  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    '  <Worksheet ss:Name="Export">',
    "    <Table>",
    `      <Row>${headerCells}</Row>`,
    `      ${dataRows}`,
    "    </Table>",
    "  </Worksheet>",
    "</Workbook>",
  ].join("\n");
}

function toCsvContent(columns, keys, rows) {
  const header = columns.map((c) => `"${c}"`).join(",");
  const lines = rows.map((row) =>
    keys.map((k) => `"${String(row[k] ?? "").replaceAll('"', '""')}"`).join(",")
  );
  return [header, ...lines].join("\n");
}

async function buildExport(dataset, format) {
  const meta = DATASETS[dataset];
  if (!meta) throw new Error(`Unknown dataset: ${dataset}`);

  const rows = await getDataRows(dataset);

  if (format === "json") {
    return {
      content: JSON.stringify(rows, null, 2),
      contentType: "application/json",
      fileName: `${dataset}-export.json`,
    };
  }

  if (format === "excel") {
    return {
      content: toExcel(meta.columns, meta.keys, rows),
      contentType: "application/vnd.ms-excel",
      fileName: `${dataset}-export.xls`,
    };
  }

  return {
    content: toCsvContent(meta.columns, meta.keys, rows),
    contentType: "text/csv",
    fileName: `${dataset}-export.csv`,
  };
}

// Kept for backward compatibility with managerController
async function getExportData() {
  const { detections } = await getAllDetections();
  const completed = detections.filter((d) => d.status === "Completed").length;
  const rejected = detections.filter((d) => d.status === "Rejected").length;
  return {
    records: detections.map((d) => ({
      id: d.id,
      fileName: d.fileName,
      requestedBy: d.requestedBy,
      sign: d.sign,
      category: d.category,
      confidence: d.confidence,
      status: d.status,
      detectedAt: d.detectedAt,
    })),
    summary: { totalRecords: detections.length, completed, rejected },
  };
}

module.exports = { getExportData, buildExport, DATASETS };
