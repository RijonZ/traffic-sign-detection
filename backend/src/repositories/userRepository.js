const { query } = require("../db/client");

async function findByEmail(email) {
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
  return result.rows[0] || null;
}

async function findAll() {
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
        ) AS last_login_at,
        (
          SELECT s.plan_name
          FROM subscriptions s
          WHERE s.user_id = u.id AND s.is_active = true
          ORDER BY s.start_date DESC
          LIMIT 1
        ) AS subscription_plan
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      ORDER BY u.created_at DESC
    `
  );
  return result.rows;
}

async function insert(firstName, lastName, email, passwordHash) {
  const result = await query(
    `
      INSERT INTO users (first_name, last_name, email, password_hash, is_active)
      VALUES ($1, $2, $3, $4, true)
      RETURNING id, first_name, last_name, email, is_active
    `,
    [firstName, lastName, email, passwordHash]
  );
  return result.rows[0];
}

async function upsertRole(name, description) {
  const result = await query(
    `
      INSERT INTO roles (name, description)
      VALUES ($1, $2)
      ON CONFLICT (name) DO UPDATE SET description = excluded.description
      RETURNING id
    `,
    [name, description]
  );
  return result.rows[0].id;
}

async function insertUserRole(userId, roleId) {
  await query(
    `
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, role_id) DO NOTHING
    `,
    [userId, roleId]
  );
}

async function deleteRolesByUserId(userId) {
  await query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
}

async function revokeActiveTokensByUserId(userId) {
  await query(
    `UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

async function insertToken(userId, tokenHash) {
  await query(
    `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, now() + INTERVAL '7 days')
    `,
    [userId, tokenHash]
  );
}

async function findByTokenHash(tokenHash) {
  const result = await query(
    `
      SELECT u.id, u.email,
             trim(concat(u.first_name, ' ', u.last_name)) AS name,
             COALESCE(r.name, 'User') AS role
      FROM refresh_tokens rt
      JOIN users u ON u.id = rt.user_id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE rt.token_hash = $1
        AND rt.revoked_at IS NULL
        AND rt.expires_at > now()
      LIMIT 1
    `,
    [tokenHash]
  );
  return result.rows[0] || null;
}

async function revokeTokenByHash(tokenHash) {
  await query(
    `
      UPDATE refresh_tokens
      SET revoked_at = now()
      WHERE token_hash = $1 AND revoked_at IS NULL
    `,
    [tokenHash]
  );
}

async function countAdmins() {
  const result = await query(
    `SELECT COUNT(*) AS cnt
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE r.name = 'Administrator'`
  );
  return parseInt(result.rows[0].cnt, 10);
}

async function getRoleName(userId) {
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

async function setActiveStatus(userId, isActive) {
  await query(
    `UPDATE users SET is_active = $1, updated_at = now() WHERE id = $2`,
    [isActive, userId]
  );
}

async function deleteById(userId) {
  await query(`DELETE FROM users WHERE id = $1`, [userId]);
}

async function getNameChangedAt(userId) {
  const result = await query(
    `SELECT name_changed_at FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0]?.name_changed_at || null;
}

async function updateName(userId, firstName, lastName) {
  await query(
    `UPDATE users SET first_name = $1, last_name = $2, name_changed_at = now(), updated_at = now() WHERE id = $3`,
    [firstName, lastName, userId]
  );
}

async function updatePassword(userId, passwordHash) {
  await query(
    `UPDATE users SET password_hash = $1, password_changed_at = now(), updated_at = now() WHERE id = $2`,
    [passwordHash, userId]
  );
}

async function getProfileCooldowns(userId) {
  const result = await query(
    `SELECT name_changed_at, password_changed_at, created_at FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function insertResetToken(userId, tokenHash) {
  await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + INTERVAL '1 hour')`,
    [userId, tokenHash]
  );
}

async function findResetToken(tokenHash) {
  const result = await query(
    `SELECT id, user_id, expires_at FROM password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [tokenHash]
  );
  return result.rows[0] || null;
}

async function markResetTokenUsed(tokenHash) {
  await query(
    `UPDATE password_reset_tokens SET used_at = now() WHERE token_hash = $1`,
    [tokenHash]
  );
}

async function clearResetTokensByUser(userId) {
  await query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [userId]);
}

module.exports = {
  findByEmail,
  findAll,
  insert,
  upsertRole,
  insertUserRole,
  deleteRolesByUserId,
  revokeActiveTokensByUserId,
  insertToken,
  revokeTokenByHash,
  findByTokenHash,
  countAdmins,
  getRoleName,
  setActiveStatus,
  deleteById,
  getNameChangedAt,
  updateName,
  updatePassword,
  getProfileCooldowns,
  insertResetToken,
  findResetToken,
  markResetTokenUsed,
  clearResetTokensByUser,
};
