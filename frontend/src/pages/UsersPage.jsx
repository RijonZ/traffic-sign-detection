import { useEffect, useMemo, useState } from "react";
import Navbar from "../shared/Navbar";
import { usePagination, Pagination } from "../shared/Pagination";
import "../styles/auth.css";
import "../styles/dashboard.css";
import "../styles/reports.css";
import "../styles/users.css";

const USERS_KEY = "traffic-sign-users";
const API_BASE_URL = "http://localhost:5000/api";
const USERS_REFRESH_INTERVAL = 10000;

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

const EMPTY_FORM = { name: "", email: "", password: "", role: "User" };

function UsersPage({ currentUser, onLogout, onNavigate }) {
  const fallbackUsers = useMemo(readUsers, []);
  const [users, setUsers] = useState(fallbackUsers);
  const [filters, setFilters] = useState({
    role: "All",
    status: "All",
    subscription: "All",
    user: "",
  });
  const [saving, setSaving] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(null), 5000);
    return () => clearTimeout(t);
  }, [actionError]);

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

  async function handleUpdateUser(userId, updates) {
    setSaving(userId);
    setActionError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/users/${userId}?adminEmail=${encodeURIComponent(currentUser.email)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.message || "Update failed.");
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                ...(updates.role !== undefined && { role: updates.role }),
                ...(updates.isActive !== undefined && { status: updates.isActive ? "Active" : "Inactive" }),
              }
            : u
        )
      );
    } catch {
      setActionError("Could not connect to server.");
    } finally {
      setSaving(null);
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/users?adminEmail=${encodeURIComponent(currentUser.email)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createForm),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.message || "Could not create user.");
        return;
      }
      setUsers((prev) => [data, ...prev]);
      setShowCreateForm(false);
      setCreateForm(EMPTY_FORM);
    } catch {
      setCreateError("Could not connect to server.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteUser(userId, userName) {
    if (!window.confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    setSaving(userId);
    setActionError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/users/${userId}?adminEmail=${encodeURIComponent(currentUser.email)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.message || "Delete failed.");
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      setActionError("Could not connect to server.");
    } finally {
      setSaving(null);
    }
  }

  function updateFilter(key, value) {
    setFilters((currentFilters) => ({ ...currentFilters, [key]: value }));
  }

  function resetFilters() {
    setFilters({ role: "All", status: "All", subscription: "All", user: "" });
  }

  const filteredUsers = useMemo(() => {
    const search = filters.user.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch = !search ||
        String(user.name || "").toLowerCase().includes(search) ||
        String(user.email || "").toLowerCase().includes(search);
      const matchesRole = filters.role === "All" || user.role === filters.role;
      const status = user.status || "Active";
      const matchesStatus = filters.status === "All" || status === filters.status;
      const plan = (user.subscriptionPlan || "None").trim().toLowerCase();
      const isRegularUser = user.role === "User";
      const hasPaidPlan = isRegularUser && plan !== "none" && plan !== "basic";
      const matchesSubscription =
        filters.subscription === "All" ||
        (filters.subscription === "Paid" && hasPaidPlan) ||
        (filters.subscription === "None" && isRegularUser && !hasPaidPlan);

      return matchesSearch && matchesRole && matchesStatus && matchesSubscription;
    });
  }, [filters, users]);

  const { page, setPage, totalPages, paginatedItems: paginatedUsers, pageSize } = usePagination(filteredUsers);
  const admins = filteredUsers.filter((user) => user.role === "Administrator").length;
  const managers = filteredUsers.filter((user) => user.role === "Manager").length;
  const regularUsers = filteredUsers.filter((user) => user.role === "User").length;
  const paidPlans = filteredUsers.filter((u) => {
    if (u.role !== "User") return false;
    const plan = (u.subscriptionPlan || "").toLowerCase();
    return plan && plan !== "none" && plan !== "basic";
  }).length;

  useEffect(() => {
    setPage(1);
  }, [filters, setPage]);

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
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="primary-btn" onClick={() => { setShowCreateForm(true); setCreateError(""); }}>
              Add User
            </button>
            <button className="secondary-btn" onClick={() => onNavigate("admin-dashboard")}>
              Back to Admin Dashboard
            </button>
          </div>
        </section>

        {showCreateForm && (
          <div className="report-modal-overlay" onClick={() => setShowCreateForm(false)}>
            <div className="report-modal create-user-modal" onClick={(e) => e.stopPropagation()}>
              <div className="create-user-modal-header">
                <div>
                  <span className="eyebrow">Administration</span>
                  <h2>Add New User</h2>
                </div>
                <button className="report-modal-close" onClick={() => setShowCreateForm(false)}>✕</button>
              </div>

              <form onSubmit={handleCreateUser} className="create-user-form">
                <div className="create-user-field">
                  <label>Full Name</label>
                  <input
                    placeholder="e.g. Filan Fisteku"
                    value={createForm.name}
                    required
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>

                <div className="create-user-field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. filan@example.com"
                    value={createForm.email}
                    required
                    onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>

                <div className="create-user-field">
                  <label>Password</label>
                  <input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={createForm.password}
                    required
                    onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  />
                </div>

                <div className="create-user-field">
                  <label>Role</label>
                  <div className="role-picker">
                    {["User", "Manager", "Administrator"].map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`role-option${createForm.role === r ? " role-option-active" : ""}`}
                        onClick={() => setCreateForm((f) => ({ ...f, role: r }))}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {createError && <p className="auth-error">{createError}</p>}

                <div className="create-user-actions">
                  <button type="button" className="secondary-btn" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary-btn" disabled={creating}>
                    {creating ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <section className="dashboard-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
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
          <div className="dashboard-card">
            <h3>Paid Plans</h3>
            <p className="metric-value">{paidPlans}</p>
          </div>
        </section>

        {actionError && (
          <p className="auth-error" style={{ marginTop: "16px" }}>{actionError}</p>
        )}

        <section className="reports-filter-panel users-filter-panel">
          <input
            placeholder="Filter by user or email"
            value={filters.user}
            onChange={(event) => updateFilter("user", event.target.value)}
          />
          <select value={filters.role} onChange={(event) => updateFilter("role", event.target.value)}>
            <option value="All">All roles</option>
            <option value="Administrator">Administrator</option>
            <option value="Manager">Manager</option>
            <option value="User">User</option>
          </select>
          <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
            <option value="All">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <select value={filters.subscription} onChange={(event) => updateFilter("subscription", event.target.value)}>
            <option value="All">All subscriptions</option>
            <option value="Paid">Paid plans</option>
            <option value="None">No subscription</option>
          </select>
          <button className="secondary-btn" type="button" onClick={resetFilters}>
            Reset
          </button>
        </section>

        <section className="users-table">
          <div className="users-row users-head">
            <p>ID</p>
            <p>Name</p>
            <p>Email</p>
            <p>Role</p>
            <p className="subscription-cell">Subscription</p>
            <p>Status</p>
            <p>Actions</p>
          </div>

          {paginatedUsers.map((user) => {
            const isSelf = user.email === currentUser.email;
            const isBeingSaved = saving === user.id;
            const isActive = user.status !== "Inactive";
            const plan = (user.role === "Administrator" || user.role === "Manager") ? null : user.subscriptionPlan;

            return (
              <div className="users-row" key={user.email}>
                <p className="user-id" title={user.id}>
                  {user.id ? `#${String(user.id).slice(-6)}` : "—"}
                </p>
                <p title={user.name}>{user.name}</p>
                <p title={user.email}>{user.email}</p>
                <p>
                  {user.id && !isSelf ? (
                    <select
                      className="role-select"
                      value={user.role}
                      disabled={isBeingSaved}
                      onChange={(e) => handleUpdateUser(user.id, { role: e.target.value })}
                    >
                      <option value="Administrator">Administrator</option>
                      <option value="Manager">Manager</option>
                      <option value="User">User</option>
                    </select>
                  ) : (
                    user.role
                  )}
                </p>
                <p className="subscription-cell">
                  {user.role === "Administrator" || user.role === "Manager" ? (
                    <span style={{ color: "#9ca3af" }}>—</span>
                  ) : (
                    <span className={`status-pill ${plan ? "status-active" : ""}`}>
                      {plan || "None"}
                    </span>
                  )}
                </p>
                <p>
                  <span className={`status-pill ${isActive ? "status-active" : "status-inactive"}`}>
                    {user.status || "Active"}
                  </span>
                </p>
                <p>
                  {user.id && !isSelf ? (
                    <span className="users-actions">
                      <button
                        className="action-btn action-btn-toggle"
                        disabled={isBeingSaved}
                        onClick={() => handleUpdateUser(user.id, { isActive: !isActive })}
                      >
                        {isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        className="action-btn action-btn-danger"
                        disabled={isBeingSaved}
                        onClick={() => handleDeleteUser(user.id, user.name)}
                      >
                        Delete
                      </button>
                    </span>
                  ) : (
                    <span className="status-pill">You</span>
                  )}
                </p>
              </div>
            );
          })}
          {!filteredUsers.length && (
            <div className="users-row">
              <p>-</p>
              <p>No users found</p>
              <p>-</p>
              <p>-</p>
              <p className="subscription-cell">-</p>
              <p><span className="status-pill">Empty</span></p>
              <p>-</p>
            </div>
          )}
          <Pagination page={page} totalPages={totalPages} total={filteredUsers.length} pageSize={pageSize} onPage={setPage} />
        </section>
      </main>
    </div>
  );
}

export default UsersPage;
