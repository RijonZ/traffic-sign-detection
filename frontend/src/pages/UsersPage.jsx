import { useEffect, useMemo, useState } from "react";
import Navbar from "../shared/Navbar";
import "../styles/auth.css";
import "../styles/dashboard.css";
import "../styles/users.css";

const USERS_KEY = "traffic-sign-users";
const API_BASE_URL = "http://localhost:5000/api";
const USERS_REFRESH_INTERVAL = 2000;

const defaultUsers = [
  { name: "Admin", email: "admin@trafficsign.ai", role: "Administrator" },
  { name: "Manager", email: "manager@trafficsign.ai", role: "Manager" },
];

function readUsers() {
  const savedUsers = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  const allUsers = [...defaultUsers, ...savedUsers];

  return allUsers.filter(
    (user, index) =>
      allUsers.findIndex((item) => item.email.toLowerCase() === user.email.toLowerCase()) === index
  );
}

function UsersPage({ currentUser, onLogout, onNavigate }) {
  const fallbackUsers = useMemo(readUsers, []);
  const [users, setUsers] = useState(fallbackUsers);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "Administrator") {
      return;
    }

    function loadUsers() {
      fetch(`${API_BASE_URL}/admin/users?adminEmail=${encodeURIComponent(currentUser.email)}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (data?.users?.length) {
            setUsers(data.users);
          }
        })
        .catch(() => setUsers(fallbackUsers));
    }

    loadUsers();
    window.addEventListener("focus", loadUsers);
    const refreshTimer = window.setInterval(loadUsers, USERS_REFRESH_INTERVAL);

    return () => {
      window.removeEventListener("focus", loadUsers);
      window.clearInterval(refreshTimer);
    };
  }, [currentUser]);

  const admins = users.filter((user) => user.role === "Administrator").length;
  const managers = users.filter((user) => user.role === "Manager").length;
  const regularUsers = users.filter((user) => user.role === "User").length;

  if (!currentUser) {
    return (
      <div className="home">
        <Navbar onNavigate={onNavigate} />
        <main className="page-shell">
          <section className="auth-card">
            <h1>Sign in required</h1>
            <p>You need an administrator account before viewing users.</p>
            <button className="primary-btn" onClick={() => onNavigate("login")}>
              Go to login
            </button>
          </section>
        </main>
      </div>
    );
  }

  if (currentUser.role !== "Administrator") {
    return (
      <div className="home">
        <Navbar currentUser={currentUser} onLogout={onLogout} onNavigate={onNavigate} />
        <main className="page-shell">
          <section className="auth-card">
            <h1>Admin access only</h1>
            <p>Only administrators can view and manage system users.</p>
            <button className="secondary-btn" onClick={() => onNavigate("home")}>
              Back home
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="home">
      <Navbar currentUser={currentUser} onLogout={onLogout} onNavigate={onNavigate} />

      <main className="page-shell">
        <section className="dashboard-header">
          <div>
            <span className="eyebrow">Administration</span>
            <h1>Users</h1>
            <p>Review registered accounts and check which role each user has in the system.</p>
          </div>
          <button className="secondary-btn" onClick={() => onNavigate("admin-dashboard")}>
            Back to Admin Dashboard
          </button>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-card">
            <h3>Online Now</h3>
            <p className="metric-value">
              {users.filter((user) => user.sessionStatus === "Online").length}
            </p>
          </div>
          <div className="dashboard-card">
            <h3>Administrators</h3>
            <p className="metric-value">{admins}</p>
          </div>
          <div className="dashboard-card">
            <h3>Managers</h3>
            <p className="metric-value">{managers}</p>
          </div>
          <div className="dashboard-card">
            <h3>Users</h3>
            <p className="metric-value">{regularUsers}</p>
          </div>
        </section>

        <section className="users-table">
          <div className="users-row users-head">
            <p>Name</p>
            <p>Email</p>
            <p>Role</p>
            <p>Session</p>
          </div>

          {users.map((user) => (
            <div className="users-row" key={user.email}>
              <p>{user.name}</p>
              <p>{user.email}</p>
              <p>{user.role}</p>
              <p>
                <span className="status-pill">{user.sessionStatus || "Offline"}</span>
              </p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default UsersPage;
