const { query } = require("../db/client");

function formatUser(user) {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();

  return {
    id: String(user.id),
    name: fullName || user.email,
    email: user.email,
    role: user.role || "User",
    status: user.is_active ? "Active" : "Inactive",
    sessionStatus: user.is_online ? "Online" : "Offline",
    lastLoginAt: user.last_login_at || null,
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
    name: [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.email,
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
        COALESCE(r.name, 'User') AS role,
        EXISTS (
          SELECT 1
          FROM refresh_tokens rt
          WHERE rt.user_id = u.id
            AND rt.revoked_at IS NULL
            AND rt.expires_at > now()
        ) AS is_online,
        (
          SELECT max(rt.created_at)
          FROM refresh_tokens rt
          WHERE rt.user_id = u.id
        ) AS last_login_at
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

async function createLoginSession(userId) {
  const sessionToken = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  await query(
    `
      UPDATE refresh_tokens
      SET revoked_at = now()
      WHERE user_id = $1 AND revoked_at IS NULL
    `,
    [userId]
  );

  await query(
    `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, now() + INTERVAL '8 hours')
    `,
    [userId, sessionToken]
  );

  return sessionToken;
}

function splitName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return { firstName: "New", lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function getRoleFromEmail(email) {
  const normalizedEmail = String(email || "").toLowerCase();

  if (normalizedEmail.includes("admin")) {
    return "Administrator";
  }

  if (normalizedEmail.includes("manager")) {
    return "Manager";
  }

  return "User";
}

async function ensureRole(roleName) {
  const result = await query(
    `
      INSERT INTO roles (name, description)
      VALUES ($1, $2)
      ON CONFLICT (name) DO UPDATE SET description = excluded.description
      RETURNING id
    `,
    [roleName, `${roleName} access role`]
  );

  return result.rows[0].id;
}

async function createUserAccount(name, email, password) {
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    return { ok: false, message: "An account with this email already exists." };
  }

  const { firstName, lastName } = splitName(name);
  const roleName = getRoleFromEmail(email);
  const roleId = await ensureRole(roleName);

  const userResult = await query(
    `
      INSERT INTO users (first_name, last_name, email, password_hash, is_active)
      VALUES ($1, $2, $3, $4, true)
      RETURNING id, first_name, last_name, email, is_active
    `,
    [firstName, lastName, email, password]
  );

  await query(
    `
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, role_id) DO NOTHING
    `,
    [userResult.rows[0].id, roleId]
  );

  const sessionToken = await createLoginSession(userResult.rows[0].id);

  return {
    ok: true,
    user: {
      ...formatUser({ ...userResult.rows[0], role: roleName }),
      sessionStatus: "Online",
      lastLoginAt: new Date().toISOString(),
      sessionToken,
    },
  };
}

async function revokeLoginSession(sessionToken) {
  if (!sessionToken) {
    return;
  }

  await query(
    `
      UPDATE refresh_tokens
      SET revoked_at = now()
      WHERE token_hash = $1 AND revoked_at IS NULL
    `,
    [sessionToken]
  );
}

async function validateLogin(email, password) {
  const user = await findUserByEmail(email);

  if (!user || user.password_hash !== password || !user.is_active) {
    return null;
  }

  const sessionToken = await createLoginSession(user.id);

  return {
    ...formatUser(user),
    sessionStatus: "Online",
    lastLoginAt: new Date().toISOString(),
    sessionToken,
  };
}

module.exports = {
  findUserByEmail,
  createUserAccount,
  getAllUsers,
  getUsersSummary,
  revokeLoginSession,
  validateLogin,
};
