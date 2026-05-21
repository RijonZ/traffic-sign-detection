import { useEffect, useState } from "react";

const READ_NOTIFICATIONS_KEY = "traffic-sign-read-notifications";

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

const notificationsByRole = {
  Administrator: [
    { id: "admin-detection", title: "New detection request", message: "A detection is ready for admin review.", page: "all-detections" },
    { id: "admin-report", title: "Report generated", message: "System reports are available for download.", page: "reports" },
    { id: "admin-user", title: "User activity", message: "A user account is active in the system.", page: "users" },
  ],
  Manager: [
    { id: "manager-analytics", title: "Analytics updated", message: "Detection statistics are ready to review.", page: "dashboard-analytics" },
    { id: "manager-export", title: "Export available", message: "Detection data can be exported as CSV or JSON.", page: "export-data" },
    { id: "manager-report", title: "Report generated", message: "A report is ready for manager review.", page: "reports" },
  ],
  User: [
    { id: "user-detection", title: "Detection completed", message: "Your latest traffic sign result is saved.", page: "history" },
    { id: "user-report", title: "Report ready", message: "Your detection report can be downloaded as PDF.", page: "my-reports" },
  ],
};

function readNotificationIds(email) {
  const savedItems = JSON.parse(localStorage.getItem(READ_NOTIFICATIONS_KEY) || "{}");
  return savedItems[email] || [];
}

function saveNotificationId(email, id) {
  const savedItems = JSON.parse(localStorage.getItem(READ_NOTIFICATIONS_KEY) || "{}");
  const readIds = savedItems[email] || [];

  if (!readIds.includes(id)) {
    localStorage.setItem(
      READ_NOTIFICATIONS_KEY,
      JSON.stringify({ ...savedItems, [email]: [...readIds, id] })
    );
  }
}

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
  const [showNotifications, setShowNotifications] = useState(false);
  const [readIds, setReadIds] = useState(() => {
    return currentUser ? readNotificationIds(currentUser.email) : [];
  });
  const links = getLinks(currentUser);
  const notifications = currentUser ? notificationsByRole[currentUser.role] || [] : [];
  const unreadCount = notifications.filter((item) => !readIds.includes(item.id)).length;
  const navClassName = currentUser ? "navbar sidebar-navbar" : "navbar public-navbar";

  useEffect(() => {
    setReadIds(currentUser ? readNotificationIds(currentUser.email) : []);
  }, [currentUser]);

  function openNotification(notification) {
    const nextReadIds = readIds.includes(notification.id) ? readIds : [...readIds, notification.id];

    setReadIds(nextReadIds);
    saveNotificationId(currentUser.email, notification.id);
    setShowNotifications(false);
    onNavigate(notification.page);
  }

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

        {currentUser && (
          <div className="notification-box">
            <button
              aria-label="Notifications"
              className="notification-btn"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2Z" />
                <path d="M10 21h4" />
              </svg>
              <span>{unreadCount}</span>
            </button>

            {showNotifications && (
              <div className="notification-menu">
                <h3>Notifications</h3>
                {notifications.map((notification) => (
                  <button
                    className={`notification-item ${readIds.includes(notification.id) ? "is-read" : ""}`}
                    key={notification.id}
                    onClick={() => openNotification(notification)}
                  >
                    <strong>{notification.title}</strong>
                    <span>{notification.message}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {currentUser && <button onClick={onLogout}>Logout</button>}
      </div>
    </nav>
  );
}

export default Navbar;
