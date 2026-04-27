import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import LeaderboardTable from "../components/LeaderboardTable.jsx";
import PlayerCard from "../components/PlayerCard.jsx";
import Podium from "../components/Podium.jsx";

export default function GroupPage() {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [playerCard, setPlayerCard] = useState(null);
  const [error, setError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");

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

  const handleSync = async () => {
    setSyncMessage("");

    try {
      const result = await api.post("/strava/sync", { groupId });
      setSyncMessage(result.message);
      loadGroup();
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

      <Podium leaderboard={group.leaderboard} />

      <section className="two-column analytics-layout">
        <LeaderboardTable
          leaderboard={group.leaderboard}
          onSelectPlayer={loadPlayer}
          selectedPlayerId={playerCard?.player?._id}
        />
        <PlayerCard player={playerCard} />
      </section>
    </div>
  );
}
