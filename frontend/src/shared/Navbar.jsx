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
  { label: "Feedbacks", page: "feedbacks" },
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
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    fetch(`${API_BASE_URL}/users/${encodeURIComponent(currentUser.email)}/notifications/read-all`, {
      method: "POST",
    }).catch(() => {});
  }

  function deleteNotification(notificationId, e) {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    fetch(`${API_BASE_URL}/users/${encodeURIComponent(currentUser.email)}/notifications/one`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    }).catch(() => {});
  }

  function deleteReadNotifications() {
    setNotifications((prev) => prev.filter((n) => !n.isRead));
    fetch(`${API_BASE_URL}/users/${encodeURIComponent(currentUser.email)}/notifications/read`, {
      method: "DELETE",
    }).catch(() => {});
  }

  function deleteAllNotifications() {
    setNotifications([]);
    fetch(`${API_BASE_URL}/users/${encodeURIComponent(currentUser.email)}/notifications/all`, {
      method: "DELETE",
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
              onClick={() => setShowNotifications(true)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2Z" />
                <path d="M10 21h4" />
              </svg>
              <span>{unreadCount}</span>
            </button>

            {showNotifications && (
              <>
                <div
                  className="notification-overlay"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="notification-drawer" role="dialog" aria-label="Notifications">
                  <div className="notification-drawer-header">
                    <h3>Notifications {notifications.length > 0 && <span className="notification-count-badge">{notifications.length}</span>}</h3>
                    <div className="notification-drawer-actions">
                      {unreadCount > 0 && (
                        <button className="notification-action-btn" onClick={markAllNotificationsRead}>
                          Mark all read
                        </button>
                      )}
                      {notifications.some((n) => n.isRead) && (
                        <button className="notification-action-btn notification-action-btn--danger" onClick={deleteReadNotifications}>
                          Clear read
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button className="notification-action-btn notification-action-btn--danger" onClick={deleteAllNotifications}>
                          Clear all
                        </button>
                      )}
                      <button
                        className="notification-close-btn"
                        aria-label="Close"
                        onClick={() => setShowNotifications(false)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="notification-drawer-body">
                    {notifications.length ? notifications.map((notification) => (
                      <div
                        className={`notification-item ${notification.isRead ? "is-read" : ""}`}
                        key={notification.id}
                      >
                        <button
                          className="notification-item-content"
                          onClick={() => openNotification(notification)}
                        >
                          <strong>{notification.title}</strong>
                          <span>{notification.message}</span>
                        </button>
                        <button
                          className="notification-delete-btn"
                          aria-label="Delete notification"
                          onClick={(e) => deleteNotification(notification.id, e)}
                        >
                          ✕
                        </button>
                      </div>
                    )) : (
                      <div className="notification-empty">
                        <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2Z" />
                          <path d="M10 21h4" />
                        </svg>
                        <span>No notifications yet.</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
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
