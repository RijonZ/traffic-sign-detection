import DashboardLayout from "../shared/DashboardLayout";
import Navbar from "../shared/Navbar";

function SignUpPage({ currentUser, onLogout, onNavigate }) {
  if (currentUser) {
    return (
      <DashboardLayout
        activePage="signup"
        currentUser={currentUser}
        onLogout={onLogout}
        onNavigate={onNavigate}
      >
        <section className="title-page">
          <h1>Request Access</h1>
        </section>
      </DashboardLayout>
    );
  }

  return (
    <div className="home">
      <Navbar onNavigate={onNavigate} />
      <main className="page-shell">
        <section className="title-page">
          <h1>Request Access</h1>
        </section>
      </main>
    </div>
  );
}

export default SignUpPage;
