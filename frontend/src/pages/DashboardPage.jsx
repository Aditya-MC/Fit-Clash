import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function DashboardPage() {
  const [groups, setGroups] = useState([]);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    challengeDuration: "monthly",
    visibility: "private"
  });
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const totalActivitiesLogged = groups.reduce((sum, group) => sum + (group.userActivityCount || 0), 0);
  const rankedGroups = groups.map((group) => group.userRank).filter(Boolean);
  const highestRank = rankedGroups.length ? Math.min(...rankedGroups) : "-";

  const loadGroups = async () => {
    try {
      const data = await api.get("/groups");
      setGroups(data);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await api.post("/groups", createForm);
      setCreateForm({
        name: "",
        description: "",
        challengeDuration: "monthly",
        visibility: "private"
      });
      loadGroups();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const handleJoin = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await api.post("/groups/join", { inviteCode });
      setInviteCode("");
      loadGroups();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  return (
    <div className="page-stack dashboard-page">
      {error && <p className="error-text">{error}</p>}

      <section className="card dashboard-stats-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Your stats</p>
            <h2>Quick snapshot</h2>
          </div>
        </div>

        <div className="hero-stat-panel">
          <div className="hero-stat">
            <span>Groups</span>
            <strong>{groups.length}</strong>
          </div>
          <div className="hero-stat">
            <span>Total activities logged</span>
            <strong>{totalActivitiesLogged}</strong>
          </div>
          <div className="hero-stat">
            <span>Highest rank in any group</span>
            <strong>{highestRank === "-" ? "-" : `#${highestRank}`}</strong>
          </div>
        </div>
      </section>

      <section className="card dashboard-groups-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Your groups</p>
            <h2>Competition spaces</h2>
            <p className="section-subtle">Your private rooms for leaderboards and player tracking.</p>
          </div>
        </div>

        <div className="group-grid">
          {groups.map((group) => (
            <Link key={group._id} to={`/app/groups/${group._id}`} className="group-tile">
              <div className="group-tile-top">
                <div>
                  <strong>{group.name}</strong>
                  <p>{group.description || "No description yet."}</p>
                </div>
                <span className="group-arrow">Open</span>
              </div>
              <div className="group-meta">
                <span>{group.challengeDuration}</span>
                <span>{group.visibility}</span>
                <span>Rank: #{group.userRank || "-"}</span>
              </div>
            </Link>
          ))}
          {!groups.length && <p className="muted">No groups yet. Create one to begin the competition.</p>}
        </div>
      </section>

      <section className="two-column dashboard-forms">
        <form className="card dashboard-form-card dashboard-create-card" onSubmit={handleCreate}>
          <div className="section-header">
            <div>
              <p className="eyebrow">Create group</p>
              <h2>Start a new league</h2>
              <p className="section-subtle">Create a private space for standings, sync, and competition.</p>
            </div>
          </div>

          <label>
            Group name
            <input
              value={createForm.name}
              onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
              required
            />
          </label>

          <label>
            Description
            <textarea
              rows="4"
              value={createForm.description}
              onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })}
            />
          </label>

          <label>
            Challenge duration
            <select
              value={createForm.challengeDuration}
              onChange={(event) => setCreateForm({ ...createForm, challengeDuration: event.target.value })}
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>

          <label>
            Type
            <select
              value={createForm.visibility}
              onChange={(event) => setCreateForm({ ...createForm, visibility: event.target.value })}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </label>

          <button className="primary-button" type="submit">
            Create group
          </button>
        </form>

        <form className="card dashboard-form-card dashboard-join-card" onSubmit={handleJoin}>
          <div className="section-header">
            <div>
              <p className="eyebrow">Join group</p>
              <h2>Use an invite code</h2>
              <p className="section-subtle">Jump into an existing league instantly.</p>
            </div>
          </div>

          <label>
            Invite code
            <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} required />
          </label>

          <button className="primary-button form-submit-bottom" type="submit">
            Join challenge
          </button>
        </form>
      </section>
    </div>
  );
}
