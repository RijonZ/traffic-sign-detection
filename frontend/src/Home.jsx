import "./Home.css";

function Home() {
  return (
    <div className="home">
      <nav className="navbar">
        <h2>Traffic Sign AI</h2>

        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <button>Login</button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-text">
          <h1>Traffic Sign Detection System</h1>

          <p>
            A simple AI-based platform that detects traffic signs from uploaded
            images and shows prediction results in real time.
          </p>

          <div className="hero-buttons">
            <button className="primary-btn">Start Detection</button>
            <button className="secondary-btn">Learn More</button>
          </div>
        </div>

      </section>

    </div>
  );
}

export default Home;