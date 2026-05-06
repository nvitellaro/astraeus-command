import { Link, useLocation } from "react-router-dom";

export default function CommandLayout({ title, children }) {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/neo-command", label: "NEO" },
    { path: "/solar-flares", label: "Solar" },
    { path: "/cme-command", label: "CME" },
    { path: "/gst-command", label: "GST" },
  ];

  return (
    <div className="command-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <p className="sidebar-eyebrow">MISSION CONTROL</p>
          <h1>Astraeus</h1>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={
                location.pathname === item.path
                  ? "sidebar-link active"
                  : "sidebar-link"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="status-indicator">
            <span className="pulse-dot"></span>
            SYSTEM ONLINE
          </div>
        </div>
      </aside>

      <main className="command-main">
        <div className="page-header">
          <h1>{title}</h1>
        </div>

        {children}
      </main>
    </div>
  );
}