import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

import NeoCommand from "./pages/NeoCommand";
import SolarFlareCommand from "./pages/SolarFlareCommand";

import "./App.css";

function LandingPage() {
  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Space Intelligence Platform</p>
          <h1>Astraeus Command</h1>
          <p className="subtitle">
            Mission-control access point for near-Earth object tracking, solar
            activity, CME monitoring, and geomagnetic storm intelligence.
          </p>
        </div>

        <div className="status-pill">
          <span className="pulse-dot"></span>
          PLATFORM ONLINE
        </div>
      </header>

      <section className="kpi-grid">
        <Link to="/neo-command" className="kpi-card command-tile">
          <p>NEO Command</p>
          <h2>NeoWs</h2>
          <span>Asteroid tracking, hazard flags, approach analytics</span>
        </Link>

        <Link to="/solar-flares" className="kpi-card command-tile">
          <p>Solar Flares</p>
          <h2>DONKI FLR</h2>
          <span>Recent flare activity and class intelligence</span>
        </Link>

        <Link to="/neo-command" className="kpi-card command-tile">
          <p>CME Command</p>
          <h2>DONKI CME</h2>
          <span>Coronal mass ejection monitoring and linked events</span>
        </Link>

        <Link to="/neo-command" className="kpi-card command-tile danger">
          <p>GST Command</p>
          <h2>DONKI GST</h2>
          <span>Geomagnetic storms, Kp index, and severe events</span>
        </Link>
      </section>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/neo-command" element={<NeoCommand />} />

        <Route
          path="/solar-flares"
          element={<SolarFlareCommand />}
        />
      </Routes>
    </BrowserRouter>
  );
}