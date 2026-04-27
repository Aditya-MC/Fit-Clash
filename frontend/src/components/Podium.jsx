export default function Podium({ leaderboard = [] }) {
  const topThree = leaderboard.slice(0, 3);
  const ordered = [topThree[1], topThree[0], topThree[2]].filter(Boolean);

  return (
    <section className="card card-elevated">
      <div className="section-header">
        <div>
          <p className="eyebrow">Current podium</p>
          <h2>Leaders of the pack</h2>
          <p className="section-subtle">A calm snapshot of who is setting the pace right now.</p>
        </div>
      </div>

      <div className="podium">
        {ordered.map((entry) => (
          <div key={entry.user._id} className={`podium-step rank-${entry.rank}`}>
            <span className="podium-rank">0{entry.rank}</span>
            <strong>{entry.user.name}</strong>
            <p className="podium-points">{entry.points} pts</p>
            <span className="podium-caption">{entry.rank === 1 ? "In command" : "Within reach"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
