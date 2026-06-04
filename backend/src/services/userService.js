const bcrypt = require("bcrypt");
const crypto = require("crypto");
const userRepo = require("../repositories/userRepository");
const { recordAuditLog } = require("./auditLogService");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/jwt");

const BCRYPT_ROUNDS = 12;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

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
    subscriptionPlan: user.subscription_plan || null,
  };
}

async function findUserByEmail(email) {
  const user = await userRepo.findByEmail(email);

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
  const rows = await userRepo.findAll();
  return rows.map(formatUser);
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

async function createLoginSession(userId, email, role) {
  const accessToken = signAccessToken({ sub: String(userId), email, role });
  const refreshToken = signRefreshToken(userId);
  await userRepo.revokeActiveTokensByUserId(userId);
  await userRepo.insertToken(userId, hashToken(refreshToken));
  return { accessToken, refreshToken };
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

async function createUserAccount(name, email, password) {
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    return { ok: false, message: "An account with this email already exists." };
  }

  const { firstName, lastName } = splitName(name);
  const roleName = getRoleFromEmail(email);
  const roleId = await userRepo.upsertRole(roleName, `${roleName} access role`);
  const newUser = await userRepo.insert(firstName, lastName, email, await bcrypt.hash(password, BCRYPT_ROUNDS));

  await userRepo.insertUserRole(newUser.id, roleId);

  const { accessToken, refreshToken } = await createLoginSession(newUser.id, email, roleName);
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
  await recordAuditLog({
    userId: newUser.id,
    action: "User signed up",
    entity: "Authentication",
    entityId: newUser.id,
    newValue: { email, role: roleName, status: "Success" },
  });

  return {
    ok: true,
    user: {
      ...formatUser({ ...newUser, role: roleName }),
      sessionStatus: "Online",
      lastLoginAt: new Date().toISOString(),
      accessToken,
      refreshToken,
    },
  };
}

const VALID_ROLES = ["Administrator", "Manager", "User"];

async function createUserByAdmin(name, email, password, role, actor) {
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    return { ok: false, message: "An account with this email already exists." };
  }

  const roleName = role && VALID_ROLES.includes(role) ? role : getRoleFromEmail(email);
  const roleId = await userRepo.upsertRole(roleName, `${roleName} access role`);
  const { firstName, lastName } = splitName(name);
  const newUser = await userRepo.insert(
    firstName,
    lastName,
    email,
    await bcrypt.hash(password, BCRYPT_ROUNDS)
  );
  await userRepo.insertUserRole(newUser.id, roleId);
  await recordAuditLog({
    userId: actor?.id || null,
    action: "User created by administrator",
    entity: "Users",
    entityId: newUser.id,
    newValue: { email, role: roleName, actorEmail: actor?.email, status: "Success" },
  });

  return { ok: true, user: formatUser({ ...newUser, role: roleName }) };
}

async function updateUser(userId, { role, isActive }, actor) {
  const oldRole = await userRepo.getRoleName(userId);
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) {
      return { ok: false, message: "Invalid role. Must be Administrator, Manager, or User." };
    }
    if (role !== "Administrator") {
      if (oldRole === "Administrator" && (await userRepo.countAdmins()) <= 1) {
        return { ok: false, message: "Cannot demote the last administrator." };
      }
    }
  }

  if (isActive !== undefined) {
    await userRepo.setActiveStatus(userId, isActive);
    if (!isActive) {
      await userRepo.revokeActiveTokensByUserId(userId);
    }
  }

  if (role) {
    const roleId = await userRepo.upsertRole(role, `${role} access role`);
    await userRepo.deleteRolesByUserId(userId);
    await userRepo.insertUserRole(userId, roleId);
  }

  await recordAuditLog({
    userId: actor?.id || null,
    action: "User updated",
    entity: "Users",
    entityId: userId,
    oldValue: { role: oldRole },
    newValue: { role: role || oldRole, isActive, actorEmail: actor?.email, status: "Success" },
  });

  return { ok: true };
}

async function deleteUser(userId, actor) {
  const currentRole = await userRepo.getRoleName(userId);
  if (currentRole === "Administrator" && (await userRepo.countAdmins()) <= 1) {
    return { ok: false, message: "Cannot delete the last administrator." };
  }

  await recordAuditLog({
    userId: actor?.id || null,
    action: "User deleted",
    entity: "Users",
    entityId: userId,
    oldValue: { role: currentRole },
    newValue: { actorEmail: actor?.email, status: "Success" },
  });
  await userRepo.deleteById(userId);
  return { ok: true };
}

const NAME_COOLDOWN_DAYS = 90;    // 3 months
const PASSWORD_COOLDOWN_DAYS = 30; // 1 month

function cooldownUntil(lastChanged, days) {
  if (!lastChanged) return null;
  const until = new Date(new Date(lastChanged).getTime() + days * 864e5);
  return until > new Date() ? until.toISOString() : null;
}

