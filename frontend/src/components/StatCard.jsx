export default function StatCard({
  title,
  value,
  subtitle,
  danger = false,
}) {
  return (
    <div className={`kpi-card ${danger ? "danger" : ""}`}>
      <p>{title}</p>

      <h2>{value}</h2>

      {subtitle && <span>{subtitle}</span>}
    </div>
  );
}