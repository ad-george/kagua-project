import Navbar from "../components/Navbar";
import "./AboutPage.css";

function AboutPage({ onNavigate }) {
  return (
    <div className="about-page">
      <Navbar currentView="about" onNavigate={onNavigate} />

      <div className="about-inner">

        <header className="about-header">
          <p className="about-label">About Kagua</p>
          <h1 className="about-title">
            Built to help farmers think, not just follow instructions.
          </h1>
          <p className="about-intro">
            Kagua is a Media and Information Literacy (MIL) tool for smallholder
            farmers in Kenya. It does not tell you what to do. It helps you
            organise what you know, compare different sources of advice, and
            understand what is still uncertain — so you can make a better decision yourself.
          </p>
        </header>

        <section className="about-section">
          <h2 className="about-section-title">What MIL means for farmers</h2>
          <p className="about-section-text">
            Media and Information Literacy is the ability to find, evaluate, and
            use information critically. For farmers, this means being able to
            tell the difference between advice that is well-supported and advice
            that is guesswork — and knowing when you still do not have enough
            information to be sure.
          </p>
          <p className="about-section-text">
            Most agricultural apps give you an answer. Kagua shows you the
            reasoning behind it, where that reasoning is strong, and where it
            is not.
          </p>
        </section>

        <section className="about-section">
          <h2 className="about-section-title">What Kagua is not</h2>
          <ul className="about-list">
            <li>It is not a diagnosis tool — it does not replace a trained agronomist.</li>
            <li>It is not an AI that always knows the answer — it is honest about uncertainty.</li>
            <li>It is not a replacement for your own knowledge — it helps you use it better.</li>
          </ul>
        </section>

        <div className="about-cta">
          <p className="about-cta-text">Ready to start?</p>
          <button className="about-cta-btn" onClick={() => onNavigate("login")}>
            Create an account
          </button>
        </div>

      </div>

      <footer className="about-footer">
        <p>Built for smallholder farmers across Kenya · UNESCO Hackathon 2025</p>
      </footer>
    </div>
  );
}

export default AboutPage;