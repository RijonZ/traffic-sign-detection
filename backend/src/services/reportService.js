const PDFDocument = require("pdfkit");
const { getUserDetections } = require("./detectionService");
const { query } = require("../db/client");
const homeRepo = require("../repositories/homeRepository");
const userRepo = require("../repositories/userRepository");

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

function buildReportPdf(report, allReports = [], ownerName = null) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    const W = 595;
    const H = 842;
    const margin = 44;
    const contentW = W - margin * 2;

    const BLUE       = "#2563EB";
    const BLUE_DARK  = "#1D4ED8";
    const BLUE_LIGHT = "#EFF6FF";
    const BLUE_MID   = "#BFDBFE";
    const BLUE_PALE  = "#DBEAFE";
    const DARK       = "#0F172A";
    const BODY       = "#1E293B";
    const MUTED      = "#64748B";
    const BORDER     = "#E2E8F0";
    const GREEN      = "#16A34A";
    const GREEN_BG   = "#DCFCE7";
    const GREEN_DARK = "#14532D";
    const RED        = "#DC2626";
    const RED_BG     = "#FEE2E2";
    const RED_DARK   = "#7F1D1D";
    const AMBER      = "#D97706";
    const AMBER_BG   = "#FEF3C7";
    const AMBER_DARK = "#78350F";
    const WHITE      = "#FFFFFF";
    const GRAY_BG    = "#F8FAFC";

    const dateStr = new Date().toLocaleDateString("en-GB", {
      day: "2-digit", month: "long", year: "numeric",
    });

    // ── Header band ──────────────────────────────────────────
    doc.rect(0, 0, W, 130).fill(BLUE);
    doc.rect(0, 106, W, 24).fill(BLUE_DARK);

    // Accent circle decoration
    doc.circle(W - 60, 10, 90).fill(BLUE_DARK).opacity(0.4);
    doc.opacity(1);
    doc.circle(W - 20, 70, 50).fill("#1E40AF").opacity(0.3);
    doc.opacity(1);

    // Brand name
    doc.font("Helvetica-Bold").fontSize(22).fillColor(WHITE)
      .text("Traffic Sign AI", margin, 26);

    // Subtitle
    doc.font("Helvetica").fontSize(11).fillColor(BLUE_MID)
      .text("Detection Analysis Report", margin, 54);

    // Generated date
    doc.font("Helvetica").fontSize(8.5).fillColor("#93C5FD")
      .text(`Generated  ${dateStr}`, margin, 74);

    // Report ID badge on right side
    const badgeText = report.id;
    const badgeX = W - margin - 158;
    doc.rect(badgeX, 28, 158, 28).fill("#1E40AF");
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(WHITE)
      .text(badgeText, badgeX, 39, { width: 158, align: "center", lineBreak: false });

    // Sub-band label
    doc.font("Helvetica").fontSize(8).fillColor(BLUE_PALE)
      .text("CONFIDENTIAL  ·  INTERNAL USE ONLY", margin, 113, { characterSpacing: 0.8 });

    // ── Body ─────────────────────────────────────────────────
    let y = 150;

    function sectionLabel(title) {
      doc.rect(margin, y, 3, 14).fill(BLUE);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(BLUE)
        .text(title.toUpperCase(), margin + 10, y + 1, { characterSpacing: 0.6 });
      y += 20;
      doc.rect(margin, y, contentW, 0.5).fill(BORDER);
      y += 10;
    }

    function infoRow(label, value, valueColor) {
      doc.font("Helvetica").fontSize(9).fillColor(MUTED)
        .text(label, margin + 8, y, { width: 130 });
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(valueColor || BODY)
        .text(String(value ?? "—"), margin + 145, y, { width: contentW - 150 });
      y += 22;
    }

    function gap(n = 14) { y += n; }

    // ── Info card ────────────────────────────────────────────
    doc.rect(margin, y, contentW, 148).fill(GRAY_BG);
    doc.rect(margin, y, contentW, 148).stroke(BORDER).lineWidth(0.5);
    y += 14;

    sectionLabel("Report Details");

    infoRow("Report ID",     report.id);
    infoRow("Requested by",  report.requestedBy || report.userEmail || "—");
    infoRow("Image file",    report.fileName    || "—");
    infoRow("Date created",  report.createdAt
      ? new Date(report.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
      : "—");

    gap(20);

    // ── Detection result card ─────────────────────────────────
    doc.rect(margin, y, contentW, 185).fill(GRAY_BG);
    doc.rect(margin, y, contentW, 185).stroke(BORDER).lineWidth(0.5);
    y += 14;

    sectionLabel("Detection Result");

    infoRow("Detected sign", report.sign     || "—");
    infoRow("Category",      report.category || "—");

    // Status badge
    const status    = String(report.status || "Unknown");
    const isOk      = status === "Completed";
    const isRej     = status === "Rejected";
    const pillColor = isOk ? GREEN      : isRej ? RED      : AMBER;
    const pillBg    = isOk ? GREEN_BG   : isRej ? RED_BG   : AMBER_BG;
    const pillText  = isOk ? GREEN_DARK : isRej ? RED_DARK : AMBER_DARK;
    const pillW     = 72;
    const pillH     = 17;
    const pillX     = margin + 145;

    doc.font("Helvetica").fontSize(9).fillColor(MUTED)
      .text("Status", margin + 8, y, { width: 130 });
    doc.rect(pillX, y - 2, pillW, pillH).fill(pillBg);
    doc.rect(pillX, y - 2, pillW, pillH).stroke(pillColor).lineWidth(0.4);
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(pillText)
      .text(status, pillX, y + 2, { width: pillW, align: "center" });
    y += 24;

    gap(8);

    // Confidence bar
    const confidence = Number(report.confidence || 0);
    const barColor   = confidence >= 80 ? GREEN : confidence >= 50 ? AMBER : RED;
    const barH       = 18;
    const barW       = 310;
    const fillW      = Math.max(0, Math.round((confidence / 100) * barW));

    doc.font("Helvetica").fontSize(9).fillColor(MUTED)
      .text("Confidence score", margin + 8, y + 4, { width: 130 });

    doc.rect(margin + 145, y, barW, barH).fill(BORDER);
    if (fillW > 0) {
      doc.rect(margin + 145, y, fillW, barH).fill(barColor);
    }
    doc.font("Helvetica-Bold").fontSize(9).fillColor(barColor)
      .text(`${confidence}%`, margin + 145 + barW + 6, y + 4, { lineBreak: false });

    y += barH + 26;

    // ── Statistics cards ─────────────────────────────────────
    if (allReports.length > 0) {
      sectionLabel(ownerName ? `${ownerName}'s Statistics` : "Your Account Statistics");

      const total     = allReports.length;
      const completed = allReports.filter((r) => r.status === "Completed").length;
      const rejected  = allReports.filter((r) => r.status === "Rejected").length;
      const avgConf   = total
        ? Math.round(allReports.reduce((s, r) => s + Number(r.confidence || 0), 0) / total)
        : 0;

      const cards = [
        { label: "Total Reports",   value: String(total),     color: BLUE,  bg: BLUE_LIGHT,  border: BLUE_MID  },
        { label: "Completed",       value: String(completed), color: GREEN, bg: GREEN_BG,    border: GREEN      },
        { label: "Rejected",        value: String(rejected),  color: RED,   bg: RED_BG,      border: RED        },
        { label: "Avg. Confidence", value: `${avgConf}%`,     color: AMBER, bg: AMBER_BG,    border: AMBER      },
      ];

      const gap4  = 8;
      const cardW = Math.floor((contentW - gap4 * 3) / 4);
      const cardH = 64;

      cards.forEach((card, i) => {
        const cx = margin + i * (cardW + gap4);
        doc.rect(cx, y, cardW, cardH).fill(card.bg);
        doc.rect(cx, y, cardW, cardH).stroke(card.border).lineWidth(0.5);
        doc.rect(cx, y, cardW, 3).fill(card.color);

        doc.font("Helvetica-Bold").fontSize(22).fillColor(card.color)
          .text(card.value, cx, y + 14, { width: cardW, align: "center" });
        doc.font("Helvetica").fontSize(7.5).fillColor(MUTED)
          .text(card.label, cx, y + 44, { width: cardW, align: "center" });
      });

      y += cardH + 24;
    }

    // ── Recent detections table ───────────────────────────────
    if (allReports.length > 1) {
      const recent = allReports.slice(0, 3);
      sectionLabel("Recent Detections");

      const cols = [
        { label: "Report ID",  w: 130 },
        { label: "Sign",       w: 130 },
        { label: "Confidence", w: 75  },
        { label: "Status",     w: 75  },
        { label: "Date",       w: contentW - 410 },
      ];

      function trunc(str, max) {
        const s = String(str ?? "—");
        return s.length > max ? s.slice(0, max - 1) + "…" : s;
      }

      // thead
      doc.rect(margin, y, contentW, 20).fill(BLUE);
      let tx = margin + 8;
      cols.forEach((col) => {
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(WHITE)
          .text(col.label, tx, y + 5, { width: col.w - 8, lineBreak: false });
        tx += col.w;
      });
      y += 20;

      // tbody
      recent.forEach((r, idx) => {
        const rowBg = idx % 2 === 0 ? WHITE : BLUE_LIGHT;
        doc.rect(margin, y, contentW, 20).fill(rowBg);
        doc.rect(margin, y, contentW, 20).stroke(BORDER).lineWidth(0.3);
        tx = margin + 8;

        const sColor = r.status === "Completed" ? GREEN : r.status === "Rejected" ? RED : AMBER;
        const cells  = [
          { text: trunc(r.id, 19),          color: BODY  },
          { text: trunc(r.sign, 20),        color: BODY  },
          { text: `${r.confidence || 0}%`,  color: BODY  },
          { text: r.status || "—",          color: sColor },
          { text: r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : "—", color: MUTED },
        ];

        cells.forEach((cell, ci) => {
          doc.font(ci === 3 ? "Helvetica-Bold" : "Helvetica").fontSize(8.5)
            .fillColor(cell.color)
            .text(cell.text, tx, y + 5, { width: cols[ci].w - 8, lineBreak: false });
          tx += cols[ci].w;
        });
        y += 20;
      });

      y += 10;
    }

    // ── Footer ───────────────────────────────────────────────
    const footerY = H - 36;
    doc.rect(0, footerY, W, 36).fill(DARK);
    doc.rect(0, footerY, W, 2).fill(BLUE);

    doc.font("Helvetica").fontSize(7.5).fillColor("#94A3B8")
      .text("Traffic Sign AI  ·  Automated traffic sign detection platform", margin, footerY + 10);
    doc.font("Helvetica").fontSize(7.5).fillColor("#94A3B8")
      .text(`${report.id}  ·  ${dateStr}`, margin, footerY + 22);

    doc.font("Helvetica-Bold").fontSize(8).fillColor(WHITE)
      .text("Page 1 of 1", 0, footerY + 14, { align: "right", width: W - margin });

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

  const userEmail = report.userEmail || report.requestedBy;
  const userReports = userEmail ? await getUserReports(userEmail) : [];

  let ownerName = null;
  if (userEmail) {
    const userRecord = await userRepo.findByEmail(userEmail);
    if (userRecord) {
      ownerName = `${userRecord.first_name} ${userRecord.last_name}`.trim();
    }
  }

  return {
    fileName: `${report.id.toLowerCase()}-traffic-sign-report.pdf`,
    pdf: await buildReportPdf(report, userReports, ownerName),
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
