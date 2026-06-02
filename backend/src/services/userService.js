const userRepo = require("../repositories/userRepository");

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

async function createLoginSession(userId) {
  const sessionToken = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await userRepo.revokeActiveTokensByUserId(userId);
  await userRepo.insertToken(userId, sessionToken);
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

async function createUserAccount(name, email, password) {
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    return { ok: false, message: "An account with this email already exists." };
  }

  const { firstName, lastName } = splitName(name);
  const roleName = getRoleFromEmail(email);
  const roleId = await userRepo.upsertRole(roleName, `${roleName} access role`);
  const newUser = await userRepo.insert(firstName, lastName, email, password);

  await userRepo.insertUserRole(newUser.id, roleId);

  const sessionToken = await createLoginSession(newUser.id);
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
      ...formatUser({ ...newUser, role: roleName }),
      sessionStatus: "Online",
      lastLoginAt: new Date().toISOString(),
      sessionToken,
    },
  };
}

const VALID_ROLES = ["Administrator", "Manager", "User"];

async function updateUser(userId, { role, isActive }) {
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) {
      return { ok: false, message: "Invalid role. Must be Administrator, Manager, or User." };
    }
    if (role !== "Administrator") {
      const currentRole = await userRepo.getRoleName(userId);
      if (currentRole === "Administrator" && (await userRepo.countAdmins()) <= 1) {
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

  return { ok: true };
}

async function deleteUser(userId) {
  const currentRole = await userRepo.getRoleName(userId);
  if (currentRole === "Administrator" && (await userRepo.countAdmins()) <= 1) {
    return { ok: false, message: "Cannot delete the last administrator." };
  }

  await userRepo.deleteById(userId);
  return { ok: true };
}

const NAME_CHANGE_COOLDOWN_HOURS = 24;

async function updateProfile(email, { name, password }) {
  const user = await findUserByEmail(email);
  if (!user) return { ok: false, message: "User not found." };

  if (name !== undefined) {
    const lastChanged = await userRepo.getNameChangedAt(user.id);
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
    await userRepo.updateName(user.id, firstName, lastName);
  }

  if (password !== undefined) {
    await userRepo.updatePassword(user.id, password);
  }

  const updated = await findUserByEmail(email);
  return { ok: true, user: formatUser(updated) };
}

async function revokeLoginSession(sessionToken) {
  if (!sessionToken) return;
  await userRepo.revokeTokenByHash(sessionToken);
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
