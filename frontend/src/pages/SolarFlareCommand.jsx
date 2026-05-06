import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";

const API_BASE = "http://localhost:5001";

function formatDateTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function SolarFlareCommand() {
  const [solarSummary, setSolarSummary] = useState(null);
  const [solarFlares, setSolarFlares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchSolarData() {
      try {
        setLoading(true);
        setError("");

        const [summaryResponse, recentResponse] = await Promise.all([
          fetch(`${API_BASE}/api/solar-flares/summary`),
          fetch(`${API_BASE}/api/solar-flares/recent`),
        ]);

        if (!summaryResponse.ok || !recentResponse.ok) {
          throw new Error("Failed to load solar flare data");
        }

        const summaryData = await summaryResponse.json();
        const recentData = await recentResponse.json();

        setSolarSummary(summaryData);
        setSolarFlares(recentData.rows || []);
      } catch (err) {
        setError(err.message || "Failed to load solar flare data");
      } finally {
        setLoading(false);
      }
    }

    fetchSolarData();
  }, []);

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">DONKI Solar Intelligence</p>
          <h1>Solar Flare Command</h1>
          <p className="subtitle">
            Dedicated monitoring page for NASA DONKI solar flare activity,
            classifications, source regions, and linked event records.
          </p>
        </div>

        <Link to="/" className="status-pill">
          ← COMMAND HOME
        </Link>
      </header>

      {loading && <div className="message-box">Loading solar telemetry...</div>}
      {error && <div className="message-box error">Error: {error}</div>}

      {!loading && !error && (
        <>
          <section className="kpi-grid">
            <div className="kpi-card">
              <p>Total Solar Flares</p>
              <h2>{solarSummary?.total_flares ?? 0}</h2>
            </div>

            <div className="kpi-card danger">
              <p>Strongest Flare</p>
              <h2>{solarSummary?.strongest_flare?.class_type ?? "N/A"}</h2>
              <span>
                {solarSummary?.strongest_flare?.source_location ?? "Unknown"}
              </span>
            </div>

            <div className="kpi-card">
              <p>C-Class</p>
              <h2>{solarSummary?.class_counts?.C ?? 0}</h2>
            </div>

            <div className="kpi-card">
              <p>M/X-Class</p>
              <h2>
                {(solarSummary?.class_counts?.M ?? 0) +
                  (solarSummary?.class_counts?.X ?? 0)}
              </h2>
              <span>higher-energy events</span>
            </div>
          </section>

          <section className="tracking-table-wrap solar-panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Solar Flare Feed</p>
                <h2>Recent Solar Flare Activity</h2>
              </div>

              <span>{solarFlares.length} visible</span>
            </div>

            <div className="tracking-table">
              <div className="table-row table-head">
                <span>Flare ID</span>
                <span>Class</span>
                <span>Begin Time</span>
                <span>Region</span>
                <span>Source</span>
              </div>

              {solarFlares.map((flare) => (
                <a
                  key={flare.flr_id}
                  href={flare.link}
                  target="_blank"
                  rel="noreferrer"
                  className="table-row data-row"
                >
                  <span>{flare.flr_id}</span>
                  <span>{flare.class_type}</span>
                  <span>{formatDateTime(flare.begin_time)}</span>
                  <span>{flare.active_region_num || "N/A"}</span>
                  <span>{flare.source_location || "Unknown"}</span>
                </a>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}