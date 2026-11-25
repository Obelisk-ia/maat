// The notifications a business sends: who they're for and what they say.
import type { cardProgress } from "./card-progress";
import { daysBetween } from "./stamp-day";

export const reminderTypes = {
  near: {
    label: "Cerca de un premio",
    message: "{nombre}, estás a {sellos} de {premio}.",
  },
  ready: {
    label: "Premio esperando",
    message: "{nombre}, tu premio {premio} te está esperando.",
  },
  inactive: {
    label: "Te extrañamos",
    message: "{nombre}, te extrañamos en {negocio}. ¡Vuelve pronto!",
  },
} as const;
export type ReminderType = keyof typeof reminderTypes;
export type AudienceType = ReminderType | "all";

export const audienceLabels: Record<AudienceType, string> = {
  all: "Todos", near: "Cerca de un premio", ready: "Con premio listo", inactive: "Sin venir hace tiempo",
};

export type Audience = { type: AudienceType; stamps: number; days: number };
export type Rule = {
  id: string; type: ReminderType; stamps: number; days: number; message: string; enabled: boolean;
  /** Sent again this often while the customer stays in the situation. Left out: sent once. */
  repeatEveryDays?: number;
  /** For a repeating reminder: sends in all, the first included. Left out: no limit. */
  maxTimes?: number;
};

export const maxRules = 3;
export const fewestRepeatTimes = 2;
export const mostRepeatTimes = 24;
/** Transient failures are tried again on later days, this many times in all. */
export const attemptLimit = 3;
export const messageLimit = 150;
export const firstSendHour = 9;
export const lastSendHour = 20;
export const defaultSendHour = 11;
/** How many days ahead a one-time message can be scheduled. */
export const scheduleLimitDays = 30;
/** A visit this soon after a notification counts as "came back". */
export const returnWindowDays = 7;

export type Placeholder = "nombre" | "negocio" | "premio" | "sellos";

/** What a message may mention depends on who receives it. */
export function placeholdersFor(type: AudienceType): Placeholder[] {
  if (type === "near") return ["nombre", "negocio", "premio", "sellos"];
  if (type === "ready") return ["nombre", "negocio", "premio"];
  return ["nombre", "negocio"];
}

export function messageProblem(message: string, type: AudienceType) {
  const text = message.trim();
  if (!text) return "Escribe el mensaje.";
  if (text.length > messageLimit) return `El mensaje puede tener hasta ${messageLimit} caracteres.`;
  const allowed: string[] = placeholdersFor(type);
  const unknown = [...text.matchAll(/\{([^{}]*)\}/g)].find(([, name]) => !allowed.includes(name));
  return unknown ? `{${unknown[1]}} no se puede usar en este aviso.` : null;
}

const whole = (value: number, least: number, most: number) => Number.isInteger(value) && value >= least && value <= most;

export function audienceProblem({ type, stamps, days }: Audience) {
  if (type === "near" && !whole(stamps, 1, 99)) return "Los sellos que faltan van de 1 a 99.";
  if (type === "inactive" && !whole(days, 1, 365)) return "Los días sin venir van de 1 a 365.";
  return null;
}

export function ruleProblem(rule: Rule) {
  if (!whole(rule.days, 1, 365)) return "Los días sin venir van de 1 a 365.";
  if (rule.repeatEveryDays !== undefined) {
    if (!whole(rule.repeatEveryDays, 1, 365)) return "La repetición va de 1 a 365 días (52 semanas).";
    if (rule.maxTimes !== undefined && !whole(rule.maxTimes, fewestRepeatTimes, mostRepeatTimes)) {
      return `El máximo va de ${fewestRepeatTimes} a ${mostRepeatTimes} avisos. Déjalo vacío para no poner límite.`;
    }
  }
  return audienceProblem(rule) ?? messageProblem(rule.message, rule.type);
}

type Progress = ReturnType<typeof cardProgress>;

