import { useEffect, useMemo, useState } from "react";
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

function getObjectName(neo) {
  return neo?.name || neo?.neo_reference_id || "Unknown Object";
}

function getHazardValue(neo) {
  return (
    neo?.is_potentially_hazardous_asteroid === true ||
    neo?.is_potentially_hazardous_asteroid === "true" ||
    neo?.is_potentially_hazardous_asteroid === 1
  );
}

export default function App() {
  const [neoEvents, setNeoEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [hazardousOnly, setHazardousOnly] = useState(false);
  const [sortBy, setSortBy] = useState("time");
  const [selectedAsteroid, setSelectedAsteroid] = useState(null);

  useEffect(() => {
    async function fetchNeoEvents() {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/api/neows/upcoming`);

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        setNeoEvents(data.rows || []);
      } catch (err) {
        setError(err.message || "Failed to load NeoWs data");
      } finally {
        setLoading(false);
      }
    }

    fetchNeoEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const filtered = neoEvents.filter((neo) => {
      const name = getObjectName(neo).toLowerCase();
      const id = String(neo.neo_reference_id || "").toLowerCase();

      const matchesSearch =
        name.includes(search.toLowerCase()) ||
        id.includes(search.toLowerCase());

      const matchesHazardous = !hazardousOnly || getHazardValue(neo);

      return matchesSearch && matchesHazardous;
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
  }, [neoEvents, search, hazardousOnly, sortBy]);

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
      closest,
      fastest,
    };
  }, [neoEvents]);

  function resetFilters() {
    setSearch("");
    setHazardousOnly(false);
    setSortBy("time");
    setSelectedAsteroid(null);
  }

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

        <div className="status-pill">
          <span className="pulse-dot"></span>
          LIVE DATA LINK
        </div>
      </header>

      <section className="kpi-grid">
        <div className="kpi-card">
          <p>Total Tracked Objects</p>
          <h2>{kpis.total}</h2>
        </div>

        <div className="kpi-card danger">
          <p>Hazardous Objects</p>
          <h2>{kpis.hazardous}</h2>
        </div>

        <div className="kpi-card">
          <p>Closest Approach</p>
          <h2>
            {kpis.closest
              ? formatDistance(kpis.closest.miss_distance_miles)
              : "N/A"}
          </h2>
          <span>{kpis.closest ? getObjectName(kpis.closest) : "No object"}</span>
        </div>

        <div className="kpi-card">
          <p>Fastest Object</p>
          <h2>
            {kpis.fastest
              ? formatVelocity(kpis.fastest.relative_velocity_mph)
              : "N/A"}
          </h2>
          <span>{kpis.fastest ? getObjectName(kpis.fastest) : "No object"}</span>
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

      {loading && <div className="message-box">Loading NeoWs telemetry...</div>}
      {error && <div className="message-box error">Error: {error}</div>}

      {!loading && !error && (
        <main className={`dashboard-grid ${selectedAsteroid ? "drawer-open" : ""}`}>
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

                return (
                  <button
                    key={`${neo.neo_reference_id}-${neo.close_approach_date}`}
                    className={`table-row data-row ${
                      isHazardous ? "hazard-row" : ""
                    } ${isSelected ? "selected-row" : ""}`}
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

          {selectedAsteroid && (
            <aside className="detail-drawer">
              <div className="drawer-header">
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

              <div className="detail-grid">
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
                  <h3>{selectedAsteroid.close_approach_datetime || "N/A"}</h3>
                </div>

                <div>
                  <p>Miss Distance</p>
                  <h3>{formatDistance(selectedAsteroid.miss_distance_miles)}</h3>
                </div>

                <div>
                  <p>Relative Velocity</p>
                  <h3>{formatVelocity(selectedAsteroid.relative_velocity_mph)}</h3>
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
            </aside>
          )}
        </main>
      )}
    </div>
  );
}