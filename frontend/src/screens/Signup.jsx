import { useState } from "react";
import { signup } from "../services/authStorage";
import "./Auth.css";

function Signup({ onSignupSuccess, onSwitchToLogin }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [county, setCounty] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!name || !phone || !county || !password) {
      setError("Please fill in all fields.");
      return;
    }

    const result = signup({ name, phone, county, password });
    if (!result.success) {
      setError(result.error);
      return;
    }

    onSignupSuccess(result.user);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="auth-container">
      <p className="auth-brand">Kagua</p>
      <h1 className="auth-title">Create Account</h1>
      <p className="auth-subtitle">Create an account to save your Kagua conversations and summaries.</p>

      <div className="auth-fields">
        <input
          className="auth-input"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="name"
        />
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
          placeholder="County"
          value={county}
          onChange={(e) => setCounty(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="address-level2"
        />
        <input
          className="auth-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="new-password"
        />
      </div>

      {error && <p className="auth-error">{error}</p>}

      <button className="auth-submit-btn" onClick={handleSubmit}>
        Create Account
      </button>

      <p className="auth-switch-text">
        Already have an account?{" "}
        <span className="auth-switch-link" onClick={onSwitchToLogin}>
          Log in
        </span>
      </p>
    </div>
  );
}

export default Signup;