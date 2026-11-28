"use client";

import { useConvexAuth, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Plus } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { defaultProximityRadiusMeters, formatDistance } from "@/lib/geo";
import {
  audienceLabels, firstSendHour, lastSendHour, messageLimit, messageValues, placeholdersFor, renderMessage,
  type Audience, type AudienceType, type Placeholder,
} from "@/lib/reminders";
import { cardProgress } from "@/lib/card-progress";

export type Overview = FunctionReturnType<typeof api.owners.campaigns.overview>;

export const hours = Array.from({ length: lastSendHour - firstSendHour + 1 }, (_, index) => firstSendHour + index);
export const hourText = (hour: number) => `${hour}:00`;

export function audienceText({ type, stamps, days, radiusMeters }: Audience) {
  if (type === "near") return `A ${stamps} ${stamps === 1 ? "sello" : "sellos"} o menos de un premio`;
  if (type === "inactive") return `Sin venir hace ${days} ${days === 1 ? "día" : "días"} o más`;
  if (type === "nearby") return `Clientes a ${formatDistance(radiusMeters ?? defaultProximityRadiusMeters)} o menos`;
  return audienceLabels[type];
}

export function NumberField({ label, value, max, onChange }: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="campaign-field">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" inputMode="numeric" min={1} max={max} step={1}
        value={Number.isNaN(value) || value === 0 ? "" : value}
        onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

const placeholderLabels: Record<Placeholder, string> = {
  nombre: "Nombre", negocio: "Negocio", premio: "Premio", sellos: "Sellos que faltan",
};

/** The message, with buttons that insert what changes from customer to customer. */
export function MessageField({ type, value, onChange }: {
  type: AudienceType;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const field = useRef<HTMLTextAreaElement>(null);

  function insert(name: Placeholder) {
    const start = field.current?.selectionStart ?? value.length;
    const end = field.current?.selectionEnd ?? start;
    const token = `{${name}}`;
    onChange(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      field.current?.focus();
      field.current?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  return (
    <div className="campaign-field">
      <Label htmlFor={id}>Mensaje</Label>
      <textarea ref={field} id={id} className="campaign-message" rows={2} maxLength={messageLimit} value={value}
        onChange={(event) => onChange(event.target.value)} />
      <div className="campaign-chips" role="group" aria-label="Insertar en el mensaje">
        {placeholdersFor(type).map((name) => (
          <button key={name} type="button" onClick={() => insert(name)}>
            <Plus aria-hidden="true" />{placeholderLabels[name]}
          </button>
        ))}
        <span>{value.length}/{messageLimit}</span>
      </div>
    </div>
  );
}

/** How the notification will look, with an example customer. */
export function NotificationPreview({ data, audience, message }: { data: Overview; audience: Audience; message: string }) {
  const sample = cardProgress(data.card, 0);
  const prize = sample.goals[0]?.name ?? "tu premio";
  const values = {
    ...messageValues("all", sample, "Lucía Herrera", data.businessName),
    premio: prize,
    sellos: audience.stamps === 1 ? "1 sello" : `${audience.stamps || 1} sellos`,
  };
  return (
    <figure className="campaign-preview">
      <figcaption>Así se verá (ejemplo)</figcaption>
      <div>
        <Image src="/icons/maat-192.png" alt="" width={36} height={36} />
        <p><strong>{data.businessName}</strong><span>{renderMessage(message, values) || "…"}</span></p>
      </div>
    </figure>
  );
}

/** How many customers fit today, and how many of them can receive notifications. */
export function AudienceCount({ audience, reminderDays, now, valid }: {
  audience: Audience;
  reminderDays?: number;
  now: number;
  /** Counting waits until the numbers make sense. */
  valid: boolean;
}) {
  const { isAuthenticated } = useConvexAuth();
  const latest = useQuery(api.owners.campaigns.preview,
    isAuthenticated && valid ? { audience, reminderDays, now } : "skip");
  // The same question asked a minute later keeps its answer on screen meanwhile.
  const asked = JSON.stringify([audience, reminderDays]);
  const [kept, setKept] = useState<{ asked: string; count: typeof latest }>();
  if (latest && latest !== kept?.count) setKept({ asked, count: latest });
  const count = latest ?? (kept?.asked === asked ? kept.count : undefined);
  if (!valid) return null;
  return (
    <p className="campaign-count" role="status">
      {!count ? "Contando clientes…" : (
        <>
          Hoy {count.matched === 1 ? "cumple" : "cumplen"} <b>{count.matched}</b> {count.matched === 1 ? "cliente" : "clientes"}
          {" · "}<b>{count.reachable}</b> {count.reachable === 1 ? "puede" : "pueden"} recibirlo
          {count.partial && " (entre tus clientes más recientes)"}
        </>
      )}
    </p>
  );
}
