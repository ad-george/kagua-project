import { useState } from "react";
import { login } from "../services/authStorage";
import "./Auth.css";

function Login({ onLoginSuccess, onSwitchToSignup }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!phone || !password) {
      setError("Please fill in all fields.");
      return;
    }

    const result = login({ phone, password });
    if (!result.success) {
      setError(result.error);
      return;
    }

    onLoginSuccess(result.user);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="auth-container">
      <p className="auth-brand">Kagua</p>
      <h1 className="auth-title">Welcome Back</h1>
      <p className="auth-subtitle">Log in to continue where you left off.</p>

      <div className="auth-fields">
        <input
          className="auth-input"
          type="tel"
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="tel"
        />
        <input
          className="auth-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="current-password"
        />
      </div>

      {error && <p className="auth-error">{error}</p>}

      <button className="auth-submit-btn" onClick={handleSubmit}>
        Log In
      </button>

      <p className="auth-switch-text">
        Don't have an account?{" "}
        <span className="auth-switch-link" onClick={onSwitchToSignup}>
          Sign up
        </span>
      </p>
    </div>
  );
}

export default Login;