const Stripe = require("stripe");
const { pool, query } = require("../db/client");

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

async function getUserByEmail(userEmail) {
  const result = await query(
    "SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
    [userEmail],
  );

  return result.rows[0] || null;
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
  const user = await getUserByEmail(userEmail);

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
  const user = await getUserByEmail(userEmail);

  if (!user) {
    return { ok: false, statusCode: 404, message: "User was not found." };
  }

  const result = await query(
    `
      SELECT
        s.plan_name,
        s.start_date,
        s.end_date,
        s.is_active,
        p.amount,
        p.currency,
        p.paid_at
      FROM subscriptions s
      LEFT JOIN payments p
        ON p.user_id = s.user_id
        AND p.paid_at >= s.start_date - INTERVAL '1 minute'
        AND p.paid_at <= s.start_date + INTERVAL '5 minutes'
      WHERE s.user_id = $1 AND s.is_active = true
      ORDER BY s.start_date DESC, p.paid_at DESC
      LIMIT 1
    `,
    [user.id],
  );
  const subscription = result.rows[0];

  if (!subscription) {
    return { ok: true, payment: null };
  }

  const planId = String(subscription.plan_name || "basic").toLowerCase();
  const plan = allPlans[planId] || {
    id: planId,
    name: subscription.plan_name,
    amount: Number(subscription.amount || 0) * 100,
  };

  return { ok: true, payment: formatPayment(plan, subscription, subscription) };
}

async function activateBasicSubscription(userEmail) {
  return activateDemoSubscription(userEmail, "basic");
}

async function activateDemoSubscription(userEmail, planId) {
  const plan = allPlans[planId];

  if (!plan) {
    return { ok: false, statusCode: 400, message: "Selected plan is not available." };
  }

  const user = await getUserByEmail(userEmail);

  if (!user) {
    return { ok: false, statusCode: 404, message: "User was not found." };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      "UPDATE subscriptions SET is_active = false, end_date = now() WHERE user_id = $1 AND is_active = true",
      [user.id],
    );

    const paymentResult = await client.query(
      `INSERT INTO payments (user_id, amount, currency, provider, status, paid_at)
       VALUES ($1, $2, $3, $4, $5, now())
       RETURNING id, paid_at`,
      [user.id, plan.amount / 100, String(plan.currency || "USD").toUpperCase(), "demo", "paid"],
    );

    const subscriptionResult = await client.query(
      `INSERT INTO subscriptions (user_id, plan_name, start_date, end_date, is_active)
       VALUES ($1, $2, now(), now() + INTERVAL '1 month', true)
       RETURNING plan_name, start_date, end_date, is_active`,
      [user.id, plan.name],
    );

    await client.query(
      `INSERT INTO payment_logs (payment_id, event_type, event_payload)
       VALUES ($1, $2, $3)`,
      [paymentResult.rows[0].id, "demo_subscription_activated", JSON.stringify({ userEmail: user.email, planId: plan.id })],
    );

    await client.query("COMMIT");

    return {
      ok: true,
      payment: formatPayment(plan, subscriptionResult.rows[0], paymentResult.rows[0]),
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

  // Idempotency: nëse sesioni është procesuar tashmë, kthe subscriptionin aktual
  const already = await query(
    `SELECT pl.payment_id FROM payment_logs pl
     WHERE pl.event_type = 'stripe_checkout_session_completed'
     AND pl.event_payload->>'sessionId' = $1
     LIMIT 1`,
    [session.id],
  );
  if (already.rows.length) {
    const current = await getCurrentSubscription(userEmail);
    return current.ok
      ? { ok: true, payment: current.payment }
      : { ok: false, statusCode: 409, message: "This Stripe session was already confirmed." };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const paymentResult = await client.query(
      `INSERT INTO payments (user_id, amount, currency, provider, status, paid_at)
       VALUES ($1, $2, $3, $4, $5, now())
       RETURNING id, user_id, amount, currency, paid_at`,
      [userId, plan.amount / 100, plan.currency.toUpperCase(), "stripe", "paid"],
    );
    const payment = paymentResult.rows[0];

    await client.query(
      "UPDATE subscriptions SET is_active = false, end_date = now() WHERE user_id = $1 AND is_active = true",
      [payment.user_id],
    );

    const subscriptionResult = await client.query(
      `INSERT INTO subscriptions (user_id, plan_name, start_date, end_date, is_active)
       VALUES ($1, $2, now(), now() + INTERVAL '1 month', true)
       RETURNING plan_name, start_date, end_date, is_active`,
      [payment.user_id, plan.name],
    );

    await client.query(
      `INSERT INTO payment_logs (payment_id, event_type, event_payload)
       VALUES ($1, $2, $3)`,
      [payment.id, "stripe_checkout_session_completed", JSON.stringify({ sessionId: session.id, planId: plan.id })],
    );

    await client.query("COMMIT");

    return { ok: true, payment: formatPayment(plan, subscriptionResult.rows[0], payment) };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function cancelSubscription(userEmail) {
  const user = await getUserByEmail(userEmail);

  if (!user) {
    return { ok: false, statusCode: 404, message: "User was not found." };
  }

  const result = await query(
    `UPDATE subscriptions SET is_active = false, end_date = now()
     WHERE user_id = $1 AND is_active = true
     RETURNING id`,
    [user.id]
  );

  if (!result.rows.length) {
    return { ok: false, statusCode: 404, message: "No active subscription found." };
  }

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
