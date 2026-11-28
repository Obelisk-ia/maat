"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Composer } from "./composer";
import { History } from "./history";
import { ProximitySection } from "./proximity-section";
import { RemindersForm } from "./reminders-form";
import "./campaigns.css";

/** The current time to the minute, so "today" and the sending hours stay right. */
function useNow() {
  const minute = () => Math.floor(Date.now() / 60_000) * 60_000;
  const [now, setNow] = useState(minute);
  useEffect(() => {
    const timer = setInterval(() => setNow(minute()), 15_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function Campaigns() {
  const { isAuthenticated } = useConvexAuth();
  const now = useNow();
  const config = useQuery(api.notifications.config);
  const latest = useQuery(api.owners.campaigns.overview, isAuthenticated ? { now } : "skip");
  // The page keeps its numbers while a new minute loads, so nothing being typed is lost.
  const [kept, setKept] = useState(latest);
  if (latest && latest !== kept) setKept(latest);
  const data = latest ?? kept;

  return (
    <>
      <div className="owner-heading">
        <h1>Campañas push</h1>
        <p>Avisos en el teléfono de tus clientes, aun con Maat cerrada.</p>
      </div>
      {!data ? <p className="campaign-empty" role="status">Cargando tus avisos…</p> : (
        <div className="campaigns">
          {config && !config.publicKey && (
            <p className="campaign-warning" role="alert">Los avisos todavía no están configurados en el servidor, así que no saldrá ninguno.</p>
          )}
          {data.dailyLimitsOff && (
            <p className="campaign-night" role="status">
              Modo de prueba: los límites diarios están apagados. Cada envío llega a tus clientes, sin importar cuántos van hoy.
            </p>
          )}
          <p className="campaign-reach">
            <strong>{data.reach.reachable} de {data.reach.customers}</strong>{" "}
            {data.reach.customers === 1 ? "cliente puede" : "clientes pueden"} recibir tus avisos
            {data.reach.partial && " (entre los más recientes)"}.
            <span>Los demás no los han permitido en su teléfono o los apagaron.</span>
          </p>
          <RemindersForm data={data} now={now} />
          <ProximitySection data={data} />
          <Composer data={data} now={now} />
          <History data={data} />
        </div>
      )}
    </>
  );
}
