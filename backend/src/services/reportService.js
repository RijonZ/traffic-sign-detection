const PDFDocument = require("pdfkit");
const { getUserDetections } = require("./detectionService");
const { query } = require("../db/client");
const homeRepo = require("../repositories/homeRepository");

function formatReport(item) {
  return {
    id: `REP-${item.id}`,
    detectionId: item.id,
    fileName: item.fileName,
    requestedBy: item.requestedBy || item.userEmail,
    userEmail: item.userEmail,
    sign: item.sign,
    category: item.category,
    confidence: item.confidence,
    status: item.status,
    createdAt: item.detectedAt,
  };
}

function buildReportPdf(report, allReports = []) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    const W = 595;
    const margin = 40;
    const contentW = W - margin * 2;

    const BLUE = "#2563EB";
    const BLUE_LIGHT = "#EFF6FF";
    const BLUE_MID = "#BFDBFE";
    const DARK = "#1E293B";
    const MUTED = "#64748B";
    const GREEN = "#16A34A";
    const GREEN_BG = "#DCFCE7";
    const RED = "#DC2626";
    const RED_BG = "#FEE2E2";
    const YELLOW = "#D97706";
    const YELLOW_BG = "#FEF3C7";
    const GRAY = "#E2E8F0";
    const WHITE = "#FFFFFF";

    // ── Header ───────────────────────────────────────────────
    doc.rect(0, 0, W, 115).fill(BLUE);

    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(24)
      .text("Traffic Sign AI", margin, 22, { continued: false });

    doc.font("Helvetica").fontSize(12).fillColor("#BFDBFE")
      .text("Detection Report", margin, 52);

    doc.fontSize(9).fillColor("#93C5FD")
      .text(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`, margin, 72);

    doc.font("Helvetica-Bold").fontSize(11).fillColor(WHITE)
      .text(report.id, 0, 22, { align: "right", width: W - margin });

    // ── Section helper ───────────────────────────────────────
    let y = 135;

    function sectionTitle(title) {
      doc.font("Helvetica-Bold").fontSize(10).fillColor(BLUE)
        .text(title.toUpperCase(), margin, y);
      y += 14;
      doc.rect(margin, y, contentW, 1).fill(BLUE_MID);
      y += 10;
    }

    function row(label, value, valueColor) {
      doc.font("Helvetica-Bold").fontSize(10).fillColor(MUTED)
        .text(label, margin, y, { width: 140, continued: false });
      doc.font("Helvetica").fontSize(10).fillColor(valueColor || DARK)
        .text(String(value ?? "—"), margin + 145, y, { width: contentW - 145 });
      y += 20;
    }

    function gap(n = 16) { y += n; }

    // ── Report Information ───────────────────────────────────
    doc.rect(margin, y - 6, contentW, 130).fill(BLUE_LIGHT).stroke(BLUE_LIGHT);
    y += 4;
    sectionTitle("Report Information");

    row("Report ID", report.id);
    row("Requested by", report.requestedBy || report.userEmail);
    row("Image file", report.fileName);
    row("Date", report.createdAt
      ? new Date(report.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
      : "—");

    gap(26);

    // ── Detection Result ─────────────────────────────────────
    sectionTitle("Detection Result");

    row("Detected sign", report.sign);
    row("Category", report.category);

    // Status pill
    doc.font("Helvetica-Bold").fontSize(10).fillColor(MUTED)
      .text("Status", margin, y, { width: 140 });

    const status = String(report.status || "");
    const pillColor = status === "Completed" ? GREEN : status === "Rejected" ? RED : YELLOW;
    const pillBg   = status === "Completed" ? GREEN_BG : status === "Rejected" ? RED_BG : YELLOW_BG;
    const pillW = 80;
    const pillH = 16;
    const pillX = margin + 145;
    doc.rect(pillX, y - 1, pillW, pillH).fill(pillBg);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(pillColor)
      .text(status || "Unknown", pillX, y + 2, { width: pillW, align: "center" });
    y += 22;

    gap(10);

    // Confidence bar
    const confidence = Number(report.confidence || 0);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(MUTED)
      .text("Confidence", margin, y);
    y += 16;

    const barH = 14;
    const barW = contentW;
    doc.rect(margin, y, barW, barH).fill(GRAY);
    const fillW = Math.round((confidence / 100) * barW);
    const barColor = confidence >= 80 ? GREEN : confidence >= 50 ? YELLOW : RED;
    if (fillW > 0) {
      doc.rect(margin, y, fillW, barH).fill(barColor);
    }
    doc.font("Helvetica-Bold").fontSize(9).fillColor(DARK)
      .text(`${confidence}%`, margin + barW + 6, y + 2);
    y += barH + 20;

    gap(6);

    // ── User Statistics ──────────────────────────────────────
    if (allReports.length > 0) {
      sectionTitle("Your Detection Statistics");

      const total = allReports.length;
      const completed = allReports.filter((r) => r.status === "Completed").length;
      const rejected = allReports.filter((r) => r.status === "Rejected").length;
      const avgConf = total
        ? Math.round(allReports.reduce((s, r) => s + Number(r.confidence || 0), 0) / total)
        : 0;

      const cards = [
        { label: "Total Reports", value: String(total), color: BLUE, bg: BLUE_LIGHT },
        { label: "Completed", value: String(completed), color: GREEN, bg: GREEN_BG },
        { label: "Rejected", value: String(rejected), color: RED, bg: RED_BG },
        { label: "Avg. Confidence", value: `${avgConf}%`, color: YELLOW, bg: YELLOW_BG },
      ];

      const cardW = Math.floor((contentW - 12) / 4);
      const cardH = 56;
      cards.forEach((card, i) => {
        const cx = margin + i * (cardW + 4);
        doc.rect(cx, y, cardW, cardH).fill(card.bg);
        doc.font("Helvetica-Bold").fontSize(18).fillColor(card.color)
          .text(card.value, cx, y + 10, { width: cardW, align: "center" });
        doc.font("Helvetica").fontSize(8).fillColor(MUTED)
          .text(card.label, cx, y + 34, { width: cardW, align: "center" });
      });

      y += cardH + 24;
    }

    // ── Recent detections mini-table ─────────────────────────
    if (allReports.length > 1) {
      const recent = allReports.slice(0, 5);
      sectionTitle("Recent Detections");

      const cols = [
        { label: "Report ID", w: 115 },
        { label: "Sign", w: 150 },
        { label: "Confidence", w: 75 },
        { label: "Status", w: 75 },
        { label: "Date", w: contentW - 415 },
      ];

      function truncate(str, max) {
        const s = String(str ?? "—");
        return s.length > max ? s.slice(0, max - 1) + "…" : s;
      }

      // Table header
      doc.rect(margin, y, contentW, 18).fill(BLUE);
      let tx = margin + 6;
      cols.forEach((col) => {
        doc.font("Helvetica-Bold").fontSize(9).fillColor(WHITE)
          .text(col.label, tx, y + 4, { width: col.w - 6, lineBreak: false });
        tx += col.w;
      });
      y += 18;

      recent.forEach((r, idx) => {
        const rowBg = idx % 2 === 0 ? WHITE : BLUE_LIGHT;
        doc.rect(margin, y, contentW, 18).fill(rowBg);
        tx = margin + 6;
        const cells = [
          truncate(r.id, 16),
          truncate(r.sign, 22),
          `${r.confidence}%`,
          r.status,
          r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : "—",
        ];
        cells.forEach((cell, ci) => {
          doc.font("Helvetica").fontSize(9).fillColor(DARK)
            .text(String(cell ?? "—"), tx, y + 4, { width: cols[ci].w - 6, lineBreak: false });
          tx += cols[ci].w;
        });
        y += 18;
      });

      y += 12;
    }

    // ── Footer ───────────────────────────────────────────────
    const footerY = 820;
    doc.rect(0, footerY, W, 22).fill(BLUE);
    doc.font("Helvetica").fontSize(8).fillColor(WHITE)
      .text("Traffic Sign AI  —  Confidential document. For internal use only.", margin, footerY + 7, {
        width: contentW - 60,
      });
    doc.font("Helvetica-Bold").fontSize(8).fillColor(WHITE)
      .text("Page 1", 0, footerY + 7, { align: "right", width: W - margin });

    doc.end();
  });
}

async function getUserReports(email) {
  const detections = await getUserDetections(email);
  return detections.map(formatReport);
}

async function getUserReportPdf(email, reportId) {
  const reports = await getUserReports(email);
  const report = reports.find((item) => item.id === reportId);

  if (!report) {
    return null;
  }

  return {
    fileName: `${report.id.toLowerCase()}-traffic-sign-report.pdf`,
    pdf: await buildReportPdf(report, reports),
  };
}

function reportMatchesFilters(report, filters = {}) {
  const status = String(filters.status || "").trim();
  const user = String(filters.user || "").trim().toLowerCase();
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : null;
  const reportDate = report.createdAt ? new Date(report.createdAt) : null;

  if (status && status !== "All" && report.status !== status) {
    return false;
  }

  if (user) {
    const haystack = `${report.requestedBy || ""} ${report.userEmail || ""}`.toLowerCase();
    if (!haystack.includes(user)) {
      return false;
    }
  }

  if (dateFrom && reportDate && reportDate < dateFrom) {
    return false;
  }

  if (dateTo && reportDate) {
    const endOfDay = new Date(dateTo);
    endOfDay.setHours(23, 59, 59, 999);
    if (reportDate > endOfDay) {
      return false;
    }
  }

  return true;
}

async function getFilteredReports(filters = {}) {
  const { reports } = await getAllReports();
  return reports.filter((report) => reportMatchesFilters(report, filters));
}

async function saveReportMetadata(report) {
  const result = await query(
    `
      SELECT id
      FROM detection_results
      WHERE request_id = $1
      ORDER BY detected_at DESC
      LIMIT 1
    `,
    [report.detectionId]
  );
  const detectionResult = result.rows[0];

  if (!detectionResult) {
    return;
  }

  const filePath = `backend-generated/${report.id.toLowerCase()}-traffic-sign-report.pdf`;
  const existing = await query(
    "SELECT id FROM reports WHERE detection_result_id = $1 AND file_path = $2 LIMIT 1",
    [detectionResult.id, filePath]
  );

  if (existing.rows[0]) {
    return;
  }

  await query(
    `
      INSERT INTO reports (detection_result_id, report_type, file_path)
      VALUES ($1, $2, $3)
    `,
    [detectionResult.id, "pdf", filePath]
  );
}

async function getReportPdfById(reportId, filters = {}) {
  const reports = await getFilteredReports(filters);
  const report = reports.find((item) => item.id === reportId);

  if (!report) {
    return null;
  }

  await saveReportMetadata(report);

  return {
    fileName: `${report.id.toLowerCase()}-traffic-sign-report.pdf`,
    pdf: buildReportPdf(report),
  };
}

function toCsvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

async function exportReportsCsv(filters = {}) {
  const reports = await getFilteredReports(filters);
  const columns = ["id", "fileName", "requestedBy", "userEmail", "sign", "category", "confidence", "status", "createdAt"];
  const rows = reports.map((report) => columns.map((column) => toCsvValue(report[column])).join(","));

  return {
    fileName: "traffic-sign-admin-reports.csv",
    csv: [columns.join(","), ...rows].join("\n"),
  };
}

function getReportsSummary(reports) {
  const completed = reports.filter((report) => report.status === "Completed").length;
  const rejected = reports.filter((report) => report.status === "Rejected").length;
  const averageConfidence = reports.length
    ? Math.round(
        reports.reduce((total, report) => total + Number(report.confidence || 0), 0) /
          reports.length
      )
    : 0;

  return {
    totalReports: reports.length,
    completed,
    rejected,
    averageConfidence,
  };
}

async function getAllReports(filters = {}) {
  const emails = await homeRepo.findAllUserEmails();
  const reportGroups = await Promise.all(
    emails.map(async (email) => {
      const detections = await getUserDetections(email);
      return detections.map((item) => formatReport({ ...item, requestedBy: email }));
    })
  );
  const reports = reportGroups.flat();
  const filteredReports = reports.filter((report) => reportMatchesFilters(report, filters));

  return {
    reports: filteredReports,
    summary: getReportsSummary(filteredReports),
  };
}

async function getAdminReportPdf(reportId, filters = {}) {
  return getReportPdfById(reportId, filters);
}

module.exports = {
  exportReportsCsv,
  getAllReports,
  getAdminReportPdf,
  getReportPdfById,
  getUserReportPdf,
  getUserReports,
};
