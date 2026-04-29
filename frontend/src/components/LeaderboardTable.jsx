export default function LeaderboardTable({ leaderboard = [], onSelectPlayer, selectedPlayerId }) {
  return (
    <section className="card">
      <div className="section-header">
        <div>
          <p className="eyebrow">Standings</p>
          <h2>Race for the top</h2>
          <p className="section-subtle">Open any athlete to inspect consistency, pace, and rivalry context.</p>
        </div>
      </div>

      <div className="leaderboard-list">
        {leaderboard.map((entry) => (
          <button
            key={entry.user._id}
            className={`leaderboard-row ${selectedPlayerId === entry.user._id ? "active" : ""}`}
            onClick={() => onSelectPlayer(entry.user._id)}
          >
            <span className="rank-chip">#{entry.rank}</span>
            <div className="leaderboard-meta">
              <strong>{entry.user.name}</strong>
              <small>{entry.activityCount} activities | {entry.activeDays} active days</small>
            </div>
            <div className="leaderboard-score">
              <strong>{entry.points}</strong>
              <small>pts</small>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
