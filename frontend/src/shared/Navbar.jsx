function Navbar({ currentUser, onNavigate }) {
  return (
    <nav className="navbar">
      <button className="brand-btn" onClick={() => onNavigate("home")}>
        Traffic Sign AI
      </button>

      <div className="nav-links">
        <button className="link-btn" onClick={() => onNavigate("home")}>
          Home
        </button>
        <button className="link-btn" onClick={() => onNavigate("features")}>
          System Overview
        </button>
        {currentUser ? (
          <button onClick={() => onNavigate("dashboard")}>Dashboard</button>
        ) : (
          <>
            <button onClick={() => onNavigate("login")}>Login</button>
            <button className="secondary-btn" onClick={() => onNavigate("signup")}>
              Request Access
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
