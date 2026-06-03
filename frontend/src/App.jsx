import { lazy, Suspense } from "react";
import "./styles/global.css";
import { AppProvider, useApp } from "./context/AppContext";

const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const AllDetections = lazy(() => import("./pages/AllDetections"));
const BlankPage = lazy(() => import("./pages/BlankPage"));
const DashboardAnalytics = lazy(() => import("./pages/DashboardAnalytics"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const DetectSignPage = lazy(() => import("./pages/DetectSignPage"));
const DetectionHistory = lazy(() => import("./pages/DetectionHistory"));
const ExportData = lazy(() => import("./pages/ExportData"));
const FeaturesPage = lazy(() => import("./pages/FeaturesPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ModelMonitoring = lazy(() => import("./pages/ModelMonitoring"));
const MyReports = lazy(() => import("./pages/MyReports"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const Reports = lazy(() => import("./pages/Reports"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const FeedbacksPage = lazy(() => import("./pages/FeedbacksPage"));

const blankPages = {};

function Router() {
  const { page, currentUser, navigate, logout, login, signUp, updateProfile } = useApp();

  const common = { currentUser, onLogout: logout, onNavigate: navigate };

  if (page === "login" || page === "signup") {
    return <LoginPage {...common} onLogin={login} onSignUp={signUp} />;
  }

  if (page === "dashboard") return <DashboardPage {...common} />;
  if (page === "admin-dashboard") return <AdminDashboard {...common} />;
  if (page === "users") return <UsersPage {...common} />;
  if (page === "all-detections") return <AllDetections {...common} />;
  if (page === "reports") return <Reports {...common} />;
  if (page === "model-monitoring") return <ModelMonitoring {...common} />;
  if (page === "audit-logs") return <AuditLogs {...common} />;
  if (page === "settings") return <SettingsPage {...common} />;
  if (page === "feedbacks") return <FeedbacksPage {...common} />;
  if (page === "detect") return <DetectSignPage {...common} />;
  if (page === "features") return <FeaturesPage {...common} />;
  if (page === "history") return <DetectionHistory {...common} />;
  if (page === "my-reports") return <MyReports {...common} />;
  if (page === "dashboard-analytics") return <DashboardAnalytics {...common} />;
  if (page === "export-data") return <ExportData {...common} />;
  if (page === "profile") return <ProfilePage {...common} onUpdateProfile={updateProfile} />;

  if (page === "subscription" || page === "payment") {
    if (currentUser?.role === "Manager" || currentUser?.role === "Administrator") {
      navigate("home");
      return null;
    }
    return <PaymentPage {...common} />;
  }

  if (blankPages[page]) {
    return <BlankPage {...common} title={blankPages[page]} />;
  }

  return <HomePage {...common} />;
}

function App() {
  return (
    <AppProvider>
      <Suspense fallback={null}>
        <Router />
      </Suspense>
    </AppProvider>
  );
}

export default App;
