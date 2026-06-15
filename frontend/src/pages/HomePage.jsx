import { useEffect, useState } from "react";
import Navbar from "../shared/Navbar";
import "../styles/home.css";

import { API_BASE_URL } from "../config/api";

const roleActions = {
  Administrator: [
    { label: "Open Admin Dashboard", page: "admin-dashboard", type: "primary-btn" },
    { label: "View Users", page: "users", type: "secondary-btn" },
  ],
  Manager: [
    { label: "Open Analytics", page: "dashboard-analytics", type: "primary-btn" },
    { label: "Export Data", page: "export-data", type: "secondary-btn" },
  ],
  User: [
    { label: "Start Detection", page: "detect", type: "primary-btn" },
    { label: "My Reports", page: "my-reports", type: "secondary-btn" },
  ],
};

function HomePage({ currentUser, onLogout, onNavigate }) {
  const actions = currentUser ? roleActions[currentUser.role] || roleActions.User : [];
  const [homeData, setHomeData] = useState(null);

  useEffect(() => {
    const emailQuery = currentUser?.email ? `?email=${encodeURIComponent(currentUser.email)}` : "";

    fetch(`${API_BASE_URL}/home${emailQuery}`)
      .then((response) => response.json())
      .then((data) => setHomeData(data))
      .catch(() => setHomeData(null));
  }, [currentUser]);

  const userStats = homeData?.userStats;
  const globalStats = homeData?.globalStats;

  function getWorkspaceItems() {
    if (!userStats) return [];
    const role = userStats.role || currentUser?.role;
    if (role === "Administrator") {
      return [
        `${globalStats?.totalUsers ?? 0} registered users`,
        `${globalStats?.totalDetections ?? 0} total detections`,
        `${globalStats?.averageConfidence ?? "0%"} average confidence`,
      ];
    }
    if (role === "Manager") {
      return [
        `${globalStats?.totalDetections ?? 0} total detections`,
        `${globalStats?.completedDetections ?? 0} completed`,
        `${globalStats?.averageConfidence ?? "0%"} average confidence`,
      ];
    }
    return [
      `${userStats.totalDetections ?? 0} saved detections`,
      `Latest: ${userStats.latestSign || "No detection yet"}`,
      `${userStats.activePlan || "Basic"} plan`,
    ];
  }
  const featureCards = homeData?.features || [
    {
      title: "Fast Detection",
      description: "Upload a road image and get a classified result in seconds. The model covers 43 traffic sign categories.",
    },
    {
      title: "Prediction Result",
      description: "Every prediction includes a confidence score. Results below the configured threshold are flagged automatically.",
    },
    {
      title: "Detection History",
      description: "Every completed detection is stored and available for download as a PDF report.",
      page: "login",
      actionLabel: "Sign up to get started",
    },
  ];

  return (
    <div className="home">
      <Navbar
        currentUser={currentUser}
        onLogout={onLogout}
        onNavigate={onNavigate}
      />

      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Computer vision for road safety</span>
          <h1>{currentUser ? `Welcome, ${currentUser.name}` : "Traffic Sign Detection System"}</h1>

          <p>
            {currentUser
              ? `You are signed in as ${userStats?.role || currentUser.role}. Continue from your project workspace.`
              : "Upload road images, classify traffic signs, and review prediction confidence from a focused detection dashboard."}
          </p>

          <div className="hero-buttons">
            {currentUser ? (
              actions.map((action) => (
                <button
                  className={action.type}
                  key={action.page}
                  onClick={() => onNavigate(action.page)}
                >
                  {action.label}
                </button>
              ))
            ) : (
              <>
                <button className="primary-btn" onClick={() => onNavigate("login")}>
                  Start Detection
                </button>
                <button className="secondary-btn" onClick={() => onNavigate("login")}>
                  Login / Sign Up
                </button>
              </>
            )}
          </div>
        </div>

        <div className="hero-card">
          <span className="status-pill">{currentUser ? currentUser.role : "Detection workflow"}</span>
          <h3>{currentUser ? "Your workspace" : "How it works"}</h3>
          {(currentUser ? getWorkspaceItems() : ["Upload a road image", "Review model prediction", "Track the result"]).map(
            (item, index) => <p key={item}>{index + 1}. {item}</p>
          )}
          <button
            className="secondary-btn full-width"
            onClick={() => onNavigate(currentUser ? actions[0].page : "login")}
          >
            {currentUser ? "Continue" : "Get Started"}
          </button>
        </div>
      </section>

      <section className="features" id="features">
        {featureCards.map((feature) => (
          <div key={feature.title}>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
            {feature.page && (
              <button className="text-btn" onClick={() => onNavigate(feature.page)}>
                {feature.actionLabel}
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

export default HomePage;
