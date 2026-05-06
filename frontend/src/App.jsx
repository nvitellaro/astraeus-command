import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./App.css";

const API_BASE = "http://localhost:5001";

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "N/A";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString();
}

function formatDistance(value) {
  if (!value) return "N/A";
  return `${formatNumber(Number(value).toFixed(0))} mi`;
}

function formatVelocity(value) {
  if (!value) return "N/A";
  return `${formatNumber(Number(value).toFixed(0))} mph`;
}

function formatDateTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function getObjectName(neo) {
  return neo?.name || neo?.neo_reference_id || "Unknown Object";
}

function getHazardValue(neo) {
  return (
    neo?.is_potentially_hazardous_asteroid === true ||
    neo?.is_potentially_hazardous_asteroid === "true" ||
    neo?.is_potentially_hazardous_asteroid === 1 ||
    neo?.is_hazardous === true ||
    neo?.is_hazardous === "true" ||
    neo?.is_hazardous === 1
  );
}

function getDistanceBand(miles) {
  const value = Number(miles);
  if (Number.isNaN(value)) return "Unknown";
  if (value < 1_000_000) return "< 1M mi";
  if (value < 5_000_000) return "1M–5M mi";
  if (value < 10_000_000) return "5M–10M mi";
  if (value < 20_000_000) return "10M–20M mi";
  return "20M+ mi";
}

function getVelocityBand(mph) {
  const value = Number(mph);
  if (Number.isNaN(value)) return "Unknown";
  if (value < 10_000) return "< 10K mph";
  if (value < 25_000) return "10K–25K mph";
  if (value < 50_000) return "25K–50K mph";
  if (value < 75_000) return "50K–75K mph";
  return "75K+ mph";
}

function buildBandData(events, field, bandFn, order) {
  const counts = {};

  events.forEach((neo) => {
    const band = bandFn(neo[field]);
    counts[band] = (counts[band] || 0) + 1;
  });

  return order.map((band) => ({
    name: band,
    count: counts[band] || 0,
  }));
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="mission-tooltip">
      <p className="tooltip-label">{label || payload[0].name}</p>
      <p className="tooltip-value">
        Objects: <strong>{payload[0].value}</strong>
      </p>
    </div>
  );
}

