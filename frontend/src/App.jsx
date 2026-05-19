import { useEffect, useState } from "react";
import "./Home.css";
import DashboardPage from "./pages/DashboardPage";
import DetectSignPage from "./pages/DetectSignPage";
import DetectionHistory from "./pages/DetectionHistory";
import FeaturesPage from "./pages/FeaturesPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";

const ADMIN_USER = {
  name: "Admin",
  email: "admin@trafficsign.ai",
  password: "admin123",
  role: "Administrator",
};

const USERS_KEY = "traffic-sign-users";
const SESSION_KEY = "traffic-sign-session";

function readUsers() {
  const savedUsers = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  const hasAdmin = savedUsers.some((user) => user.email === ADMIN_USER.email);

  if (hasAdmin) {
    return savedUsers;
  }

  return [ADMIN_USER, ...savedUsers];
}

function getPageFromHash() {
  return window.location.hash.replace("#/", "") || "home";
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

  function login(email, password) {
    const user = users.find(
      (savedUser) =>
        savedUser.email.toLowerCase() === email.toLowerCase() &&
        savedUser.password === password
    );

    if (!user) {
      return { ok: false, message: "Invalid email or password." };
    }

    const sessionUser = {
      email: user.email,
      name: user.name,
      role: user.role,
    };

    setCurrentUser(sessionUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    navigate("dashboard");
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
    setCurrentUser({ email, name, role: "User" });
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email, name, role: "User" }));
    navigate("dashboard");
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

  if (page === "dashboard") {
    return (
      <DashboardPage
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

  return (
    <HomePage
      currentUser={currentUser}
      onLogout={logout}
      onNavigate={navigate}
    />
  );
}

export default App;
