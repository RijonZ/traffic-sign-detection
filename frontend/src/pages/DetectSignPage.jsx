import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../shared/Navbar";
import { downloadReportPdf } from "../utils/reportPdf";
import "../styles/auth.css";
import "../styles/dashboard.css";
import "../styles/detect.css";
import "../styles/features.css";

const HISTORY_KEY = "traffic-sign-detections";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const API_BASE_URL = "http://localhost:5000/api";

const samplePredictions = [
  { sign: "Stop Sign", category: "Regulatory", confidence: 96, box: "x: 124, y: 88, w: 210, h: 210" },
  { sign: "Speed Limit", category: "Regulatory", confidence: 92, box: "x: 98, y: 74, w: 180, h: 180" },
  { sign: "Pedestrian Crossing", category: "Warning", confidence: 89, box: "x: 140, y: 102, w: 195, h: 170" },
  { sign: "No Entry", category: "Prohibition", confidence: 94, box: "x: 110, y: 90, w: 205, h: 205" },
];

const initialSteps = [
  { label: "Created", done: false },
  { label: "Uploaded", done: false },
  { label: "Validating", done: false },
  { label: "Processing", done: false },
  { label: "Predicted", done: false },
  { label: "Saved", done: false },
  { label: "Notified", done: false },
  { label: "Completed", done: false },
];

function getHistoryKey(currentUser) {
  return currentUser?.email ? `${HISTORY_KEY}:${currentUser.email}` : HISTORY_KEY;
}

function readHistory(currentUser) {
  return JSON.parse(localStorage.getItem(getHistoryKey(currentUser)) || "[]");
}