export default function App() {
  const [neoEvents, setNeoEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [lastRefresh, setLastRefresh] = useState(null);
  const [summary, setSummary] = useState(null);

  const [search, setSearch] = useState("");
  const [hazardousOnly, setHazardousOnly] = useState(false);
  const [sortBy, setSortBy] = useState("time");
  const [selectedAsteroid, setSelectedAsteroid] = useState(null);

  const [selectedDistanceBand, setSelectedDistanceBand] = useState(null);
  const [selectedVelocityBand, setSelectedVelocityBand] = useState(null);
  const [hoveredDistanceBand, setHoveredDistanceBand] = useState(null);
  const [hoveredVelocityBand, setHoveredVelocityBand] = useState(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError("");

        const [neoResponse, refreshResponse, summaryResponse] =
          await Promise.all([
            fetch(`${API_BASE}/api/neows/upcoming`),
            fetch(`${API_BASE}/api/neows/last-refresh`),
            fetch(`${API_BASE}/api/neows/summary`),
          ]);

        if (!neoResponse.ok) {
          throw new Error(`API returned ${neoResponse.status}`);
        }

        const neoData = await neoResponse.json();
        setNeoEvents(neoData.rows || []);

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          setLastRefresh(refreshData.last_refresh || null);
        }

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          setSummary(summaryData);
        }
      } catch (err) {
        setError(err.message || "Failed to load NeoWs data");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const filteredEvents = useMemo(() => {
    const filtered = neoEvents.filter((neo) => {
      const name = getObjectName(neo).toLowerCase();
      const id = String(neo.neo_reference_id || "").toLowerCase();

      const matchesSearch =
        name.includes(search.toLowerCase()) ||
        id.includes(search.toLowerCase());

      const matchesHazardous = !hazardousOnly || getHazardValue(neo);

      const matchesDistance =
        !selectedDistanceBand ||
        getDistanceBand(neo.miss_distance_miles) === selectedDistanceBand;

      const matchesVelocity =
        !selectedVelocityBand ||
        getVelocityBand(neo.relative_velocity_mph) === selectedVelocityBand;

      return (
        matchesSearch &&
        matchesHazardous &&
        matchesDistance &&
        matchesVelocity
      );
    });

    return filtered.sort((a, b) => {
      if (sortBy === "distance") {
        return (
          Number(a.miss_distance_miles || Number.MAX_SAFE_INTEGER) -
          Number(b.miss_distance_miles || Number.MAX_SAFE_INTEGER)
        );
      }

      if (sortBy === "velocity") {
        return (
          Number(b.relative_velocity_mph || 0) -
          Number(a.relative_velocity_mph || 0)
        );
      }

      return (
        new Date(a.close_approach_datetime || a.close_approach_date).getTime() -
        new Date(b.close_approach_datetime || b.close_approach_date).getTime()
      );
    });
  }, [
    neoEvents,
    search,
    hazardousOnly,
    sortBy,
    selectedDistanceBand,
    selectedVelocityBand,
  ]);

  const kpis = useMemo(() => {
    const hazardous = neoEvents.filter((neo) => getHazardValue(neo));

    const closest = [...neoEvents]
      .filter((neo) => neo.miss_distance_miles)
      .sort(
        (a, b) =>
          Number(a.miss_distance_miles) - Number(b.miss_distance_miles)
      )[0];

    const fastest = [...neoEvents]
      .filter((neo) => neo.relative_velocity_mph)
      .sort(
        (a, b) =>
          Number(b.relative_velocity_mph) - Number(a.relative_velocity_mph)
      )[0];

    return {
      total: neoEvents.length,
      hazardous: hazardous.length,
      safe: neoEvents.length - hazardous.length,
      closest,
      fastest,
    };
  }, [neoEvents]);

  const chartData = useMemo(() => {
    return {
      hazardData: [
        { name: "Safe", value: kpis.safe },
        { name: "Hazardous", value: kpis.hazardous },
      ],
      distanceData: buildBandData(
        neoEvents,
        "miss_distance_miles",
        getDistanceBand,
        [
          "< 1M mi",
          "1M–5M mi",
          "5M–10M mi",
          "10M–20M mi",
          "20M+ mi",
          "Unknown",
        ]
      ),
      velocityData: buildBandData(
        neoEvents,
        "relative_velocity_mph",
        getVelocityBand,
        [
          "< 10K mph",
          "10K–25K mph",
          "25K–50K mph",
          "50K–75K mph",
          "75K+ mph",
          "Unknown",
        ]
      ),
    };
  }, [neoEvents, kpis]);

  function resetFilters() {
    setSearch("");
    setHazardousOnly(false);
    setSortBy("time");
    setSelectedAsteroid(null);
    setSelectedDistanceBand(null);
    setSelectedVelocityBand(null);
    setHoveredDistanceBand(null);
    setHoveredVelocityBand(null);
  }

  const hasActiveFilters =
    search ||
    hazardousOnly ||
    selectedDistanceBand ||
    selectedVelocityBand ||
    sortBy !== "time";

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Space Intelligence Platform</p>
          <h1>Astraeus Command</h1>
          <p className="subtitle">
            Public-facing mission-control dashboard tracking near-Earth objects
            from NASA NeoWs.
          </p>
        </div>

        <div className="hero-right">
          <div className="status-pill">
            <span className="pulse-dot"></span>
            LIVE DATA LINK
          </div>

          <div className="etl-timestamp">
            <span className="etl-label">LAST ETL REFRESH</span>
            <span className="etl-value">{formatDateTime(lastRefresh)}</span>
          </div>
        </div>
      </header>

      <section className="kpi-grid">
        <div className="kpi-card">
          <p>Total Tracked Objects</p>
          <h2>{summary?.total_objects ?? kpis.total}</h2>
        </div>

        <div className="kpi-card danger">
          <p>Hazardous Objects</p>
          <h2>{summary?.hazardous_objects ?? kpis.hazardous}</h2>
        </div>

        <div className="kpi-card">
          <p>Closest Approach</p>
          <h2>
            {summary?.closest_object
              ? formatDistance(summary.closest_object.miss_distance_miles)
              : kpis.closest
              ? formatDistance(kpis.closest.miss_distance_miles)
              : "N/A"}
          </h2>
          <span>
            {summary?.closest_object
              ? summary.closest_object.name
              : kpis.closest
              ? getObjectName(kpis.closest)
              : "No object"}
          </span>
        </div>

        <div className="kpi-card">
          <p>Fastest Object</p>
          <h2>
            {summary?.fastest_object
              ? formatVelocity(summary.fastest_object.relative_velocity_mph)
              : kpis.fastest
              ? formatVelocity(kpis.fastest.relative_velocity_mph)
              : "N/A"}
          </h2>
          <span>
            {summary?.fastest_object
              ? summary.fastest_object.name
              : kpis.fastest
              ? getObjectName(kpis.fastest)
              : "No object"}
          </span>
        </div>
      </section>

      <section className="control-panel">
        <input
          type="text"
          placeholder="Search asteroid name or Neo ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={hazardousOnly}
            onChange={(e) => setHazardousOnly(e.target.checked)}
          />
          Hazardous only
        </label>

        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="time">Sort: Approach Time</option>
          <option value="distance">Sort: Closest First</option>
          <option value="velocity">Sort: Fastest First</option>
        </select>

        <button onClick={resetFilters}>Reset</button>
      </section>

      {hasActiveFilters && (
        <section className="filter-strip">
          <span className="filter-title">Active Intelligence Filters</span>

          {search && (
            <button onClick={() => setSearch("")}>Search: {search} ×</button>
          )}

          {hazardousOnly && (
            <button onClick={() => setHazardousOnly(false)}>
              Hazardous Only ×
            </button>
          )}

          {selectedDistanceBand && (
            <button onClick={() => setSelectedDistanceBand(null)}>
              Distance: {selectedDistanceBand} ×
            </button>
          )}

          {selectedVelocityBand && (
            <button onClick={() => setSelectedVelocityBand(null)}>
              Velocity: {selectedVelocityBand} ×
            </button>
          )}

          {sortBy !== "time" && (
            <button onClick={() => setSortBy("time")}>Sort: {sortBy} ×</button>
          )}
        </section>
      )}

      {loading && <div className="message-box">Loading NeoWs telemetry...</div>}
      {error && <div className="message-box error">Error: {error}</div>}

      {!loading && !error && (
        <>
          <section className="chart-grid">
            <div className="chart-card hazard-chart-card">
              <div className="chart-header">
                <p className="eyebrow">Threat Profile</p>
                <h2>Hazard Classification</h2>
              </div>

              <div className="donut-wrap">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={chartData.hazardData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={90}
                      paddingAngle={4}
                      onClick={(data) => {
                        if (data.name === "Hazardous") {
                          setHazardousOnly((prev) => !prev);
                        } else {
                          setHazardousOnly(false);
                        }
                      }}
                    >
                      {chartData.hazardData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={
                            entry.name === "Hazardous" ? "#fb7185" : "#22c55e"
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="donut-center">
                  <strong>{filteredEvents.length}</strong>
                  <span>VISIBLE</span>
                </div>
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <p className="eyebrow">Range Bands</p>
                <h2>Miss Distance Distribution</h2>
              </div>

              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={chartData.distanceData}
                  onMouseMove={(state) => {
                    if (state?.activeLabel) {
                      setHoveredDistanceBand(state.activeLabel);
                    }
                  }}
                  onMouseLeave={() => setHoveredDistanceBand(null)}
                  onClick={(state) => {
                    if (!state?.activeLabel) return;
                    setSelectedDistanceBand((prev) =>
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
                    {chartData.distanceData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.name === selectedDistanceBand ||
                          entry.name === hoveredDistanceBand
                            ? "#facc15"
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
                <p className="eyebrow">Velocity Bands</p>
                <h2>Speed Distribution</h2>
              </div>

              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={chartData.velocityData}
                  onMouseMove={(state) => {
                    if (state?.activeLabel) {
                      setHoveredVelocityBand(state.activeLabel);
                    }
                  }}
                  onMouseLeave={() => setHoveredVelocityBand(null)}
                  onClick={(state) => {
                    if (!state?.activeLabel) return;
                    setSelectedVelocityBand((prev) =>
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
                    {chartData.velocityData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.name === selectedVelocityBand ||
                          entry.name === hoveredVelocityBand
                            ? "#facc15"
                            : "#a78bfa"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {selectedAsteroid && (
            <section className="selected-object-tile">
              <div className="selected-object-header">
                <div>
                  <p className="eyebrow">Selected Object</p>
                  <h2>{getObjectName(selectedAsteroid)}</h2>
                </div>

                <button
                  className="close-btn"
                  onClick={() => setSelectedAsteroid(null)}
                >
                  ×
                </button>
              </div>

              <div
                className={`hazard-banner ${
                  getHazardValue(selectedAsteroid) ? "hazard" : "safe"
                }`}
              >
                {getHazardValue(selectedAsteroid)
                  ? "Potentially Hazardous Asteroid"
                  : "No Hazard Flag"}
              </div>

              <div className="selected-object-grid">
                <div>
                  <p>Neo Reference ID</p>
                  <h3>{selectedAsteroid.neo_reference_id || "N/A"}</h3>
                </div>

                <div>
                  <p>Approach Date</p>
                  <h3>{selectedAsteroid.close_approach_date || "N/A"}</h3>
                </div>

                <div>
                  <p>Approach DateTime</p>
                  <h3>
                    {formatDateTime(selectedAsteroid.close_approach_datetime)}
                  </h3>
                </div>

                <div>
                  <p>Miss Distance</p>
                  <h3>{formatDistance(selectedAsteroid.miss_distance_miles)}</h3>
                </div>

                <div>
                  <p>Relative Velocity</p>
                  <h3>
                    {formatVelocity(selectedAsteroid.relative_velocity_mph)}
                  </h3>
                </div>

                <div>
                  <p>Hazardous</p>
                  <h3>{getHazardValue(selectedAsteroid) ? "Yes" : "No"}</h3>
                </div>
              </div>

              {selectedAsteroid.nasa_jpl_url && (
                <a
                  className="jpl-link"
                  href={selectedAsteroid.nasa_jpl_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open NASA / JPL Record →
                </a>
              )}
            </section>
          )}

          <main className="dashboard-grid">
            <section className="tracking-table-wrap">
              <div className="section-header">
                <div>
                  <p className="eyebrow">NeoWs Tracking Grid</p>
                  <h2>Near-Earth Object Feed</h2>
                </div>
                <span>{filteredEvents.length} visible</span>
              </div>

              <div className="tracking-table">
                <div className="table-row table-head">
                  <span>Name</span>
                  <span>Approach Date</span>
                  <span>Hazard</span>
                  <span>Miss Distance</span>
                  <span>Velocity</span>
                </div>

                {filteredEvents.map((neo) => {
                  const isSelected =
                    selectedAsteroid?.neo_reference_id === neo.neo_reference_id;

                  const isHazardous = getHazardValue(neo);

                  const isChartHighlighted =
                    (hoveredDistanceBand &&
                      getDistanceBand(neo.miss_distance_miles) ===
                        hoveredDistanceBand) ||
                    (hoveredVelocityBand &&
                      getVelocityBand(neo.relative_velocity_mph) ===
                        hoveredVelocityBand);

                  return (
                    <button
                      key={`${neo.neo_reference_id}-${neo.close_approach_date}`}
                      className={`table-row data-row ${
                        isHazardous ? "hazard-row" : ""
                      } ${isSelected ? "selected-row" : ""} ${
                        isChartHighlighted ? "chart-highlight-row" : ""
                      }`}
                      onClick={() => setSelectedAsteroid(neo)}
                    >
                      <span>{getObjectName(neo)}</span>
                      <span>{neo.close_approach_date || "N/A"}</span>
                      <span>{isHazardous ? "YES" : "NO"}</span>
                      <span>{formatDistance(neo.miss_distance_miles)}</span>
                      <span>{formatVelocity(neo.relative_velocity_mph)}</span>
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