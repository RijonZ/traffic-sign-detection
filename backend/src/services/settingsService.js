const settingsRepo = require("../repositories/settingsRepository");

const DEFAULT_SETTINGS = {
  maxUploadSize: "5",
  acceptedFormats: "JPG, PNG, WEBP",
  retentionDays: "90",
  confidenceThreshold: "80",
  notificationsEnabled: "true",
  auditLoggingEnabled: "true",
  maintenanceMode: "false",
};

const SETTING_DESCRIPTIONS = {
  maxUploadSize: "Maximum file upload size in MB",
  acceptedFormats: "Accepted image formats for detection",
  retentionDays: "Number of days to retain detection history",
  confidenceThreshold: "Minimum confidence percentage for detection results",
  notificationsEnabled: "Whether system notifications are enabled",
  auditLoggingEnabled: "Whether audit logging is enabled",
  maintenanceMode: "Whether maintenance mode is active",
};

const BOOLEAN_KEYS = ["notificationsEnabled", "auditLoggingEnabled", "maintenanceMode"];

function parseSettings(rows) {
  const map = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in map) {
      map[row.key] = row.value;
    }
  }
  return {
    maxUploadSize: map.maxUploadSize,
    acceptedFormats: map.acceptedFormats,
    retentionDays: map.retentionDays,
    confidenceThreshold: map.confidenceThreshold,
    notificationsEnabled: map.notificationsEnabled === "true",
    auditLoggingEnabled: map.auditLoggingEnabled === "true",
    maintenanceMode: map.maintenanceMode === "true",
  };
}

async function getSettings() {
  const rows = await settingsRepo.findAll();
  return parseSettings(rows);
}

function validateSettings(updates) {
  const errors = [];

  if ("maxUploadSize" in updates) {
    const v = Number(updates.maxUploadSize);
    if (!Number.isFinite(v) || v < 1 || v > 100)
      errors.push("Maximum upload size must be between 1 and 100 MB.");
  }
  if ("confidenceThreshold" in updates) {
    const v = Number(updates.confidenceThreshold);
    if (!Number.isFinite(v) || v < 0 || v > 100)
      errors.push("Confidence threshold must be between 0 and 100.");
  }
  if ("retentionDays" in updates) {
    const v = Number(updates.retentionDays);
    if (!Number.isInteger(v) || v < 1 || v > 3650)
      errors.push("Retention days must be a whole number between 1 and 3650.");
  }
  if ("acceptedFormats" in updates) {
    const v = String(updates.acceptedFormats || "").trim();
    if (!v) errors.push("Accepted formats cannot be empty.");
  }

  return errors;
}

async function updateSettings(updates) {
  const errors = validateSettings(updates);
  if (errors.length) return { ok: false, errors };

  const allowedKeys = Object.keys(DEFAULT_SETTINGS);
  for (const [key, value] of Object.entries(updates)) {
    if (!allowedKeys.includes(key)) continue;
    const strValue = BOOLEAN_KEYS.includes(key) ? String(Boolean(value)) : String(value).trim();
    await settingsRepo.upsert(key, strValue, SETTING_DESCRIPTIONS[key] || "");
  }

  return { ok: true, settings: await getSettings() };
}

module.exports = { getSettings, updateSettings };