function daysLeftLabel(untilIso) {
  const ms = new Date(untilIso).getTime() - Date.now();
  const days = Math.ceil(ms / 864e5);
  if (days > 1) return `${days} days`;
  const hours = Math.ceil(ms / 36e5);
  return `${hours} hour${hours !== 1 ? "s" : ""}`;
}

async function getProfileMeta(email) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const meta = await userRepo.getProfileCooldowns(user.id);
  return {
    createdAt: meta?.created_at || null,
    nameLockedUntil: cooldownUntil(meta?.name_changed_at, NAME_COOLDOWN_DAYS),
    passwordLockedUntil: cooldownUntil(meta?.password_changed_at, PASSWORD_COOLDOWN_DAYS),
  };
}

async function updateProfile(email, { name, password }) {
  const user = await findUserByEmail(email);
  if (!user) return { ok: false, message: "User not found." };

  if (name !== undefined) {
    const meta = await userRepo.getProfileCooldowns(user.id);
    const lockedUntil = cooldownUntil(meta?.name_changed_at, NAME_COOLDOWN_DAYS);
    if (lockedUntil) {
      return {
        ok: false,
        field: "name",
        lockedUntil,
        message: `You can only change your display name once every 3 months. Try again in ${daysLeftLabel(lockedUntil)}.`,
      };
    }
    const { firstName, lastName } = splitName(name);
    await userRepo.updateName(user.id, firstName, lastName);
  }

  if (password !== undefined) {
    const meta = await userRepo.getProfileCooldowns(user.id);
    const lockedUntil = cooldownUntil(meta?.password_changed_at, PASSWORD_COOLDOWN_DAYS);
    if (lockedUntil) {
      return {
        ok: false,
        field: "password",
        lockedUntil,
        message: `You can only change your password once every month. Try again in ${daysLeftLabel(lockedUntil)}.`,
      };
    }
    await userRepo.updatePassword(user.id, await bcrypt.hash(password, BCRYPT_ROUNDS));
  }

  const updated = await findUserByEmail(email);
  return { ok: true, user: formatUser(updated) };
}

async function forgotPassword(email) {
  const user = await findUserByEmail(email);
  if (!user) return { ok: true }; // don't reveal whether email exists

  const { sendResetEmail } = require("./emailService");
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);

  await userRepo.clearResetTokensByUser(user.id);
  await userRepo.insertResetToken(user.id, tokenHash);
  await sendResetEmail(email, token);

  return { ok: true };
}

async function resetPassword(token, newPassword) {
  const tokenHash = hashToken(token);
  const record = await userRepo.findResetToken(tokenHash);

  if (!record) {
    return { ok: false, message: "This reset link is invalid or has expired." };
  }

  await userRepo.updatePassword(record.user_id, await bcrypt.hash(newPassword, BCRYPT_ROUNDS));
  await userRepo.markResetTokenUsed(tokenHash);

  return { ok: true };
}

async function revokeLoginSession(refreshToken) {
  if (!refreshToken) return;
  await userRepo.revokeTokenByHash(hashToken(refreshToken));
}

async function refreshSession(refreshToken) {
  if (!refreshToken) return null;
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) return null;
  const user = await userRepo.findByTokenHash(hashToken(refreshToken));
  if (!user) return null;
  const accessToken = signAccessToken({ sub: String(user.id), email: user.email, role: user.role });
  return { accessToken };
}

async function validateLogin(email, password) {
  const user = await findUserByEmail(email);

  if (!user || !user.is_active) return null;

  const isHashed = user.password_hash.startsWith("$2b$") || user.password_hash.startsWith("$2a$");
  let passwordMatch;

  if (isHashed) {
    passwordMatch = await bcrypt.compare(password, user.password_hash).catch(() => false);
  } else {
    passwordMatch = user.password_hash === password;
    if (passwordMatch) {
      await userRepo.updatePassword(user.id, await bcrypt.hash(password, BCRYPT_ROUNDS));
    }
  }

  if (!passwordMatch) return null;

  const { accessToken, refreshToken } = await createLoginSession(user.id, user.email, user.role);
  await recordAuditLog({
    userId: user.id,
    action: "User logged in",
    entity: "Authentication",
    entityId: user.id,
    newValue: { email: user.email, role: user.role, status: "Success" },
  });

  return {
    ...formatUser(user),
    sessionStatus: "Online",
    lastLoginAt: new Date().toISOString(),
    accessToken,
    refreshToken,
  };
}

module.exports = {
  findUserByEmail,
  createUserAccount,
  createUserByAdmin,
  getAllUsers,
  getUsersSummary,
  getUsersSummaryFromList,
  updateUser,
  updateProfile,
  getProfileMeta,
  deleteUser,
  forgotPassword,
  resetPassword,
  revokeLoginSession,
  refreshSession,
  validateLogin,
};