export function inAudience(audience: Audience, progress: Progress, daysSinceVisit: number | null) {
  if (audience.type === "near") return progress.remaining !== null && progress.remaining <= audience.stamps;
  if (audience.type === "ready") return progress.ready.length > 0;
  if (audience.type === "inactive") return daysSinceVisit !== null && daysSinceVisit >= audience.days;
  return true;
}

/** A reminder also waits for the customer to have stayed away long enough. */
export function ruleApplies(rule: Rule, progress: Progress, daysSinceVisit: number | null) {
  return daysSinceVisit !== null && daysSinceVisit >= rule.days && inAudience(rule, progress, daysSinceVisit);
}

/** When several reminders apply at once, the most useful one goes first. */
export function byPriority(a: Rule, b: Rule) {
  const order: Record<ReminderType, number> = { ready: 0, near: 1, inactive: 2 };
  return order[a.type] - order[b.type] || b.days - a.days || a.stamps - b.stamps;
}

export function messageValues(type: AudienceType, progress: Progress, name: string, business: string) {
  const prize = type === "ready" ? progress.ready[0] : progress.next;
  return {
    nombre: name.trim().split(/\s+/)[0] ?? "",
    negocio: business,
    premio: prize?.name ?? "",
    sellos: progress.remaining === 1 ? "1 sello" : `${progress.remaining} sellos`,
  } satisfies Record<Placeholder, string>;
}

export function renderMessage(template: string, values: Partial<Record<string, string>>) {
  return template.trim().replace(/\{([^{}]*)\}/g, (found, name: string) => values[name] ?? found);
}

/** "cada 2 semanas", "cada 10 días". */
export function intervalText(days: number) {
  if (days === 1) return "cada día";
  if (days === 7) return "cada semana";
  return days % 7 === 0 ? `cada ${days / 7} semanas` : `cada ${days} días`;
}

/** When a reminder goes out, in a sentence. */
export function scheduleText({ days, repeatEveryDays, maxTimes }: Rule) {
  const first = `A los ${days === 1 ? "1 día" : `${days} días`} sin venir`;
  if (!repeatEveryDays) return `${first}, una sola vez hasta que regrese.`;
  const limit = maxTimes ? `, hasta ${maxTimes} avisos en total` : ", sin límite";
  return `${first}, y después ${intervalText(repeatEveryDays)} mientras siga en esta situación y no regrese${limit}.`;
}

/** A notification already sent to a card since the customer's last visit. */
type Earlier = {
  day: string; _creationTime: number; accepted?: boolean;
  ruleId?: string; ruleType?: string; ruleDays?: number;
};

/**
 * Whether a reminder that applies today should go, given what the card already got since the last
 * visit. A visit empties that history, so every reminder starts over.
 */
export function dueAgain(rule: Rule, sinceVisit: Earlier[], today: string) {
  const own = sinceVisit.filter((entry) => entry.ruleId === rule.id);
  // A reminder of the same kind that waits longer also counts for the shorter ones.
  const related = sinceVisit.filter((entry) =>
    entry.ruleId === rule.id || (entry.ruleType === rule.type && (entry.ruleDays ?? 0) >= rule.days));
  const delivered = related.filter((entry) => entry.accepted !== false);
  const latest = delivered.reduce<Earlier | undefined>(
    (newest, entry) => !newest || entry._creationTime > newest._creationTime ? entry : newest, undefined);
  const failedSince = related.filter((entry) =>
    entry.accepted === false && (!latest || entry._creationTime > latest._creationTime));
  if (failedSince.length >= attemptLimit) return false;
  if (!latest) return true;
  if (!rule.repeatEveryDays) return false;
  if (rule.maxTimes !== undefined && own.filter((entry) => entry.accepted !== false).length >= rule.maxTimes) return false;
  return daysBetween(latest.day, today) >= rule.repeatEveryDays;
}
