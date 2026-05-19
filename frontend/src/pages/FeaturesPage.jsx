import Navbar from "../shared/Navbar";

const userBenefits = [
  {
    title: "Upload Road Images",
    text: "The user can upload a road image directly from the application.",
  },
  {
    title: "Detect Traffic Signs",
    text: "The system analyzes the uploaded image and identifies the traffic sign.",
  },
  {
    title: "View Prediction Result",
    text: "The user can see the detected sign name and the confidence score.",
  },
  {
    title: "Check Request Status",
    text: "Each detection request shows if it is uploaded, processing, completed, or rejected.",
  },
  {
    title: "Review Detection History",
    text: "Previous detections can be saved so the user can review them later.",
  },
  {
    title: "Export Results",
    text: "The user can download or export detection results when a report is needed.",
  },
];

const workflowSteps = [
  "Upload image",
  "Validate image",
  "Process with ML model",
  "Save prediction result",
  "Show notification",
];

const helpfulSections = [
  {
    title: "Why this helps the user",
    items: [
      "Makes traffic sign checking faster",
      "Shows prediction confidence",
      "Keeps results organized",
    ],
  },
  {
    title: "What the user needs",
    items: [
      "A clear upload page",
      "A simple result screen",
      "A history of previous detections",
    ],
  },
  {
    title: "What stays simple",
    items: [
      "No technical setup for the user",
      "No manual sign classification",
      "No complicated dashboard actions",
    ],
  },
];

function FeaturesPage({ currentUser, onLogout, onNavigate }) {
  return (
    <div className="home">
      <Navbar
        currentUser={currentUser}
        onLogout={onLogout}
        onNavigate={onNavigate}
      />

      <main className="page-shell">
        <section className="features-header">
          <span className="eyebrow">System overview</span>
          <h1>Traffic Sign Detection for Users</h1>
          <p>
            This page explains the parts of the system that are most useful for
            the user: uploading an image, detecting the sign, viewing the result,
            and keeping previous detections organized.
          </p>
        </section>

        <section className="features-grid">
          {userBenefits.map((benefit) => (
            <div className="feature-card" key={benefit.title}>
              <h3>{benefit.title}</h3>
              <p>{benefit.text}</p>
            </div>
          ))}
        </section>

        <section className="feature-section">
          <div>
            <span className="eyebrow">Detection request flow</span>
            <h2>How the system processes an image</h2>
            <p>
              From the user's point of view, the process is simple: upload an
              image, wait for analysis, then view the prediction result.
            </p>
          </div>

          <div className="workflow-list">
            {workflowSteps.map((step, index) => (
              <div className="workflow-step" key={step}>
                <span>{index + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="role-section">
          {helpfulSections.map((group) => (
            <div className="role-card" key={group.title}>
              <h3>{group.title}</h3>
              {group.items.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default FeaturesPage;
