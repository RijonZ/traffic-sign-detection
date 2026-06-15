import { useEffect, useRef, useState } from "react";
import "../styles/chat-bot.css";

import { API_BASE_URL } from "../config/api";

const welcomeMessage = {
  sender: "bot",
  text: "Hi. I can help with detections, reports, subscriptions, exports, and dashboard questions.",
};

function getBotReply(message, currentUser) {
  const text = message.toLowerCase();

  if (text.includes("confidence")) {
    return "Confidence shows how sure the model is about the detected traffic sign. Higher values usually mean a more reliable prediction.";
  }

  if (text.includes("reject") || text.includes("failed")) {
    return "A detection can be rejected when the image is blurry, too dark, too large, not an image file, or the traffic sign is not visible enough.";
  }

  if (text.includes("report") || text.includes("pdf")) {
    return "You can open My Reports and download a structured PDF report for a selected detection.";
  }

  if (text.includes("subscription") || text.includes("payment") || text.includes("plan")) {
    return "The Subscription page shows Basic, Premium, and Team plans, including payment status and expiry date.";
  }

  if (text.includes("history")) {
    return "Detection History shows previous requests, detected signs, confidence, status, and date. It is now connected to the backend API.";
  }

  if (text.includes("export")) {
    return "Managers can use Export Data to download detection records as CSV or JSON.";
  }

  if (text.includes("dashboard")) {
    return `Your ${currentUser.role} dashboard helps you continue with the main tasks for your role.`;
  }

  if (text.includes("admin")) {
    return "Admins can review users, detections, reports, model monitoring, and audit logs.";
  }

  if (text.includes("manager")) {
    return "Managers can review analytics, reports, detections, and export system data.";
  }

  return "I can help with detection results, rejected uploads, reports, subscriptions, dashboards, and exports. Try asking about one of those topics.";
}

function ChatBot({ currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([welcomeMessage]);
  const [isSending, setIsSending] = useState(false);
  const [isNudging, setIsNudging] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    const interval = setInterval(() => {
      setIsNudging(true);
      setTimeout(() => setIsNudging(false), 900);
    }, 45000);

    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [isOpen, isSending, messages]);

  async function sendMessage(event) {
    event.preventDefault();

    if (!message.trim()) {
      return;
    }

    const userMessage = { sender: "user", text: message.trim() };
    const currentText = message.trim();

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setMessage("");
    setIsSending(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentText, user: currentUser, history: messages.slice(-10) }),
      });
      const data = response.ok ? await response.json() : null;
      const botMessage = { sender: "bot", text: data?.reply || getBotReply(currentText, currentUser) };

      setMessages((currentMessages) => [...currentMessages, botMessage]);
    } catch (error) {
      setMessages((currentMessages) => [
        ...currentMessages,
        { sender: "bot", text: getBotReply(currentText, currentUser) },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className={`chat-widget ${isOpen ? "open" : ""}`}>
      <section className={`chat-panel ${isOpen ? "open" : ""}`} aria-label="AI assistant chat">
          <div className="chat-header">
            <div>
              <span className="eyebrow">AI assistant</span>
              <h3>Traffic Sign Help</h3>
            </div>
            <button className="text-btn" onClick={() => setIsOpen(false)}>
              Close
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((item, index) => (
              <p className={`chat-message ${item.sender}`} key={`${item.sender}-${index}`}>
                {item.text}
              </p>
            ))}
            {isSending && (
              <div className="chat-message bot typing-message" aria-live="polite">
                <span>Generating response</span>
                <span className="typing-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-form" onSubmit={sendMessage}>
            <input
              aria-label="Chat message"
              placeholder="Ask about detections..."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <button className="primary-btn" disabled={isSending} type="submit">
              {isSending ? "..." : "Send"}
            </button>
          </form>
      </section>

      <button
        className={`chat-toggle primary-btn ${isNudging ? "nudge" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        AI Chat
      </button>
    </div>
  );
}

export default ChatBot;
