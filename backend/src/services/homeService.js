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
      description: `${globalStats.totalDetections} detection requests are saved in the system.`,
    },
    {
      title: "Prediction Result",
      description: `Average confidence across saved results is ${globalStats.averageConfidence}.`,
    },
    {
      title: "Detection History",
      description: `${globalStats.completedDetections} completed detections are available for review.`,
      page: "history",
      actionLabel: "Open history",
    },
  ];
}

function getUserFeatures(userStats) {
  return [
    {
      title: "Your Detections",
      description: `${userStats.totalDetections} requests saved for ${userStats.email}.`,
    },
    {
      title: "Latest Result",
      description: userStats.latestSign,
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
    features: userStats ? getUserFeatures(userStats) : getPublicFeatures(globalStats),
  };
}

module.exports = { getHomeData };
