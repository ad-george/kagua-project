import "./AppShell.css";

function AppShell({ children }) {
  return (
    <div className="app-shell">

      {/* ── Left brand panel — desktop only ── */}
      <aside className="app-shell-panel">
        <div className="app-shell-panel-inner">

          <div className="app-shell-brand">
            <span className="app-shell-logo">K</span>
            <span className="app-shell-logo-name">Kagua</span>
          </div>

          <div className="app-shell-hero">
            <h1 className="app-shell-headline">
              Know what you're<br />dealing with.
            </h1>
            <p className="app-shell-mission">
              A media and information literacy tool helping
              smallholder farmers in Kenya organise field
              observations, compare advice, and identify
              what is still uncertain — before making decisions.
            </p>
          </div>

          <div className="app-shell-footer">
            <p className="app-shell-footer-text">
              Built for smallholder farmers across Kenya
            </p>
            <div className="app-shell-divider" />
            <p className="app-shell-footer-tag">UNESCO Hackathon 2025</p>
          </div>

        </div>
      </aside>

      {/* ── Right content panel ── */}
      <main className="app-shell-content">
        {children}
      </main>

    </div>
  );
}

export default AppShell;