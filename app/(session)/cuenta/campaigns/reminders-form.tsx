"use client";

import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { randomPrizeId } from "@/lib/prizes";
import { maxRules, reminderTypes, ruleProblem, scheduleText, type ReminderType, type Rule } from "@/lib/reminders";
import { hourOf } from "@/lib/stamp-day";
import { RepeatFields } from "./repeat-fields";
import {
  AudienceCount, hours, hourText, MessageField, NotificationPreview, NumberField, type Overview,
} from "./shared";

const defaultDays: Record<ReminderType, number> = { near: 10, ready: 3, inactive: 30 };

function newRule(taken: Rule[]): Rule {
  const types = Object.keys(reminderTypes) as ReminderType[];
  const type = types.find((candidate) => !taken.some((rule) => rule.type === candidate)) ?? "near";
  return { id: randomPrizeId(), type, stamps: 2, days: defaultDays[type], message: reminderTypes[type].message, enabled: true };
}

/** The saved reminder without what the page adds to it, such as its numbers. */
const plain = ({ id, type, stamps, days, message, enabled, repeatEveryDays, maxTimes }: Rule): Rule =>
  ({ id, type, stamps, days, message, enabled, repeatEveryDays, maxTimes });

function nextSend(data: Overview, sendHour: number, now: number) {
  const hour = hourOf(now);
  if (data.doneForToday || hour > 20) return `mañana a las ${hourText(sendHour)}`;
  return hour < sendHour ? `hoy a las ${hourText(sendHour)}` : "hoy, dentro de la próxima hora";
}

