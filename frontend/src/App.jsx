import { useEffect, useState } from "react";
import "./styles/global.css";
import AdminDashboard from "./pages/AdminDashboard";
import AllDetections from "./pages/AllDetections";
import BlankPage from "./pages/BlankPage";
import DashboardAnalytics from "./pages/DashboardAnalytics";
import DashboardPage from "./pages/DashboardPage";
import DetectSignPage from "./pages/DetectSignPage";
import DetectionHistory from "./pages/DetectionHistory";
import FeaturesPage from "./pages/FeaturesPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MyReports from "./pages/MyReports";
import UsersPage from "./pages/UsersPage";

const ADMIN_USER = {
  name: "Admin",
  email: "admin@trafficsign.ai",
  password: "admin123",
  role: "Administrator",
};

const MANAGER_USER = {
  name: "Manager",
  email: "manager@trafficsign.ai",
  password: "manager123",
  role: "Manager",
};

const USERS_KEY = "traffic-sign-users";
const SESSION_KEY = "traffic-sign-session";
const DEFAULT_USERS = [ADMIN_USER, MANAGER_USER];

const blankPages = {
  reports: "Reports",
  "model-monitoring": "Model Monitoring",
  "audit-logs": "Audit Logs",
  "export-data": "Export Data",
};

function readUsers() {
  const savedUsers = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  const missingDefaultUsers = DEFAULT_USERS.filter(
    (defaultUser) =>
      !savedUsers.some((user) => user.email.toLowerCase() === defaultUser.email.toLowerCase())
  );

  return [...missingDefaultUsers, ...savedUsers];
}

function getPageFromHash() {
  return window.location.hash.replace("#/", "") || "home";
}

function getRoleFromEmail(email) {
  const normalizedEmail = email.toLowerCase();

  if (normalizedEmail.includes("admin")) {
    return "Administrator";
  }

  if (normalizedEmail.includes("manager")) {
    return "Manager";
  }

  return "User";
}

function App() {
  const [page, setPage] = useState(getPageFromHash);
  const [users, setUsers] = useState(readUsers);
  const [currentUser, setCurrentUser] = useState(() => {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
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

  function getLandingPage(role) {
    if (role === "Administrator") {
      return "admin-dashboard";
    }

    if (role === "Manager") {
      return "dashboard-analytics";
    }

    return "dashboard";
  }

  function login(email, password) {
    const user = users.find(
      (savedUser) =>
        savedUser.email.toLowerCase() === email.toLowerCase() &&
        savedUser.password === password
    );

    if (!user) {
      return { ok: false, message: "Invalid email or password." };
    }

    const role = getRoleFromEmail(user.email);
    const sessionUser = {
      email: user.email,
      name: user.name,
      role,
    };

    setCurrentUser(sessionUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    navigate(getLandingPage(role));
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
      role: getRoleFromEmail(email),
    };

    const nextUsers = [...users, newUser];
    const sessionUser = { email, name, role: newUser.role };

    setUsers(nextUsers);
    setCurrentUser(sessionUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    navigate(getLandingPage(newUser.role));
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
        onSignUp={signUp}
      />
    );
  }

  if (page === "signup") {
    return (
      <LoginPage
        currentUser={currentUser}
        onLogin={login}
        onLogout={logout}
        onNavigate={navigate}
        onSignUp={signUp}
      />
    );
  }

  if (page === "dashboard") {
    return (
      <DashboardPage
        currentUser={currentUser}
        onLogout={logout}
        onNavigate={navigate}
      />
    );
  }

  if (page === "admin-dashboard") {
    return (
      <AdminDashboard
        currentUser={currentUser}
        onLogout={logout}
        onNavigate={navigate}
      />
    );
  }

  if (page === "users") {
    return (
      <UsersPage
        currentUser={currentUser}
        onLogout={logout}
        onNavigate={navigate}
      />
    );
  }

  if (page === "all-detections") {
    return (
      <AllDetections
        currentUser={currentUser}
        onLogout={logout}
        onNavigate={navigate}
      />
    );
  }

  if (page === "detect") {
    return (
      <DetectSignPage
        currentUser={currentUser}
        onLogout={logout}
        onNavigate={navigate}
      />
    );
  }

  if (page === "features") {
    return (
      <FeaturesPage
        currentUser={currentUser}
        onLogout={logout}
        onNavigate={navigate}
      />
    );
  }

  if (page === "history") {
    return (
      <DetectionHistory
        currentUser={currentUser}
        onLogout={logout}
        onNavigate={navigate}
      />
    );
  }

  if (page === "my-reports") {
    return (
      <MyReports
        currentUser={currentUser}
        onLogout={logout}
        onNavigate={navigate}
      />
    );
  }

  if (page === "dashboard-analytics") {
    return (
      <DashboardAnalytics
        currentUser={currentUser}
        onLogout={logout}
        onNavigate={navigate}
      />
    );
  }

  if (blankPages[page]) {
    return (
      <BlankPage
        currentUser={currentUser}
        onLogout={logout}
        onNavigate={navigate}
        title={blankPages[page]}
      />
    );
  }

  return (
    <HomePage
      currentUser={currentUser}
      onLogout={logout}
      onNavigate={navigate}
    />
  );
}

export default App;
