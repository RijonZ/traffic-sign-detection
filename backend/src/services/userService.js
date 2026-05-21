const { users } = require("../data/store");

function findUserByEmail(email) {
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
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

module.exports = { findUserByEmail, validateLogin };