function DetectSignPage({ currentUser, onLogout, onNavigate }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [steps, setSteps] = useState(initialSteps);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(() => readHistory(currentUser));
  const timers = useRef([]);

  const canDetect = useMemo(() => file && !error && status !== "Processing", [file, error, status]);

  useEffect(() => {
    return () => {
      clearTimers();
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  useEffect(() => {
    setHistory(readHistory(currentUser));
  }, [currentUser]);

  function clearTimers() {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current = [];
  }

  function updateStep(index, nextStatus) {
    timers.current.push(
      setTimeout(() => {
        setSteps((currentSteps) =>
          currentSteps.map((step, stepIndex) => ({
            ...step,
            done: stepIndex <= index,
          }))
        );
        setStatus(nextStatus);
      }, index * 450)
    );
  }

  function validateFile(selectedFile) {
    if (!selectedFile) {
      return "Please select an image first.";
    }

    if (!selectedFile.type.startsWith("image/")) {
      return "Only image files are allowed.";
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      return "Image size must be under 5 MB.";
    }

    return "";
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files[0];
    const validationMessage = validateFile(selectedFile);

    clearTimers();
    setFile(selectedFile || null);
    setError(validationMessage);
    setIsRateLimited(false);
    setResult(null);
    setSteps(initialSteps);
    setStatus(selectedFile ? "Created" : "Ready");

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setPreview(selectedFile && !validationMessage ? URL.createObjectURL(selectedFile) : "");
  }

  function saveDetectionResult(completedResult) {
    const nextHistory = [completedResult, ...history].slice(0, 5);

    setResult(completedResult);
    setHistory(nextHistory);
    localStorage.setItem(getHistoryKey(currentUser), JSON.stringify(nextHistory));
  }

  async function requestBackendDetection() {
    const response = await fetch(`${API_BASE_URL}/detect-sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userEmail: currentUser.email,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      const err = new Error(data.message || "Detection request failed.");
      err.rateLimited = data.rateLimited || false;
      throw err;
    }

    return data.detection;
  }

  function buildLocalDetection() {
    const prediction = samplePredictions[file.name.length % samplePredictions.length];

    return {
      id: Date.now(),
      fileName: file.name,
      requestedBy: currentUser.name,
      detectedAt: new Date().toLocaleString(),
      status: "Completed",
      ...prediction,
    };
  }

  function formatBackendDetection(detection) {
    return {
      ...detection,
      requestedBy: currentUser.name,
      box: detection.box || "Saved by backend",
    };
  }

  async function runDetection() {
    const validationMessage = validateFile(file);

    if (validationMessage) {
      setError(validationMessage);
      setStatus("Rejected");
      setSteps(initialSteps);
      return;
    }

    clearTimers();
    setError("");
    setResult(null);
    setSteps(initialSteps);
    setStatus("Processing");

    let detectionResult;
    try {
      const backendDetection = await requestBackendDetection();
      detectionResult = formatBackendDetection(backendDetection);
    } catch (requestError) {
      if (requestError.rateLimited) {
        setError(requestError.message);
        setIsRateLimited(true);
        setStatus("Rejected");
        return;
      }
      detectionResult = buildLocalDetection();
    }

    ["Created", "Uploaded", "Validating", "Processing", "Predicted", "Saved", "Notified", "Completed"].forEach(
      (stepStatus, index) => updateStep(index, stepStatus)
    );

    timers.current.push(
      setTimeout(() => {
        saveDetectionResult(detectionResult);
      }, 8 * 450)
    );
  }

  function downloadReport() {
    if (!result) return;

    const reportId = `REP-${result.id}`;
    const email = currentUser?.email;

    fetch(`${API_BASE_URL}/users/${encodeURIComponent(email)}/reports/${encodeURIComponent(reportId)}/pdf`)
      .then((response) => (response.ok ? response.blob() : Promise.reject()))
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "traffic-sign-report.pdf";
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        downloadReportPdf(
          { ...result, user: result.requestedBy, status: "Completed" },
          "traffic-sign-report.pdf"
        );
      });
  }

  if (!currentUser) {
    return (
      <div className="home">
        <Navbar onNavigate={onNavigate} />
        <main className="page-shell">
          <section className="auth-card">
            <h1>Sign in required</h1>
            <p>You need an account before detecting traffic signs.</p>
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
        <section className="detect-header">
          <div>
            <span className="eyebrow">Detection page</span>
            <h1>Detect Traffic Sign</h1>
            <p>
              Upload a road image, validate it, run a simple prediction flow, and save the result
              in your local detection history.
            </p>
          </div>
          <span className="status-pill">{status}</span>
        </section>

        <section className="detect-layout">
          <div className="detect-panel">
            <h3>Upload Image</h3>

            {isRateLimited ? (
              <div className="rate-limit-banner">
                <strong>Detection limit reached</strong>
                <p>{error}</p>
                <button className="primary-btn" onClick={() => onNavigate("subscription")}>
                  Upgrade Plan
                </button>
              </div>
            ) : (
              <>
                <label className="upload-box">
                  <input type="file" accept="image/*" onChange={handleFileChange} />
                  <span>{file ? file.name : "Choose traffic sign image"}</span>
                </label>

                {error && <p className="auth-error">{error}</p>}

                {preview ? (
                  <img className="image-preview" src={preview} alt="Uploaded traffic sign preview" />
                ) : (
                  <div className="empty-preview">Image preview</div>
                )}

                <button className="primary-btn full-width" disabled={!canDetect} onClick={runDetection}>
                  Run Detection
                </button>
              </>
            )}
          </div>

          <div className="detect-panel">
            <h3>Prediction Result</h3>
            {result ? (
              <div className="result-box">
                <h2>{result.sign}</h2>
                <p>{result.category}</p>
                <strong>{result.confidence}% confidence</strong>
                <span>{result.box}</span>
                <button className="secondary-btn" onClick={downloadReport}>
                  Download Report
                </button>
              </div>
            ) : (
              <p className="muted-text">Result will appear here after the image is processed.</p>
            )}
          </div>
        </section>

        <section className="feature-section detect-flow">
          <div>
            <span className="eyebrow">Request state</span>
            <h2>Simple detection workflow</h2>
            <p>
              This follows the project diagrams: created, uploaded, validated, processed by the
              model, saved, notified, and completed.
            </p>
          </div>

          <div className="workflow-list">
            {steps.map((step, index) => (
              <div className={`workflow-step ${step.done ? "step-done" : ""}`} key={step.label}>
                <span>{index + 1}</span>
                <p>{step.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="activity-panel">
          <div>
            <h3>Recent Detection History</h3>
            {history.length ? (
              history.map((item) => (
                <p key={item.id}>
                  {item.sign} from {item.fileName} - {item.confidence}%
                </p>
              ))
            ) : (
              <p>No completed detections yet.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default DetectSignPage;
