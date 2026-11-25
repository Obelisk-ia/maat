import { ArrowDown, ArrowUp } from "lucide-react";
import { number } from "./format";

/** How a total compares with the equal period before it. */
function Change({ current, previous, period }: { current: number; previous: number; period: string }) {
  // A percentage of nothing means nothing, so say there is no comparison yet.
  if (previous === 0) return <p className="stat-change">Sin datos de {period}</p>;
  const percent = Math.round(((current - previous) / previous) * 100);
  if (percent === 0) return <p className="stat-change">Igual que en {period}</p>;
  const Arrow = percent > 0 ? ArrowUp : ArrowDown;
  return (
    <p className="stat-change" data-trend={percent > 0 ? "up" : "down"}>
      <Arrow aria-hidden="true" />{percent > 0 ? "+" : "−"}{number.format(Math.abs(percent))}% vs. {period}
    </p>
  );
}

export function Stat({ label, value, detail, change }: {
  label: string;
  value: string;
  detail: string;
  change?: { current: number; previous: number; period: string };
}) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd>
        <strong>{value}</strong>
        <span>{detail}</span>
        {change && <Change {...change} />}
      </dd>
    </div>
  );
}
