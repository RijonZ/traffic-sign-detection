function cleanText(value) {
  return String(value ?? "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function pdfText(text, x, y, font = "F1", size = 11) {
  return `BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${cleanText(text)}) Tj ET`;
}

function buildReportPdf(report) {
  const fields = [
    ["Report ID", report.id],
    ["User", report.user || report.requestedBy],
    ["Image", report.fileName],
    ["Detected sign", report.sign],
    ["Category", report.category],
    ["Confidence", `${report.confidence}%`],
    ["Status", report.status],
    ["Bounding box", report.box],
    ["Created at", report.createdAt || report.detectedAt],
  ].filter((field) => field[1]);

  const rows = fields.flatMap(([label, value], index) => {
    const y = 642 - index * 34;
    return [
      pdfText(`${label}:`, 70, y, "F2", 11),
      pdfText(value, 190, y, "F1", 11),
    ];
  });

  const stream = [
    "0.95 0.97 1 rg",
    "40 700 515 100 re f",
    "0.88 0.92 0.98 rg",
    "40 660 515 1 re f",
    "0 0 0 rg",
    pdfText("Traffic Sign Detection Report", 70, 760, "F2", 22),
    pdfText("Generated report for the traffic sign detection system.", 70, 735, "F1", 11),
    pdfText("Report Details", 70, 675, "F2", 15),
    ...rows,
    "0.88 0.92 0.98 rg",
    "40 70 515 1 re f",
    "0 0 0 rg",
    pdfText("Traffic Sign AI - Project documentation", 70, 48, "F1", 10),
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefStart = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return pdf;
}

export function downloadReportPdf(report, fileName) {
  const pdf = buildReportPdf(report);
  const reportUrl = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = reportUrl;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(reportUrl);
}
