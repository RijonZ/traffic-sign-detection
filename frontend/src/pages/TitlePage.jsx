import DashboardLayout from "../shared/DashboardLayout";
import Navbar from "../shared/Navbar";

function TitleSection({ title }) {
  return (
    <section className="title-page">
      <h1>{title}</h1>
    </section>
  );
}

function TitlePage({ activePage, currentUser, isPublicPage, onLogout, onNavigate, title }) {
  if (currentUser) {
    return (
      <DashboardLayout
        activePage={activePage}
        currentUser={currentUser}
        onLogout={onLogout}
        onNavigate={onNavigate}
      >
        <TitleSection title={title} />
      </DashboardLayout>
    );
  }

  if (!isPublicPage) {
    return (
      <div className="home">
        <Navbar onNavigate={onNavigate} />
        <main className="page-shell">
          <section className="auth-card">
            <h1>Sign in required</h1>
            <p>You need an account before opening this page.</p>
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
      <Navbar onNavigate={onNavigate} />
      <main className="page-shell">
        <TitleSection title={title} />
      </main>
    </div>
  );
}

export default TitlePage;
