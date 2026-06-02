import { lazy, Suspense, useEffect, useState } from "react";
import "./styles/global.css";
import { connectSocket, disconnectSocket } from "./socket/socket";

const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const AllDetections = lazy(() => import("./pages/AllDetections"));
const BlankPage = lazy(() => import("./pages/BlankPage"));
const DashboardAnalytics = lazy(() => import("./pages/DashboardAnalytics"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const DetectSignPage = lazy(() => import("./pages/DetectSignPage"));
const DetectionHistory = lazy(() => import("./pages/DetectionHistory"));
const ExportData = lazy(() => import("./pages/ExportData"));
const FeaturesPage = lazy(() => import("./pages/FeaturesPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ModelMonitoring = lazy(() => import("./pages/ModelMonitoring"));
const MyReports = lazy(() => import("./pages/MyReports"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const Reports = lazy(() => import("./pages/Reports"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const FeedbacksPage = lazy(() => import("./pages/FeedbacksPage"));

const USERS_KEY = "traffic-sign-users";
const SESSION_KEY = "traffic-sign-session";

const blankPages = {};

function getPageFromHash() {
  return window.location.hash.replace("#/", "").split("?")[0] || "home";
}

const API_BASE_URL = "http://localhost:5000/api";

function App() {
  const [page, setPage] = useState(getPageFromHash);
  const [currentUser, setCurrentUser] = useState(() => {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  });

  useEffect(() => {
    if (!currentUser?.id) return;

    const token = currentUser.accessToken;
    if (!token) return;

    // Decode JWT payload without verifying signature (frontend only reads exp)
    function isExpired(jwt) {
      try {
        const payload = JSON.parse(atob(jwt.split(".")[1]));
        return Date.now() / 1000 > payload.exp;
      } catch {
        return true;
      }
    }

    if (isExpired(token)) {
      // Access token expired — try silent refresh
      fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: currentUser.refreshToken }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.accessToken) {
            const updated = { ...currentUser, accessToken: data.accessToken };
            setCurrentUser(updated);
            localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
            connectSocket(currentUser.id);
          } else {
            // Refresh token also expired — force logout
            setCurrentUser(null);
            localStorage.removeItem(SESSION_KEY);
          }
        })
        .catch(() => {});
    } else {
      connectSocket(currentUser.id);
    }
  }, []);

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

  async function login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        body: JSON.stringify({ email, password }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Invalid email or password." };
      }

      const sessionUser = data.user;

      setCurrentUser(sessionUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      connectSocket(sessionUser.id);
      navigate(getLandingPage(sessionUser.role));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: "Backend is not available. Please try again later." };
    }
  }

  async function signUp(name, email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        body: JSON.stringify({ name, email, password }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Sign up failed." };
      }

      const sessionUser = data.user;

      setCurrentUser(sessionUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      connectSocket(sessionUser.id);
      navigate(getLandingPage(sessionUser.role));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: "Backend is not available. Please try again later." };
    }
  }

  function updateProfile(updatedUser) {
    const merged = { ...currentUser, ...updatedUser };
    setCurrentUser(merged);
    localStorage.setItem(SESSION_KEY, JSON.stringify(merged));
  }

  function logout() {
    const refreshToken = currentUser?.refreshToken;

    if (refreshToken) {
      fetch(`${API_BASE_URL}/auth/logout`, {
        body: JSON.stringify({ refreshToken }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }).catch(() => {});
    }

    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
    disconnectSocket();
    navigate("home");
  }

  function renderPage() {
    if (page === "login" || page === "signup") {
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

    if (page === "reports") {
      return (
        <Reports
          currentUser={currentUser}
          onLogout={logout}
          onNavigate={navigate}
        />
      );
    }

    if (page === "model-monitoring") {
      return (
        <ModelMonitoring
          currentUser={currentUser}
          onLogout={logout}
          onNavigate={navigate}
        />
      );
    }

    if (page === "audit-logs") {
      return (
        <AuditLogs
          currentUser={currentUser}
          onLogout={logout}
          onNavigate={navigate}
        />
      );
    }

    if (page === "settings") {
      return (
        <SettingsPage
          currentUser={currentUser}
          onLogout={logout}
          onNavigate={navigate}
        />
      );
    }

    if (page === "feedbacks") {
      return (
        <FeedbacksPage
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

    if (page === "export-data") {
      return (
        <ExportData
          currentUser={currentUser}
          onLogout={logout}
          onNavigate={navigate}
        />
      );
    }

    if (page === "profile") {
      return (
        <ProfilePage
          currentUser={currentUser}
          onLogout={logout}
          onNavigate={navigate}
          onUpdateProfile={updateProfile}
        />
      );
    }

    if (page === "subscription" || page === "payment") {
      if (currentUser?.role === "Manager" || currentUser?.role === "Administrator") {
        navigate("home");
        return null;
      }
      return (
        <PaymentPage
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

  return <Suspense fallback={null}>{renderPage()}</Suspense>;
}

export default App;
