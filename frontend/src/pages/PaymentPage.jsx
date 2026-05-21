import { useMemo, useState } from "react";
import Navbar from "../shared/Navbar";
import "../styles/auth.css";
import "../styles/dashboard.css";
import "../styles/payment.css";

const PAYMENT_KEY = "traffic-sign-payments";

const plans = [
  {
    id: "basic",
    name: "Basic",
    price: "Free",
    description: "For testing the main detection workflow.",
    features: ["3 detections", "Detection history", "PDF report download"],
  },
  {
    id: "premium",
    name: "Premium",
    price: "$9/month",
    description: "For users who need more detections and reports.",
    features: ["Unlimited detections", "Priority processing", "Advanced reports"],
  },
  {
    id: "team",
    name: "Team",
    price: "$19/month",
    description: "For managers who need exports and analytics.",
    features: ["Manager analytics", "CSV and JSON export", "Team report review"],
  },
];

function readPayments() {
  return JSON.parse(localStorage.getItem(PAYMENT_KEY) || "{}");
}

function savePayment(email, payment) {
  const savedPayments = readPayments();
  localStorage.setItem(PAYMENT_KEY, JSON.stringify({ ...savedPayments, [email]: payment }));
}

function getNextMonthDate() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toLocaleString();
}

function getExpiryDate(payment) {
  if (!payment) {
    return "";
  }

  if (payment.expiresAt) {
    return payment.expiresAt;
  }

  const date = new Date(payment.paidAt);
  date.setMonth(date.getMonth() + 1);
  return date.toLocaleString();
}

function PaymentPage({ currentUser, onLogout, onNavigate }) {
  const initialPayment = useMemo(() => {
    return currentUser ? readPayments()[currentUser.email] : null;
  }, [currentUser]);
  const [savedPayment, setSavedPayment] = useState(initialPayment);
  const [selectedPlan, setSelectedPlan] = useState(initialPayment?.planId || "premium");
  const [showCheckout, setShowCheckout] = useState(false);
  const [cardName, setCardName] = useState(currentUser?.name || "");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [message, setMessage] = useState("");

  const plan = plans.find((item) => item.id === selectedPlan);

  function choosePlan(planId) {
    const nextPlan = plans.find((item) => item.id === planId);
    setSelectedPlan(planId);
    setMessage("");

    if (nextPlan.id === "basic") {
      const payment = {
        planId: nextPlan.id,
        planName: nextPlan.name,
        price: nextPlan.price,
        status: "Active",
        paidAt: new Date().toLocaleString(),
        expiresAt: getNextMonthDate(),
        cardLast4: "Free",
      };

      savePayment(currentUser.email, payment);
      setSavedPayment(payment);
      setShowCheckout(false);
      setMessage("Basic plan is now active.");
      return;
    }

    setShowCheckout(true);
  }

  function completePayment(event) {
    event.preventDefault();

    const payment = {
      planId: plan.id,
      planName: plan.name,
      price: plan.price,
      status: plan.id === "basic" ? "Active" : "Paid",
      paidAt: new Date().toLocaleString(),
      expiresAt: getNextMonthDate(),
      cardLast4: cardNumber.slice(-4) || "Demo",
    };

    savePayment(currentUser.email, payment);
    setSavedPayment(payment);
    setShowCheckout(false);
    setMessage(`${plan.name} plan is now ${payment.status.toLowerCase()}.`);
  }

  if (!currentUser) {
    return (
      <div className="home">
        <Navbar onNavigate={onNavigate} />
        <main className="page-shell">
          <section className="auth-card">
            <h1>Sign in required</h1>
            <p>You need an account before opening subscription options.</p>
            <button className="primary-btn" onClick={() => onNavigate("login")}>
              Go to login
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="home">
      <Navbar currentUser={currentUser} onLogout={onLogout} onNavigate={onNavigate} />

      <main className="page-shell">
        <section className="dashboard-header">
          <div>
            <span className="eyebrow">Subscription module</span>
            <h1>Subscription Plans</h1>
            <p>
              Choose a plan for detections, reports, exports, and analytics.
              Paid plans open a demo checkout that can later connect to Stripe or PayPal.
            </p>
          </div>
          <button className="secondary-btn" onClick={() => onNavigate("home")}>
            Back Home
          </button>
        </section>

        <section className="payment-plans">
          {plans.map((item) => (
            <div
              className={`payment-plan ${selectedPlan === item.id ? "selected-plan" : ""}`}
              key={item.id}
            >
              <span className="eyebrow">{item.name}</span>
              <h2>{item.price}</h2>
              <p>{item.description}</p>
              {item.features.map((feature) => <small key={feature}>{feature}</small>)}
              <button
                className={item.id === "basic" ? "secondary-btn full-width" : "primary-btn full-width"}
                onClick={() => choosePlan(item.id)}
              >
                {item.id === "basic" ? "Use Basic Plan" : `Choose ${item.name}`}
              </button>
            </div>
          ))}
        </section>

        {message && <p className="payment-success">{message}</p>}

        {showCheckout && (
          <section className="payment-layout">
          <form className="payment-form" onSubmit={completePayment}>
            <h2>{plan.name} checkout</h2>
            <p className="muted-text">Use any demo card information. No real payment is processed.</p>

            <label htmlFor="card-name">Cardholder name</label>
            <input
              id="card-name"
              required
              value={cardName}
              onChange={(event) => setCardName(event.target.value)}
            />

            <label htmlFor="card-number">Card number</label>
            <input
              id="card-number"
              inputMode="numeric"
              maxLength="16"
              placeholder="4242424242424242"
              required
              value={cardNumber}
              onChange={(event) => setCardNumber(event.target.value.replace(/\D/g, ""))}
            />

            <div className="payment-fields">
              <div>
                <label htmlFor="expiry">Expiry</label>
                <input
                  id="expiry"
                  placeholder="12/28"
                  required
                  value={expiry}
                  onChange={(event) => setExpiry(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="cvv">CVV</label>
                <input id="cvv" inputMode="numeric" maxLength="3" placeholder="123" required />
              </div>
            </div>

            <button className="primary-btn full-width" type="submit">
              Confirm Demo Payment
            </button>
            <button className="secondary-btn full-width" type="button" onClick={() => setShowCheckout(false)}>
              Back to Plans
            </button>
          </form>

          <aside className="payment-summary">
            <span className="eyebrow">Checkout summary</span>
            <h2>{plan.name}</h2>
            <p><strong>Price:</strong> {plan.price}</p>
            <p><strong>User:</strong> {currentUser.email}</p>
          </aside>
          </section>
        )}

        <section className="activity-panel">
          <div>
            <h3>Current Subscription</h3>
            {savedPayment ? (
              <div className="subscription-details">
                <p><strong>Plan:</strong> {savedPayment.planName}</p>
                <p><strong>Status:</strong> {savedPayment.status}</p>
                <p><strong>Paid on:</strong> {savedPayment.paidAt}</p>
                <p><strong>Expires on:</strong> {getExpiryDate(savedPayment)}</p>
              </div>
            ) : (
              <p>No plan has been selected yet.</p>
            )}
          </div>
          <button className="secondary-btn" onClick={() => onNavigate("detect")}>
            Start Detection
          </button>
        </section>
      </main>
    </div>
  );
}

export default PaymentPage;
