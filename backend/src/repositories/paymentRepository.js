const { query } = require("../db/client");

async function findUserByEmail(email) {
  const result = await query(
    "SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
    [email]
  );
  return result.rows[0] || null;
}

async function findActiveSubscription(userId) {
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
    [userId]
  );
  return result.rows[0] || null;
}

async function deactivateSubscriptions(dbClient, userId) {
  await dbClient.query(
    "UPDATE subscriptions SET is_active = false, end_date = now() WHERE user_id = $1 AND is_active = true",
    [userId]
  );
}

async function insertPayment(dbClient, userId, amount, currency, provider, status) {
  const result = await dbClient.query(
    `INSERT INTO payments (user_id, amount, currency, provider, status, paid_at)
     VALUES ($1, $2, $3, $4, $5, now())
     RETURNING id, paid_at`,
    [userId, amount, currency, provider, status]
  );
  return result.rows[0];
}

async function insertSubscription(dbClient, userId, planName) {
  const result = await dbClient.query(
    `INSERT INTO subscriptions (user_id, plan_name, start_date, end_date, is_active)
     VALUES ($1, $2, now(), now() + INTERVAL '1 month', true)
     RETURNING plan_name, start_date, end_date, is_active`,
    [userId, planName]
  );
  return result.rows[0];
}

async function insertPaymentLog(dbClient, paymentId, eventType, payload) {
  await dbClient.query(
    `INSERT INTO payment_logs (payment_id, event_type, event_payload)
     VALUES ($1, $2, $3)`,
    [paymentId, eventType, JSON.stringify(payload)]
  );
}

async function findPaymentLogBySession(sessionId) {
  const result = await query(
    `SELECT pl.payment_id FROM payment_logs pl
     WHERE pl.event_type = 'stripe_checkout_session_completed'
     AND pl.event_payload->>'sessionId' = $1
     LIMIT 1`,
    [sessionId]
  );
  return result.rows[0] || null;
}

async function cancelActiveSubscription(userId) {
  const result = await query(
    `UPDATE subscriptions SET is_active = false, end_date = now()
     WHERE user_id = $1 AND is_active = true
     RETURNING id`,
    [userId]
  );
  return result.rows;
}

module.exports = {
  findUserByEmail,
  findActiveSubscription,
  deactivateSubscriptions,
  insertPayment,
  insertSubscription,
  insertPaymentLog,
  findPaymentLogBySession,
  cancelActiveSubscription,
};
