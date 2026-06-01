const {
  activateBasicSubscription,
  activateDemoSubscription,
  confirmCheckoutSession,
  createCheckoutSession,
  getCurrentSubscription,
} = require("../services/paymentService");
const { readBody, sendJson } = require("../utils/http");

function getEmailFromQuery(request) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  return url.searchParams.get("email") || "";
}

async function getSubscription(request, response) {
  const email = getEmailFromQuery(request);

  if (!email) {
    sendJson(response, 400, { message: "Email is required." });
    return;
  }

  const result = await getCurrentSubscription(email);

  if (!result.ok) {
    sendJson(response, result.statusCode, { message: result.message });
    return;
  }

  sendJson(response, 200, { payment: result.payment });
}

async function activateBasicPlan(request, response) {
  try {
    const { email } = await readBody(request);

    if (!email) {
      sendJson(response, 400, { message: "Email is required." });
      return;
    }

    const result = await activateBasicSubscription(email);

    if (!result.ok) {
      sendJson(response, result.statusCode, { message: result.message });
      return;
    }

    sendJson(response, 200, { payment: result.payment });
  } catch (error) {
    sendJson(response, 400, { message: "Invalid request body." });
  }
}

async function activateDemoPlan(request, response) {
  try {
    const { email, planId } = await readBody(request);

    if (!email || !planId) {
      sendJson(response, 400, { message: "Email and plan are required." });
      return;
    }

    const result = await activateDemoSubscription(email, planId);

    if (!result.ok) {
      sendJson(response, result.statusCode, { message: result.message });
      return;
    }

    sendJson(response, 200, { payment: result.payment });
  } catch (error) {
    sendJson(response, 400, { message: "Invalid request body." });
  }
}

async function createStripeCheckoutSession(request, response) {
  try {
    const { email, planId } = await readBody(request);

    if (!email || !planId) {
      sendJson(response, 400, { message: "Email and plan are required." });
      return;
    }

    const result = await createCheckoutSession(email, planId);

    if (!result.ok) {
      sendJson(response, result.statusCode, { message: result.message });
      return;
    }

    sendJson(response, 200, { url: result.url });
  } catch (error) {
    const message = error.message.includes("STRIPE_SECRET_KEY")
      ? error.message
      : "Stripe checkout could not be created.";

    sendJson(response, 500, { message });
  }
}

async function confirmStripeCheckoutSession(request, response) {
  try {
    const { email, sessionId } = await readBody(request);

    if (!email || !sessionId) {
      sendJson(response, 400, { message: "Email and Stripe session are required." });
      return;
    }

    const result = await confirmCheckoutSession(sessionId, email);

    if (!result.ok) {
      sendJson(response, result.statusCode, { message: result.message });
      return;
    }

    sendJson(response, 200, { payment: result.payment });
  } catch (error) {
    const message = error.message.includes("STRIPE_SECRET_KEY")
      ? error.message
      : "Stripe checkout could not be confirmed.";

    sendJson(response, 500, { message });
  }
}

module.exports = {
  activateBasicPlan,
  activateDemoPlan,
  confirmStripeCheckoutSession,
  createStripeCheckoutSession,
  getSubscription,
};
