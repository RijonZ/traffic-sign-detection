const { query } = require("../db/client");

function formatPercent(value) {
  return `${Math.round(Number(value || 0))}%`;
}

async function getGlobalHomeStats() {
  const result = await query(
    `
      SELECT
        (SELECT count(*) FROM users WHERE is_active = true) AS total_users,
        (SELECT count(*) FROM detection_requests) AS total_detections,
        (SELECT count(*) FROM detection_requests WHERE status = 'completed') AS completed_detections,
        (SELECT COALESCE(avg(confidence), 0) FROM detection_results) AS average_confidence
    `,
  );

  const stats = result.rows[0];

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

  const result = await query(
    `
      SELECT
        u.id,
        u.email,
        trim(concat(u.first_name, ' ', u.last_name)) AS name,
        COALESCE(r.name, 'User') AS role,
        (SELECT count(*) FROM detection_requests dr WHERE dr.user_id = u.id) AS total_detections,
        (
          SELECT count(*)
          FROM detection_requests dr
          WHERE dr.user_id = u.id AND dr.status = 'completed'
        ) AS completed_detections,
        (
          SELECT COALESCE(avg(res.confidence), 0)
          FROM detection_requests dr
          JOIN detection_results res ON res.request_id = dr.id
          WHERE dr.user_id = u.id
        ) AS average_confidence,
        (
          SELECT s.plan_name
          FROM subscriptions s
          WHERE s.user_id = u.id AND s.is_active = true
          ORDER BY s.start_date DESC
          LIMIT 1
        ) AS active_plan,
        (
          SELECT ts.sign_name
          FROM detection_requests dr
          JOIN detection_results res ON res.request_id = dr.id
          LEFT JOIN traffic_signs ts ON ts.id = res.traffic_sign_id
          WHERE dr.user_id = u.id
          ORDER BY dr.requested_at DESC
          LIMIT 1
        ) AS latest_sign
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE lower(u.email) = lower($1)
      LIMIT 1
    `,
    [email],
  );

  const stats = result.rows[0];

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
