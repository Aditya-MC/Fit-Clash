const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });

export default function ActivityFeed({ activities = [] }) {
  return (
    <section className="card">
      <div className="section-header">
        <div>
          <p className="eyebrow">Activity feed</p>
          <h2>Recent imports</h2>
          <p className="section-subtle">Latest scored Strava activities that were pulled into this group.</p>
        </div>
      </div>

      <div className="activity-feed-list">
        {activities.map((activity) => (
          <article key={activity._id || activity.stravaActivityId} className="activity-row">
            <div className="activity-row-main">
              <strong>{activity.title}</strong>
              <p className="muted">
                {(activity.user?.name || "Unknown athlete")} · {activity.type} · {formatDate(activity.startedAt)}
              </p>
            </div>
            <div className="activity-row-metrics">
              <span>{activity.distanceKm || 0} km</span>
              <span>{activity.movingTimeMinutes || 0} min</span>
              <strong>{activity.pointsAwarded} pts</strong>
            </div>
          </article>
        ))}
        {!activities.length && <p className="muted">No synced activities yet.</p>}
      </div>
    </section>
  );
}
