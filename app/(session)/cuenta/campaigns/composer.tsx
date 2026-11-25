"use client";

import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { addDays } from "@/lib/dashboard-periods";
import {
  audienceLabels, audienceProblem, firstSendHour, lastSendHour, messageProblem, placeholdersFor,
  scheduleLimitDays, type AudienceType,
} from "@/lib/reminders";
import { dayKey, hourOf } from "@/lib/stamp-day";
import {
  AudienceCount, audienceText, hours, hourText, MessageField, NotificationPreview, NumberField, type Overview,
} from "./shared";

// A chosen day is a calendar date, so it's read and shown without moving between time zones.
const longDay = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const dayText = (day: string) => Number.isNaN(Date.parse(day)) ? day : longDay.format(Date.parse(`${day}T00:00:00Z`));

const clockTime = new Intl.DateTimeFormat("es-MX", {
  hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Mexico_City",
});

function NightWarning({ now }: { now: number }) {
  return (
    <p className="campaign-night">
      Son las {clockTime.format(now)} en Ciudad de México. Tus clientes pueden recibirlo mientras duermen.
      Para que llegue de día, elige «Programar».
    </p>
  );
}

/** A one-time message, sent now or on a chosen day. */
export function Composer({ data, now }: { data: Overview; now: number }) {
  const send = useMutation(api.owners.campaigns.sendCampaign);
  const today = dayKey(now);
  const atNight = hourOf(now) < firstSendHour || hourOf(now) >= lastSendHour;
  const [type, setType] = useState<AudienceType>("all");
  const [stamps, setStamps] = useState(2);
  const [days, setDays] = useState(30);
  const [message, setMessage] = useState("");
  // Until the owner chooses, a message written at night is set to go out later.
  const [later, setLater] = useState<boolean>();
  const [day, setDay] = useState(() => addDays(today, 1));
  const [hour, setHour] = useState(11);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean }>();
  const scheduled = later ?? atNight;
  const lateNow = atNight && !scheduled;
  const audience = { type, stamps, days };

  function chooseType(next: AudienceType) {
    setType(next);
    setStatus(undefined);
  }

  function review() {
    const problem = audienceProblem(audience) ?? messageProblem(message, type);
    setStatus(problem ? { text: problem, error: true } : undefined);
    if (!problem) setConfirming(true);
  }

  async function confirm() {
    setSending(true);
    try {
      await send({ audience, message, schedule: scheduled ? { day, hour } : undefined });
      setStatus({ text: scheduled ? "Aviso programado." : "Aviso en camino." });
      setMessage("");
    } catch (error) {
      setStatus({
        error: true,
        text: error instanceof ConvexError && typeof error.data === "string"
          ? error.data : "No pudimos enviar el aviso. Intenta de nuevo.",
      });
    } finally {
      setSending(false);
      setConfirming(false);
    }
  }

  return (
    <section className="campaign-section" aria-labelledby="compose-title">
      <div className="campaign-section-head">
        <div>
          <h2 id="compose-title">Enviar un aviso</h2>
          <p>Un mensaje tuyo, una sola vez. {data.dailyLimitsOff ? "Sin límite mientras pruebas." : "Puedes enviar uno por día."}</p>
        </div>
      </div>
      <div className="campaign-pills" role="group" aria-label="Quién lo recibe">
        {(Object.keys(audienceLabels) as AudienceType[]).map((option) => (
          <Button key={option} type="button" variant="ghost" size="sm" aria-pressed={type === option}
            onClick={() => chooseType(option)}>
            {audienceLabels[option]}
          </Button>
        ))}
      </div>
      {(type === "near" || type === "inactive") && (
        <div className="campaign-numbers">
          {type === "near"
            ? <NumberField label="Le faltan estos sellos o menos" value={stamps} max={99} onChange={setStamps} />
            : <NumberField label="Días sin venir" value={days} max={365} onChange={setDays} />}
        </div>
      )}
      <div className="campaign-compose">
        <MessageField type={type} value={message} onChange={(value) => { setMessage(value); setStatus(undefined); }} />
        <NotificationPreview data={data} audience={audience} message={message} />
      </div>
      {!placeholdersFor(type).includes("premio") && (
        <p className="campaign-hint">Para mencionar el premio, elige «Cerca de un premio» o «Con premio listo».</p>
      )}
      <AudienceCount now={now} audience={audience} valid={!audienceProblem(audience)} />

      <fieldset className="campaign-when">
        <legend>Cuándo</legend>
        <label>
          <input type="radio" name="when" checked={!scheduled} onChange={() => setLater(false)} />
          Ahora
        </label>
        <label>
          <input type="radio" name="when" checked={scheduled} onChange={() => setLater(true)} />
          Programar
        </label>
        {scheduled && (
          <div>
            <Input type="date" aria-label="Día de envío" value={day} min={today} max={addDays(today, scheduleLimitDays)}
              onChange={(event) => setDay(event.target.value)} />
            <select aria-label="Hora de envío" value={hour} onChange={(event) => setHour(Number(event.target.value))}>
              {hours.map((option) => <option key={option} value={option}>{hourText(option)}</option>)}
            </select>
          </div>
        )}
      </fieldset>
      {lateNow && <NightWarning now={now} />}

      <div className="campaign-actions">
        <Button type="button" disabled={!message.trim() || sending} onClick={review}>
          <Send aria-hidden="true" /> {scheduled ? "Programar aviso" : "Enviar aviso"}
        </Button>
      </div>
      <p className="campaign-status" data-error={Boolean(status?.error)} role="status">{status?.text}</p>

      <Dialog open={confirming} onOpenChange={(open) => { if (!sending) setConfirming(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="m-0">{scheduled ? "¿Programar este aviso?" : "¿Enviar este aviso ahora?"}</DialogTitle>
            <DialogDescription className="m-0">
              {audienceText(audience)}.{" "}
              {scheduled
                ? `Saldrá el ${dayText(day)} a las ${hourText(hour)}. Puedes cancelarlo antes.`
                : "No se puede deshacer."}
            </DialogDescription>
          </DialogHeader>
          {lateNow && <NightWarning now={now} />}
          <NotificationPreview data={data} audience={audience} message={message} />
          <AudienceCount now={now} audience={audience} valid={confirming} />
          <DialogFooter>
            <Button type="button" variant="outline" disabled={sending} onClick={() => setConfirming(false)}>Cancelar</Button>
            <Button type="button" disabled={sending} onClick={confirm}>
              {sending ? "Guardando…" : scheduled ? "Sí, programar" : "Sí, enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
