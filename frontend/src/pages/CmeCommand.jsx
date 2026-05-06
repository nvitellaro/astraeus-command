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

export default function CmeCommand() {
  const [cmeSummary, setCmeSummary] = useState(null);
  const [cmeEvents, setCmeEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCmeData() {
      try {
        setLoading(true);
        setError("");

        const [summaryResponse, recentResponse] = await Promise.all([
          fetch(`${API_BASE}/api/cme/summary`),
          fetch(`${API_BASE}/api/cme/recent`),
        ]);

        if (!summaryResponse.ok || !recentResponse.ok) {
          throw new Error("Failed to load CME data");
        }

        const summaryData = await summaryResponse.json();
        const recentData = await recentResponse.json();

        setCmeSummary(summaryData);
        setCmeEvents(recentData.rows || []);
      } catch (err) {
        setError(err.message || "Failed to load CME data");
      } finally {
        setLoading(false);
      }
    }

    fetchCmeData();
  }, []);

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">DONKI CME Intelligence</p>
          <h1>CME Command</h1>
          <p className="subtitle">
            Dedicated monitoring page for NASA DONKI coronal mass ejections,
            linked solar events, source regions, and operational event records.
          </p>
        </div>

        <Link to="/" className="status-pill">
          ← COMMAND HOME
        </Link>
      </header>

      {loading && <div className="message-box">Loading CME telemetry...</div>}
      {error && <div className="message-box error">Error: {error}</div>}

      {!loading && !error && (
        <>
          <section className="kpi-grid">
            <div className="kpi-card">
              <p>Total CMEs</p>
              <h2>{cmeSummary?.total_cmes ?? 0}</h2>
            </div>

            <div className="kpi-card danger">
              <p>Linked Events</p>
              <h2>{cmeSummary?.linked_event_count ?? 0}</h2>
              <span>flare/cme correlations</span>
            </div>

            <div className="kpi-card">
              <p>Latest CME</p>
              <h2>
                {cmeSummary?.latest_cme?.start_time
                  ? formatDateTime(cmeSummary.latest_cme.start_time)
                  : "N/A"}
              </h2>
              <span>{cmeSummary?.latest_cme?.source_location || "Unknown"}</span>
            </div>

            <div className="kpi-card">
              <p>Latest Active Region</p>
              <h2>{cmeSummary?.latest_cme?.active_region_num || "N/A"}</h2>
            </div>
          </section>

          <section className="tracking-table-wrap solar-panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">CME Feed</p>
                <h2>Recent Coronal Mass Ejections</h2>
              </div>

              <span>{cmeEvents.length} visible</span>
            </div>

            <div className="tracking-table">
              <div className="table-row table-head">
                <span>CME ID</span>
                <span>Start Time</span>
                <span>Region</span>
                <span>AR</span>
                <span>Linked</span>
              </div>

              {cmeEvents.map((cme) => (
                <a
                  key={cme.cme_id}
                  href={cme.link}
                  target="_blank"
                  rel="noreferrer"
                  className="table-row data-row"
                >
                  <span>{cme.cme_id}</span>
                  <span>{formatDateTime(cme.start_time)}</span>
                  <span>{cme.source_location || "Unknown"}</span>
                  <span>{cme.active_region_num || "N/A"}</span>
                  <span>{cme.linked_events ? "YES" : "NO"}</span>
                </a>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}