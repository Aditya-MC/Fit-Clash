import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import ActivityFeed from "../components/ActivityFeed.jsx";
import LeaderboardTable from "../components/LeaderboardTable.jsx";
import PlayerCard from "../components/PlayerCard.jsx";
import Podium from "../components/Podium.jsx";

const toRadians = (value) => (value * Math.PI) / 180;

const getDistanceKm = (from, to) => {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const formatElapsed = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [hours, minutes, remainingSeconds].map((value) => String(value).padStart(2, "0")).join(":");
};

const getDisplayedPoints = (mode, distanceKm, elapsedSeconds, scoringRules, active) => {
  if (!active) {
    return calculateLivePoints(mode, distanceKm, elapsedSeconds, scoringRules);
  }

  const snappedSeconds = Math.floor(elapsedSeconds / 10) * 10;
  return calculateLivePoints(mode, distanceKm, snappedSeconds, scoringRules);
};

const calculateLivePoints = (mode, distanceKm, elapsedSeconds, scoringRules = {}) => {
  const movingTimeMinutes = elapsedSeconds / 60;
  const rules = {
    runPerKm: 12,
    workoutPerMinute: 1 / 6,
    ...scoringRules
  };

  if (mode === "Run") {
    return Math.round(distanceKm * Number(rules.runPerKm || 12));
  }

  return Math.round(movingTimeMinutes * Number(rules.workoutPerMinute || 1 / 6));
};

const createDefaultTracker = () => ({
  mode: "Run",
  active: false,
  elapsedSeconds: 0,
  distanceKm: 0,
  points: 0,
  status: "Idle",
  startedAt: "",
  locationCount: 0
});

