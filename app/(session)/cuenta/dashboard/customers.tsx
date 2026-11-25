"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { cardProgress } from "@/lib/card-progress";
import { formatMemberCode } from "@/lib/member-code";
import { dayKey } from "@/lib/stamp-day";
import { joinedText, lastVisitText, number } from "./format";

const filters = { all: "Todos", prize: "Con premio listo", returned: "Han regresado", new: "Nuevos hoy" } as const;
type Filter = keyof typeof filters;

const searchable = (text: string) => text.normalize("NFD").replace(/[\p{Diacritic}\s-]/gu, "").toLowerCase();

export function Customers({ today }: { today: string }) {
  const { isAuthenticated } = useConvexAuth();
  const data = useQuery(api.dashboard.customers, isAuthenticated ? {} : "skip");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  if (!data) return <p className="dashboard-loading" role="status">Cargando tus clientes…</p>;

  const term = searchable(search);
  const rows = data.customers
    .map((customer) => ({ ...customer, ...cardProgress(data.card, customer.stamps, customer.redeemedPrizes) }))
    .filter((customer) => searchable(`${customer.name} ${customer.code}`).includes(term))
    .filter((customer) => filter === "all" ||
      (filter === "prize" && customer.ready.length > 0) ||
      (filter === "returned" && customer.visits >= 2) ||
      (filter === "new" && dayKey(customer.joinedAt) === today));

  return (
    <section aria-label="Clientes">
      <div className="customers-tools">
        <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
          aria-label="Buscar clientes" placeholder="Buscar por nombre o código…" />
        <div className="dashboard-pills" role="group" aria-label="Filtrar clientes">
          {(Object.keys(filters) as Filter[]).map((option) => (
            <Button key={option} type="button" variant="ghost" size="sm" aria-pressed={filter === option}
              onClick={() => setFilter(option)}>
              {filters[option]}
            </Button>
          ))}
        </div>
      </div>

      {data.total > data.customers.length && (
        <p className="dashboard-note">Se muestran los {number.format(data.customers.length)} clientes más recientes de {number.format(data.total)}.</p>
      )}
      {rows.length === 0 ? (
        <p className="dashboard-empty" role="status">
          {data.total === 0 ? "Aún no tienes clientes. Comparte tu código QR para que guarden tu tarjeta." : "Ningún cliente coincide."}
        </p>
      ) : (
        <table className="dashboard-table">
          <thead>
            <tr><th scope="col">Cliente</th><th scope="col">Sellos</th><th scope="col">Visitas</th><th scope="col">Premios canjeados</th><th scope="col">Última visita</th><th scope="col">Cliente desde</th></tr>
          </thead>
          <tbody>
            {rows.map((customer) => (
              <tr key={customer.membershipId}>
                <th scope="row"><strong>{customer.name}</strong><code>{formatMemberCode(customer.code)}</code></th>
                <td data-label="Sellos">
                  <span className="dashboard-count">{customer.stamps}/{customer.total}</span>
                  {customer.ready.length > 0 && <span className="dashboard-chip">{customer.ready[0].name}</span>}
                </td>
                <td data-label="Visitas">{number.format(customer.visits)}</td>
                <td data-label="Premios canjeados">{number.format(customer.prizesRedeemed)}</td>
                <td data-label="Última visita">{lastVisitText(customer.lastVisitAt, today)}</td>
                <td data-label="Cliente desde">{joinedText(customer.joinedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
