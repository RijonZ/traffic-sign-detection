import { useEffect, useState } from "react";
import "./Home.css";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import TitlePage from "./pages/TitlePage";

const ADMIN_USER = {
  name: "Admin",
  email: "admin@trafficsign.ai",
  password: "admin123",
  role: "Admin",
};

const MANAGER_USER = {
  name: "Manager",
  email: "manager@trafficsign.ai",
  password: "manager123",
  role: "Manager",
};

const USERS_KEY = "traffic-sign-users";
const SESSION_KEY = "traffic-sign-session";

const pageTitles = {
  home: "Home",
  features: "System Overview",
  dashboard: "Dashboard",
  detect: "Detect Sign",
  history: "Detection History",
  "my-reports": "My Reports",
  "all-detections": "All Detections",
  users: "Users",
  reports: "Reports",
  "model-monitoring": "Model Monitoring",
  "audit-logs": "Audit Logs",
  analytics: "Dashboard Analytics",
  "export-data": "Export Data",
};

const publicPages = ["home", "features"];

function normalizeRole(role) {
  return role === "Administrator" ? "Admin" : role || "User";
}

function normalizeUser(user) {
  return {
    ...user,
    role: normalizeRole(user.role),
  };
}

function ensureSeedUsers(savedUsers) {
  const normalizedUsers = savedUsers.map(normalizeUser);
  const withoutSeedUsers = normalizedUsers.filter(
    (user) =>
      user.email.toLowerCase() !== ADMIN_USER.email &&
      user.email.toLowerCase() !== MANAGER_USER.email
  );

  return [ADMIN_USER, MANAGER_USER, ...withoutSeedUsers];
}

function readUsers() {
  return ensureSeedUsers(JSON.parse(localStorage.getItem(USERS_KEY) || "[]"));
}

function getPageFromHash() {
  return window.location.hash.replace("#/", "") || "home";
}

function getDisplayName(email) {
  return email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "User";
}

function getTitle(page, currentUser) {
  if (page === "dashboard" && normalizeRole(currentUser?.role) === "Admin") {
    return "Admin Dashboard";
  }

  return pageTitles[page] || "Home";
}

function App() {
  const [page, setPage] = useState(getPageFromHash);
  const [users, setUsers] = useState(readUsers);
  const [currentUser, setCurrentUser] = useState(() => {
    const savedSession = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    return savedSession ? normalizeUser(savedSession) : null;
  });

  useEffect(() => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    function handleHashChange() {
      setPage(getPageFromHash());
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  function navigate(nextPage) {
    window.location.hash = `/${nextPage}`;
    setPage(nextPage);
  }

  function createSession(user) {
    const sessionUser = {
      email: user.email,
      name: user.name,
      role: normalizeRole(user.role),
    };

    setCurrentUser(sessionUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    navigate("dashboard");
  }

  function login(email, password) {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = users.find(
      (savedUser) => savedUser.email.toLowerCase() === normalizedEmail
    );

    if (
      existingUser &&
      [ADMIN_USER.email, MANAGER_USER.email].includes(normalizedEmail) &&
      existingUser.password !== password
    ) {
      return { ok: false, message: "Invalid email or password." };
    }

    if (existingUser) {
      createSession(existingUser);
      return { ok: true };
    }

    const normalUser = {
      name: getDisplayName(normalizedEmail),
      email: normalizedEmail,
      password,
      role: "User",
    };

    const nextUsers = [...users, normalUser];
    setUsers(nextUsers);
    createSession(normalUser);
    return { ok: true };
  }

  function signUp(name, email, password) {
    const userExists = users.some(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );

    if (userExists) {
      return { ok: false, message: "An account with this email already exists." };
    }

    const newUser = {
      name,
      email,
      password,
      role: "User",
    };

    const nextUsers = [...users, newUser];
    setUsers(nextUsers);
    createSession(newUser);
    return { ok: true };
  }

  function logout() {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
    navigate("home");
  }

  if (page === "login") {
    return (
      <LoginPage
        currentUser={currentUser}
        onLogin={login}
        onLogout={logout}
        onNavigate={navigate}
      />
    );
  }

  if (page === "signup") {
    return (
      <SignUpPage
        currentUser={currentUser}
        onLogout={logout}
        onNavigate={navigate}
        onSignUp={signUp}
      />
    );
  }

  if (page === "home" && !currentUser) {
    return (
      <HomePage
        currentUser={currentUser}
        onLogout={logout}
        onNavigate={navigate}
      />
    );
  }

  return (
    <TitlePage
      activePage={pageTitles[page] ? page : "home"}
      currentUser={currentUser}
      isPublicPage={publicPages.includes(page)}
      onLogout={logout}
      onNavigate={navigate}
      title={getTitle(page, currentUser)}
    />
  );
}

export default App;
