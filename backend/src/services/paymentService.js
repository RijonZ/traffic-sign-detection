const Stripe = require("stripe");
const { query } = require("../db/client");

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
  const userResult = await query(
    "SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
    [userEmail],
  );
  const user = userResult.rows[0];

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

  const paymentResult = await query(
    `
      INSERT INTO payments (user_id, amount, currency, provider, status, paid_at)
      VALUES ($1, $2, $3, $4, $5, now())
      RETURNING id, user_id, amount, currency, paid_at
    `,
    [userId, plan.amount / 100, plan.currency.toUpperCase(), "stripe", "paid"],
  );
  const payment = paymentResult.rows[0];
  const paymentId = paymentResult.rows[0].id;

  if (!payment) {
    return { ok: false, statusCode: 500, message: "Payment record could not be created." };
  }

  await query(
    "UPDATE subscriptions SET is_active = false, end_date = now() WHERE user_id = $1 AND is_active = true",
    [payment.user_id],
  );
  await query(
    `
      INSERT INTO subscriptions (user_id, plan_name, start_date, end_date, is_active)
      VALUES ($1, $2, now(), now() + INTERVAL '1 month', true)
    `,
    [payment.user_id, plan.name],
  );
  await query(
    `
      INSERT INTO payment_logs (payment_id, event_type, event_payload)
      VALUES ($1, $2, $3)
    `,
    [paymentId, "stripe_checkout_session_completed", JSON.stringify({ sessionId: session.id, planId: plan.id })],
  );

  return {
    ok: true,
    payment: {
      planId: plan.id,
      planName: plan.name,
      price: `$${plan.amount / 100}/month`,
      status: "Paid",
      paidAt: new Date(payment.paid_at).toLocaleString(),
    },
  };
}

module.exports = { confirmCheckoutSession, createCheckoutSession };
