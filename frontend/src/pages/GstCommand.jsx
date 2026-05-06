import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "../App.css";

const API_BASE = "http://localhost:5001";

function formatDateTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function getKpSeverity(kpIndex) {
  const kp = Number(kpIndex);

  if (Number.isNaN(kp)) return "Unknown";
  if (kp >= 7) return "Severe";
  if (kp >= 5) return "Storm";
  if (kp >= 4) return "Elevated";
  return "Quiet";
}

function getKpBand(kpIndex) {
  const kp = Number(kpIndex);

  if (Number.isNaN(kp)) return "Unknown";
  if (kp >= 7) return "Kp 7+";
  if (kp >= 5) return "Kp 5–6.99";
  if (kp >= 4) return "Kp 4–4.99";
  return "Below Kp 4";
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="mission-tooltip">
      <p className="tooltip-label">{label}</p>
      <p className="tooltip-value">
        Storms: <strong>{payload[0].value}</strong>
      </p>
    </div>
  );
}

export default function GstCommand() {
  const [gstSummary, setGstSummary] = useState(null);
  const [gstEvents, setGstEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [severeOnly, setSevereOnly] = useState(false);
  const [selectedGst, setSelectedGst] = useState(null);
  const [selectedKpBand, setSelectedKpBand] = useState(null);
  const [hoveredKpBand, setHoveredKpBand] = useState(null);

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

  const filteredGstEvents = useMemo(() => {
    return gstEvents.filter((gst) => {
      const searchText = [gst.gst_id, gst.kp_index, gst.linked_events]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchText.includes(search.toLowerCase());

      const kp = Number(gst.kp_index);
      const matchesSevereOnly = !severeOnly || (!Number.isNaN(kp) && kp >= 5);

      const matchesChart = !selectedKpBand || getKpBand(gst.kp_index) === selectedKpBand;

      return matchesSearch && matchesSevereOnly && matchesChart;
    });
  }, [gstEvents, search, severeOnly, selectedKpBand]);

  const kpChartData = useMemo(() => {
    const counts = {
      "Below Kp 4": 0,
      "Kp 4–4.99": 0,
      "Kp 5–6.99": 0,
      "Kp 7+": 0,
      Unknown: 0,
    };

    gstEvents.forEach((gst) => {
      const band = getKpBand(gst.kp_index);
      counts[band] = (counts[band] || 0) + 1;
    });

    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
    }));
  }, [gstEvents]);

  function resetFilters() {
    setSearch("");
    setSevereOnly(false);
    setSelectedKpBand(null);
    setHoveredKpBand(null);
    setSelectedGst(null);
  }

  const hasActiveFilters = search || severeOnly || selectedKpBand;

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">DONKI GST Intelligence</p>
          <h1>GST Command</h1>
          <p className="subtitle">
            Mission-control dashboard for NASA DONKI geomagnetic storm events,
            Kp index severity, linked solar activity, and Earth-impact records.
          </p>
        </div>

        <div className="hero-right">
          <Link to="/" className="status-pill">
            ← COMMAND HOME
          </Link>

          <div className="etl-timestamp">
            <span className="etl-label">LAST GST REFRESH</span>
            <span className="etl-value">
              {formatDateTime(gstSummary?.last_refresh)}
            </span>
          </div>
        </div>
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
              <p>Current Severity</p>
              <h2>
                {getKpSeverity(gstSummary?.strongest_storm?.kp_index)}
              </h2>
              <span>based on strongest recorded Kp</span>
            </div>
          </section>

          <section className="control-panel">
            <input
              type="text"
              placeholder="Search GST ID, Kp index, or linked events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={severeOnly}
                onChange={(e) => setSevereOnly(e.target.checked)}
              />
              Severe storms only
            </label>

            <button onClick={resetFilters}>Reset</button>
          </section>

          {hasActiveFilters && (
            <section className="filter-strip">
              <span className="filter-title">Active GST Filters</span>

              {search && (
                <button onClick={() => setSearch("")}>
                  Search: {search} ×
                </button>
              )}

              {severeOnly && (
                <button onClick={() => setSevereOnly(false)}>
                  Severe Storms Only ×
                </button>
              )}

              {selectedKpBand && (
                <button onClick={() => setSelectedKpBand(null)}>
                  Kp Band: {selectedKpBand} ×
                </button>
              )}
            </section>
          )}

          <section className="chart-grid">
            <div className="chart-card">
              <div className="chart-header">
                <p className="eyebrow">Geomagnetic Severity</p>
                <h2>Kp Index Distribution</h2>
              </div>

              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={kpChartData}
                  onMouseMove={(state) => {
                    if (state?.activeLabel) {
                      setHoveredKpBand(state.activeLabel);
                    }
                  }}
                  onMouseLeave={() => setHoveredKpBand(null)}
                  onClick={(state) => {
                    if (!state?.activeLabel) return;
                    setSelectedKpBand((prev) =>
                      prev === state.activeLabel ? null : state.activeLabel
                    );
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148,163,184,0.18)"
                  />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {kpChartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.name === selectedKpBand ||
                          entry.name === hoveredKpBand
                            ? "#facc15"
                            : entry.name === "Kp 5–6.99" || entry.name === "Kp 7+"
                            ? "#fb7185"
                            : "#38bdf8"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <p className="eyebrow">Earth Impact Focus</p>
                <h2>Strongest Geomagnetic Storm</h2>
              </div>

              <div className="selected-object-grid">
                <div>
                  <p>GST ID</p>
                  <h3>{gstSummary?.strongest_storm?.gst_id ?? "N/A"}</h3>
                </div>

                <div>
                  <p>Kp Index</p>
                  <h3>{gstSummary?.strongest_storm?.kp_index ?? "N/A"}</h3>
                </div>

                <div>
                  <p>Severity</p>
                  <h3>{getKpSeverity(gstSummary?.strongest_storm?.kp_index)}</h3>
                </div>

                <div>
                  <p>Start Time</p>
                  <h3>
                    {formatDateTime(gstSummary?.strongest_storm?.start_time)}
                  </h3>
                </div>
              </div>
            </div>
          </section>

          {selectedGst && (
            <section className="selected-object-tile">
              <div className="selected-object-header">
                <div>
                  <p className="eyebrow">Selected GST Event</p>
                  <h2>{selectedGst.gst_id || "Unknown GST"}</h2>
                </div>

                <button
                  className="close-btn"
                  onClick={() => setSelectedGst(null)}
                >
                  ×
                </button>
              </div>

              <div
                className={`hazard-banner ${
                  Number(selectedGst.kp_index) >= 5 ? "hazard" : "safe"
                }`}
              >
                {getKpSeverity(selectedGst.kp_index)} Geomagnetic Activity
              </div>

              <div className="selected-object-grid">
                <div>
                  <p>GST ID</p>
                  <h3>{selectedGst.gst_id || "N/A"}</h3>
                </div>

                <div>
                  <p>Start Time</p>
                  <h3>{formatDateTime(selectedGst.start_time)}</h3>
                </div>

                <div>
                  <p>Kp Index</p>
                  <h3>{selectedGst.kp_index || "N/A"}</h3>
                </div>

                <div>
                  <p>Severity</p>
                  <h3>{getKpSeverity(selectedGst.kp_index)}</h3>
                </div>

                <div>
                  <p>Linked Events</p>
                  <h3>{selectedGst.linked_events ? "Yes" : "No"}</h3>
                </div>

                <div>
                  <p>Fetched At</p>
                  <h3>{formatDateTime(selectedGst.fetched_at)}</h3>
                </div>
              </div>

              {selectedGst.link && (
                <a
                  className="jpl-link"
                  href={selectedGst.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open DONKI GST Record →
                </a>
              )}
            </section>
          )}

          <main className="dashboard-grid">
            <section className="tracking-table-wrap solar-panel">
              <div className="section-header">
                <div>
                  <p className="eyebrow">GST Feed</p>
                  <h2>Recent Geomagnetic Storms</h2>
                </div>

                <span>{filteredGstEvents.length} visible</span>
              </div>

              <div className="tracking-table">
                <div className="table-row table-head">
                  <span>GST ID</span>
                  <span>Start Time</span>
                  <span>Kp Index</span>
                  <span>Severity</span>
                  <span>Linked</span>
                </div>

                {filteredGstEvents.map((gst) => {
                  const band = getKpBand(gst.kp_index);
                  const isSelected = selectedGst?.gst_id === gst.gst_id;
                  const isHighlighted = hoveredKpBand === band;
                  const kp = Number(gst.kp_index);

                  return (
                    <button
                      key={gst.gst_id}
                      className={`table-row data-row ${
                        !Number.isNaN(kp) && kp >= 5 ? "hazard-row" : ""
                      } ${isSelected ? "selected-row" : ""} ${
                        isHighlighted ? "chart-highlight-row" : ""
                      }`}
                      onClick={() => setSelectedGst(gst)}
                    >
                      <span>{gst.gst_id}</span>
                      <span>{formatDateTime(gst.start_time)}</span>
                      <span>{gst.kp_index || "N/A"}</span>
                      <span>{getKpSeverity(gst.kp_index)}</span>
                      <span>{gst.linked_events ? "YES" : "NO"}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </main>
        </>
      )}
    </div>
  );
}