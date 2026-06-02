const Stripe = require("stripe");
const { pool } = require("../db/client");
const paymentRepo = require("../repositories/paymentRepository");
const { getClient: getRedis } = require("../db/redis");

const SUBSCRIPTION_CACHE_TTL = 300;

function subCacheKey(email) {
  return `sub:payment:${email.toLowerCase()}`;
}

async function getCachedSubscription(email) {
  try {
    const redis = getRedis();
    if (!redis) return null;
    const cached = await redis.get(subCacheKey(email));
    return cached ? (typeof cached === "string" ? JSON.parse(cached) : cached) : null;
  } catch {
    return null;
  }
}

async function setCachedSubscription(email, data) {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.setex(subCacheKey(email), SUBSCRIPTION_CACHE_TTL, JSON.stringify(data));
  } catch {}
}

async function invalidateSubscriptionCache(email) {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.del(subCacheKey(email));
  } catch {}
}

const paidPlans = {
  premium: {
    id: "premium",
    name: "Premium",
    amount: 900,
    currency: "usd",
    interval: "month",
  },
  team: {
    id: "team",
    name: "Team",
    amount: 1900,
    currency: "usd",
    interval: "month",
  },
};

const allPlans = {
  basic: {
    id: "basic",
    name: "Basic",
    amount: 0,
    currency: "USD",
  },
  ...paidPlans,
};

function formatPayment(plan, subscription, payment) {
  if (!subscription) {
    return null;
  }

  return {
    planId: plan.id,
    planName: plan.name,
    price: plan.id === "basic" ? "Free" : `$${plan.amount / 100}/month`,
    status: subscription.is_active ? (plan.id === "basic" ? "Active" : "Paid") : "Inactive",
    paidAt: payment?.paid_at ? new Date(payment.paid_at).toLocaleString() : null,
    expiresAt: subscription.end_date ? new Date(subscription.end_date).toLocaleString() : null,
  };
}

function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is missing. Add it to the project .env file.");
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function getAppBaseUrl() {
  return (process.env.APP_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
}

async function createCheckoutSession(userEmail, planId) {
  const plan = paidPlans[planId];

  if (!plan) {
    return { ok: false, statusCode: 400, message: "Selected plan is not available for Stripe checkout." };
  }

  const stripe = getStripeClient();
  const user = await paymentRepo.findUserByEmail(userEmail);

  if (!user) {
    return { ok: false, statusCode: 404, message: "User was not found." };
  }

  const baseUrl = getAppBaseUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    client_reference_id: String(user.id),
    success_url: `${baseUrl}/#/subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/#/subscription`,
    metadata: {
      userId: String(user.id),
      userEmail: user.email,
      planId: plan.id,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: plan.currency,
          product_data: {
            name: plan.name,
          },
          recurring: {
            interval: plan.interval,
          },
          unit_amount: plan.amount,
        },
      },
    ],
  });

  return { ok: true, url: session.url };
}

async function getCurrentSubscription(userEmail) {
  const cached = await getCachedSubscription(userEmail);
  if (cached) return cached;

  const user = await paymentRepo.findUserByEmail(userEmail);

  if (!user) {
    return { ok: false, statusCode: 404, message: "User was not found." };
  }

  const subscription = await paymentRepo.findActiveSubscription(user.id);

  if (!subscription) {
    const empty = { ok: true, payment: null };
    await setCachedSubscription(userEmail, empty);
    return empty;
  }

  const planId = String(subscription.plan_name || "basic").toLowerCase();
  const plan = allPlans[planId] || {
    id: planId,
    name: subscription.plan_name,
    amount: Number(subscription.amount || 0) * 100,
  };

  const result = { ok: true, payment: formatPayment(plan, subscription, subscription) };
  await setCachedSubscription(userEmail, result);
  return result;
}

async function activateBasicSubscription(userEmail) {
  return activateDemoSubscription(userEmail, "basic");
}

async function activateDemoSubscription(userEmail, planId) {
  const plan = allPlans[planId];

  if (!plan) {
    return { ok: false, statusCode: 400, message: "Selected plan is not available." };
  }

  const user = await paymentRepo.findUserByEmail(userEmail);

  if (!user) {
    return { ok: false, statusCode: 404, message: "User was not found." };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await paymentRepo.deactivateSubscriptions(client, user.id);

    const payment = await paymentRepo.insertPayment(
      client,
      user.id,
      plan.amount / 100,
      String(plan.currency || "USD").toUpperCase(),
      "demo",
      "paid"
    );

    const subscription = await paymentRepo.insertSubscription(client, user.id, plan.name);

    await paymentRepo.insertPaymentLog(
      client,
      payment.id,
      "demo_subscription_activated",
      { userEmail: user.email, planId: plan.id }
    );

    await client.query("COMMIT");
    await invalidateSubscriptionCache(userEmail);

    return {
      ok: true,
      payment: formatPayment(plan, subscription, payment),
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function confirmCheckoutSession(sessionId, userEmail) {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const plan = paidPlans[session.metadata?.planId];
  const userId = session.metadata?.userId;
  const sessionEmail = session.metadata?.userEmail || session.customer_email || "";

  if (!plan || !userId || sessionEmail.toLowerCase() !== userEmail.toLowerCase()) {
    return { ok: false, statusCode: 400, message: "Stripe checkout session does not match this user." };
  }

  if (session.status !== "complete" || session.payment_status !== "paid") {
    return { ok: false, statusCode: 402, message: "Stripe payment is not completed yet." };
  }

  const already = await paymentRepo.findPaymentLogBySession(session.id);
  if (already) {
    const current = await getCurrentSubscription(userEmail);
    return current.ok
      ? { ok: true, payment: current.payment }
      : { ok: false, statusCode: 409, message: "This Stripe session was already confirmed." };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const payment = await paymentRepo.insertPayment(
      client,
      userId,
      plan.amount / 100,
      plan.currency.toUpperCase(),
      "stripe",
      "paid"
    );

    await paymentRepo.deactivateSubscriptions(client, payment.user_id || userId);

    const subscription = await paymentRepo.insertSubscription(client, payment.user_id || userId, plan.name);

    await paymentRepo.insertPaymentLog(
      client,
      payment.id,
      "stripe_checkout_session_completed",
      { sessionId: session.id, planId: plan.id }
    );

    await client.query("COMMIT");
    await invalidateSubscriptionCache(userEmail);

    return { ok: true, payment: formatPayment(plan, subscription, payment) };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function cancelSubscription(userEmail) {
  const user = await paymentRepo.findUserByEmail(userEmail);

  if (!user) {
    return { ok: false, statusCode: 404, message: "User was not found." };
  }

  const rows = await paymentRepo.cancelActiveSubscription(user.id);

  if (!rows.length) {
    return { ok: false, statusCode: 404, message: "No active subscription found." };
  }

  await invalidateSubscriptionCache(userEmail);
  return { ok: true };
}

module.exports = {
  activateBasicSubscription,
  activateDemoSubscription,
  cancelSubscription,
  confirmCheckoutSession,
  createCheckoutSession,
  getCurrentSubscription,
};
