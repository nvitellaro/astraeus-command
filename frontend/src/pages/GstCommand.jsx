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

export default function GstCommand() {
  const [gstSummary, setGstSummary] = useState(null);
  const [gstEvents, setGstEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchGstData() {
      try {
        setLoading(true);
        setError("");

        const [summaryResponse, recentResponse] = await Promise.all([
          fetch(`${API_BASE}/api/gst/summary`),
          fetch(`${API_BASE}/api/gst/recent`),
        ]);

        if (!summaryResponse.ok || !recentResponse.ok) {
          throw new Error("Failed to load GST data");
        }

        const summaryData = await summaryResponse.json();
        const recentData = await recentResponse.json();

        setGstSummary(summaryData);
        setGstEvents(recentData.rows || []);
      } catch (err) {
        setError(err.message || "Failed to load GST data");
      } finally {
        setLoading(false);
      }
    }

    fetchGstData();
  }, []);

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">DONKI GST Intelligence</p>
          <h1>GST Command</h1>
          <p className="subtitle">
            Dedicated monitoring page for NASA DONKI geomagnetic storm events,
            Kp index severity, linked solar activity, and Earth-impact records.
          </p>
        </div>

        <Link to="/" className="status-pill">
          ← COMMAND HOME
        </Link>
      </header>

      {loading && <div className="message-box">Loading GST telemetry...</div>}
      {error && <div className="message-box error">Error: {error}</div>}

      {!loading && !error && (
        <>
          <section className="kpi-grid">
            <div className="kpi-card">
              <p>Total GST Events</p>
              <h2>{gstSummary?.total_gst ?? 0}</h2>
            </div>

            <div className="kpi-card danger">
              <p>Severe Storms</p>
              <h2>{gstSummary?.severe_storms ?? 0}</h2>
              <span>Kp ≥ 5</span>
            </div>

            <div className="kpi-card">
              <p>Strongest Storm</p>
              <h2>{gstSummary?.strongest_storm?.kp_index ?? "N/A"}</h2>
              <span>
                {gstSummary?.strongest_storm?.start_time
                  ? formatDateTime(gstSummary.strongest_storm.start_time)
                  : "No storm data"}
              </span>
            </div>

            <div className="kpi-card">
              <p>Latest Refresh</p>
              <h2>{formatDateTime(gstSummary?.last_refresh)}</h2>
            </div>
          </section>

          <section className="tracking-table-wrap solar-panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">GST Feed</p>
                <h2>Recent Geomagnetic Storms</h2>
              </div>

              <span>{gstEvents.length} visible</span>
            </div>

            <div className="tracking-table">
              <div className="table-row table-head">
                <span>GST ID</span>
                <span>Start Time</span>
                <span>Kp Index</span>
                <span>Linked</span>
                <span>Record</span>
              </div>

              {gstEvents.map((gst) => (
                <a
                  key={gst.gst_id}
                  href={gst.link}
                  target="_blank"
                  rel="noreferrer"
                  className="table-row data-row"
                >
                  <span>{gst.gst_id}</span>
                  <span>{formatDateTime(gst.start_time)}</span>
                  <span>{gst.kp_index || "N/A"}</span>
                  <span>{gst.linked_events ? "YES" : "NO"}</span>
                  <span>DONKI →</span>
                </a>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}