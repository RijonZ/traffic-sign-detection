const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const { Client } = require("pg");

function readDatabaseUrl() {
  const envPath = path.resolve(__dirname, "../../.env");
  const envText = fs.readFileSync(envPath, "utf8");
  const line = envText.split(/\r?\n/).find((entry) => /^\s*DATABASE_URL\s*=/.test(entry));
  if (!line) throw new Error("DATABASE_URL is missing from .env");
  return line.replace(/^\s*DATABASE_URL\s*=\s*/, "").trim().replace(/^['"]|['"]$/g, "");
}

const USERS = [
  { firstName: "Admin",   lastName: "User",    email: "admin@trafficsign.ai",   password: "admin123",   role: "Administrator" },
  { firstName: "Manager", lastName: "User",    email: "manager@trafficsign.ai", password: "manager123", role: "Manager" },
  { firstName: "Regular", lastName: "User",    email: "user@trafficsign.ai",    password: "user123",    role: "User" },
];

const SETTINGS = [
  { key: "confidenceThreshold", value: "80",    description: "Minimum confidence % to accept a detection" },
  { key: "maxFileSize",         value: "5",     description: "Maximum upload file size in MB" },
  { key: "allowedFileTypes",    value: "image/jpeg,image/png,image/webp", description: "Allowed image MIME types" },
  { key: "detectionRateLimit",  value: "3",     description: "Max detections per month for Basic plan" },
  { key: "maintenanceMode",     value: "false", description: "Put the system in maintenance mode" },
];

async function main() {
  const client = new Client({
    connectionString: readDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  await client.connect();

  try {
    for (const user of USERS) {
      const hash = await bcrypt.hash(user.password, 10);

      const userResult = await client.query(
        `INSERT INTO users (first_name, last_name, email, password_hash)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
         RETURNING id`,
        [user.firstName, user.lastName, user.email, hash]
      );
      const userId = userResult.rows[0].id;

      const roleResult = await client.query(
        `SELECT id FROM roles WHERE name = $1`, [user.role]
      );

      if (roleResult.rows.length) {
        await client.query(
          `INSERT INTO user_roles (user_id, role_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, role_id) DO NOTHING`,
          [userId, roleResult.rows[0].id]
        );
      }

      await client.query(
        `INSERT INTO subscriptions (user_id, plan_name, is_active)
         VALUES ($1, $2, true)
         ON CONFLICT DO NOTHING`,
        [userId, user.role === "User" ? "Basic" : "Team"]
      );

      console.log(`Seeded: ${user.email} (${user.role})`);
    }

    for (const s of SETTINGS) {
      await client.query(
        `INSERT INTO settings (key, value, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [s.key, s.value, s.description]
      );
    }

    console.log("Settings seeded.");
    console.log("Done.");
  } finally {
    await client.end();
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });
