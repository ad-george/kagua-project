import { useState, useEffect } from "react";
import { fetchJourneys } from "../services/authStorage";
import { Plus, ArrowRight, Clock, Info, Sprout } from "lucide-react";
import "./Home.css";
import { FileText } from "lucide-react";

function Home({ user, onStartNew }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadJourneys() {
      const journeys = await fetchJourneys(user.phone);
      setConversations(journeys);
      setLoading(false);
    }
    loadJourneys();
  }, [user.phone]);

  const activeJourney = conversations.find(
    (c) => (c.status || "").toLowerCase() !== "completed"
  );
  const pastSummaries = conversations.filter((c) => c !== activeJourney);

  return (
    <div className="home-container">
      <div className="home-header">
        <h1 className="home-title">Welcome back, {user.name}</h1>
        <p className="home-county">{user.county} County</p>
      </div>

      <div className="home-top-grid">
        <button className="home-tile home-cta-card" onClick={onStartNew}>
          <span className="home-cta-icon">
            <Plus size={22} strokeWidth={2.5} />
          </span>
          <span className="home-cta-title">Start new conversation</span>
          <span className="home-cta-sub">Tell Kagua what you're seeing</span>
        </button>

        {!loading && activeJourney && (
          <div className="home-tile home-continue-card">
            <p className="home-section-label home-tile-label">Current conversation</p>
            <p className="home-continue-crop">
              {activeJourney.crop} — {activeJourney.problem}
            </p>
            <p className="home-continue-meta">
              <Clock size={14} strokeWidth={2} />
              {activeJourney.created_at
                ? new Date(activeJourney.created_at).toLocaleDateString()
                : "In progress"}
            </p>
            <button className="home-continue-btn" onClick={onStartNew}>
              Continue
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>

      <section className="home-section">
        <div className="home-section-header">
          <p className="home-section-label">Previous summaries</p>
          {/* {!loading && pastSummaries.length > 0 && (
            <span className="home-conversations-count">{pastSummaries.length}</span>
          )} */}
        </div>

        {loading ? (
          <p className="home-empty-note">Loading…</p>
        ) : pastSummaries.length === 0 ? (
          <div className="home-empty-state">
            <p className="home-empty-note">You haven't started a conversation yet.</p>
            <p className="home-empty-hint">
              Tap the button above to describe what you're seeing in your field.
            </p>
          </div>
        ) : (
          <div className="home-conversations">
            {pastSummaries.map((c, index) => (
              <div key={index} className="home-tile home-conversation-item">
                <span className="home-conversation-icon">
                  <FileText size={18} strokeWidth={2} />
                </span>
                <p className="home-conversation-crop">
                  {c.crop} — {c.problem}
                </p>
                <p className="home-conversation-date">
                  {c.created_at ? new Date(c.created_at).toLocaleDateString() : ""}
                  {" · "}
                  {c.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="home-remember-card">
        <Info size={18} strokeWidth={2} className="home-remember-icon" />
        <div>
          <p className="home-remember-title">Remember</p>
          <p className="home-remember-text">
            Kagua helps you organise observations and compare advice. It does not
            diagnose problems or recommend treatments.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Home;