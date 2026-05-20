import Navbar from "../shared/Navbar";
import "../styles/dashboard.css";
import "../styles/history.css";

const detections = [
  {
    id: "REQ-1001",
    imageName: "road-crossing.jpg",
    sign: "Pedestrian crossing",
    confidence: "96%",
    status: "Completed",
    date: "2026-05-10",
  },
  {
    id: "REQ-1002",
    imageName: "speed-limit.png",
    sign: "Speed limit 50",
    confidence: "91%",
    status: "Completed",
    date: "2026-05-11",
  },
  {
    id: "REQ-1003",
    imageName: "night-road.jpg",
    sign: "Stop sign",
    confidence: "88%",
    status: "Completed",
    date: "2026-05-12",
  },
  {
    id: "REQ-1004",
    imageName: "blurred-upload.jpg",
    sign: "Not detected",
    confidence: "-",
    status: "Rejected",
    date: "2026-05-13",
  },
];

function DetectionHistory({ currentUser, onLogout, onNavigate }) {
  return (
    <div className="home">
      <Navbar
        currentUser={currentUser}
        onLogout={onLogout}
        onNavigate={onNavigate}
      />

      <main className="page-shell">
        <section className="dashboard-header">
          <div>
            <span className="eyebrow">Saved detections</span>
            <h1>Detection History</h1>
            <p>
              Review previous image uploads, detected traffic signs, confidence
              score, and request status.
            </p>
          </div>
          <button className="secondary-btn" onClick={() => onNavigate("dashboard")}>
            Back to Dashboard
          </button>
        </section>

        <section className="history-summary">
          <div className="dashboard-card">
            <h3>Total Requests</h3>
            <p>{detections.length}</p>
          </div>

          <div className="dashboard-card">
            <h3>Completed</h3>
            <p>{detections.filter((item) => item.status === "Completed").length}</p>
          </div>

          <div className="dashboard-card">
            <h3>Rejected</h3>
            <p>{detections.filter((item) => item.status === "Rejected").length}</p>
          </div>
        </section>

        <section className="history-table">
          <div className="history-row history-head">
            <p>Request ID</p>
            <p>Image</p>
            <p>Detected Sign</p>
            <p>Confidence</p>
            <p>Status</p>
            <p>Date</p>
          </div>

          {detections.map((detection) => (
            <div className="history-row" key={detection.id}>
              <p>{detection.id}</p>
              <p>{detection.imageName}</p>
              <p>{detection.sign}</p>
              <p>{detection.confidence}</p>
              <p>
                <span className="status-pill">{detection.status}</span>
              </p>
              <p>{detection.date}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default DetectionHistory;
