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

function getLinkedStatus(cme) {
  return cme?.linked_events ? "Linked" : "Unlinked";
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="mission-tooltip">
      <p className="tooltip-label">{label}</p>
      <p className="tooltip-value">
        CMEs: <strong>{payload[0].value}</strong>
      </p>
    </div>
  );
}

export default function CmeCommand() {
  const [cmeSummary, setCmeSummary] = useState(null);
  const [cmeEvents, setCmeEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [linkedOnly, setLinkedOnly] = useState(false);
  const [selectedCme, setSelectedCme] = useState(null);
  const [selectedLinkedBand, setSelectedLinkedBand] = useState(null);
  const [hoveredLinkedBand, setHoveredLinkedBand] = useState(null);

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

  const filteredCmes = useMemo(() => {
    return cmeEvents.filter((cme) => {
      const searchText = [
        cme.cme_id,
        cme.source_location,
        cme.active_region_num,
        cme.linked_events,
        cme.note,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchText.includes(search.toLowerCase());
      const matchesLinkedOnly = !linkedOnly || Boolean(cme.linked_events);
      const matchesChart =
        !selectedLinkedBand || getLinkedStatus(cme) === selectedLinkedBand;

      return matchesSearch && matchesLinkedOnly && matchesChart;
    });
  }, [cmeEvents, search, linkedOnly, selectedLinkedBand]);

  const linkedChartData = useMemo(() => {
    const counts = {
      Linked: 0,
      Unlinked: 0,
    };

    cmeEvents.forEach((cme) => {
      counts[getLinkedStatus(cme)] += 1;
    });

    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
    }));
  }, [cmeEvents]);

  function resetFilters() {
    setSearch("");
    setLinkedOnly(false);
    setSelectedLinkedBand(null);
    setHoveredLinkedBand(null);
    setSelectedCme(null);
  }

  const hasActiveFilters = search || linkedOnly || selectedLinkedBand;

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">DONKI CME Intelligence</p>
          <h1>CME Command</h1>
          <p className="subtitle">
            Mission-control dashboard for NASA DONKI coronal mass ejections,
            linked solar events, source regions, and operational event records.
          </p>
        </div>

        <div className="hero-right">
          <Link to="/" className="status-pill">
            ← COMMAND HOME
          </Link>

          <div className="etl-timestamp">
            <span className="etl-label">LAST CME REFRESH</span>
            <span className="etl-value">
              {formatDateTime(cmeSummary?.last_refresh)}
            </span>
          </div>
        </div>
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

          <section className="control-panel">
            <input
              type="text"
              placeholder="Search CME ID, source, AR, linked events, or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={linkedOnly}
                onChange={(e) => setLinkedOnly(e.target.checked)}
              />
              Linked events only
            </label>

            <button onClick={resetFilters}>Reset</button>
          </section>

          {hasActiveFilters && (
            <section className="filter-strip">
              <span className="filter-title">Active CME Filters</span>

              {search && (
                <button onClick={() => setSearch("")}>
                  Search: {search} ×
                </button>
              )}

              {linkedOnly && (
                <button onClick={() => setLinkedOnly(false)}>
                  Linked Events Only ×
                </button>
              )}

              {selectedLinkedBand && (
                <button onClick={() => setSelectedLinkedBand(null)}>
                  Chart: {selectedLinkedBand} ×
                </button>
              )}
            </section>
          )}

          <section className="chart-grid">
            <div className="chart-card">
              <div className="chart-header">
                <p className="eyebrow">Correlation Layer</p>
                <h2>CME Linked Event Status</h2>
              </div>

              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={linkedChartData}
                  onMouseMove={(state) => {
                    if (state?.activeLabel) {
                      setHoveredLinkedBand(state.activeLabel);
                    }
                  }}
                  onMouseLeave={() => setHoveredLinkedBand(null)}
                  onClick={(state) => {
                    if (!state?.activeLabel) return;
                    setSelectedLinkedBand((prev) =>
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
                    {linkedChartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.name === selectedLinkedBand ||
                          entry.name === hoveredLinkedBand
                            ? "#facc15"
                            : entry.name === "Linked"
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
                <p className="eyebrow">Latest Event</p>
                <h2>Current CME Focus</h2>
              </div>

              <div className="selected-object-grid">
                <div>
                  <p>CME ID</p>
                  <h3>{cmeSummary?.latest_cme?.cme_id ?? "N/A"}</h3>
                </div>

                <div>
                  <p>Start Time</p>
                  <h3>
                    {formatDateTime(cmeSummary?.latest_cme?.start_time)}
                  </h3>
                </div>

                <div>
                  <p>Source</p>
                  <h3>{cmeSummary?.latest_cme?.source_location || "Unknown"}</h3>
                </div>

                <div>
                  <p>Active Region</p>
                  <h3>{cmeSummary?.latest_cme?.active_region_num || "N/A"}</h3>
                </div>
              </div>
            </div>
          </section>

          {selectedCme && (
            <section className="selected-object-tile">
              <div className="selected-object-header">
                <div>
                  <p className="eyebrow">Selected CME Event</p>
                  <h2>{selectedCme.cme_id || "Unknown CME"}</h2>
                </div>

                <button
                  className="close-btn"
                  onClick={() => setSelectedCme(null)}
                >
                  ×
                </button>
              </div>

              <div
                className={`hazard-banner ${
                  selectedCme.linked_events ? "hazard" : "safe"
                }`}
              >
                {selectedCme.linked_events
                  ? "Linked Solar Event Detected"
                  : "No Linked Event Flag"}
              </div>

              <div className="selected-object-grid">
                <div>
                  <p>CME ID</p>
                  <h3>{selectedCme.cme_id || "N/A"}</h3>
                </div>

                <div>
                  <p>Start Time</p>
                  <h3>{formatDateTime(selectedCme.start_time)}</h3>
                </div>

                <div>
                  <p>Source Location</p>
                  <h3>{selectedCme.source_location || "Unknown"}</h3>
                </div>

                <div>
                  <p>Active Region</p>
                  <h3>{selectedCme.active_region_num || "N/A"}</h3>
                </div>

                <div>
                  <p>Linked Events</p>
                  <h3>{selectedCme.linked_events ? "Yes" : "No"}</h3>
                </div>

                <div>
                  <p>Fetched At</p>
                  <h3>{formatDateTime(selectedCme.fetched_at)}</h3>
                </div>
              </div>

              {selectedCme.note && (
                <div className="selected-object-grid">
                  <div>
                    <p>Operational Note</p>
                    <h3>{selectedCme.note}</h3>
                  </div>
                </div>
              )}

              {selectedCme.link && (
                <a
                  className="jpl-link"
                  href={selectedCme.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open DONKI CME Record →
                </a>
              )}
            </section>
          )}

          <main className="dashboard-grid">
            <section className="tracking-table-wrap solar-panel">
              <div className="section-header">
                <div>
                  <p className="eyebrow">CME Feed</p>
                  <h2>Recent Coronal Mass Ejections</h2>
                </div>

                <span>{filteredCmes.length} visible</span>
              </div>

              <div className="tracking-table">
                <div className="table-row table-head">
                  <span>CME ID</span>
                  <span>Start Time</span>
                  <span>Region</span>
                  <span>AR</span>
                  <span>Linked</span>
                </div>

                {filteredCmes.map((cme) => {
                  const status = getLinkedStatus(cme);
                  const isSelected = selectedCme?.cme_id === cme.cme_id;
                  const isHighlighted = hoveredLinkedBand === status;

                  return (
                    <button
                      key={cme.cme_id}
                      className={`table-row data-row ${
                        cme.linked_events ? "hazard-row" : ""
                      } ${isSelected ? "selected-row" : ""} ${
                        isHighlighted ? "chart-highlight-row" : ""
                      }`}
                      onClick={() => setSelectedCme(cme)}
                    >
                      <span>{cme.cme_id}</span>
                      <span>{formatDateTime(cme.start_time)}</span>
                      <span>{cme.source_location || "Unknown"}</span>
                      <span>{cme.active_region_num || "N/A"}</span>
                      <span>{cme.linked_events ? "YES" : "NO"}</span>
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