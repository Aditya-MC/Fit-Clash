import { useMemo, useState } from "react";

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });

export default function ActivityFeed({ activities = [] }) {
  const [filters, setFilters] = useState({
    player: "",
    date: "",
    activity: ""
  });

  const players = useMemo(
    () => [...new Set(activities.map((activity) => activity.user?.name).filter(Boolean))].sort(),
    [activities]
  );

  const filteredActivities = useMemo(() => {
    const sorted = [...activities].sort(
      (left, right) => new Date(right.createdAt || right.startedAt) - new Date(left.createdAt || left.startedAt)
    );

    return sorted.filter((activity) => {
      const playerMatch = !filters.player || activity.user?.name === filters.player;
      const dateMatch = !filters.date || new Date(activity.startedAt).toISOString().slice(0, 10) === filters.date;
      const activitySearch = filters.activity.trim().toLowerCase();
      const activityMatch =
        !activitySearch ||
        `${activity.title} ${activity.type} ${activity.sourceLabel || "Strava"}`
          .toLowerCase()
          .includes(activitySearch);

      return playerMatch && dateMatch && activityMatch;
    });
  }, [activities, filters]);

  return (
    <section className="card activity-feed-card">
      <div className="section-header">
        <div>
          <p className="eyebrow">Activity feed</p>
          <h2>Recent activity</h2>
          <p className="section-subtle">Latest scored activities across Strava, manual entry, and in-app tracking.</p>
        </div>
      </div>

      <div className="activity-filter-row">
        <label>
          Player
          <select value={filters.player} onChange={(event) => setFilters((current) => ({ ...current, player: event.target.value }))}>
            <option value="">All players</option>
            {players.map((player) => (
              <option key={player} value={player}>
                {player}
              </option>
            ))}
          </select>
        </label>

        <label>
          Date
          <input
            type="date"
            value={filters.date}
            onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}
          />
        </label>

        <label>
          Activity
          <input
            type="text"
            placeholder="Run, weight training, manual..."
            value={filters.activity}
            onChange={(event) => setFilters((current) => ({ ...current, activity: event.target.value }))}
          />
        </label>
      </div>

      <div className="activity-feed-list">
        {filteredActivities.map((activity) => (
          <article key={activity._id || activity.stravaActivityId} className="activity-row">
            <div className="activity-row-main">
              <strong>{activity.title}</strong>
              <p className="muted">
                {(activity.user?.name || "Unknown athlete")} | {activity.type} | {activity.sourceLabel || "Strava"} | {formatDate(activity.startedAt)}
              </p>
            </div>
            <div className="activity-row-metrics">
              <span>{activity.distanceKm || 0} km</span>
              <span>{activity.movingTimeMinutes || 0} min</span>
              <strong>{activity.pointsAwarded} pts</strong>
            </div>
          </article>
        ))}
        {!filteredActivities.length && <p className="muted">No scored activities match the selected filters.</p>}
      </div>
    </section>
  );
}
