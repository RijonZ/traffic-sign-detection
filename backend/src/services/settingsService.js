const { query } = require("../db/client");

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
  const result = await query(`SELECT key, value FROM settings`);
  return parseSettings(result.rows);
}

async function updateSettings(updates) {
  const allowedKeys = Object.keys(DEFAULT_SETTINGS);

  for (const [key, value] of Object.entries(updates)) {
    if (!allowedKeys.includes(key)) continue;

    const strValue = BOOLEAN_KEYS.includes(key) ? String(Boolean(value)) : String(value);

    await query(
      `
        INSERT INTO settings (key, value, description, updated_at)
        VALUES ($1, $2, $3, now())
        ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now()
      `,
      [key, strValue, SETTING_DESCRIPTIONS[key] || ""]
    );
  }

  return getSettings();
}

module.exports = { getSettings, updateSettings };
