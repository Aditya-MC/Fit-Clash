import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";

export default function StravaCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithStrava, user } = useAuth();
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const stateIntent = searchParams.get("state");
    const intent = stateIntent || sessionStorage.getItem("fitclash-strava-intent") || "login";

    const run = async () => {
      if (!code) {
        setError("Missing Strava authorization code.");
        return;
      }

      try {
        if (intent === "connect") {
          await api.post("/strava/connect", { code });
          sessionStorage.removeItem("fitclash-strava-intent");
          setFinished(true);
          navigate("/app", { replace: true });
          return;
        }

        await loginWithStrava(code);
        sessionStorage.removeItem("fitclash-strava-intent");
        setFinished(true);
        navigate("/app", { replace: true });
      } catch (callbackError) {
        setError(callbackError.message);
      }
    };

    run();
  }, [loginWithStrava, navigate, searchParams]);

  if (finished && user) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="center-screen">
      {error ? <p className="error-text">{error}</p> : <p className="muted">Completing Strava connection...</p>}
    </div>
  );
}
