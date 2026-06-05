function esc(val) {
  return String(val ?? "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function bt(text, x, y, font, size) {
  return `BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${esc(text)}) Tj ET`;
}

function rgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

function rect(x, y, w, h, fill) {
  return `${rgb(fill)} rg ${x} ${y} ${w} ${h} re f`;
}

function line(x1, y1, x2, y2, color) {
  return `${rgb(color)} RG 0.5 w ${x1} ${y1} m ${x2} ${y2} l S 0 0 0 RG`;
}

function buildReportPdf(report) {
  const W = 595;
  const H = 842;
  const m = 44;
  const cW = W - m * 2;

  const BLUE      = "#2563EB";
  const BLUE_DARK = "#1D4ED8";
  const BLUE_PALE = "#EFF6FF";
  const DARK      = "#0F172A";
  const MUTED     = "#64748B";
  const BORDER    = "#CBD5E1";
  const GREEN     = "#16A34A";
  const GREEN_BG  = "#DCFCE7";
  const RED       = "#DC2626";
  const RED_BG    = "#FEE2E2";
  const AMBER     = "#D97706";
  const AMBER_BG  = "#FEF3C7";
  const WHITE     = "#FFFFFF";
  const GRAY_BG   = "#F8FAFC";

  const status     = String(report.status || "Completed");
  const isOk       = status === "Completed";
  const isRej      = status === "Rejected";
  const statusColor = isOk ? GREEN : isRej ? RED : AMBER;
  const statusBg    = isOk ? GREEN_BG : isRej ? RED_BG : AMBER_BG;

  const confidence = Number(report.confidence || 0);
  const barColor   = confidence >= 80 ? GREEN : confidence >= 50 ? AMBER : RED;
  const barW       = cW - 60;
  const fillW      = Math.max(2, Math.round((confidence / 100) * barW));

  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const reportDate = report.createdAt
    ? new Date(report.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    : "—";

  const ops = [
    // ── Header background ─────────────────────────────────
    rect(0, H - 130, W, 130, BLUE),
    rect(0, H - 154, W, 24, BLUE_DARK),

    // Title
    `${rgb(WHITE)} rg`,
    bt("Traffic Sign AI", m, H - 50, "F2", 20),

    // Subtitle
    `0.748 0.855 0.992 rg`,
    bt("Detection Analysis Report", m, H - 72, "F1", 11),

    // Date
    `0.576 0.761 0.988 rg`,
    bt(`Generated  ${dateStr}`, m, H - 90, "F1", 8.5),

    // Sub-band label
    `0.859 0.906 0.965 rg`,
    bt("CONFIDENTIAL  -  INTERNAL USE ONLY", m, H - 148, "F1", 7.5),

    // Report ID badge
    rect(W - m - 116, H - 64, 116, 26, BLUE_DARK),
    `${rgb(WHITE)} rg`,
    bt(esc(report.id || "—"), W - m - 110, H - 54, "F2", 8.5),

    // ── Report Details card ────────────────────────────────
    rect(m, H - 310, cW, 140, GRAY_BG),
    line(m, H - 310, m + cW, H - 310, BORDER),
    line(m, H - 170, m + cW, H - 170, BORDER),
    line(m, H - 310, m, H - 170, BORDER),
    line(m + cW, H - 310, m + cW, H - 170, BORDER),

    // Section accent bar
    rect(m, H - 193, 3, 14, BLUE),
    `${rgb(BLUE)} rg`,
    bt("REPORT DETAILS", m + 10, H - 191, "F2", 8.5),
    line(m, H - 198, m + cW, H - 198, BORDER),

    `${rgb(MUTED)} rg`,
    bt("Report ID",    m + 8,   H - 218, "F1", 9),
    bt("Requested by", m + 8,   H - 238, "F1", 9),
    bt("Image file",   m + 8,   H - 258, "F1", 9),
    bt("Date created", m + 8,   H - 278, "F1", 9),

    `${rgb(DARK)} rg`,
    bt(esc(report.id        || "—"), m + 150, H - 218, "F2", 9.5),
    bt(esc(report.requestedBy || report.user || "—"), m + 150, H - 238, "F2", 9.5),
    bt(esc(report.fileName  || "—"), m + 150, H - 258, "F2", 9.5),
    bt(esc(reportDate),              m + 150, H - 278, "F2", 9.5),

    // ── Detection Result card ──────────────────────────────
    rect(m, H - 470, cW, 140, GRAY_BG),
    line(m, H - 470, m + cW, H - 470, BORDER),
    line(m, H - 330, m + cW, H - 330, BORDER),
    line(m, H - 470, m, H - 330, BORDER),
    line(m + cW, H - 470, m + cW, H - 330, BORDER),

    rect(m, H - 353, 3, 14, BLUE),
    `${rgb(BLUE)} rg`,
    bt("DETECTION RESULT", m + 10, H - 351, "F2", 8.5),
    line(m, H - 358, m + cW, H - 358, BORDER),

    `${rgb(MUTED)} rg`,
    bt("Detected sign", m + 8, H - 378, "F1", 9),
    bt("Category",      m + 8, H - 398, "F1", 9),
    bt("Status",        m + 8, H - 418, "F1", 9),

    `${rgb(DARK)} rg`,
    bt(esc(report.sign     || "—"), m + 150, H - 378, "F2", 9.5),
    bt(esc(report.category || "—"), m + 150, H - 398, "F2", 9.5),

    // Status pill
    rect(m + 150, H - 422, 74, 17, statusBg),
    `${rgb(statusColor)} rg`,
    bt(esc(status), m + 153, H - 418, "F2", 8.5),

    // Confidence
    `${rgb(MUTED)} rg`,
    bt("Confidence score", m + 8, H - 447, "F1", 9),
    rect(m + 150, H - 451, barW, 16, BORDER),
    rect(m + 150, H - 451, fillW, 16, barColor),
    `${rgb(WHITE)} rg`,
    bt(`${confidence}%`, m + 153, H - 448, "F2", 8.5),

    // ── Footer ────────────────────────────────────────────
    rect(0, 0, W, 36, DARK),
    rect(0, 34, W, 2, BLUE),
    `0.580 0.631 0.694 rg`,
    bt("Traffic Sign AI  -  Automated traffic sign detection platform", m, 20, "F1", 7.5),
    bt(`${esc(report.id || "")}  -  ${dateStr}`, m, 8, "F1", 7.5),
    `${rgb(WHITE)} rg`,
    bt("Page 1 of 1", W - m - 60, 14, "F2", 8),
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${new TextEncoder().encode(ops).length} >>\nstream\n${ops}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefStart = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return pdf;
}

export function downloadReportPdf(report, fileName) {
  const pdf = buildReportPdf(report);
  const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
