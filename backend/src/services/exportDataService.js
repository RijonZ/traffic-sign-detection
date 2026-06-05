const ExcelJS = require("exceljs");
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

async function toExcel(columns, keys, rows) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Traffic Sign AI";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Export");

  sheet.columns = columns.map((col, i) => ({
    header: col,
    key: keys[i],
    width: Math.max(col.length + 4, 16),
  }));

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF1D4ED8" } },
    };
  });
  headerRow.height = 22;

  rows.forEach((row) => {
    const values = {};
    keys.forEach((k) => { values[k] = row[k] ?? ""; });
    sheet.addRow(values);
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle" };
    });
    row.height = 18;
  });

  return workbook.xlsx.writeBuffer();
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
      content: await toExcel(meta.columns, meta.keys, rows),
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fileName: `${dataset}-export.xlsx`,
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
