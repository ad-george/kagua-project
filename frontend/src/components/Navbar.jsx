import { useState, useEffect } from "react";
import { Menu, X, Home, Info, LayoutDashboard } from "lucide-react";
import "./Navbar.css";

function Navbar({ user, currentView, onNavigate, onLogout, onAboutClick, stepLabel, isReviewMode = false }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 600) setMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  const handleNav = (action) => {
    action();
    closeMenu();
  };

  const guestLinks = [
    { label: "Home", icon: Home, action: () => onNavigate("landing"), highlight: currentView === "landing" },
    { label: "About", icon: Info, action: () => onAboutClick?.(), highlight: false },
  ];

  const guestActions = [
    { label: "Log in", action: () => onNavigate("login"), variant: "secondary" },
    { label: "Get started", action: () => onNavigate("login"), variant: "primary" },
  ];

  const authedLinks = [
    { label: "Home", icon: Home, action: () => onNavigate("landing"), highlight: currentView === "landing" },
    { label: "Dashboard", icon: LayoutDashboard, action: () => onNavigate("home"), highlight: currentView === "dashboard" },
  ];

  const authedActions = [
    { label: "Log out", action: () => onLogout?.(), variant: "secondary" },
  ];

  const links = user ? authedLinks : guestLinks;
  const actions = user ? authedActions : guestActions;
  const primaryAction = actions.find((a) => a.variant === "primary");
  const secondaryAction = actions.find((a) => a.variant === "secondary");

  return (
    <nav className="navbar" aria-label="Main">
      <div className="navbar-inner">
        <div className="navbar-left">
          <button
            className="navbar-logo"
            onClick={() => handleNav(() => onNavigate("landing"))}
            aria-label="Kagua home"
          >
            <span className="navbar-logo-mark">K</span>
            <span className="navbar-logo-name">Kagua</span>
          </button>

          {stepLabel && !isReviewMode && <span className="navbar-step-label">{stepLabel}</span>}
        </div>

        <div className="navbar-desktop">
          <ul className="navbar-links">
            {links.map(({ label, action, highlight }) => (
              <li key={label}>
                <button
                  className={`navbar-link ${highlight ? "navbar-link-active" : ""}`}
                  onClick={() => handleNav(action)}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>

          <div className="navbar-actions">
            {actions.map(({ label, action, variant }) => (
              <button
                key={label}
                className={`navbar-action ${variant === "primary" ? "navbar-action-primary" : "navbar-action-secondary"}`}
                onClick={() => handleNav(action)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          className="navbar-hamburger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="navbar-menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div
        className={`navbar-mobile-backdrop ${menuOpen ? "navbar-mobile-backdrop-open" : ""}`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      <div
        id="navbar-menu"
        className={`navbar-mobile-drawer ${menuOpen ? "navbar-mobile-drawer-open" : ""}`}
        aria-hidden={!menuOpen}
      >
        <div className="navbar-mobile-links">
          {links.map(({ label, icon: Icon, action, highlight }) => (
            <button
              key={label}
              tabIndex={menuOpen ? 0 : -1}
              className={`navbar-mobile-link-row ${highlight ? "navbar-mobile-active" : ""}`}
              onClick={() => handleNav(action)}
            >
              {Icon && <Icon size={20} strokeWidth={2} />}
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="navbar-mobile-cta-area">
          {primaryAction && (
            <button
              tabIndex={menuOpen ? 0 : -1}
              className="navbar-mobile-primary-btn"
              onClick={() => handleNav(primaryAction.action)}
            >
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button
              tabIndex={menuOpen ? 0 : -1}
              className="navbar-mobile-secondary-link"
              onClick={() => handleNav(secondaryAction.action)}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;