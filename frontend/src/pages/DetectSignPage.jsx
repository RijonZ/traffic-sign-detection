import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../shared/Navbar";
import { downloadReportPdf } from "../utils/reportPdf";
import "../styles/auth.css";
import "../styles/dashboard.css";
import "../styles/detect.css";
import "../styles/features.css";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
import { API_BASE_URL } from "../config/api";

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

function DetectSignPage({ currentUser, onLogout, onNavigate }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [steps, setSteps] = useState(initialSteps);
  const [result, setResult] = useState(null);
  const [thresholdWarning, setThresholdWarning] = useState(null);
  const [history, setHistory] = useState([]);
  const timers = useRef([]);

  const canDetect = useMemo(() => file && !error && status !== "Processing", [file, error, status]);

  useEffect(() => {
    return () => {
      clearTimers();
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    if (!currentUser?.email) return;
    fetch(`${API_BASE_URL}/detect-sign?userEmail=${encodeURIComponent(currentUser.email)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.detections) setHistory(data.detections.slice(0, 5)); })
      .catch(() => {});
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
    setResult(completedResult);
    setHistory((prev) => [completedResult, ...prev].slice(0, 5));
  }

  function readFileAsBase64(selectedFile) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(selectedFile);
    });
  }

  async function requestBackendDetection() {
    const imageBase64 = await readFileAsBase64(file).catch(() => null);

    const response = await fetch(`${API_BASE_URL}/detect-sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userEmail: currentUser.email,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        imageBase64,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      const err = new Error(data.message || "Detection request failed.");
      err.rateLimited = data.rateLimited || false;
      throw err;
    }

    return { detection: data.detection, belowThreshold: data.belowThreshold, threshold: data.threshold, rawConfidence: data.rawConfidence };
  }

  function buildLocalDetection() {
    return {
      id: Date.now(),
      fileName: file.name,
      requestedBy: currentUser.name,
      detectedAt: new Date().toLocaleString(),
      sign: "Not detected",
      category: "Unknown",
      confidence: 0,
      status: "Completed",
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
    setThresholdWarning(null);
    setSteps(initialSteps);
    setStatus("Processing");

    let detectionResult;
    let thresholdWarning = null;
    try {
      const response = await requestBackendDetection();
      detectionResult = formatBackendDetection(response.detection);
      if (response.belowThreshold) {
        thresholdWarning = `Confidence ${response.rawConfidence}% is below the ${response.threshold}% threshold. The sign was not identified.`;
      }
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
        setThresholdWarning(thresholdWarning);
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
                {thresholdWarning && (
                  <p style={{ color: "#dc2626", fontSize: "13px", marginTop: "8px", fontWeight: "500" }}>
                    {thresholdWarning}
                  </p>
                )}
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
