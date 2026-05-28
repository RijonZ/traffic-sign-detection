import { useEffect, useMemo, useState } from "react";
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
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [redirectingPlan, setRedirectingPlan] = useState("");
  const [checkoutChecked, setCheckoutChecked] = useState(false);

  useEffect(() => {
    async function confirmStripeReturn() {
      const queryText = window.location.hash.split("?")[1] || "";
      const params = new URLSearchParams(queryText);
      const sessionId = params.get("session_id");

      if (!currentUser || checkoutChecked || params.get("checkout") !== "success" || !sessionId) {
        return;
      }

      setCheckoutChecked(true);
      setMessage("Confirming Stripe payment...");
      setMessageType("success");

      try {
        const response = await fetch("http://localhost:5000/api/payments/confirm-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: currentUser.email, sessionId }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Stripe payment could not be confirmed.");
        }

        const payment = {
          ...data.payment,
          expiresAt: getNextMonthDate(),
        };

        savePayment(currentUser.email, payment);
        setSavedPayment(payment);
        setSelectedPlan(payment.planId);
        setMessage(`${payment.planName} plan is now paid.`);
        window.history.replaceState(null, "", "#/subscription");
      } catch (error) {
        setMessage(error.message);
        setMessageType("error");
      }
    }

    confirmStripeReturn();
  }, [checkoutChecked, currentUser]);

  async function choosePlan(planId) {
    const nextPlan = plans.find((item) => item.id === planId);
    setSelectedPlan(planId);
    setMessage("");
    setMessageType("success");

    if (nextPlan.id === "basic") {
      const payment = {
        planId: nextPlan.id,
        planName: nextPlan.name,
        price: nextPlan.price,
        status: "Active",
      };

      savePayment(currentUser.email, payment);
      setSavedPayment(payment);
      setMessage("Basic plan is now active.");
      setMessageType("success");
      return;
    }

    try {
      setRedirectingPlan(planId);

      const response = await fetch("http://localhost:5000/api/payments/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser.email, planId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Stripe checkout could not be created.");
      }

      window.location.href = data.url;
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
      setRedirectingPlan("");
    }
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
              Paid plans redirect to Stripe Checkout so the payment is completed securely outside the app.
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
                disabled={Boolean(redirectingPlan)}
              >
                {redirectingPlan === item.id ? "Redirecting to Stripe..." : item.id === "basic" ? "Use Basic Plan" : `Choose ${item.name}`}
              </button>
            </div>
          ))}
        </section>

        {message && <p className={messageType === "error" ? "payment-error" : "payment-success"}>{message}</p>}

        <section className="activity-panel">
          <div>
            <h3>Current Subscription</h3>
            {savedPayment ? (
              <div className="subscription-details">
                <p><strong>Plan:</strong> {savedPayment.planName}</p>
                <p><strong>Status:</strong> {savedPayment.status}</p>
                {savedPayment.planId !== "basic" && (
                  <>
                    <p><strong>Paid on:</strong> {savedPayment.paidAt}</p>
                    <p><strong>Expires on:</strong> {getExpiryDate(savedPayment)}</p>
                  </>
                )}
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
