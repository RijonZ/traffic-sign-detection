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
  const users = await getAllUsers();
  return getUsersSummaryFromList(users);
}

function getUsersSummaryFromList(users) {
  return {
    totalUsers: users.length,
    administrators: users.filter((user) => user.role === "Administrator").length,
    managers: users.filter((user) => user.role === "Manager").length,
    users: users.filter((user) => user.role === "User").length,
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
  const { createNotificationForEmail, notifyRoles } = require("./notificationService");

  await createNotificationForEmail(
    email,
    "account",
    "Account created",
    "Your Traffic Sign AI account is ready."
  );
  await notifyRoles(
    ["Administrator"],
    "new-user",
    "New user registered",
    `${email} created a new account.`
  );

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

async function getAdminCount() {
  const result = await query(
    `SELECT COUNT(*) AS cnt
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE r.name = 'Administrator'`
  );
  return parseInt(result.rows[0].cnt, 10);
}

async function getUserRoleName(userId) {
  const result = await query(
    `SELECT r.name
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = $1
     LIMIT 1`,
    [userId]
  );
  return result.rows[0]?.name || "User";
}

const VALID_ROLES = ["Administrator", "Manager", "User"];

async function updateUser(userId, { role, isActive }) {
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) {
      return { ok: false, message: "Invalid role. Must be Administrator, Manager, or User." };
    }
    if (role !== "Administrator") {
      const currentRole = await getUserRoleName(userId);
      if (currentRole === "Administrator" && (await getAdminCount()) <= 1) {
        return { ok: false, message: "Cannot demote the last administrator." };
      }
    }
  }

  if (isActive !== undefined) {
    await query(
      `UPDATE users SET is_active = $1, updated_at = now() WHERE id = $2`,
      [isActive, userId]
    );
    if (!isActive) {
      await query(
        `UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
        [userId]
      );
    }
  }

  if (role) {
    const roleId = await ensureRole(role);
    await query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
    await query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, roleId]
    );
  }

  return { ok: true };
}

async function deleteUser(userId) {
  const currentRole = await getUserRoleName(userId);
  if (currentRole === "Administrator" && (await getAdminCount()) <= 1) {
    return { ok: false, message: "Cannot delete the last administrator." };
  }

  await query(`DELETE FROM users WHERE id = $1`, [userId]);
  return { ok: true };
}

const NAME_CHANGE_COOLDOWN_HOURS = 24;

async function updateProfile(email, { name, password }) {
  const user = await findUserByEmail(email);
  if (!user) return { ok: false, message: "User not found." };

  if (name !== undefined) {
    const cooldownRow = await query(
      `SELECT name_changed_at FROM users WHERE id = $1`,
      [user.id]
    );
    const lastChanged = cooldownRow.rows[0]?.name_changed_at;
    if (lastChanged) {
      const hoursSince = (Date.now() - new Date(lastChanged).getTime()) / 36e5;
      if (hoursSince < NAME_CHANGE_COOLDOWN_HOURS) {
        const hoursLeft = Math.ceil(NAME_CHANGE_COOLDOWN_HOURS - hoursSince);
        return {
          ok: false,
          message: `You can only change your name once every 24 hours. Try again in ${hoursLeft} hour${hoursLeft !== 1 ? "s" : ""}.`,
          cooldownHoursLeft: hoursLeft,
        };
      }
    }

    const { firstName, lastName } = splitName(name);
    await query(
      `UPDATE users SET first_name = $1, last_name = $2, name_changed_at = now(), updated_at = now() WHERE id = $3`,
      [firstName, lastName, user.id]
    );
  }

  if (password !== undefined) {
    await query(
      `UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`,
      [password, user.id]
    );
  }

  const updated = await findUserByEmail(email);
  return { ok: true, user: formatUser(updated) };
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
  getUsersSummaryFromList,
  updateUser,
  updateProfile,
  deleteUser,
  revokeLoginSession,
  validateLogin,
};
