import { useState, useEffect, useMemo } from "react";
import { fetchJourneys } from "../services/authStorage";
import { saveFollowUp } from "../services/trackA";
import { Search } from "lucide-react";
import "./Home.css";

const PREVIEW_LIMIT = 6;
const PAGE_SIZE = 9;

function Home({ user, onStartNew, onContinueJourney, onSelectSummary }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [dismissedFollowUps, setDismissedFollowUps] = useState({});
  const [followUpStep, setFollowUpStep] = useState({}); // journeyId -> { outcome }

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

  const followUpJourney = pastSummaries.find(
    (c) =>
      (c.status || "").toLowerCase() === "completed" &&
      !c.follow_up_outcome &&
      !dismissedFollowUps[c.id]
  );

  const handleFollowUpOutcome = (journeyId, outcome) => {
    // Step 1 answered — store outcome and show step 2
    setFollowUpStep((prev) => ({ ...prev, [journeyId]: { outcome } }));
  };

  const handleFollowUpRating = async (journeyId, rating) => {
    // Step 2 answered — save both and dismiss
    const outcome = followUpStep[journeyId]?.outcome || null;
    try {
      await saveFollowUp(journeyId, outcome, rating);
    } catch {
      // Non-critical — dismiss regardless
    }
    setDismissedFollowUps((prev) => ({ ...prev, [journeyId]: true }));
  };

  const handleFollowUpSkip = (journeyId) => {
    setDismissedFollowUps((prev) => ({ ...prev, [journeyId]: true }));
  };

  const filtered = useMemo(() => {
    return pastSummaries.filter((c) => {
      const matchesSearch =
        searchTerm.trim() === "" ||
        `${c.crop} ${c.problem}`.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (c.status || "").toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [pastSummaries, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = expanded
    ? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : pastSummaries.slice(0, PREVIEW_LIMIT);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  const formatStatus = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "completed") return "Completed";
    if (s === "in_progress") return "In progress";
    return status;
  };

  return (
    <div className="home-container">
      <div className="home-page-header">
        <h1 className="home-title">Welcome back, {user.name}</h1>
        <p className="home-county">{user.county} County</p>
      </div>

      <div className="home-grid">

        {/* ── Left column ── */}
        <div className="home-left">

          <div className="home-panel">
            <div className="home-panel-header">
              <p className="home-panel-title">
                {activeJourney ? "Your conversation" : "Start a new conversation"}
              </p>
            </div>
            <div className="home-panel-body">
              <div className="home-panel-sections">
                {!loading && activeJourney && (
                  <div className="home-panel-section">
                    <p className="home-panel-eyebrow">Continuing</p>
                    <p className="home-current-crop">
                      {activeJourney.crop}: {activeJourney.problem}
                    </p>
                    <p className="home-current-meta">
                      Started{" "}
                      {activeJourney.created_at
                        ? new Date(activeJourney.created_at).toLocaleDateString()
                        : "recently"}
                    </p>
                    <button
                      className="home-panel-link"
                      onClick={() => onContinueJourney(activeJourney.id)}
                    >
                      Continue
                    </button>
                  </div>
                )}
                <div className="home-panel-section">
                  {!loading && activeJourney && (
                    <p className="home-panel-eyebrow">Start a new conversation</p>
                  )}
                  <p className="home-panel-text">Tell Kagua what you're seeing.</p>
                  <button className="home-panel-link" onClick={onStartNew}>
                    Get started
                  </button>
                </div>
                {followUpJourney && (
                  <div className="home-panel-section">
                    <p className="home-panel-eyebrow">How did it go?</p>
                    {!followUpStep[followUpJourney.id] ? (
                      <>
                        <p className="home-followup-question">
                          Did you get help for your {followUpJourney.crop}?
                        </p>
                        <div className="home-followup-row">
                          <button className="home-followup-btn" onClick={() => handleFollowUpOutcome(followUpJourney.id, "yes")}>Yes</button>
                          <button className="home-followup-btn" onClick={() => handleFollowUpOutcome(followUpJourney.id, "not_yet")}>Not yet</button>
                          <button className="home-followup-skip" onClick={() => handleFollowUpSkip(followUpJourney.id)}>Not now</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="home-followup-question">
                          Was Kagua helpful?
                        </p>
                        <div className="home-followup-row">
                          <button className="home-followup-btn" onClick={() => handleFollowUpRating(followUpJourney.id, "yes")}>Yes</button>
                          <button className="home-followup-btn" onClick={() => handleFollowUpRating(followUpJourney.id, "somewhat")}>A little</button>
                          <button className="home-followup-btn" onClick={() => handleFollowUpRating(followUpJourney.id, "no")}>No</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="home-panel home-panel--muted">
            <div className="home-panel-header">
              <p className="home-panel-title">Remember</p>
            </div>
            <div className="home-panel-body">
              <p className="home-panel-text">
                Kagua helps you organise observations and compare advice. It
                does not diagnose problems or recommend treatments.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="home-right">
          <div className="home-panel home-panel--tall">
            <div className="home-panel-header home-panel-header--with-count">
              <p className="home-panel-title">Previous summaries</p>
              {!loading && pastSummaries.length > 0 && (
                <span className="home-panel-count">{pastSummaries.length}</span>
              )}
            </div>

            <div className="home-panel-body">

              {loading ? (
                <p className="home-empty-note">Loading…</p>
              ) : pastSummaries.length === 0 ? (
                <div>
                  <p className="home-empty-note">You haven't started a conversation yet.</p>
                  <p className="home-empty-hint">
                    Start a new conversation to describe what you're seeing in your field.
                  </p>
                </div>
              ) : !expanded ? (
                <>
                  {pastSummaries.length > PREVIEW_LIMIT && (
                    <button className="home-toggle-link home-toggle-link--top" onClick={() => setExpanded(true)}>
                      View all {pastSummaries.length} summaries
                    </button>
                  )}
                  <div className="home-preview-grid">
                    {paginated.map((c, index) => (
                      <button
                        key={index}
                        className="home-preview-tile"
                        onClick={() => onSelectSummary && onSelectSummary(c)}
                      >
                        <span className="home-row-crop">
                          {c.crop}: {c.problem}
                        </span>
                        <span className="home-row-meta">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : ""}
                          {" · "}
                          <span
                            className={
                              (c.status || "").toLowerCase() === "completed"
                                ? "home-row-status home-row-status--completed"
                                : "home-row-status home-row-status--progress"
                            }
                          >
                            {formatStatus(c.status)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="home-filters">
                    <div className="home-search">
                      <Search size={15} strokeWidth={2} className="home-search-icon" />
                      <input
                        type="text"
                        placeholder="Search by crop or problem"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="home-search-input"
                      />
                    </div>
                    <div className="home-filter-links">
                      {["all", "completed", "in_progress"].map((status, i) => (
                        <span key={status}>
                          {i > 0 && <span className="home-filter-sep">·</span>}
                          <button
                            className={`home-filter-link ${statusFilter === status ? "home-filter-link--active" : ""}`}
                            onClick={() => setStatusFilter(status)}
                          >
                            {status === "all" ? "All" : formatStatus(status)}
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="home-list-scroll">
                    {filtered.length === 0 ? (
                      <p className="home-empty-note">No summaries match your search.</p>
                    ) : (
                      <div className="home-preview-grid">
                        {paginated.map((c, index) => (
                          <button
                            key={index}
                            className="home-preview-tile"
                            onClick={() => onSelectSummary && onSelectSummary(c)}
                          >
                            <span className="home-row-crop">
                              {c.crop}: {c.problem}
                            </span>
                            <span className="home-row-meta">
                              {c.created_at ? new Date(c.created_at).toLocaleDateString() : ""}
                              {" · "}
                              <span
                                className={
                                  (c.status || "").toLowerCase() === "completed"
                                    ? "home-row-status home-row-status--completed"
                                    : "home-row-status home-row-status--progress"
                                }
                              >
                                {formatStatus(c.status)}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {totalPages > 1 && (
                    <div className="home-pagination">
                      <button
                        className="home-page-link"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </button>
                      <span className="home-page-info">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        className="home-page-link"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        Next
                      </button>
                    </div>
                  )}

                  <button
                    className="home-toggle-link"
                    onClick={() => {
                      setExpanded(false);
                      setSearchTerm("");
                      setStatusFilter("all");
                      setPage(1);
                    }}
                  >
                    Show less
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Home;
