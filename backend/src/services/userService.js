const { users } = require("../data/store");

function findUserByEmail(email) {
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

function formatUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

function getAllUsers() {
  return users.map(formatUser);
}

function getUsersSummary() {
  const safeUsers = getAllUsers();

  return {
    totalUsers: safeUsers.length,
    administrators: safeUsers.filter((user) => user.role === "Administrator").length,
    managers: safeUsers.filter((user) => user.role === "Manager").length,
    users: safeUsers.filter((user) => user.role === "User").length,
  };
}

function validateLogin(email, password) {
  const user = findUserByEmail(email);

  if (!user || user.password !== password) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

module.exports = { findUserByEmail, getAllUsers, getUsersSummary, validateLogin };
