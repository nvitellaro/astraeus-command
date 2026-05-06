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

function getFlareClassGroup(classType) {
  if (!classType) return "Unknown";
  return classType.charAt(0).toUpperCase();
}

function getClassSeverity(classType) {
  const group = getFlareClassGroup(classType);

  if (group === "X") return "Extreme";
  if (group === "M") return "High";
  if (group === "C") return "Moderate";
  if (group === "B") return "Low";
  return "Unknown";
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="mission-tooltip">
      <p className="tooltip-label">{label}</p>
      <p className="tooltip-value">
        Flares: <strong>{payload[0].value}</strong>
      </p>
    </div>
  );
}

export default function SolarFlareCommand() {
  const [solarSummary, setSolarSummary] = useState(null);
  const [solarFlares, setSolarFlares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [selectedFlare, setSelectedFlare] = useState(null);
  const [selectedClassBand, setSelectedClassBand] = useState(null);
  const [hoveredClassBand, setHoveredClassBand] = useState(null);

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

  const filteredFlares = useMemo(() => {
    return solarFlares.filter((flare) => {
      const searchText = [
        flare.flr_id,
        flare.class_type,
        flare.source_location,
        flare.active_region_num,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchText.includes(search.toLowerCase());

      const group = getFlareClassGroup(flare.class_type);

      const matchesDropdown =
        classFilter === "all" || group === classFilter;

      const matchesChart =
        !selectedClassBand || group === selectedClassBand;

      return matchesSearch && matchesDropdown && matchesChart;
    });
  }, [solarFlares, search, classFilter, selectedClassBand]);

  const classChartData = useMemo(() => {
    const counts = {
      B: 0,
      C: 0,
      M: 0,
      X: 0,
      Unknown: 0,
    };

    solarFlares.forEach((flare) => {
      const group = getFlareClassGroup(flare.class_type);
      if (counts[group] === undefined) {
        counts.Unknown += 1;
      } else {
        counts[group] += 1;
      }
    });

    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
    }));
  }, [solarFlares]);

  function resetFilters() {
    setSearch("");
    setClassFilter("all");
    setSelectedClassBand(null);
    setHoveredClassBand(null);
    setSelectedFlare(null);
  }

  const hasActiveFilters =
    search || classFilter !== "all" || selectedClassBand;

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">DONKI Solar Intelligence</p>
          <h1>Solar Flare Command</h1>
          <p className="subtitle">
            Mission-control dashboard for NASA DONKI solar flare activity,
            class severity, source regions, and linked event records.
          </p>
        </div>

        <div className="hero-right">
          <Link to="/" className="status-pill">
            ← COMMAND HOME
          </Link>

          <div className="etl-timestamp">
            <span className="etl-label">LAST FLR REFRESH</span>
            <span className="etl-value">
              {formatDateTime(solarSummary?.last_refresh)}
            </span>
          </div>
        </div>
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
              <p>C-Class Events</p>
              <h2>{solarSummary?.class_counts?.C ?? 0}</h2>
            </div>

            <div className="kpi-card">
              <p>M/X-Class Events</p>
              <h2>
                {(solarSummary?.class_counts?.M ?? 0) +
                  (solarSummary?.class_counts?.X ?? 0)}
              </h2>
              <span>higher-energy activity</span>
            </div>
          </section>

          <section className="control-panel">
            <input
              type="text"
              placeholder="Search flare ID, class, region, or source..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="sort-select"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="all">Class: All</option>
              <option value="B">B-Class</option>
              <option value="C">C-Class</option>
              <option value="M">M-Class</option>
              <option value="X">X-Class</option>
            </select>

            <button onClick={resetFilters}>Reset</button>
          </section>

          {hasActiveFilters && (
            <section className="filter-strip">
              <span className="filter-title">Active Solar Filters</span>

              {search && (
                <button onClick={() => setSearch("")}>
                  Search: {search} ×
                </button>
              )}

              {classFilter !== "all" && (
                <button onClick={() => setClassFilter("all")}>
                  Class: {classFilter} ×
                </button>
              )}

              {selectedClassBand && (
                <button onClick={() => setSelectedClassBand(null)}>
                  Chart Class: {selectedClassBand} ×
                </button>
              )}
            </section>
          )}

          <section className="chart-grid">
            <div className="chart-card">
              <div className="chart-header">
                <p className="eyebrow">Flare Class Bands</p>
                <h2>Solar Flare Classification</h2>
              </div>

              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={classChartData}
                  onMouseMove={(state) => {
                    if (state?.activeLabel) {
                      setHoveredClassBand(state.activeLabel);
                    }
                  }}
                  onMouseLeave={() => setHoveredClassBand(null)}
                  onClick={(state) => {
                    if (!state?.activeLabel) return;
                    setSelectedClassBand((prev) =>
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
                    {classChartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.name === selectedClassBand ||
                          entry.name === hoveredClassBand
                            ? "#facc15"
                            : entry.name === "M" || entry.name === "X"
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
                <p className="eyebrow">Strongest Event</p>
                <h2>Current Solar Threat Focus</h2>
              </div>

              <div className="selected-object-grid">
                <div>
                  <p>Class</p>
                  <h3>{solarSummary?.strongest_flare?.class_type ?? "N/A"}</h3>
                </div>

                <div>
                  <p>Source Location</p>
                  <h3>
                    {solarSummary?.strongest_flare?.source_location ??
                      "Unknown"}
                  </h3>
                </div>

                <div>
                  <p>Active Region</p>
                  <h3>
                    {solarSummary?.strongest_flare?.active_region_num ?? "N/A"}
                  </h3>
                </div>

                <div>
                  <p>Peak Time</p>
                  <h3>
                    {formatDateTime(solarSummary?.strongest_flare?.peak_time)}
                  </h3>
                </div>
              </div>
            </div>
          </section>

          {selectedFlare && (
            <section className="selected-object-tile">
              <div className="selected-object-header">
                <div>
                  <p className="eyebrow">Selected Solar Event</p>
                  <h2>{selectedFlare.class_type || "Unknown Class"}</h2>
                </div>

                <button
                  className="close-btn"
                  onClick={() => setSelectedFlare(null)}
                >
                  ×
                </button>
              </div>

              <div
                className={`hazard-banner ${
                  ["M", "X"].includes(getFlareClassGroup(selectedFlare.class_type))
                    ? "hazard"
                    : "safe"
                }`}
              >
                {getClassSeverity(selectedFlare.class_type)} Solar Flare
              </div>

              <div className="selected-object-grid">
                <div>
                  <p>Flare ID</p>
                  <h3>{selectedFlare.flr_id || "N/A"}</h3>
                </div>

                <div>
                  <p>Begin Time</p>
                  <h3>{formatDateTime(selectedFlare.begin_time)}</h3>
                </div>

                <div>
                  <p>Peak Time</p>
                  <h3>{formatDateTime(selectedFlare.peak_time)}</h3>
                </div>

                <div>
                  <p>End Time</p>
                  <h3>{formatDateTime(selectedFlare.end_time)}</h3>
                </div>

                <div>
                  <p>Active Region</p>
                  <h3>{selectedFlare.active_region_num || "N/A"}</h3>
                </div>

                <div>
                  <p>Source Location</p>
                  <h3>{selectedFlare.source_location || "Unknown"}</h3>
                </div>
              </div>

              {selectedFlare.link && (
                <a
                  className="jpl-link"
                  href={selectedFlare.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open DONKI Solar Flare Record →
                </a>
              )}
            </section>
          )}

          <main className="dashboard-grid">
            <section className="tracking-table-wrap solar-panel">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Solar Flare Feed</p>
                  <h2>Recent Solar Flare Activity</h2>
                </div>

                <span>{filteredFlares.length} visible</span>
              </div>

              <div className="tracking-table">
                <div className="table-row table-head">
                  <span>Flare ID</span>
                  <span>Class</span>
                  <span>Begin Time</span>
                  <span>Region</span>
                  <span>Source</span>
                </div>

                {filteredFlares.map((flare) => {
                  const group = getFlareClassGroup(flare.class_type);
                  const isSelected = selectedFlare?.flr_id === flare.flr_id;
                  const isHighlighted = hoveredClassBand === group;

                  return (
                    <button
                      key={flare.flr_id}
                      className={`table-row data-row ${
                        ["M", "X"].includes(group) ? "hazard-row" : ""
                      } ${isSelected ? "selected-row" : ""} ${
                        isHighlighted ? "chart-highlight-row" : ""
                      }`}
                      onClick={() => setSelectedFlare(flare)}
                    >
                      <span>{flare.flr_id}</span>
                      <span>{flare.class_type || "N/A"}</span>
                      <span>{formatDateTime(flare.begin_time)}</span>
                      <span>{flare.active_region_num || "N/A"}</span>
                      <span>{flare.source_location || "Unknown"}</span>
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