export function RemindersForm({ data, now }: { data: Overview; now: number }) {
  const save = useMutation(api.owners.campaigns.savePlan);
  // Unsaved changes, if any; otherwise the page shows what's saved.
  const [draft, setDraft] = useState<{ sendHour: number; rules: Rule[] }>();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean }>();
  const sendHour = draft?.sendHour ?? data.sendHour;
  const rules = draft?.rules ?? data.rules.map(plain);
  const active = rules.filter((rule) => rule.enabled).length;

  function change(next: Partial<{ sendHour: number; rules: Rule[] }>) {
    setDraft({ sendHour, rules, ...next });
    setStatus(undefined);
  }
  const update = (id: string, values: Partial<Rule>) =>
    change({ rules: rules.map((rule) => rule.id === id ? { ...rule, ...values } : rule) });

  function changeType(rule: Rule, type: ReminderType) {
    // An untouched message and wait follow the kind of reminder.
    update(rule.id, {
      type,
      ...(rule.message === reminderTypes[rule.type].message ? { message: reminderTypes[type].message } : {}),
      ...(rule.days === defaultDays[rule.type] ? { days: defaultDays[type] } : {}),
    });
  }

  async function submit() {
    const problem = rules.map(ruleProblem).find(Boolean);
    if (problem) {
      setStatus({ text: problem, error: true });
      return;
    }
    setSaving(true);
    setStatus(undefined);
    try {
      await save({ sendHour, rules });
      setDraft(undefined);
      setStatus({ text: "Recordatorios guardados." });
    } catch (error) {
      setStatus({
        error: true,
        text: error instanceof ConvexError && typeof error.data === "string"
          ? error.data : "No pudimos guardar los recordatorios. Intenta de nuevo.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="campaign-section" aria-labelledby="reminders-title">
      <div className="campaign-section-head">
        <div>
          <h2 id="reminders-title">Recordatorios automáticos</h2>
          <p>Se envían solos. Tú decides si cada uno llega una vez o se repite. Cuando el cliente regresa, la cuenta empieza de nuevo.</p>
        </div>
        <div className="campaign-field campaign-hour">
          <label htmlFor="reminder-hour">Hora de envío (Ciudad de México)</label>
          <select id="reminder-hour" value={sendHour} onChange={(event) => change({ sendHour: Number(event.target.value) })}>
            {hours.map((hour) => <option key={hour} value={hour}>{hourText(hour)}</option>)}
          </select>
        </div>
      </div>

      {rules.length === 0 && <p className="campaign-empty">Todavía no tienes recordatorios.</p>}

      <ol className="campaign-rules">
        {rules.map((rule, index) => {
          const saved = data.rules.find((other) => other.id === rule.id);
          return (
            <li key={rule.id} data-enabled={rule.enabled}>
              <div className="campaign-rule-head">
                <div className="campaign-field">
                  <label htmlFor={`rule-type-${rule.id}`}>Recordatorio {index + 1}</label>
                  <select id={`rule-type-${rule.id}`} value={rule.type}
                    onChange={(event) => changeType(rule, event.target.value as ReminderType)}>
                    {(Object.keys(reminderTypes) as ReminderType[]).map((type) => (
                      <option key={type} value={type}>{reminderTypes[type].label}</option>
                    ))}
                  </select>
                </div>
                <label className="campaign-check">
                  <input type="checkbox" checked={rule.enabled}
                    onChange={(event) => update(rule.id, { enabled: event.target.checked })} />
                  Activo
                </label>
                <Button type="button" variant="ghost" size="icon" aria-label={`Quitar recordatorio ${index + 1}`}
                  onClick={() => change({ rules: rules.filter((other) => other.id !== rule.id) })}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              <div className="campaign-numbers">
                {rule.type === "near" && (
                  <NumberField label="Le faltan estos sellos o menos" value={rule.stamps} max={99}
                    onChange={(stamps) => update(rule.id, { stamps })} />
                )}
                <NumberField label="Días sin venir" value={rule.days} max={365}
                  onChange={(days) => update(rule.id, { days })} />
              </div>
              <RepeatFields rule={rule} onChange={(values) => update(rule.id, values)} />
              {!ruleProblem(rule) && <p className="campaign-schedule">{scheduleText(rule)}</p>}
              {rule.repeatEveryDays !== undefined && rule.repeatEveryDays >= 1 && rule.repeatEveryDays < 7 && (
                <p className="campaign-night">Avisar tan seguido puede hacer que tus clientes apaguen los avisos.</p>
              )}
              <div className="campaign-compose">
                <MessageField type={rule.type} value={rule.message} onChange={(message) => update(rule.id, { message })} />
                <NotificationPreview data={data} audience={rule} message={rule.message} />
              </div>
              <AudienceCount now={now} reminderDays={rule.days}
                audience={{ type: rule.type, stamps: rule.stamps, days: rule.days }}
                valid={!ruleProblem(rule)} />
              {saved && (
                <p className="campaign-stats">
                  Últimos 30 días: <b>{saved.stats.sent}</b> enviados · <b>{saved.stats.returned}</b> volvieron
                  {saved.stats.failed > 0 && <> · {saved.stats.failed} no salieron</>}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="campaign-actions">
        <Button type="button" variant="outline" disabled={rules.length >= maxRules}
          onClick={() => change({ rules: [...rules, newRule(rules)] })}>
          <Plus aria-hidden="true" /> Agregar recordatorio
        </Button>
        <Button type="button" disabled={!draft || saving} onClick={submit}>
          {saving ? "Guardando…" : "Guardar recordatorios"}
        </Button>
      </div>
      <p className="campaign-status" data-error={Boolean(status?.error)} role="status">{status?.text}</p>
      {!draft && active > 0 && <p className="campaign-hint">Próximo envío: {nextSend(data, sendHour, now)}.</p>}
      {draft && <p className="campaign-hint">Tienes cambios sin guardar. Si la hora elegida ya pasó hoy, empiezan mañana.</p>}
      <p className="campaign-hint">
        {!data.dailyLimitsOff && "Cada cliente recibe como máximo un aviso de tu negocio al día. "}
        Si varios recordatorios aplican, va primero el premio esperando.
      </p>
    </section>
  );
}
