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
import { analyzeInput, getComparison, getSourceDetails, completeJourney } from "./services/trackA";
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
  const [sourceDetails, setSourceDetails] = useState([]);

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
    // Leaving the flow via the Navbar would silently drop whatever the
    // person has entered so far in this observation — confirm first.
    if (view === "flow" && nextView !== "flow") {
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
    setView("home");
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
    setSourceDetails([]);
    setView("flow");
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

  const handleScreen3Continue = async (observations) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await getComparison(extractedContext, observations);
      setComparison(result);
      if (result.sources_used && result.sources_used.length > 0) {
        const details = await getSourceDetails(result.sources_used);
        setSourceDetails(details);
      }
      setCurrentScreen(4);
    } catch (err) {
      setErrorMsg("Could not compare information. Is the backend running?");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScreen4Continue = () => setCurrentScreen(5);

  const handleFinishConversation = async () => {
    if (extractedContext?.journey_id) {
      try {
        await completeJourney(extractedContext.journey_id);
      } catch (err) {
        console.error("Could not mark journey complete:", err);
      }
    }
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
        <Home user={user} onStartNew={handleStartNew} />
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
        <Screen4Evidence comparison={comparison} onContinue={handleScreen4Continue} />
      )}
      {currentScreen === 5 && extractedContext && comparison && (
        <Screen5Summary
          extractedContext={extractedContext}
          comparison={comparison}
          sourceDetails={sourceDetails}
          onFinish={handleFinishConversation}
        />
      )}
    </div>
  );
}

export default App;