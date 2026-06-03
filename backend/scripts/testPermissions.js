const { hasPermission } = require("../src/services/permissionService");

const checks = [
  // Administrator duhet te kete keto
  { role: "Administrator", permission: "view_admin_dashboard", expect: true },
  { role: "Administrator", permission: "manage_users",         expect: true },
  { role: "Administrator", permission: "view_audit_logs",      expect: true },
  { role: "Administrator", permission: "view_analytics",       expect: true },
  { role: "Administrator", permission: "export_data",          expect: true },
  // Manager duhet te kete vetem keto 2
  { role: "Manager",       permission: "view_analytics",       expect: true },
  { role: "Manager",       permission: "export_data",          expect: true },
  // Manager NUK duhet te kete keto
  { role: "Manager",       permission: "view_admin_dashboard", expect: false },
  { role: "Manager",       permission: "manage_users",         expect: false },
  { role: "Manager",       permission: "view_audit_logs",      expect: false },
  // User nuk duhet te kete asgje
  { role: "User",          permission: "view_admin_dashboard", expect: false },
  { role: "User",          permission: "view_analytics",       expect: false },
];

async function run() {
  let passed = 0;
  let failed = 0;

  console.log("\n--- Permission checks ---\n");

  for (const check of checks) {
    const result = await hasPermission(check.role, check.permission);
    const ok = result === check.expect;
    const icon = ok ? "PASS" : "FAIL";
    const label = `${check.role.padEnd(15)} ${check.permission.padEnd(25)} expected=${String(check.expect).padEnd(5)} got=${result}`;
    console.log(`[${icon}] ${label}`);
    if (ok) passed++; else failed++;
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
