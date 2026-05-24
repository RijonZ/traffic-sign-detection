const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

function loadRootEnv() {
  if (process.env.DATABASE_URL) {
    return;
  }

  const envPath = path.resolve(__dirname, "../../../.env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const envText = fs.readFileSync(envPath, "utf8");
  envText.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);

    if (!match) {
      return;
    }

    const [, key, rawValue] = match;
    const value = rawValue.trim().replace(/^['"]|['"]$/g, "");
    process.env[key] = value;
  });
}

loadRootEnv();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Add it to the project .env file.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: /sslmode=disable/i.test(process.env.DATABASE_URL)
    ? false
    : { rejectUnauthorized: false },
});

function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
