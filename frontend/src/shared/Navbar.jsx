import { useEffect, useState } from "react";
import ChatBot from "./ChatBot";

const API_BASE_URL = "http://localhost:5000/api";

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
  { label: "Subscription", page: "subscription" },
];

const managerLinks = [
  { label: "Home", page: "home" },
  { label: "System Overview", page: "features" },
  { label: "Dashboard Analytics", page: "dashboard-analytics" },
  { label: "Reports", page: "reports" },
  { label: "All Detections", page: "all-detections" },
  { label: "Export Data", page: "export-data" },
  { label: "Subscription", page: "subscription" },
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
  { label: "Settings", page: "settings" },
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const links = getLinks(currentUser);
  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const navClassName = currentUser ? "navbar sidebar-navbar" : "navbar public-navbar";

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    function loadNotifications() {
      fetch(`${API_BASE_URL}/users/${encodeURIComponent(currentUser.email)}/notifications`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => setNotifications(data?.notifications || []))
        .catch(() => setNotifications([]));
    }

    loadNotifications();
    const refreshTimer = window.setInterval(loadNotifications, 5000);

    return () => window.clearInterval(refreshTimer);
  }, [currentUser]);

  function openNotification(notification) {
    setNotifications((currentNotifications) =>
      currentNotifications.map((item) =>
        item.id === notification.id ? { ...item, isRead: true } : item
      )
    );
    fetch(`${API_BASE_URL}/users/${encodeURIComponent(currentUser.email)}/notifications/read`, {
      body: JSON.stringify({ notificationId: notification.id }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch(() => {});
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
                {notifications.length ? notifications.map((notification) => (
                  <button
                    className={`notification-item ${notification.isRead ? "is-read" : ""}`}
                    key={notification.id}
                    onClick={() => openNotification(notification)}
                  >
                    <strong>{notification.title}</strong>
                    <span>{notification.message}</span>
                  </button>
                )) : <p className="notification-empty">No notifications yet.</p>}
              </div>
            )}
          </div>
        )}

        {currentUser && <button onClick={onLogout}>Logout</button>}
      </div>

      {currentUser && <ChatBot currentUser={currentUser} />}
    </nav>
  );
}

export default Navbar;
