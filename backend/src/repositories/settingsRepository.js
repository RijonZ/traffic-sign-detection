const { query } = require("../db/client");

async function findAll() {
  const result = await query(`SELECT key, value FROM settings`);
  return result.rows;
}

async function upsert(key, value, description) {
  await query(
    `
      INSERT INTO settings (key, value, description, updated_at)
      VALUES ($1, $2, $3, now())
      ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now()
    `,
    [key, value, description]
  );
}

module.exports = { findAll, upsert };
