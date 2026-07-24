import { useEffect } from "react";
import Navbar from "../components/Navbar";
import {
  Mic,
  Layers,
  Scale,
  MessageCircle,
  Check,
  ClipboardList,
  GitCompare,
  HelpCircle,
  FileText,
} from "lucide-react";
import "./LandingPage.css";
import ctaPhone from "../assets/cta-phone.jpg";


const steps = [
  {
    icon: <Mic size={22} strokeWidth={2} />,
    title: "Describe what you see",
    desc: "Record a voice note or type what is happening in your field.",
  },
  {
    icon: <Layers size={22} strokeWidth={2} />,
    title: "Organise your information",
    desc: "Kagua helps you capture observations and the advice you have received.",
  },
  {
    icon: <Scale size={22} strokeWidth={2} />,
    title: "See what is uncertain",
    desc: "Compare sources, note where they agree or differ, and see what is still unknown.",
  },
  {
    icon: <MessageCircle size={22} strokeWidth={2} />,
    title: "Continue the conversation",
    desc: "Leave with a clear summary to discuss with an agrovet or extension officer.",
  },
];

const capabilities = [
  {
    icon: <ClipboardList size={20} strokeWidth={2} />,
    text: "Organises your field observations",
  },
  {
    icon: <GitCompare size={20} strokeWidth={2} />,
    text: "Compares advice from different sources",
  },
  {
    icon: <HelpCircle size={20} strokeWidth={2} />,
    text: "Highlights what is known and what remains unclear",
  },
  {
    icon: <FileText size={20} strokeWidth={2} />,
    text: "Prepares a summary for your next conversation",
  },
];

function LandingPage({ user, onNavigate, onLogout, scrollToAbout, onScrollToAboutDone }) {
  useEffect(() => {
    if (scrollToAbout) {
      requestAnimationFrame(() => {
        document.getElementById("about")?.scrollIntoView({ behavior: "smooth", block: "start" });
        onScrollToAboutDone?.();
      });
    }
  }, [scrollToAbout, onScrollToAboutDone]);

  const scrollToAboutSection = () => {
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="lp-page">
      <Navbar
        user={user}
        currentView="landing"
        onNavigate={onNavigate}
        onLogout={onLogout}
        onAboutClick={scrollToAboutSection}
      />

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <h1 className="lp-hero-headline">Know what you're dealing with.</h1>
          <p className="lp-hero-sub">
            Observe what you see. Compare the advice you receive. Understand what remains uncertain before making a decision.
          </p>
          <div className="lp-hero-actions">
            <button className="btn btn-primary" onClick={() => onNavigate(user ? "home" : "signup")}>
              Get started
            </button>
            <button className="btn btn-hero-ghost" onClick={scrollToAboutSection}>
              Explore Kagua
            </button>
          </div>
        </div>
      </section>

      {/* About Kagua */}
      <section className="lp-about" id="about">
        <div className="lp-about-inner">
          <p className="lp-section-label">About</p>
          {/* <h2 className="lp-about-title">
            A trusted companion for organising what you know
          </h2> */}
          <p className="lp-about-text">
            Kagua is a Media and Information Literacy tool for smallholder
            farmers in Kenya. It helps you organise what you know, compare
            different sources of advice, and understand what is still uncertain,
            so you can prepare for your next conversation with confidence.
          </p>

          <ul className="lp-capabilities">
            {capabilities.map((c, i) => (
              <li className="lp-capability" key={i}>
                <span className="lp-capability-icon">{c.icon}</span>
                <span className="lp-capability-text">{c.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section className="lp-steps">
        <div className="lp-steps-inner">
          <div className="lp-steps-head">
            <p className="lp-section-label">How it works</p>
            <h2 className="lp-steps-title">Four simple steps</h2>
          </div>
          <div className="lp-steps-grid">
            {steps.map((step, i) => (
              <div className="card lp-step-card" key={i}>
                <div className="lp-step-icon">{step.icon}</div>
                <p className="lp-step-num">Step {i + 1}</p>
                <h3 className="lp-step-title">{step.title}</h3>
                <p className="lp-step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to action */}
      
      {/* Call to action */}
      <section className="lp-cta">
        <div className="lp-cta-inner">

          <div className="lp-cta-content">

            <div className="lp-cta-text-side">
              <p className="lp-section-label">Get Started</p>

              <h2 className="lp-cta-title">
                Turn Observations into Understanding.
              </h2>

              <p className="lp-cta-text">
                Start with one observation. It takes less than a minute and
                it's the first step toward clarity.
              </p>

              <div className="lp-cta-actions">
                {!user ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => onNavigate("signup")}
                  >
                    Get started
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={() => onNavigate("home")}
                  >
                    Go to dashboard
                  </button>
                )}
              </div>
            </div>

            <div className="lp-cta-image-side">
              <img
                src={ctaPhone}
                alt="Farmer reviewing information on a mobile phone"
                className="lp-cta-image"
              />
            </div>

          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <p className="lp-footer-text">
          Built for smallholder farmers across Kenya. &copy; 2026 Kagua. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default LandingPage;
