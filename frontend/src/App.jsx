import { useEffect, useState } from "react"

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
      <h1>Astraeus Command</h1>
      <p>Near-Earth Object Tracking</p>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <p>Total Objects: {rows.length}</p>

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
                Velocity:{" "}
                {row.relative_velocity_mph?.toLocaleString()} mph
              </div>
              <div>
                Miss Distance:{" "}
                {row.miss_distance_miles?.toLocaleString()} miles
              </div>
              <div>
                Hazardous: {row.is_hazardous ? "Yes" : "No"}
              </div>
            </div>
          ))}
        </>
      )}
    </main>
  )
}