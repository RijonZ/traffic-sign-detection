import Navbar from "../shared/Navbar";

function BlankPage({ currentUser, onLogout, onNavigate, title }) {
  return (
    <div className="home">
      <Navbar currentUser={currentUser} onLogout={onLogout} onNavigate={onNavigate} />
      <main className="page-shell blank-page" aria-label={title}></main>
    </div>
  );
}

export default BlankPage;
