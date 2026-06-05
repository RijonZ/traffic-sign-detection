const {
  activateBasicSubscription,
  activateDemoSubscription,
  cancelSubscription,
  confirmCheckoutSession,
  createCheckoutSession,
  getCurrentSubscription,
} = require("../services/paymentService");
const { sendJson } = require("../utils/http");

async function getSubscription(req, res) {
  const email = req.query.email || "";

  if (!email) {
    sendJson(res, 400, { message: "Email is required." });
    return;
  }

  const result = await getCurrentSubscription(email);

  if (!result.ok) {
    sendJson(res, result.statusCode, { message: result.message });
    return;
  }

  sendJson(res, 200, { payment: result.payment });
}

async function activateBasicPlan(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      sendJson(res, 400, { message: "Email is required." });
      return;
    }

    const result = await activateBasicSubscription(email);

    if (!result.ok) {
      sendJson(res, result.statusCode, { message: result.message });
      return;
    }

    sendJson(res, 200, { payment: result.payment });
  } catch {
    sendJson(res, 400, { message: "Invalid request body." });
  }
}

async function activateDemoPlan(req, res) {
  try {
    const { email, planId } = req.body;

    if (!email || !planId) {
      sendJson(res, 400, { message: "Email and plan are required." });
      return;
    }

    const result = await activateDemoSubscription(email, planId);

    if (!result.ok) {
      sendJson(res, result.statusCode, { message: result.message });
      return;
    }

    sendJson(res, 200, { payment: result.payment });
  } catch {
    sendJson(res, 400, { message: "Invalid request body." });
  }
}

async function createStripeCheckoutSession(req, res) {
  try {
    const { email, planId } = req.body;

    if (!email || !planId) {
      sendJson(res, 400, { message: "Email and plan are required." });
      return;
    }

    const result = await createCheckoutSession(email, planId);

    if (!result.ok) {
      sendJson(res, result.statusCode, { message: result.message });
      return;
    }

    sendJson(res, 200, { url: result.url });
  } catch (error) {
    const message = error.message.includes("STRIPE_SECRET_KEY")
      ? error.message
      : "Stripe checkout could not be created.";
    sendJson(res, 500, { message });
  }
}

async function confirmStripeCheckoutSession(req, res) {
  try {
    const { email, sessionId } = req.body;

    if (!email || !sessionId) {
      sendJson(res, 400, { message: "Email and Stripe session are required." });
      return;
    }

    const result = await confirmCheckoutSession(sessionId, email);

    if (!result.ok) {
      sendJson(res, result.statusCode, { message: result.message });
      return;
    }

    sendJson(res, 200, { payment: result.payment });
  } catch (error) {
    const message = error.message.includes("STRIPE_SECRET_KEY")
      ? error.message
      : "Stripe checkout could not be confirmed.";
    sendJson(res, 500, { message });
  }
}

async function getUserSubscription(req, res) {
  const email = decodeURIComponent(req.params.email);
  const result = await getCurrentSubscription(email);

  if (!result.ok) {
    sendJson(res, result.statusCode, { message: result.message });
    return;
  }

  sendJson(res, 200, { payment: result.payment });
}

async function cancelUserSubscription(req, res) {
  const email = decodeURIComponent(req.params.email);
  const result = await cancelSubscription(email);

  if (!result.ok) {
    sendJson(res, result.statusCode, { message: result.message });
    return;
  }

  sendJson(res, 200, { ok: true });
}

module.exports = {
  activateBasicPlan,
  activateDemoPlan,
  cancelUserSubscription,
  confirmStripeCheckoutSession,
  createStripeCheckoutSession,
  getUserSubscription,
  getSubscription,
};
