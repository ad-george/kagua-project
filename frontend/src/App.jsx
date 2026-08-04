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
} from "./services/trackA";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("landing");
  const [currentScreen, setCurrentScreen] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [screen1StartMode, setScreen1StartMode] = useState("voice");
  const [scrollToAbout, setScrollToAbout] = useState(false);

  const [extractedContext, setExtractedContext] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [summary, setSummary] = useState(null);
  const [sourceDetails, setSourceDetails] = useState([]);
  const [isReviewMode, setIsReviewMode] = useState(false);

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

  useEffect(() => {
    const existingUser = getCurrentUser();
    if (existingUser) {
      setUser(existingUser);
      setView("home");
    }
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

      setIsReviewMode(false);
      setCurrentScreen(steps.current_screen || 1);
      setView("flow");
    } catch (err) {
      setErrorMsg("Could not resume this conversation. Is the backend running?");
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
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScreen1Submit = async (text) => {
    setIsLoading(true);
    setErrorMsg(null);
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

  // Source details (used by Screen 5's "Explore Trusted Sources" modal) are
  // supplementary to the comparison itself — Screen 4 renders straight from
  // `comparison.sources_used`, not from `sourceDetails`. So a source-details
  // failure is handled the same non-critical way as in
  // handleContinueJourney/handleSelectSummary: its own try/catch, falls back
  // to an empty list, and never blocks advancing to Screen 4. Previously
  // this was inside the same try block as getComparison, which meant a
  // source-details hiccup both (a) showed the wrong error — "Could not
  // compare information" — even though the comparison itself had already
  // succeeded, and (b) left the farmer stuck on Screen 3 with a valid
  // comparison sitting unused in state.
  const handleScreen3Continue = async (observations) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await getComparison(extractedContext, observations);
      setComparison(result);
      saveDraft(4, extractedContext, result);
      setCurrentScreen(4);

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
    } catch (err) {
      setErrorMsg("Could not compare information. Is the backend running?");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Generates the Kagua Summary before advancing to Screen 5. Treated as
  // non-critical: if it fails, we still advance to Screen 5 with
  // summary=null — the farmer's data (SummaryCard, options) is fully
  // intact either way, Screen5Summary just falls back to its own simpler
  // local narration for "Listen to this page" rather than blocking the
  // farmer from reaching their own summary over a non-essential feature.
  const handleScreen4Continue = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await getSummary(extractedContext, comparison);
      setSummary(result);
    } catch (err) {
      console.error("Could not generate Kagua Summary:", err);
      setSummary(null);
    } finally {
      setIsLoading(false);
      setCurrentScreen(5);
    }
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
      {currentScreen === 4 && comparison && (
        <Screen4Evidence comparison={comparison} extractedContext={extractedContext} onContinue={handleScreen4Continue} />
      )}
      {currentScreen === 5 && extractedContext && comparison && (
        <Screen5Summary
          extractedContext={extractedContext}
          comparison={comparison}
          summary={summary}
          sourceDetails={sourceDetails}
          onFinish={handleFinishConversation}
          isReviewMode={isReviewMode}
        />
      )}
    </div>
  );
}

export default App;