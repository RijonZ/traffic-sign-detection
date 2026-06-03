const { query } = require("../db/client");

// In-memory cache: roleName → Set<permissionName>
// Populated on first request per role, cleared on server restart.
const cache = new Map();

async function hasPermission(roleName, permissionName) {
  if (!cache.has(roleName)) {
    const result = await query(
      `SELECT p.name
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       JOIN roles r ON r.id = rp.role_id
       WHERE r.name = $1`,
      [roleName]
    );
    cache.set(roleName, new Set(result.rows.map((row) => row.name)));
  }

  return cache.get(roleName).has(permissionName);
}

async function getPermissionsForRole(roleName) {
  await hasPermission(roleName, "__warmup__");
  return [...(cache.get(roleName) || [])].sort();
}

module.exports = { hasPermission, getPermissionsForRole };
