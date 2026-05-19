function Navbar({ currentUser, onLogout, onNavigate }) {
  return (
    <nav className="navbar">
      <button className="brand-btn" onClick={() => onNavigate("home")}>
        Traffic Sign AI
      </button>

      <div className="nav-links">
        <button className="link-btn" onClick={() => onNavigate("features")}>
          System Overview
        </button>

        {currentUser && (
          <button className="link-btn" onClick={() => onNavigate("dashboard")}>
            Dashboard
          </button>
        )}

        {currentUser ? (
          <button onClick={onLogout}>Logout</button>
        ) : (
          <>
            <button className="link-btn" onClick={() => onNavigate("signup")}>
              Request access
            </button>
            <button onClick={() => onNavigate("login")}>Login</button>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
