import { addDays } from "@/lib/dashboard-periods";
import { dayKey } from "@/lib/stamp-day";

const zone = "America/Mexico_City";
const time = new Intl.DateTimeFormat("es-MX", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const date = new Intl.DateTimeFormat("es-MX", { timeZone: zone, day: "numeric", month: "short", year: "numeric" });
export const number = new Intl.NumberFormat("es-MX");

export function lastVisitText(lastVisitAt: number | null, today: string) {
  if (lastVisitAt === null) return "Sin visitas";
  const day = dayKey(lastVisitAt);
  if (day === today) return `Hoy, ${time.format(lastVisitAt)}`;
  if (day === addDays(today, -1)) return `Ayer, ${time.format(lastVisitAt)}`;
  return date.format(lastVisitAt);
}

export function joinedText(joinedAt: number) {
  return date.format(joinedAt);
}
