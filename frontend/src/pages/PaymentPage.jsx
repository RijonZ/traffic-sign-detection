import { useEffect, useState } from "react";
import Navbar from "../shared/Navbar";
import "../styles/auth.css";
import "../styles/dashboard.css";
import "../styles/payment.css";

const API_BASE_URL = "http://localhost:5000/api";

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
  const [savedPayment, setSavedPayment] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("premium");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [activatingPlan, setActivatingPlan] = useState("");
  const [checkoutChecked, setCheckoutChecked] = useState(false);

  useEffect(() => {
    async function loadSubscription() {
      if (!currentUser) {
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/payments/subscription?email=${encodeURIComponent(currentUser.email)}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Subscription could not be loaded.");
        }

        if (data.payment) {
          setSavedPayment(data.payment);
          setSelectedPlan(data.payment.planId);
        }
      } catch (error) {
        setMessage(error.message);
        setMessageType("error");
      }
    }

    loadSubscription();
  }, [currentUser]);

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
        const response = await fetch(`${API_BASE_URL}/payments/confirm-checkout-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: currentUser.email, sessionId }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Stripe payment could not be confirmed.");
        }

        setSavedPayment(data.payment);
        setSelectedPlan(data.payment.planId);
        setMessage(`${data.payment.planName} plan is now paid.`);
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

    try {
      setActivatingPlan(planId);

      const response = await fetch(`${API_BASE_URL}/payments/demo-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser.email, planId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Plan could not be activated.");
      }

      setSavedPayment(data.payment);
      setMessage(`${data.payment.planName} plan is now active for demo.`);
      setMessageType("success");
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
    } finally {
      setActivatingPlan("");
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
              Paid plans are activated as demo payments and saved in the backend database.
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
                disabled={Boolean(activatingPlan)}
              >
                {activatingPlan === item.id ? "Activating..." : item.id === "basic" ? "Use Basic Plan" : `Choose ${item.name}`}
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