export default function GroupPage() {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [playerCard, setPlayerCard] = useState(null);
  const [error, setError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [manualForm, setManualForm] = useState({
    title: "",
    type: "Run",
    distanceKm: "",
    movingTimeMinutes: "",
    elevationGain: "",
    startedAt: new Date().toISOString().slice(0, 10)
  });
  const [tracker, setTracker] = useState(createDefaultTracker());
  const watchIdRef = useRef(null);
  const timerRef = useRef(null);
  const startedAtRef = useRef(null);
  const elapsedSecondsRef = useRef(0);
  const distanceKmRef = useRef(0);
  const pointsRef = useRef([]);

  const loadPlayer = async (userId) => {
    try {
      const data = await api.get(`/groups/${groupId}/players/${userId}`);
      setPlayerCard(data);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  const loadGroup = async () => {
    try {
      const data = await api.get(`/groups/${groupId}`);
      setGroup(data);

      if (data.leaderboard?.[0]) {
        loadPlayer(data.leaderboard[0].user._id);
      }
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  useEffect(
    () => () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    },
    []
  );

  const resetTracker = (nextMode = tracker.mode) => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    startedAtRef.current = null;
    elapsedSecondsRef.current = 0;
    distanceKmRef.current = 0;
    pointsRef.current = [];
    setTracker({
      ...createDefaultTracker(),
      mode: nextMode
    });
  };

  const handleRunPosition = (position) => {
    const nextPoint = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };
    const previousPoint = pointsRef.current[pointsRef.current.length - 1];

    if (previousPoint) {
      distanceKmRef.current += getDistanceKm(previousPoint, nextPoint);
    }

    pointsRef.current = [...pointsRef.current, nextPoint];

    setTracker((current) => ({
      ...current,
      distanceKm: Number(distanceKmRef.current.toFixed(2)),
      points: getDisplayedPoints("Run", distanceKmRef.current, elapsedSecondsRef.current, group?.scoringRules, current.active),
      status: "Tracking run",
      locationCount: pointsRef.current.length
    }));
  };

  const handleStartTracker = () => {
    setError("");
    setSyncMessage("");

    if (tracker.mode === "Run" && !navigator.geolocation) {
      setError("Geolocation is not supported on this device.");
      return;
    }

    resetTracker(tracker.mode);

    const startedAt = new Date();
    startedAtRef.current = startedAt;
    setTracker((current) => ({
      ...current,
      active: true,
      elapsedSeconds: 0,
      distanceKm: 0,
      points: 0,
      startedAt: startedAt.toISOString(),
      status: current.mode === "Run" ? "Locating GPS..." : "Tracking timer"
    }));

    timerRef.current = setInterval(() => {
      elapsedSecondsRef.current += 1;

      setTracker((current) => ({
        ...current,
        elapsedSeconds: elapsedSecondsRef.current,
        points: getDisplayedPoints(current.mode, distanceKmRef.current, elapsedSecondsRef.current, group?.scoringRules, current.active)
      }));
    }, 1000);

    if (tracker.mode === "Run") {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleRunPosition,
        (positionError) => {
          setError(positionError.message || "Unable to read location.");
          setTracker((current) => ({
            ...current,
            status: "Location error"
          }));
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000
        }
      );
    }
  };

  const handleStopTracker = async () => {
    if (!tracker.active || !startedAtRef.current) {
      return;
    }

    const isRun = tracker.mode === "Run";
    const payload = {
      title: `${tracker.mode} ${new Date(startedAtRef.current).toLocaleDateString()}`,
      source: "in_app",
      type: isRun ? "Run" : "Weight Training",
      distanceKm: isRun ? Number(distanceKmRef.current.toFixed(2)) : 0,
      movingTimeMinutes: Number((elapsedSecondsRef.current / 60).toFixed(1)),
      elevationGain: 0,
      startedAt: startedAtRef.current.toISOString()
    };

    resetTracker(tracker.mode);

    try {
      const result = await api.post(`/groups/${groupId}/activities/manual`, payload);
      setSyncMessage(`${result.message} ${result.pointsAwarded} pts awarded.`);
      await loadGroup();
    } catch (stopError) {
      setError(stopError.message);
    }
  };

  const handleCancelTracker = () => {
    setError("");
    setSyncMessage("");
    resetTracker(tracker.mode);
  };

  const handleSync = async () => {
    setSyncMessage("");

    try {
      const result = await api.post("/strava/sync", { groupId });
      setSyncMessage(result.message);
      await loadGroup();
    } catch (syncError) {
      setError(syncError.message);
    }
  };

  const handleConnectStrava = async () => {
    try {
      const result = await api.get("/strava/connect-url");
      sessionStorage.setItem("fitclash-strava-intent", "connect");
      window.location.href = result.url;
    } catch (connectError) {
      setError(connectError.message);
    }
  };

  const handleManualSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSyncMessage("");

    try {
      const result = await api.post(`/groups/${groupId}/activities/manual`, {
        ...manualForm,
        source: "manual"
      });
      setSyncMessage(`${result.message} ${result.pointsAwarded} pts awarded.`);
      setManualForm((current) => ({
        ...current,
        title: "",
        distanceKm: "",
        movingTimeMinutes: "",
        elevationGain: ""
      }));
      await loadGroup();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  if (!group) {
    return <div className="center-screen">Loading group...</div>;
  }

  return (
    <div className="page-stack group-page">
      <section className="hero-banner hero-grid card-elevated">
        <div className="hero-copy">
          <p className="eyebrow">Group</p>
          <h1>{group.name}</h1>
          <p className="muted">{group.description || "A private competition space for your crew."}</p>
        </div>

        <div className="hero-actions">
          <div className="invite-chip">Invite code {group.inviteCode}</div>
          <button className="ghost-button strava-button" onClick={handleConnectStrava}>
            Connect Strava
          </button>
          <button className="primary-button" onClick={handleSync}>
            Sync activities
          </button>
        </div>
      </section>

      {error && <p className="error-text">{error}</p>}
      {syncMessage && <p className="success-text">{syncMessage}</p>}

      <section className="overview-strip">
        <article className="mini-stat">
          <span>Members</span>
          <strong>{group.members.length}</strong>
        </article>
        <article className="mini-stat">
          <span>Leader</span>
          <strong>{group.leaderboard?.[0]?.user?.name || "TBD"}</strong>
        </article>
        <article className="mini-stat">
          <span>Top score</span>
          <strong>{group.leaderboard?.[0]?.points || 0} pts</strong>
        </article>
      </section>

      <section className="card run-tracker-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Live tracker</p>
            <h2>Track a run or weight training session</h2>
            <p className="section-subtle">Runs use foreground GPS. Weight training uses a live duration timer and updates points continuously while the session runs.</p>
          </div>
        </div>

        <div className="tracker-mode-row">
          <label>
            Session type
            <select
              value={tracker.mode}
              onChange={(event) => setTracker((current) => ({ ...current, mode: event.target.value }))}
              disabled={tracker.active}
            >
              <option>Run</option>
              <option>Weight Training</option>
            </select>
          </label>
        </div>

        <div className="run-tracker-grid">
          <article className="metric-box">
            <span>Status</span>
            <strong>{tracker.status}</strong>
          </article>
          <article className="metric-box">
            <span>Elapsed</span>
            <strong>{formatElapsed(tracker.elapsedSeconds)}</strong>
          </article>
          <article className="metric-box">
            <span>{tracker.mode === "Run" ? "Distance" : "Mode"}</span>
            <strong>{tracker.mode === "Run" ? `${tracker.distanceKm.toFixed(2)} km` : "Timer only"}</strong>
          </article>
          <article className="metric-box">
            <span>Live points</span>
            <strong>{tracker.points} pts</strong>
          </article>
        </div>

        <div className="run-tracker-actions">
          <button className="ghost-button" onClick={handleStartTracker} disabled={tracker.active} type="button">
            Start
          </button>
          <button className="primary-button" onClick={handleStopTracker} disabled={!tracker.active} type="button">
            Finish and save
          </button>
          <button className="ghost-button" onClick={handleCancelTracker} disabled={!tracker.active} type="button">
            Cancel
          </button>
        </div>
      </section>

      <section className="card manual-entry-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Manual entry</p>
            <h2>Log an activity manually</h2>
            <p className="section-subtle">Use this when Strava is unavailable. Weight training and workouts score from duration, while runs, rides, swims, walks, and hikes score from distance.</p>
          </div>
        </div>

        <form className="manual-entry-form" onSubmit={handleManualSubmit}>
          <label>
            Activity title
            <input
              value={manualForm.title}
              onChange={(event) => setManualForm({ ...manualForm, title: event.target.value })}
              required
            />
          </label>

          <label>
            Activity type
            <select value={manualForm.type} onChange={(event) => setManualForm({ ...manualForm, type: event.target.value })}>
              <option>Run</option>
              <option>Ride</option>
              <option>Swim</option>
              <option>Weight Training</option>
              <option>Workout</option>
              <option>Walk</option>
              <option>Hike</option>
            </select>
          </label>

          <label>
            Distance (km)
            <input
              type="number"
              min="0"
              step="0.1"
              value={manualForm.distanceKm}
              onChange={(event) => setManualForm({ ...manualForm, distanceKm: event.target.value })}
            />
          </label>

          <label>
            Duration (minutes)
            <input
              type="number"
              min="0"
              step="1"
              value={manualForm.movingTimeMinutes}
              onChange={(event) => setManualForm({ ...manualForm, movingTimeMinutes: event.target.value })}
            />
          </label>

          <label>
            Elevation gain (m)
            <input
              type="number"
              min="0"
              step="1"
              value={manualForm.elevationGain}
              onChange={(event) => setManualForm({ ...manualForm, elevationGain: event.target.value })}
            />
          </label>

          <label>
            Date
            <input
              type="date"
              value={manualForm.startedAt}
              onChange={(event) => setManualForm({ ...manualForm, startedAt: event.target.value })}
              required
            />
          </label>

          <button className="primary-button" type="submit">
            Add manual activity
          </button>
        </form>
      </section>

      <Podium leaderboard={group.leaderboard} />

      <section className="two-column analytics-layout">
        <LeaderboardTable
          leaderboard={group.leaderboard}
          onSelectPlayer={loadPlayer}
          selectedPlayerId={playerCard?.player?._id}
        />
        <PlayerCard player={playerCard} />
      </section>

      <ActivityFeed groupId={groupId} activities={group.recentActivities} onRefresh={loadGroup} />
    </div>
  );
}
