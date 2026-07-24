import { useState } from "react";
import { login } from "../services/authStorage";
import Navbar from "../components/Navbar";
import "./Auth.css";

function Login({
  user,
  currentView,
  onNavigate,
  onLogout,
  onAboutClick,
  onLoginSuccess,
  onSwitchToSignup,
}) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!phone || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");
    const result = await login({ phone });
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onLoginSuccess(result.user);
  };

  return (
    <div className="auth-shell">
      <Navbar
        user={user}
        currentView={currentView}
        onNavigate={onNavigate}
        onLogout={onLogout}
        onAboutClick={onAboutClick}
      />

      <div className="auth-page">
        <div className="auth-container">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Log in with your phone number and PIN.</p>

          <div className="auth-field">
            <label htmlFor="login-phone">Phone number</label>
            <input
              id="login-phone"
              className="auth-input"
              type="tel"
              placeholder="e.g. 0712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-pin">PIN</label>
            <input
              id="login-pin"
              className="auth-input"
              type="password"
              placeholder="Enter your PIN"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-submit-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </button>

          <p className="auth-switch-text">
            Don't have an account?{" "}
            <span className="auth-switch-link" onClick={onSwitchToSignup}>Sign up</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;