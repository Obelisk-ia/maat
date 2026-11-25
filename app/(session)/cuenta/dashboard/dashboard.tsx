"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { dashboardPeriods, type DashboardPeriod } from "@/lib/dashboard-periods";
import { dayKey } from "@/lib/stamp-day";
import { Customers } from "./customers";
import { Deliveries } from "./deliveries";
import { Overview } from "./overview";
import "./dashboard.css";

const tabs = {
  overview: { label: "Resumen", title: "Tus números, claros", summary: "Quién llega, quién regresa y qué premios alcanza." },
  customers: { label: "Clientes", title: "Tus clientes", summary: "Quienes siguen tu tarjeta." },
  deliveries: { label: "Entregas", title: "Premios entregados", summary: "Qué se entregó, a quién y quién lo entregó." },
} as const;
type Tab = keyof typeof tabs;

/** Today in Mexico City, kept current while the dashboard stays open. */
function useToday() {
  const [today, setToday] = useState(() => dayKey(Date.now()));
  useEffect(() => {
    const timer = setInterval(() => setToday(dayKey(Date.now())), 60_000);
    return () => clearInterval(timer);
  }, []);
  return today;
}

export function Dashboard({ onEditCard }: { onEditCard: () => void }) {
  const { isAuthenticated } = useConvexAuth();
  const today = useToday();
  const [tab, setTab] = useState<Tab>("overview");
  const [period, setPeriod] = useState<DashboardPeriod>("30d");
  const data = useQuery(api.owners.dashboard.overview, isAuthenticated ? { period, today } : "skip");
  // While another period loads, the previous numbers stay in place, dimmed.
  const [lastData, setLastData] = useState(data);
  if (data && data !== lastData) setLastData(data);
  const shown = data ?? lastData;

  return (
    <>
      <div className="owner-heading dashboard-heading">
        <div>
          <h1>{tabs[tab].title}</h1>
          <p>{tabs[tab].summary}</p>
        </div>
        <div className="dashboard-controls">
          <div className="dashboard-pills" role="group" aria-label="Vista">
            {(Object.keys(tabs) as Tab[]).map((option) => (
              <Button key={option} type="button" variant="ghost" size="sm" aria-pressed={tab === option}
                onClick={() => setTab(option)}>
                {tabs[option].label}{option === "customers" && shown ? ` (${shown.following})` : ""}
              </Button>
            ))}
          </div>
          {tab === "overview" && (
            <div className="dashboard-pills" role="group" aria-label="Periodo">
              {(Object.keys(dashboardPeriods) as DashboardPeriod[]).map((option) => (
                <Button key={option} type="button" variant="ghost" size="sm" aria-pressed={period === option}
                  onClick={() => setPeriod(option)}>
                  {dashboardPeriods[option].label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {tab === "customers" ? <Customers today={today} /> : tab === "deliveries" ? <Deliveries today={today} /> : !shown ? (
        <p className="dashboard-loading" role="status">Cargando tus números…</p>
      ) : (
        <div className="dashboard-body" data-stale={!data}>
          <Overview data={shown} today={today} onShowCustomers={() => setTab("customers")} onEditCard={onEditCard} />
        </div>
      )}
    </>
  );
}
