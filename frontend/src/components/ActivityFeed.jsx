import { useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });

const toInputDate = (value) => new Date(value).toISOString().slice(0, 10);

export default function ActivityFeed({ groupId, activities = [], onRefresh }) {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    player: "",
    date: "",
    activity: ""
  });
  const [editingId, setEditingId] = useState("");
  const [editingForm, setEditingForm] = useState({
    title: "",
    type: "Run",
    distanceKm: "",
    movingTimeMinutes: "",
    elevationGain: "",
    startedAt: ""
  });
  const [actionError, setActionError] = useState("");

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

  const startEdit = (activity) => {
    setActionError("");
    setEditingId(activity._id);
    setEditingForm({
      title: activity.title,
      type: activity.type,
      distanceKm: activity.distanceKm ?? "",
      movingTimeMinutes: activity.movingTimeMinutes ?? "",
      elevationGain: activity.elevationGain ?? "",
      startedAt: toInputDate(activity.startedAt)
    });
  };

  const cancelEdit = () => {
    setEditingId("");
    setActionError("");
  };

  const saveEdit = async (activityId) => {
    try {
      await api.patch(`/groups/${groupId}/activities/${activityId}`, editingForm);
      setEditingId("");
      await onRefresh?.();
    } catch (error) {
      setActionError(error.message);
    }
  };

  const removeActivity = async (activityId) => {
    try {
      setActionError("");
      await api.delete(`/groups/${groupId}/activities/${activityId}`);
      if (editingId === activityId) {
        setEditingId("");
      }
      await onRefresh?.();
    } catch (error) {
      setActionError(error.message);
    }
  };

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

      {actionError && <p className="error-text">{actionError}</p>}

      <div className="activity-feed-list">
        {filteredActivities.map((activity) => {
          const isOwner = user?._id && activity.user?._id === user._id;
          const editable = isOwner && activity.source !== "strava";
          const isEditing = editingId === activity._id;

          return (
            <article key={activity._id || activity.stravaActivityId} className="activity-row activity-row-card">
              {isEditing ? (
                <div className="activity-edit-form">
                  <label>
                    Title
                    <input
                      value={editingForm.title}
                      onChange={(event) => setEditingForm((current) => ({ ...current, title: event.target.value }))}
                    />
                  </label>
                  <label>
                    Type
                    <select
                      value={editingForm.type}
                      onChange={(event) => setEditingForm((current) => ({ ...current, type: event.target.value }))}
                    >
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
                      value={editingForm.distanceKm}
                      onChange={(event) => setEditingForm((current) => ({ ...current, distanceKm: event.target.value }))}
                    />
                  </label>
                  <label>
                    Duration (minutes)
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editingForm.movingTimeMinutes}
                      onChange={(event) => setEditingForm((current) => ({ ...current, movingTimeMinutes: event.target.value }))}
                    />
                  </label>
                  <label>
                    Elevation (m)
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editingForm.elevationGain}
                      onChange={(event) => setEditingForm((current) => ({ ...current, elevationGain: event.target.value }))}
                    />
                  </label>
                  <label>
                    Date
                    <input
                      type="date"
                      value={editingForm.startedAt}
                      onChange={(event) => setEditingForm((current) => ({ ...current, startedAt: event.target.value }))}
                    />
                  </label>
                  <div className="activity-row-actions">
                    <button className="primary-button" type="button" onClick={() => saveEdit(activity._id)}>
                      Save
                    </button>
                    <button className="ghost-button" type="button" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
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
                  {isOwner && (
                    <div className="activity-row-actions compact">
                      {editable && (
                        <button className="ghost-button small-button" type="button" onClick={() => startEdit(activity)}>
                          Edit
                        </button>
                      )}
                      <button className="ghost-button small-button" type="button" onClick={() => removeActivity(activity._id)}>
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </article>
          );
        })}
        {!filteredActivities.length && <p className="muted">No scored activities match the selected filters.</p>}
      </div>
    </section>
  );
}
