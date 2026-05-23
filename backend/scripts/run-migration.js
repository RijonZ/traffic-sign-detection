const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function readDatabaseUrl() {
  const envPath = path.resolve(__dirname, "../../.env");
  const envText = fs.readFileSync(envPath, "utf8");
  const line = envText.split(/\r?\n/).find((entry) => /^\s*DATABASE_URL\s*=/.test(entry));

  if (!line) {
    throw new Error("DATABASE_URL is missing from .env");
  }

  return line.replace(/^\s*DATABASE_URL\s*=\s*/, "").trim().replace(/^['"]|['"]$/g, "");
}

async function main() {
  const migrationPath = process.argv[2];

  if (!migrationPath) {
    throw new Error("Usage: node scripts/run-migration.js migrations/001_initial_schema.sql");
  }

  const connectionString = readDatabaseUrl();
  const sql = fs.readFileSync(path.resolve(__dirname, "..", migrationPath), "utf8");
  const client = new Client({
    connectionString,
    ssl: /sslmode=disable/i.test(connectionString) ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  await client.connect();
  try {
    await client.query(sql);
    console.log(`Migration applied: ${migrationPath}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
