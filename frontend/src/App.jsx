import { useState, useEffect } from "react";
import Login from "./screens/Login";
import Signup from "./screens/Signup";
import Home from "./screens/Home";
import Screen1Input from "./screens/Screen1Input";
import Screen2Context from "./screens/Screen2Context";
import Screen3Observe from "./screens/Screen3Observe";
import Screen4Evidence from "./screens/Screen4Evidence";
import Screen5Summary from "./screens/Screen5Summary";
import AppShell from "./components/AppShell";
import { getCurrentUser, logout, saveConversation } from "./services/authStorage";
import { analyzeInput, getComparison, getSourceDetails } from "./services/trackA";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState("login");
  const [view, setView] = useState("home");
  const [currentScreen, setCurrentScreen] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [screen1StartMode, setScreen1StartMode] = useState("voice");

  const [extractedContext, setExtractedContext] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [sourceDetails, setSourceDetails] = useState([]);

  useEffect(() => {
    const existingUser = getCurrentUser();
    if (existingUser) setUser(existingUser);
  }, []);

  const handleAuthSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setView("home");
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setView("home");
    setAuthView("login");
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
      const context = await analyzeInput(text, user.county);

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

  const handleFinishConversation = () => {
    saveConversation(user.id, {
      crop: extractedContext.crop,
      reported_problem: extractedContext.reported_problem,
    });
    setUser(getCurrentUser());
    setView("home");
  };

  /* ── Auth screens — no shell ── */
  if (!user) {
    return authView === "login" ? (
      <Login
        onLoginSuccess={handleAuthSuccess}
        onSwitchToSignup={() => setAuthView("signup")}
      />
    ) : (
      <Signup
        onSignupSuccess={handleAuthSuccess}
        onSwitchToLogin={() => setAuthView("login")}
      />
    );
  }

  /* ── Home — with shell ── */
  if (view === "home") {
    return (
      <AppShell>
        <Home user={user} onStartNew={handleStartNew} onLogout={handleLogout} />
      </AppShell>
    );
  }

  /* ── Loading — with shell ── */
  if (isLoading) {
    return (
      <AppShell>
        <div className="app-loading">
          <div className="app-loading-spinner" />
          <p className="app-loading-text">Thinking…</p>
        </div>
      </AppShell>
    );
  }

  /* ── Conversation flow — with shell ── */
  return (
    <AppShell>
      <div className="app-flow">
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
          <Screen4Evidence
            comparison={comparison}
            onContinue={handleScreen4Continue}
          />
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
    </AppShell>
  );
}

export default App;