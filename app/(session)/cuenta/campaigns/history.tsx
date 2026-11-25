"use client";

import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { returnWindowDays } from "@/lib/reminders";
import { audienceText, type Overview } from "./shared";

const when = new Intl.DateTimeFormat("es-MX", {
  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Mexico_City",
});
const states = { scheduled: "Programado", sending: "Enviando", sent: "Enviado", cancelled: "Cancelado" } as const;

export function History({ data }: { data: Overview }) {
  const cancel = useMutation(api.owners.campaigns.cancelCampaign);
  const [pending, setPending] = useState<string>();
  const [error, setError] = useState("");

  async function stop(id: Overview["campaigns"][number]["id"]) {
    setPending(id);
    setError("");
    try {
      await cancel({ campaignId: id });
    } catch (error) {
      setError(error instanceof ConvexError && typeof error.data === "string"
        ? error.data : "No pudimos cancelar el aviso. Intenta de nuevo.");
    } finally {
      setPending(undefined);
    }
  }

  return (
    <section className="campaign-section" aria-labelledby="history-title">
      <div className="campaign-section-head">
        <div>
          <h2 id="history-title">Tus avisos</h2>
          <p>«Volvieron» son quienes visitaron en los {returnWindowDays} días siguientes. No prueba que fuera por el aviso.</p>
        </div>
      </div>
      {error && <p className="campaign-status" data-error role="alert">{error}</p>}
      {data.campaigns.length === 0 ? <p className="campaign-empty">Todavía no has enviado avisos.</p> : (
        <ul className="campaign-history">
          {data.campaigns.map((campaign) => (
            <li key={campaign.id}>
              <div>
                <span className="campaign-badge" data-status={campaign.status}>{states[campaign.status]}</span>
                <span>{when.format(campaign.scheduledFor)} · {audienceText(campaign.audience)}</span>
              </div>
              <p>{campaign.message}</p>
              {(campaign.status === "sent" || campaign.status === "sending") && (
                <p className="campaign-stats">
                  Cumplían <b>{campaign.matched}</b> · enviados <b>{campaign.sent}</b>
                  {campaign.pending > 0 && <> · en camino {campaign.pending}</>}
                  {campaign.failed > 0 && <> · no salieron {campaign.failed}</>}
                  {" "}· volvieron <b>{campaign.returned}</b>
                </p>
              )}
              {campaign.status === "scheduled" && (
                <div>
                  <Button type="button" variant="outline" size="sm" disabled={pending === campaign.id} onClick={() => stop(campaign.id)}>
                    {pending === campaign.id ? "Cancelando…" : "Cancelar envío"}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
