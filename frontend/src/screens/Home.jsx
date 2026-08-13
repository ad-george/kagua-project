import { useState, useEffect, useMemo } from "react";
import { fetchJourneys } from "../services/authStorage";
import { saveFollowUp } from "../services/trackA";

import {
  Search,
  MessageCircle,
  Lightbulb,
  FileText,
  ArrowRight,
  Sprout,
  Home as HomeIcon,
  LayoutDashboard,
  ChevronDown,
  MapPin,
} from "lucide-react";

import maizeImage from "../assets/maizeimage.png";

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
  const [followUpStep, setFollowUpStep] = useState({});

  const [isFreshLoginSession] = useState(() => {
    const key = `kagua_followup_eligible_${user?.phone || "anon"}`;
    const eligible = localStorage.getItem(key) === "1";

    if (eligible) {
      localStorage.removeItem(key);
    }

    return eligible;
  });

  useEffect(() => {
    async function loadJourneys() {
      const journeys = await fetchJourneys(user.phone);
      setConversations(journeys);
      setLoading(false);
    }

    loadJourneys();
  }, [user.phone]);

  const activeJourney = conversations.find(
    (c) => (c.status || "").toLowerCase() !== "completed",
  );

  const pastSummaries = conversations.filter((c) => c !== activeJourney);

  const latestCompletedJourney = useMemo(() => {
    const completed = pastSummaries.filter(
      (c) => (c.status || "").toLowerCase() === "completed",
    );

    if (completed.length === 0) return null;

    return [...completed].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    )[0];
  }, [pastSummaries]);

  const followUpJourney =
    isFreshLoginSession &&
    latestCompletedJourney &&
    !latestCompletedJourney.follow_up_outcome &&
    !dismissedFollowUps[latestCompletedJourney.id]
      ? latestCompletedJourney
      : null;

  const handleFollowUpOutcome = (journeyId, outcome) => {
    setFollowUpStep((prev) => ({
      ...prev,
      [journeyId]: { outcome },
    }));
  };

  const handleFollowUpRating = async (journeyId, rating) => {
    const outcome = followUpStep[journeyId]?.outcome || null;

    try {
      await saveFollowUp(journeyId, outcome, rating);
    } catch {
      // Non-critical — dismiss regardless.
    }

    setDismissedFollowUps((prev) => ({
      ...prev,
      [journeyId]: true,
    }));
  };

  const handleFollowUpSkip = async (journeyId) => {
    setDismissedFollowUps((prev) => ({
      ...prev,
      [journeyId]: true,
    }));

    try {
      await saveFollowUp(journeyId, "skipped", null);
    } catch {
      // Non-critical.
    }
  };

  const filtered = useMemo(() => {
    return pastSummaries.filter((c) => {
      const matchesSearch =
        searchTerm.trim() === "" ||
        `${c.crop} ${c.problem}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

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
      {/* ════════════ WELCOME HERO ═══════════*/}

      <section className="kagua-welcome">
        <div className="kagua-welcome-content">
          <h1>
            Welcome back,
            <strong>{user.name}</strong>
          </h1>

          <p className="kagua-location">
            <MapPin size={20} strokeWidth={2} />
            {user.county} County
          </p>
        </div>

        <div className="kagua-welcome-image">
          <img src={maizeImage} alt="" />
          <div className="kagua-image-fade"></div>
        </div>
      </section>

      {/* ───────────────── MAIN CONTENT ───────────────── */}
      <div className="home-grid">
        {/* ───────────── LEFT COLUMN ───────────── */}
        <div className="home-left">
          {/* Start conversation */}
          <div className="home-action-card home-action-card--green">
            <div className="home-action-icon">
              <MessageCircle size={25} strokeWidth={1.9} />
            </div>

            <div className="home-action-content">
              <h2>Start a new conversation</h2>

              <p>Ask about something you’re seeing on your farm.</p>

              <button className="home-primary-button" onClick={onStartNew}>
                Get started
                <ArrowRight size={17} />
              </button>
            </div>
          </div>

          {/* Existing active journey */}
          {!loading && activeJourney && (
            <div className="home-current-card">
              <div className="home-current-card-header">
                <span className="home-current-dot"></span>
                Continuing your conversation
              </div>

              <p className="home-current-crop">
                <span className="home-current-crop-name">
                  {activeJourney.crop}:
                </span>{" "}
                <span className="home-current-problem">
                  {activeJourney.problem}
                </span>
              </p>

              <p className="home-current-meta">
                Started{" "}
                {activeJourney.created_at
                  ? new Date(activeJourney.created_at).toLocaleDateString()
                  : "recently"}
              </p>

              <button
                className="home-secondary-button"
                onClick={() => onContinueJourney(activeJourney.id)}
              >
                Continue
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Follow-up */}
          {followUpJourney && (
            <div className="home-followup-card">
              <div className="home-followup-title">
                How did your last summary help?
              </div>

              {!followUpStep[followUpJourney.id] ? (
                <>
                  <p className="home-followup-question">
                    Did it help you better understand the situation?
                  </p>

                  <div className="home-followup-row">
                    <button
                      className="home-followup-btn"
                      onClick={() =>
                        handleFollowUpOutcome(followUpJourney.id, "yes")
                      }
                    >
                      Yes
                    </button>

                    <button
                      className="home-followup-btn"
                      onClick={() =>
                        handleFollowUpOutcome(followUpJourney.id, "somewhat")
                      }
                    >
                      A little
                    </button>

                    <button
                      className="home-followup-btn"
                      onClick={() =>
                        handleFollowUpOutcome(followUpJourney.id, "not_yet")
                      }
                    >
                      Not yet
                    </button>
                  </div>

                  <button
                    className="home-followup-skip"
                    onClick={() => handleFollowUpSkip(followUpJourney.id)}
                  >
                    Not now
                  </button>
                </>
              ) : (
                <>
                  <p className="home-followup-question">
                    What happened after your last summary?
                  </p>

                  <div className="home-followup-row">
                    <button
                      className="home-followup-btn"
                      onClick={() =>
                        handleFollowUpRating(followUpJourney.id, "agrovet")
                      }
                    >
                      Discussed with an agrovet
                    </button>

                    <button
                      className="home-followup-btn"
                      onClick={() =>
                        handleFollowUpRating(
                          followUpJourney.id,
                          "extension_officer",
                        )
                      }
                    >
                      Discussed with an extension officer
                    </button>

                    <button
                      className="home-followup-btn"
                      onClick={() =>
                        handleFollowUpRating(
                          followUpJourney.id,
                          "gathering_info",
                        )
                      }
                    >
                      Still gathering information
                    </button>

                    <button
                      className="home-followup-btn"
                      onClick={() =>
                        handleFollowUpRating(followUpJourney.id, "not_acted")
                      }
                    >
                      Haven't acted yet
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Remember */}
          <div className="home-info-card">
            <div className="home-info-icon">
              <Lightbulb size={23} strokeWidth={1.9} />
            </div>

            <div>
              <h2>Remember</h2>

              <p>
                Organise observations and compare advice. Kagua does not
                diagnose or recommend treatments.
              </p>
            </div>
          </div>
        </div>

        {/* ───────────── RIGHT COLUMN ───────────── */}
        <div className="home-right">
          <div className="home-summary-card">
            <div className="home-summary-header">
              <div className="home-summary-title">
                <span className="home-summary-icon">
                  <FileText size={21} strokeWidth={1.9} />
                </span>

                <div>
                  <h2>Previous summaries</h2>

                  {!loading && pastSummaries.length > 0 && (
                    <span className="home-summary-count">
                      {pastSummaries.length}{" "}
                      {pastSummaries.length === 1 ? "summary" : "summaries"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="home-summary-body">
              {loading ? (
                <div className="home-empty-state">
                  <p className="home-empty-note">Loading…</p>
                </div>
              ) : pastSummaries.length === 0 ? (
                <div className="home-empty-state">
                  <div className="home-empty-illustration">
                    <FileText size={38} strokeWidth={1.5} />
                  </div>

                  <h3>No summaries yet</h3>

                  <p>Start a conversation.</p>
                </div>
              ) : !expanded ? (
                <>
                  {pastSummaries.length > PREVIEW_LIMIT && (
                    <button
                      className="home-toggle-link home-toggle-link--top"
                      onClick={() => setExpanded(true)}
                    >
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
                          <span className="home-row-crop-name">{c.crop}:</span>{" "}
                          <span className="home-row-problem">{c.problem}</span>
                        </span>

                        <span className="home-row-meta">
                          {c.created_at
                            ? new Date(c.created_at).toLocaleDateString()
                            : ""}

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
                      <Search
                        size={16}
                        strokeWidth={2}
                        className="home-search-icon"
                      />

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
                            className={`home-filter-link ${
                              statusFilter === status
                                ? "home-filter-link--active"
                                : ""
                            }`}
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
                      <p className="home-empty-note">
                        No summaries match your search.
                      </p>
                    ) : (
                      <div className="home-preview-grid">
                        {paginated.map((c, index) => (
                          <button
                            key={index}
                            className="home-preview-tile"
                            onClick={() =>
                              onSelectSummary && onSelectSummary(c)
                            }
                          >
                            <span className="home-row-crop">
                              <span className="home-row-crop-name">
                                {c.crop}:
                              </span>{" "}
                              <span className="home-row-problem">
                                {c.problem}
                              </span>
                            </span>

                            <span className="home-row-meta">
                              {c.created_at
                                ? new Date(c.created_at).toLocaleDateString()
                                : ""}

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
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
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
