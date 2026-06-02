const jwt = require("jsonwebtoken");

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "tsd_access_dev_secret";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "tsd_refresh_dev_secret";

function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
}

function signRefreshToken(userId) {
  return jwt.sign({ sub: String(userId) }, REFRESH_SECRET, { expiresIn: "7d" });
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch {
    return null;
  }
}

function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch {
    return null;
  }
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
