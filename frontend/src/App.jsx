import { useEffect, useMemo, useState } from "react"

export default function App() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("http://localhost:5001/api/neows/upcoming")
      .then((res) => res.json())
      .then((data) => {
        setRows(data.rows || [])
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const stats = useMemo(() => {
    const hazardous = rows.filter((row) => row.is_hazardous)

    const closest = rows.reduce((best, row) => {
      if (!row.miss_distance_miles) return best
      if (!best || row.miss_distance_miles < best.miss_distance_miles) return row
      return best
    }, null)

    const fastest = rows.reduce((best, row) => {
      if (!row.relative_velocity_mph) return best
      if (!best || row.relative_velocity_mph > best.relative_velocity_mph) return row
      return best
    }, null)

    return {
      total: rows.length,
      hazardous: hazardous.length,
      closest,
      fastest,
    }
  }, [rows])

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b1020",
        color: "#e5e7eb",
        padding: "32px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header style={{ marginBottom: "28px" }}>
        <h1 style={{ margin: 0, fontSize: "36px" }}>Astraeus Command</h1>
        <p style={{ marginTop: "8px", color: "#94a3b8" }}>
          Near-Earth Object Tracking
        </p>
      </header>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              marginBottom: "28px",
            }}
          >
            <KpiCard
              label="Tracked Objects"
              value={stats.total}
              subtext="Current NeoWs feed"
            />

            <KpiCard
              label="Potentially Hazardous"
              value={stats.hazardous}
              subtext={`${stats.total ? ((stats.hazardous / stats.total) * 100).toFixed(1) : 0}% of feed`}
            />

            <KpiCard
              label="Closest Approach"
              value={
                stats.closest
                  ? `${Math.round(stats.closest.miss_distance_miles).toLocaleString()} mi`
                  : "N/A"
              }
              subtext={stats.closest?.name || "No data"}
            />

            <KpiCard
              label="Fastest Object"
              value={
                stats.fastest
                  ? `${Math.round(stats.fastest.relative_velocity_mph).toLocaleString()} mph`
                  : "N/A"
              }
              subtext={stats.fastest?.name || "No data"}
            />
          </section>

          <section>
            <h2 style={{ marginBottom: "14px" }}>Tracking Grid</h2>

            {rows.slice(0, 20).map((row) => (
              <div
                key={row.id}
                style={{
                  border: "1px solid #24304a",
                  borderRadius: "10px",
                  padding: "12px",
                  marginBottom: "10px",
                  background: "#121a2b",
                }}
              >
                <strong>{row.name}</strong>
                <div>Date: {row.close_approach_date}</div>
                <div>
                  Velocity: {row.relative_velocity_mph?.toLocaleString()} mph
                </div>
                <div>
                  Miss Distance: {row.miss_distance_miles?.toLocaleString()} miles
                </div>
                <div>Hazardous: {row.is_hazardous ? "Yes" : "No"}</div>
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  )
}

function KpiCard({ label, value, subtext }) {
  return (
    <div
      style={{
        border: "1px solid #24304a",
        borderRadius: "14px",
        padding: "18px",
        background: "linear-gradient(180deg, #121a2b 0%, #0f172a 100%)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      }}
    >
      <div
        style={{
          color: "#94a3b8",
          fontSize: "13px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "10px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "28px",
          fontWeight: 800,
          marginBottom: "8px",
        }}
      >
        {value}
      </div>

      <div style={{ color: "#64748b", fontSize: "14px" }}>{subtext}</div>
    </div>
  )
}