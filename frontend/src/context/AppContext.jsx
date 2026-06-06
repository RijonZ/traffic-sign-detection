import { createContext, useContext, useEffect, useState } from "react";
import { connectSocket, disconnectSocket } from "../socket/socket";
import { API_BASE_URL } from "../config/api";

const AppContext = createContext(null);

const SESSION_KEY = "traffic-sign-session";

function getPageFromHash() {
  return window.location.hash.replace("#/", "").split("?")[0] || "home";
}

function getLandingPage(role) {
  if (role === "Administrator") return "admin-dashboard";
  if (role === "Manager") return "dashboard-analytics";
  return "dashboard";
}

function isTokenExpired(jwt) {
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1]));
    return Date.now() / 1000 > payload.exp;
  } catch {
    return true;
  }
}

export function AppProvider({ children }) {
  const [page, setPage] = useState(getPageFromHash);
  const [currentUser, setCurrentUser] = useState(() =>
    JSON.parse(localStorage.getItem(SESSION_KEY) || "null")
  );

  useEffect(() => {
    if (!currentUser?.id || !currentUser.accessToken) return;

    if (isTokenExpired(currentUser.accessToken)) {
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

  async function login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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
    } catch {
      return { ok: false, message: "Backend is not available. Please try again later." };
    }
  }

  async function signUp(name, email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
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
    } catch {
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
    disconnectSocket();
    navigate("home");
  }

  return (
    <AppContext.Provider value={{ currentUser, page, navigate, login, logout, signUp, updateProfile }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
