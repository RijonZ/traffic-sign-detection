const homeRepo = require("../repositories/homeRepository");

function formatPercent(value) {
  return `${Math.round(Number(value || 0))}%`;
}

async function getGlobalHomeStats() {
  const stats = await homeRepo.getGlobalStats();

  return {
    totalUsers: Number(stats.total_users || 0),
    totalDetections: Number(stats.total_detections || 0),
    completedDetections: Number(stats.completed_detections || 0),
    averageConfidence: formatPercent(stats.average_confidence),
    latestSign: stats.latest_sign || null,
  };
}

async function getUserHomeStats(email) {
  if (!email) {
    return null;
  }

  const stats = await homeRepo.getUserStats(email);

  if (!stats) {
    return null;
  }

  return {
    name: stats.name || stats.email,
    email: stats.email,
    role: stats.role,
    totalDetections: Number(stats.total_detections || 0),
    completedDetections: Number(stats.completed_detections || 0),
    averageConfidence: formatPercent(stats.average_confidence),
    activePlan: stats.active_plan || "Basic",
    latestSign: stats.latest_sign || "No detection yet",
  };
}

function getPublicFeatures(globalStats) {
  return [
    {
      title: "Fast Detection",
      description: "Upload a road image and get a classified result in seconds. The model covers 43 traffic sign categories.",
    },
    {
      title: "Prediction Result",
      description: `Every prediction includes a confidence score. ${globalStats.completedDetections} detections completed so far with an average confidence of ${globalStats.averageConfidence}.`,
    },
    {
      title: "Detection History",
      description: "Every completed detection is stored and available for download as a PDF report.",
      page: "login",
      actionLabel: "Sign up to get started",
    },
  ];
}

function getUserFeatures(userStats, globalStats) {
  if (userStats.role === "Administrator") {
    return [
      {
        title: "Total Users",
        description: `${globalStats.totalUsers} registered accounts across the platform.`,
        page: "users",
        actionLabel: "Manage users",
      },
      {
        title: "Latest Detection",
        description: globalStats.latestSign
          ? `Most recent sign: ${globalStats.latestSign}.`
          : "No detections recorded yet.",
        page: "all-detections",
        actionLabel: "View all detections",
      },
      {
        title: "Model Monitoring",
        description: `${globalStats.completedDetections} completed detections. Average confidence ${globalStats.averageConfidence}.`,
        page: "model-monitoring",
        actionLabel: "Open monitoring",
      },
    ];
  }

  if (userStats.role === "Manager") {
    return [
      {
        title: "Total Detections",
        description: `${globalStats.totalDetections} requests in the system, ${globalStats.completedDetections} completed.`,
        page: "dashboard-analytics",
        actionLabel: "View analytics",
      },
      {
        title: "Total Users",
        description: `${globalStats.totalUsers} registered accounts across the platform.`,
        page: "dashboard-analytics",
        actionLabel: "View analytics",
      },
      {
        title: "Average Confidence",
        description: `System-wide average confidence is ${globalStats.averageConfidence}.`,
        page: "export-data",
        actionLabel: "Export data",
      },
    ];
  }

  return [
    {
      title: "Your Detections",
      description: `${userStats.totalDetections} requests saved for ${userStats.email}.`,
      page: "history",
      actionLabel: "View history",
    },
    {
      title: "Latest Result",
      description: userStats.latestSign,
      page: "detect",
      actionLabel: "New detection",
    },
    {
      title: "Subscription",
      description: `${userStats.activePlan} plan is active for this workspace.`,
      page: "subscription",
      actionLabel: "Open subscription",
    },
  ];
}

async function getHomeData(email) {
  const globalStats = await getGlobalHomeStats();
  const userStats = await getUserHomeStats(email);

  return {
    globalStats,
    userStats,
    features: userStats ? getUserFeatures(userStats, globalStats) : getPublicFeatures(globalStats),
  };
}

module.exports = { getHomeData };
