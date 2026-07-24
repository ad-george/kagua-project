import { useState } from "react";
import { signup } from "../services/authStorage";
import Navbar from "../components/Navbar";
import "./Auth.css";

function Signup({
  user,
  currentView,
  onNavigate,
  onLogout,
  onAboutClick,
  onSignupSuccess,
  onSwitchToLogin,
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [county, setCounty] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !phone || !county || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");
    const result = await signup({ name, phone, county });
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onSignupSuccess(result.user);
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
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">A few details to get you started.</p>

          <div className="auth-field">
            <label htmlFor="signup-name">Full name</label>
            <input
              id="signup-name"
              className="auth-input"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-phone">Phone number</label>
            <input
              id="signup-phone"
              className="auth-input"
              type="tel"
              placeholder="e.g. 0712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-county">County</label>
            <input
              id="signup-county"
              className="auth-input"
              placeholder="e.g. Nakuru"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-pin">PIN</label>
            <input
              id="signup-pin"
              className="auth-input"
              type="password"
              placeholder="Choose a PIN"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-submit-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>

          <p className="auth-switch-text">
            Already have an account?{" "}
            <span className="auth-switch-link" onClick={onSwitchToLogin}>Log in</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;