const { query } = require("../db/client");

function formatUser(user) {
  return {
    id: String(user.id),
    name: `${user.first_name} ${user.last_name}`.trim(),
    email: user.email,
    role: user.role || "User",
    status: user.is_active ? "Active" : "Inactive",
  };
}

async function findUserByEmail(email) {
  const result = await query(
    `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.password_hash,
        u.is_active,
        COALESCE(r.name, 'User') AS role
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE lower(u.email) = lower($1)
      ORDER BY r.name
      LIMIT 1
    `,
    [email]
  );

  const user = result.rows[0];

  if (!user) {
    return null;
  }

  return {
    ...user,
    name: `${user.first_name} ${user.last_name}`.trim(),
    status: user.is_active ? "Active" : "Inactive",
  };
}

async function getAllUsers() {
  const result = await query(
    `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.is_active,
        COALESCE(r.name, 'User') AS role
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      ORDER BY u.created_at DESC
    `
  );

  return result.rows.map(formatUser);
}

async function getUsersSummary() {
  const safeUsers = await getAllUsers();

  return {
    totalUsers: safeUsers.length,
    administrators: safeUsers.filter((user) => user.role === "Administrator").length,
    managers: safeUsers.filter((user) => user.role === "Manager").length,
    users: safeUsers.filter((user) => user.role === "User").length,
  };
}

async function validateLogin(email, password) {
  const user = await findUserByEmail(email);

  if (!user || user.password_hash !== password || !user.is_active) {
    return null;
  }

  return formatUser(user);
}

module.exports = { findUserByEmail, getAllUsers, getUsersSummary, validateLogin };
