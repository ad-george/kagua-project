import { useState, useEffect } from "react";
import LandingPage from "./screens/LandingPage";
import Login from "./screens/Login";
import Signup from "./screens/Signup";
import Home from "./screens/Home";
import Screen1Input from "./screens/Screen1Input";
import Screen2Context from "./screens/Screen2Context";
import Screen3Observe from "./screens/Screen3Observe";
import Screen4Evidence from "./screens/Screen4Evidence";
import Screen5Summary from "./screens/Screen5Summary";
import Navbar from "./components/Navbar";
import { getCurrentUser, logout } from "./services/authStorage";
import {
  analyzeInput,
  getComparison,
  getSourceDetails,
  completeJourney,
  getJourney,
  getSummary,
  saveScreen4Replies,
} from "./services/trackA";
import {
  getPendingQueue,
  queueReplies,
  clearQueuedReplies,
} from "./services/replyQueue";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("landing");
  const [currentScreen, setCurrentScreen] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  // Holds a zero-arg function that re-runs whatever just failed, with its
  // original arguments already captured in the closure — lets the error
  // banner show a "Retry" button instead of forcing her to redo the whole
  // step (re-record, re-type, re-select observations) after a dropped
  // connection. Scoped intentionally: only wired into the calls most
  // likely to block her mid-flow (Screen 1 submit, Screen 3 continue,
  // resuming/reviewing a journey) — not a full background auto-retry
  // queue like Screen 4's reply saves, which is a larger change.
  const [retryAction, setRetryAction] = useState(null);
  const [screen1StartMode, setScreen1StartMode] = useState("voice");
  const [scrollToAbout, setScrollToAbout] = useState(false);

  const [extractedContext, setExtractedContext] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [summary, setSummary] = useState(null);
  const [sourceDetails, setSourceDetails] = useState([]);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Screen 4's "reply capture" (Idea 12 in the design doc): what the
  // farmer logged after sending the shaped question to a source. Keyed by
  // advice_received index. Persisted server-side via saveScreen4Replies
  // (PUT /journey/{id}/replies), stored inside journey.steps.screen4_replies
  // — so it survives a resumed journey fetched fresh from getJourney() on
  // a different device/session. Now saved the moment each reply is typed
  // and confirmed (see handleSaveReply below), not just at final Continue
  // — with a localStorage retry queue (services/replyQueue.js) covering
  // the case where that save fails, e.g. dropped connectivity.
  const [screen4Replies, setScreen4Replies] = useState({});

  // ── Draft persistence ──
  // Saves journey progress to localStorage after each screen so the farmer
  // can resume if connectivity drops or the browser is closed mid-flow.
  const DRAFT_KEY = "kagua_draft";

  const saveDraft = (screen, context, comp) => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ screen, context, comp }));
    } catch {
      // localStorage unavailable — fail silently, draft saving is non-critical
    }
  };

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  };

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  // ── Screen 4 reply save + retry queue ──
  // Attempts to persist `replies` (the full replies object for this
  // journey, not just the newest one — the backend endpoint replaces
  // journey.steps.screen4_replies wholesale, so a partial payload would
  // erase anything not included) to the backend. On failure, queues it
  // for retry instead of silently dropping it.
  const trySaveReplies = async (journeyId, replies) => {
    if (!journeyId || !replies || Object.keys(replies).length === 0) return;
    try {
      await saveScreen4Replies(journeyId, replies);
      clearQueuedReplies(journeyId);
    } catch (err) {
      console.error("Could not save reply — queued for retry:", err);
      queueReplies(journeyId, replies);
    }
  };

  // Retries every journey currently sitting in the pending queue. Safe to
  // call opportunistically (on mount, on reconnect) — a journey that's
  // still failing just stays queued for the next attempt, and a journey
  // that succeeds is cleared immediately so it isn't retried again.
  const flushPendingReplies = async () => {
    const queue = getPendingQueue();
    const journeyIds = Object.keys(queue);
    for (const jid of journeyIds) {
      try {
        await saveScreen4Replies(jid, queue[jid]);
        clearQueuedReplies(jid);
      } catch {
        // Still offline or still failing — leave it queued.
      }
    }
  };

  useEffect(() => {
    const existingUser = getCurrentUser();
    if (existingUser) {
      setUser(existingUser);
      setView("home");
    }
    // Attempt to clear any replies left over from a previous session that
    // failed to save (e.g. the farmer closed the app while offline), and
    // keep retrying whenever the browser regains connectivity.
    flushPendingReplies();
    window.addEventListener("online", flushPendingReplies);

    // If a call failed and left a retryAction queued, try it again the
    // moment connectivity returns — the manual Retry button still covers
    // the case where she wants to try again before that (e.g. the
    // backend was down, not her connection), but this saves her the tap
    // for the common "briefly lost signal" case.
    const handleOnlineRetry = () => {
      setRetryAction((current) => {
        if (current) {
          setErrorMsg(null);
          current();
        }
        return current;
      });
    };
    window.addEventListener("online", handleOnlineRetry);

    return () => {
      window.removeEventListener("online", flushPendingReplies);
      window.removeEventListener("online", handleOnlineRetry);
    };
  }, []);

  const handleNavigate = (nextView) => {
    if (nextView === "about") {
      setScrollToAbout(true);
      setView("landing");
      return;
    }
    if (view === "flow" && nextView !== "flow" && !isReviewMode) {
      const confirmLeave = window.confirm(
        "Leave this conversation? Your progress on this observation will be lost."
      );
      if (!confirmLeave) return;
    }
    setScrollToAbout(false);
    setView(nextView);
  };

  const handleAboutFromNav = () => {
    if (view === "landing") {
      document.getElementById("about")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      setScrollToAbout(true);
      setView("landing");
    }
  };

  const handleAuthSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    // Restore draft if one exists from a previous interrupted session
    const draft = loadDraft();
    if (draft?.context) {
      setExtractedContext(draft.context);
      if (draft.comp) setComparison(draft.comp);
      setCurrentScreen(draft.screen || 1);
      setView("flow");
    } else {
      setView("home");
    }
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setView("landing");
  };

  const handleStartNew = () => {
    setCurrentScreen(1);
    setScreen1StartMode("voice");
    setExtractedContext(null);
    setComparison(null);
    setSummary(null);
    setSourceDetails([]);
    setScreen4Replies({});
    setIsReviewMode(false);
    clearDraft();
    setView("flow");
  };

  // Resumes an in-progress journey: fetches its saved steps from the
  // backend, rebuilds extractedContext/comparison/summary from them, and
  // jumps straight to whichever screen the farmer had reached, instead of
  // restarting the conversation from Screen 1.
  const handleContinueJourney = async (journeyId) => {
    setIsLoading(true);
    setErrorMsg(null);
    setRetryAction(null);
    try {
      const journey = await getJourney(journeyId);
      const steps = journey.steps || {};

      if (!steps.extracted_context) {
        // Nothing usable was saved for this journey — safest fallback is
        // to just start a fresh conversation rather than show a broken screen.
        handleStartNew();
        return;
      }

      // journey_id wasn't present yet at the moment extracted_context was
      // first saved, so it needs to be added back in here — Screen 3/4's
      // /compare call depends on it being present in context.
      const restoredContext = { ...steps.extracted_context, journey_id: journey.id };
      setExtractedContext(restoredContext);

      if (steps.comparison) {
        setComparison(steps.comparison);

        // sourceDetails aren't persisted directly, so re-fetch them if the
        // saved comparison had real sources — needed for Screen 5's
        // "Explore Trusted Sources" modal to work after resuming.
        if (steps.comparison.sources_used?.length > 0) {
          try {
            const details = await getSourceDetails(steps.comparison.sources_used);
            setSourceDetails(details);
          } catch {
            setSourceDetails([]);
          }
        }
      } else {
        setComparison(null);
        setSourceDetails([]);
      }

      // Restore a previously-generated summary if this journey had already
      // reached Screen 5 before — otherwise leave it null, it'll be
      // generated fresh when Screen 4 is completed.
      setSummary(steps.summary || null);

      // Restore any Screen 4 replies saved via saveScreen4Replies on a
      // prior visit — now persisted server-side, so a journey resumed on
      // a different device/session can still see what was logged. Also
      // merge in anything still sitting in the local retry queue for this
      // journey, in case a save failed right before the app was closed.
      const queuedForThisJourney = getPendingQueue()[journey.id] || {};
      setScreen4Replies({ ...(steps.screen4_replies || {}), ...queuedForThisJourney });

      setIsReviewMode(false);
      setCurrentScreen(steps.current_screen || 1);
      setView("flow");
    } catch (err) {
      setErrorMsg("Could not resume this conversation. Is the backend running?");
      setRetryAction(() => () => handleContinueJourney(journeyId));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Reviews a completed summary: fetches the journey data and displays
  // Screen5Summary so farmers can review past completed conversations.
  const handleSelectSummary = async (journey) => {
    setIsLoading(true);
    setErrorMsg(null);
    setRetryAction(null);
    try {
      const journeyData = await getJourney(journey.id);
      const steps = journeyData.steps || {};

      if (!steps.extracted_context || !steps.comparison) {
        setErrorMsg("Could not load this summary. The data may be incomplete.");
        setIsLoading(false);
        return;
      }

      const restoredContext = { ...steps.extracted_context, journey_id: journeyData.id };
      setExtractedContext(restoredContext);
      setComparison(steps.comparison);
      setSummary(steps.summary || null);
      // Same restoration as handleContinueJourney — a reviewed past
      // summary should still show whatever replies were logged on
      // Screen 4 during that conversation.
      const queuedForThisJourney = getPendingQueue()[journeyData.id] || {};
      setScreen4Replies({ ...(steps.screen4_replies || {}), ...queuedForThisJourney });

      // Re-fetch source details for the "Explore Trusted Sources" modal
      if (steps.comparison.sources_used?.length > 0) {
        try {
          const details = await getSourceDetails(steps.comparison.sources_used);
          setSourceDetails(details);
        } catch {
          setSourceDetails([]);
        }
      } else {
        setSourceDetails([]);
      }

      setIsReviewMode(true);
      setCurrentScreen(5);
      setView("flow");
    } catch (err) {
      setErrorMsg("Could not load this summary. Is the backend running?");
      setRetryAction(() => () => handleSelectSummary(journey));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScreen1Submit = async (text) => {
    setIsLoading(true);
    setErrorMsg(null);
    setRetryAction(null);
    try {
      const context = await analyzeInput(text, user.county, user.phone, user.name);

      if (context.could_not_understand) {
        setErrorMsg(
          "We couldn't quite understand that. Let's try again — you can record again, or type it instead."
        );
        setIsLoading(false);
        return;
      }
      setExtractedContext(context);
      saveDraft(2, context, null);
      setCurrentScreen(2);
    } catch (err) {
      setErrorMsg("Could not analyze your input. Is the backend running?");
      setRetryAction(() => () => handleScreen1Submit(text));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScreen2Confirm = () => setCurrentScreen(3);

  const handleRecordAgain = () => {
    setScreen1StartMode("voice");
    setCurrentScreen(1);
  };

  const handleTypeInstead = () => {
    setScreen1StartMode("text");
    setCurrentScreen(1);
  };

  // Shared by both paths that end a conversation at Screen 5: the normal
  // path (farmer taps Continue on Screen 4) and the Scenario A skip path
  // (no advice/sources at all, so Screen 4 is skipped entirely — see the
  // Screen 4 design doc's Scenario A). Generating the summary is
  // non-critical either way: a failure here still advances to Screen 5
  // with summary=null, since Screen5Summary already has its own fallback
  // narration for that case.
  const goToScreen5 = async (context, comp) => {
    try {
      const result = await getSummary(context, comp);
      setSummary(result);
    } catch (err) {
      console.error("Could not generate Kagua Summary:", err);
      setSummary(null);
    } finally {
      setCurrentScreen(5);
    }
  };

  // Source details (used by Screen 5's "Explore Trusted Sources" modal) are
  // supplementary to the comparison itself — Screen 4 renders straight from
  // the farmer's own advice_received now (badges live there, not on
  // `comparison`), not from sourceDetails. So a source-details failure is
  // handled the same non-critical way as in
  // handleContinueJourney/handleSelectSummary: its own try/catch, falls back
  // to an empty list, and never blocks advancing past Screen 3.
  const handleScreen3Continue = async (observations) => {
    setIsLoading(true);
    setErrorMsg(null);
    setRetryAction(null);
    try {
      const result = await getComparison(extractedContext, observations);
      setComparison(result);

      // Merge field observations into extractedContext so they're available in Screen 5
      const updatedContext = {
        ...extractedContext,
        observations: [...(extractedContext.observations || []), ...observations],
      };
      setExtractedContext(updatedContext);

      // Scenario A (per the Screen 4 design doc): if there's no advice at
      // all, Screen 4 has nothing genuine to teach her about — badges,
      // the "one thing worth asking" question, and the WhatsApp send flow
      // all depend on there being at least one source. Rather than
      // invent generic filler content, Screen 4 is skipped entirely and
      // the flow goes straight from Screen 3 to Screen 5.
      const hasAdvice = (updatedContext.advice_received || []).length > 0;

      if (hasAdvice) {
        saveDraft(4, updatedContext, result);
        setCurrentScreen(4);
      } else {
        saveDraft(5, updatedContext, result);
      }

      if (result.sources_used && result.sources_used.length > 0) {
        try {
          const details = await getSourceDetails(result.sources_used);
          setSourceDetails(details);
        } catch (detailsErr) {
          console.error("Could not fetch source details:", detailsErr);
          setSourceDetails([]);
        }
      } else {
        setSourceDetails([]);
      }

      if (!hasAdvice) {
        await goToScreen5(updatedContext, result);
      }
    } catch (err) {
      setErrorMsg("Could not compare information. Is the backend running?");
      setRetryAction(() => () => handleScreen3Continue(observations));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Called from Screen4Evidence the instant she confirms an individual
  // reply (taps "Save" on one source's reply box) — not just at the end
  // of the whole screen. Updates local state immediately so the UI
  // reflects it right away, and fires the backend save in the background
  // via trySaveReplies, which queues it for retry if it fails. This is
  // what closes the "typed a reply, lost connectivity, closed the tab"
  // gap that existed when saving only happened on the final Continue tap.
  const handleSaveReply = (index, text) => {
    const updated = { ...screen4Replies, [index]: text };
    setScreen4Replies(updated);
    const journeyId = extractedContext?.journey_id;
    trySaveReplies(journeyId, updated);
  };

  // Called when the farmer taps Continue on Screen 4. Replies have
  // already been autosaved individually via handleSaveReply as she typed
  // them, so this call is a safety net — it re-sends the final replies
  // object (harmless if already saved, since the endpoint just overwrites
  // with the same data) to catch any reply whose individual save silently
  // failed without getting queued for some reason.
  const handleScreen4Continue = async (replies) => {
    if (replies) setScreen4Replies(replies);
    setIsLoading(true);
    setErrorMsg(null);

    const journeyId = extractedContext?.journey_id;
    await trySaveReplies(journeyId, replies || screen4Replies);

    await goToScreen5(extractedContext, comparison);
    setIsLoading(false);
  };

  const handleFinishConversation = async () => {
    // Only mark journey complete if we're not reviewing a past summary
    // (reviewing a completed summary should just return to home)
    if (extractedContext?.journey_id) {
      const journey = await getJourney(extractedContext.journey_id);
      if ((journey.status || "").toLowerCase() !== "completed") {
        try {
          await completeJourney(extractedContext.journey_id);
        } catch (err) {
          console.error("Could not mark journey complete:", err);
        }
      }
    }
    clearDraft();
    setIsReviewMode(false);
    setView("home");
  };

  // ── Landing ──
  if (view === "landing") {
    return (
      <LandingPage
        user={user}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        scrollToAbout={scrollToAbout}
        onScrollToAboutDone={() => setScrollToAbout(false)}
      />
    );
  }

  // ── Auth ──
  if (!user) {
    if (view === "signup") {
      return (
        <Signup
          user={user}
          currentView="signup"
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          onAboutClick={handleAboutFromNav}
          onSignupSuccess={handleAuthSuccess}
          onSwitchToLogin={() => setView("login")}
          onBack={() => setView("landing")}
        />
      );
    }
    return (
      <Login
        user={user}
        currentView="login"
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onAboutClick={handleAboutFromNav}
        onLoginSuccess={handleAuthSuccess}
        onSwitchToSignup={() => setView("signup")}
        onBack={() => setView("landing")}
      />
    );
  }

  // ── Home ──
  if (view === "home") {
    return (
      <div className="app-dashboard">
        <Navbar
          user={user}
          currentView="dashboard"
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          onAboutClick={handleAboutFromNav}
        />
        <Home
          user={user}
          onStartNew={handleStartNew}
          onContinueJourney={handleContinueJourney}
          onSelectSummary={handleSelectSummary}
        />
      </div>
    );
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
        <p className="app-loading-text">Organizing your information…</p>
      </div>
    );
  }

  // ── Flow screens 1–5 ──
  return (
    <div className="app-flow">
      <Navbar
        user={user}
        currentView="flow"
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onAboutClick={handleAboutFromNav}
        stepLabel={`Step ${currentScreen} of 5`}
        isReviewMode={isReviewMode}
      />
      {errorMsg && (
        <div className="app-error-banner">
          <p className="app-error-text">{errorMsg}</p>
          {retryAction && (
            <button
              type="button"
              className="app-error-retry-btn"
              onClick={() => {
                setErrorMsg(null);
                retryAction();
              }}
            >
              Retry
            </button>
          )}
        </div>
      )}
      {currentScreen === 1 && (
        <Screen1Input onSubmit={handleScreen1Submit} startMode={screen1StartMode} />
      )}
      {currentScreen === 2 && extractedContext && (
        <Screen2Context
          extractedContext={extractedContext}
          onConfirm={handleScreen2Confirm}
          onRecordAgain={handleRecordAgain}
          onTypeInstead={handleTypeInstead}
        />
      )}
      {currentScreen === 3 && (
        <Screen3Observe onContinue={handleScreen3Continue} />
      )}
      {currentScreen === 4 && comparison && extractedContext && (
        <Screen4Evidence
          extractedContext={extractedContext}
          initialReplies={screen4Replies}
          onSaveReply={handleSaveReply}
          onContinue={handleScreen4Continue}
        />
      )}
      {currentScreen === 5 && extractedContext && comparison && (
        <Screen5Summary
          extractedContext={extractedContext}
          comparison={comparison}
          summary={summary}
          sourceDetails={sourceDetails}
          screen4Replies={screen4Replies}
          onFinish={handleFinishConversation}
          isReviewMode={isReviewMode}
        />
      )}
    </div>
  );
}

export default App;