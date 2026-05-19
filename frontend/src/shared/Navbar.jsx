const publicLinks = [
  { label: "Home", page: "home" },
  { label: "System Overview", page: "features" },
  { label: "Login / Sign Up", page: "login" },
];

const userLinks = [
  { label: "Home", page: "home" },
  { label: "System Overview", page: "features" },
  { label: "Dashboard", page: "dashboard" },
  { label: "Detect Sign", page: "detect" },
  { label: "Detection History", page: "history" },
  { label: "My Reports", page: "my-reports" },
];

const managerLinks = [
  { label: "Home", page: "home" },
  { label: "System Overview", page: "features" },
  { label: "Dashboard Analytics", page: "dashboard-analytics" },
  { label: "Reports", page: "reports" },
  { label: "All Detections", page: "all-detections" },
  { label: "Export Data", page: "export-data" },
];

const adminLinks = [
  { label: "Home", page: "home" },
  { label: "System Overview", page: "features" },
  { label: "Admin Dashboard", page: "admin-dashboard" },
  { label: "All Detections", page: "all-detections" },
  { label: "Users", page: "users" },
  { label: "Reports", page: "reports" },
  { label: "Model Monitoring", page: "model-monitoring" },
  { label: "Audit Logs", page: "audit-logs" },
];

function getLinks(currentUser) {
  if (!currentUser) {
    return publicLinks;
  }

  if (currentUser.role === "Administrator") {
    return adminLinks;
  }

  if (currentUser.role === "Manager") {
    return managerLinks;
  }

  return userLinks;
}

function Navbar({ currentUser, onLogout, onNavigate }) {
  const links = getLinks(currentUser);
  const navClassName = currentUser ? "navbar sidebar-navbar" : "navbar public-navbar";

  return (
    <nav className={navClassName}>
      <button className="brand-btn" onClick={() => onNavigate("home")}>
        Traffic Sign AI
      </button>

      <div className="nav-links">
        {links.map((link) => (
          <button className="link-btn" key={link.page} onClick={() => onNavigate(link.page)}>
            {link.label}
          </button>
        ))}

        {currentUser && <button onClick={onLogout}>Logout</button>}
      </div>
    </nav>
  );
}

export default Navbar;
