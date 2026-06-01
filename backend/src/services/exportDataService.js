const { getAllDetections } = require("./detectionService");

async function getExportData() {
  const { detections } = await getAllDetections();
  const completed = detections.filter((item) => item.status === "Completed").length;
  const rejected = detections.filter((item) => item.status === "Rejected").length;

  return {
    records: detections.map((item) => ({
      id: item.id,
      fileName: item.fileName,
      requestedBy: item.requestedBy,
      sign: item.sign,
      category: item.category,
      confidence: item.confidence,
      status: item.status,
      detectedAt: item.detectedAt,
    })),
    summary: {
      totalRecords: detections.length,
      completed,
      rejected,
    },
  };
}

module.exports = { getExportData };
