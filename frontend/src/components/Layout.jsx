import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Layout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className={`app-shell ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand-mark">FC</div>
          <div>
            <p className="eyebrow">Private fitness leagues</p>
            <h1>Fit Clash</h1>
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/app">Overview</NavLink>
        </nav>

        <div className="sidebar-note">
          <span className="status-dot" />
          <p className="muted">Strava-backed competitions for small friend groups.</p>
        </div>

        <div className="profile-box surface-soft">
          <div className="profile-copy">
            <span className="profile-kicker">Signed in</span>
            <strong>{user?.name}</strong>
            <p className="muted">{user?.email}</p>
          </div>
          <button className="ghost-button" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-topline">
            <button
              className="sidebar-toggle"
              type="button"
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              onClick={() => setSidebarOpen((value) => !value)}
            >
              <span />
              <span />
              <span />
            </button>

            <div className="topbar-links">
              <span>Overview</span>
              <span>{user?.name}</span>
              <button className="topbar-link-button" type="button" onClick={logout}>
                Log out
              </button>
            </div>
          </div>

          <div className="topbar-body">
            <p className="eyebrow">Workspace</p>
            <h2>Dashboard</h2>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
