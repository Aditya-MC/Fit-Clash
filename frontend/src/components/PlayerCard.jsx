import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const mergeComparisonSeries = (playerSeries = [], competitorSeries = []) => {
  const dates = [...new Set([...playerSeries.map((entry) => entry.date), ...competitorSeries.map((entry) => entry.date)])];

  return dates.map((date) => ({
    date,
    player: playerSeries.find((entry) => entry.date === date)?.points || 0,
    competitor: competitorSeries.find((entry) => entry.date === date)?.points || 0
  }));
};

export default function PlayerCard({ player }) {
  if (!player) {
    return (
      <section className="card">
        <p className="muted">Select a player to see analytics.</p>
      </section>
    );
  }

  const comparisonSeries = mergeComparisonSeries(player.consistency, player.competitorTrend?.series || []);

  return (
    <section className="card player-card">
      <div className="section-header">
        <div>
          <p className="eyebrow">Player analytics</p>
          <h2>{player.player.name}</h2>
          <p className="section-subtle">{player.player.bio}</p>
        </div>
        <div className="stats-inline">
          <span className="topbar-pill">Rank #{player.rank}</span>
          <span className="topbar-pill subtle">{player.points} pts</span>
        </div>
      </div>

      <div className="metrics-grid">
        <article className="metric-box">
          <span>Activities logged</span>
          <strong>{player.activityCount}</strong>
        </article>
        <article className="metric-box">
          <span>KM ran this month</span>
          <strong>{player.monthlyDistanceKm ?? 0}</strong>
        </article>
        <article className="metric-box">
          <span>Hours worked out this month</span>
          <strong>{player.monthlyWorkoutHours ?? 0}</strong>
        </article>
        <article className="metric-box">
          <span>Highest ever ranked</span>
          <strong>#{player.highestEverRank ?? player.rank}</strong>
        </article>
        <article className="metric-box">
          <span>Consistency trend</span>
          <strong>{player.consistency.length} days</strong>
        </article>
        <article className="metric-box">
          <span>Nearby rivals</span>
          <strong>{player.nearbyCompetitors.length}</strong>
        </article>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <strong>Consistency graph</strong>
          <span className="muted">
            {player.competitorTrend ? `${player.player.name} vs ${player.competitorTrend.user.name}` : "Points over time"}
          </span>
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={comparisonSeries}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="player" stroke="#ffffff" strokeWidth={3} dot={false} />
              {player.competitorTrend && (
                <Line
                  type="monotone"
                  dataKey="competitor"
                  stroke="rgba(214, 214, 214, 0.95)"
                  strokeWidth={2.5}
                  strokeDasharray="8 6"
                  dot={{ r: 2, fill: "#d9d9d9", strokeWidth: 0 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <strong>Nearby competitor comparison</strong>
          <span className="muted">Who is right around this athlete</span>
        </div>
        <div className="competitor-list">
          {player.nearbyCompetitors.map((competitor) => (
            <div key={competitor.user._id} className="competitor-item">
              <span>{competitor.user.name}</span>
              <strong>{competitor.points} pts</strong>
            </div>
          ))}
          {!player.nearbyCompetitors.length && <p className="muted">No nearby competitors yet.</p>}
        </div>
      </div>
    </section>
  );
}
