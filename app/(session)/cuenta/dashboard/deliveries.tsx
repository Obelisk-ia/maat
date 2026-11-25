"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatMemberCode } from "@/lib/member-code";
import { lastVisitText, number } from "./format";

const roles = { owner: "Dueño", staff: "Staff" } as const;

/** Every prize handed over, and by whom. */
export function Deliveries({ today }: { today: string }) {
  const { isAuthenticated } = useConvexAuth();
  const data = useQuery(api.dashboard.deliveries, isAuthenticated ? {} : "skip");

  if (!data) return <p className="dashboard-loading" role="status">Cargando las entregas…</p>;
  if (data.deliveries.length === 0) {
    return <p className="dashboard-empty">Aún no se entrega ningún premio. Se entregan en el kiosco, con el QR o el código del cliente.</p>;
  }

  return (
    <section aria-label="Premios entregados">
      {data.more && <p className="dashboard-note">Se muestran las {number.format(data.deliveries.length)} entregas más recientes.</p>}
      <table className="dashboard-table">
        <thead>
          <tr><th scope="col">Cliente</th><th scope="col">Premio</th><th scope="col">Entregó</th><th scope="col">Fecha</th></tr>
        </thead>
        <tbody>
          {data.deliveries.map((delivery) => (
            <tr key={delivery.id}>
              <th scope="row">
                <strong>{delivery.customerName}</strong>
                {delivery.code && <code>{formatMemberCode(delivery.code)}</code>}
              </th>
              <td data-label="Premio">
                <span>
                  {delivery.prizeName}
                  <small>A los {delivery.prizeStamps} sellos{delivery.restartedCard ? " · Inició tarjeta nueva" : ""}</small>
                </span>
              </td>
              <td data-label="Entregó"><span>{delivery.deliveredBy}<small>{roles[delivery.deliveredByRole]}</small></span></td>
              <td data-label="Fecha">{lastVisitText(delivery.at, today)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
