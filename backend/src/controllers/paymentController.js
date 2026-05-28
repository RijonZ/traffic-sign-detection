const { confirmCheckoutSession, createCheckoutSession } = require("../services/paymentService");
const { readBody, sendJson } = require("../utils/http");

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

module.exports = { confirmStripeCheckoutSession, createStripeCheckoutSession };
