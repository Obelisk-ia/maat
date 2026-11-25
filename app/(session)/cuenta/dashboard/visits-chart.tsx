"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { Bucket, DayTotals } from "@/lib/dashboard-periods";
import { number } from "./format";

type Column = Bucket & DayTotals;

/** A round axis maximum whose halfway mark is a whole number. */
function axisMaximum(highest: number) {
  if (highest <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(highest));
  return [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].map((step) => Math.round(step * magnitude))
    .find((top) => top >= highest && top % 2 === 0)!;
}

const visitCount = (count: number) => `${number.format(count)} ${count === 1 ? "visita" : "visitas"}`;
const describe = (column: Column) =>
  `${column.title}: ${number.format(column.returnVisits)} de regreso, ${number.format(column.firstVisits)} primeras.`;

/** Visits per period, stacked: returning customers on the baseline, first visits above. */
export function VisitsChart({ columns, bucketName }: { columns: Column[]; bucketName: string }) {
  const [active, setActive] = useState<number>();
  // One column is in the tab order; arrow keys move between them.
  const [focusable, setFocusable] = useState(columns.length - 1);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const tabStop = Math.min(focusable, columns.length - 1);
  const totals = columns.map((column) => column.firstVisits + column.returnVisits);
  const top = axisMaximum(Math.max(...totals));
  // Enough labels to read the axis without them running into each other.
  const labelEvery = columns.length > 20 ? 7 : columns.length > 12 ? 4 : columns.length > 8 ? 2 : 1;
  const shown = active === undefined || active >= columns.length ? undefined : columns[active];

  function move(event: KeyboardEvent, index: number) {
    const target = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: columns.length - 1 }[event.key];
    if (target === undefined || target < 0 || target >= columns.length) return;
    event.preventDefault();
    buttons.current[target]?.focus();
  }

  return (
    <div className="visits-chart">
      <ul className="visits-legend">
        <li><i data-series="return" />De regreso</li>
        <li><i data-series="first" />Primera visita</li>
      </ul>

      <div className="visits-plot" onPointerLeave={() => setActive(undefined)}>
        {[1, 0.5, 0].map((share) => (
          <div key={share} className="visits-grid" style={{ bottom: `${share * 100}%` }} aria-hidden="true">
            <span>{number.format(top * share)}</span>
          </div>
        ))}
        <div className="visits-columns" role="group" aria-label={`Visitas por ${bucketName}. Usa las flechas para recorrerlas.`}>
          {columns.map((column, index) => (
            <button key={column.start} ref={(element) => { buttons.current[index] = element; }} type="button"
              className="visits-column" aria-label={describe(column)} tabIndex={index === tabStop ? 0 : -1}
              data-active={active === index} onKeyDown={(event) => move(event, index)}
              onFocus={() => { setActive(index); setFocusable(index); }} onBlur={() => setActive(undefined)}
              onPointerEnter={() => setActive(index)} onClick={() => setActive(index)}>
              <span className="visits-stack" style={{ height: `${(totals[index] / top) * 100}%` }}>
                {column.firstVisits > 0 && <i data-series="first" style={{ flexGrow: column.firstVisits }} />}
                {column.returnVisits > 0 && <i data-series="return" style={{ flexGrow: column.returnVisits }} />}
              </span>
              {(columns.length - 1 - index) % labelEvery === 0 && <small>{column.label}</small>}
            </button>
          ))}
        </div>
        {totals.every((total) => total === 0) && <p className="visits-empty">Aún no hay visitas en este periodo.</p>}
        {shown && (
          <div className="visits-tooltip" aria-hidden="true" style={{
            "--position": `${((active! + 0.5) / columns.length) * 100}%`,
          } as CSSProperties}>
            <span>{shown.title}</span>
            <strong>{visitCount(shown.firstVisits + shown.returnVisits)}</strong>
            <p><i data-series="return" /><b>{number.format(shown.returnVisits)}</b> de regreso</p>
            <p><i data-series="first" /><b>{number.format(shown.firstVisits)}</b> primeras</p>
          </div>
        )}
      </div>

      <details className="visits-table">
        <summary>Ver como tabla</summary>
        <div>
          <table>
            <thead><tr><th scope="col">Periodo</th><th scope="col">De regreso</th><th scope="col">Primeras</th><th scope="col">Total</th></tr></thead>
            <tbody>
              {columns.map((column, index) => (
                <tr key={column.start}>
                  <th scope="row">{column.title}</th>
                  <td>{number.format(column.returnVisits)}</td>
                  <td>{number.format(column.firstVisits)}</td>
                  <td>{number.format(totals[index])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
