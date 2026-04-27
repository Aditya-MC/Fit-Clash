import { useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { user, login } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  if (user) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await login(form, mode);
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const handleStravaLogin = async () => {
    setError("");

    try {
      const result = await api.get("/auth/strava/url");
      sessionStorage.setItem("fitclash-strava-intent", "login");
      window.location.href = result.url;
    } catch (stravaError) {
      setError(stravaError.message);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <div className="auth-wireframe">
          <div className="wire-card wire-large">
            <span className="wire-line wire-line-long" />
            <span className="wire-line wire-line-short" />
            <div className="wire-stack">
              <span className="wire-field" />
              <span className="wire-field" />
              <span className="wire-field" />
            </div>
          </div>
          <div className="wire-card wire-small">
            <span className="wire-line wire-line-short" />
            <div className="wire-row">
              <span className="wire-pill" />
              <span className="wire-pill" />
            </div>
            <div className="wire-stack compact">
              <span className="wire-field" />
              <span className="wire-field" />
            </div>
            <span className="wire-button" />
          </div>
        </div>
      </section>

      <section className="auth-card card-elevated">
        <div className="auth-card-head">
          <div>
            <p className="eyebrow">Login</p>
            <h2>Enter your league</h2>
          </div>
          <span className="topbar-pill subtle">Black theme</span>
        </div>

        <div className="auth-toggle">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">
            Login
          </button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <label>
              Name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
          </label>

          {error && <p className="error-text">{error}</p>}

          <button className="primary-button" type="submit">
            {mode === "login" ? "Enter Fit Clash" : "Create account"}
          </button>
          <button className="ghost-button" type="button" onClick={handleStravaLogin}>
            Login with Strava
          </button>
        </form>
      </section>
    </div>
  );
}
