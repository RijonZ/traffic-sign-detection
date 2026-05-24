const { pool, query } = require("../src/db/client");

const roles = ["Administrator", "Manager", "User"];

const users = [
  {
    firstName: "Admin",
    lastName: "User",
    email: "admin@trafficsign.ai",
    password: "admin123",
    role: "Administrator",
  },
  {
    firstName: "Manager",
    lastName: "User",
    email: "manager@trafficsign.ai",
    password: "manager123",
    role: "Manager",
  },
  {
    firstName: "Regular",
    lastName: "User",
    email: "user@trafficsign.ai",
    password: "user123",
    role: "User",
  },
];

async function seedRoles() {
  for (const role of roles) {
    await query(
      `
        INSERT INTO roles (name, description)
        VALUES ($1, $2)
        ON CONFLICT (name) DO UPDATE SET description = excluded.description
      `,
      [role, `${role} access role`]
    );
  }
}

async function seedUsers() {
  for (const user of users) {
    const userResult = await query(
      `
        INSERT INTO users (first_name, last_name, email, password_hash, is_active)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (email) DO UPDATE SET
          first_name = excluded.first_name,
          last_name = excluded.last_name,
          password_hash = excluded.password_hash,
          is_active = true,
          updated_at = now()
        RETURNING id
      `,
      [user.firstName, user.lastName, user.email, user.password]
    );

    const roleResult = await query("SELECT id FROM roles WHERE name = $1", [user.role]);

    await query(
      `
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, role_id) DO NOTHING
      `,
      [userResult.rows[0].id, roleResult.rows[0].id]
    );
  }
}

async function main() {
  await seedRoles();
  await seedUsers();
  console.log("Seed data inserted.");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
