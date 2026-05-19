const navItemsByRole = {
  Admin: [
    { label: "Home", page: "home" },
    { label: "System Overview", page: "features" },
    { label: "Admin Dashboard", page: "dashboard" },
    { label: "All Detections", page: "all-detections" },
    { label: "Users", page: "users" },
    { label: "Reports", page: "reports" },
    { label: "Model Monitoring", page: "model-monitoring" },
    { label: "Audit Logs", page: "audit-logs" },
  ],
  Manager: [
    { label: "Home", page: "home" },
    { label: "System Overview", page: "features" },
    { label: "Dashboard Analytics", page: "analytics" },
    { label: "Reports", page: "reports" },
    { label: "All Detections", page: "all-detections" },
    { label: "Export Data", page: "export-data" },
  ],
  User: [
    { label: "Home", page: "home" },
    { label: "System Overview", page: "features" },
    { label: "Dashboard", page: "dashboard" },
    { label: "Detect Sign", page: "detect" },
    { label: "Detection History", page: "history" },
    { label: "My Reports", page: "my-reports" },
  ],
};

function normalizeRole(role) {
  return role === "Administrator" ? "Admin" : role || "User";
}

function DashboardLayout({ activePage, children, currentUser, onLogout, onNavigate }) {
  const role = normalizeRole(currentUser.role);
  const navItems = navItemsByRole[role] || navItemsByRole.User;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <button className="sidebar-brand" onClick={() => onNavigate("dashboard")}>
            Traffic Sign AI
          </button>

          <nav className="sidebar-nav" aria-label="Dashboard navigation">
            {navItems.map((item) => (
              <button
                className={activePage === item.page ? "sidebar-link active" : "sidebar-link"}
                key={item.page}
                onClick={() => onNavigate(item.page)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="user-chip">
            <strong>{currentUser.name}</strong>
            <span>{role}</span>
          </div>
          <button className="signout-btn" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="dashboard-main">{children}</main>
    </div>
  );
}

export default DashboardLayout;
