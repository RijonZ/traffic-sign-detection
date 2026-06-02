import { useEffect, useState } from "react";
import ChatBot from "./ChatBot";
import { getSocket } from "../socket/socket";

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
  { label: "My Profile", page: "profile" },
];

const managerLinks = [
  { label: "Home", page: "home" },
  { label: "System Overview", page: "features" },
  { label: "Dashboard Analytics", page: "dashboard-analytics" },
  { label: "Reports", page: "reports" },
  { label: "All Detections", page: "all-detections" },
  { label: "Export Data", page: "export-data" },
  { label: "My Profile", page: "profile" },
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
  { label: "My Profile", page: "profile" },
];

function getNotificationPage(type, role) {
  if (type === "new-user") return role === "Administrator" ? "users" : "dashboard";
  if (type === "detection-completed" || type === "detection-rejected") {
    return role === "Administrator" || role === "Manager" ? "all-detections" : "history";
  }
  if (type === "account") return role === "Administrator" ? "admin-dashboard" : "dashboard";
  return "dashboard";
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
  const [notifications, setNotifications] = useState([]);
  const links = getLinks(currentUser);
  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const navClassName = currentUser ? "navbar sidebar-navbar" : "navbar public-navbar";

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    fetch(`${API_BASE_URL}/users/${encodeURIComponent(currentUser.email)}/notifications`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setNotifications(data?.notifications || []))
      .catch(() => setNotifications([]));

    const socket = getSocket();
    if (!socket) return;

    function handleNewNotification(notification) {
      const page = getNotificationPage(notification.type, currentUser.role);
      setNotifications((prev) => [{ ...notification, isRead: false, page }, ...prev]);
    }

    socket.on("notification", handleNewNotification);

    return () => {
      socket.off("notification", handleNewNotification);
    };
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

  function markAllNotificationsRead() {
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) => ({ ...notification, isRead: true }))
    );
    fetch(`${API_BASE_URL}/users/${encodeURIComponent(currentUser.email)}/notifications/read-all`, {
      method: "POST",
    }).catch(() => {});
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
                <div className="notification-menu-header">
                  <h3>Notifications</h3>
                  {unreadCount > 0 && (
                    <button className="text-btn notification-read-all" onClick={markAllNotificationsRead}>
                      Mark all as read
                    </button>
                  )}
                </div>
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
