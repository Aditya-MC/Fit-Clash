export default function AppFooter({ compact = false }) {
  return (
    <footer className={`app-footer ${compact ? "app-footer-compact" : ""}`}>
      <div>
        <strong>Fit Clash</strong>
        <span>Private fitness leagues for friends who like a little pressure.</span>
      </div>
      <div className="footer-links">
        <span>Privacy first</span>
        <span>Built for small groups</span>
        <span>Keep moving</span>
      </div>
    </footer>
  );
}
