// The dashboard's date ranges. Days are YYYY-MM-DD strings, so they sort and compare as text.

export const dashboardPeriods = {
  "30d": { label: "30 días", previous: "los 30 días anteriores", bucket: "día" },
  "90d": { label: "90 días", previous: "los 90 días anteriores", bucket: "semana" },
  year: { label: "Año", previous: "los 12 meses anteriores", bucket: "mes" },
} as const;
export type DashboardPeriod = keyof typeof dashboardPeriods;

const dayLength = 86_400_000;
const toDate = (day: string) => new Date(`${day}T00:00:00Z`);
const toDay = (date: Date) => date.toISOString().slice(0, 10);
export const addDays = (day: string, count: number) => toDay(new Date(toDate(day).getTime() + count * dayLength));
/** The first day of the month that is `count` months away from this day's month. */
const monthStart = (day: string, count: number) => {
  const date = toDate(day);
  return toDay(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1)));
};

const format = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", ...options });
const shortDay = format({ day: "numeric", month: "short" });
const shortMonth = format({ month: "short" });
const longMonth = format({ month: "long", year: "numeric" });

export type Bucket = { start: string; end: string; label: string; title: string };

/** The current range ending today, the equal range before it, and the chart's columns. */
export function periodRange(period: DashboardPeriod, today: string) {
  if (period === "year") {
    const buckets: Bucket[] = Array.from({ length: 12 }, (_, index) => {
      const start = monthStart(today, index - 11);
      const end = addDays(monthStart(today, index - 10), -1);
      return { start, end, label: shortMonth.format(toDate(start)), title: longMonth.format(toDate(start)) };
    });
    return { start: buckets[0].start, previousStart: monthStart(today, -23), buckets };
  }

  const days = period === "30d" ? 30 : 90;
  const size = period === "30d" ? 1 : 7;
  const start = addDays(today, 1 - days);
  const buckets: Bucket[] = [];
  // Columns are counted back from today, so the newest one is always complete.
  for (let end = today; end >= start; end = addDays(end, -size)) {
    const first = addDays(end, 1 - size) < start ? start : addDays(end, 1 - size);
    const label = shortDay.format(toDate(first));
    buckets.unshift({ start: first, end, label, title: first === end ? label : `${label} – ${shortDay.format(toDate(end))}` });
  }
  return { start, previousStart: addDays(start, -days), buckets };
}

export type DayTotals = { newCustomers: number; firstVisits: number; returnVisits: number; rewards: number };
/** Days saved before prizes could be redeemed have no prize count. */
type DayRow = Omit<DayTotals, "rewards"> & { rewards?: number; day: string };

export function sumDays(rows: DayRow[], from: string, to: string): DayTotals {
  const totals = { newCustomers: 0, firstVisits: 0, returnVisits: 0, rewards: 0 };
  for (const row of rows) {
    if (row.day < from || row.day > to) continue;
    totals.newCustomers += row.newCustomers;
    totals.firstVisits += row.firstVisits;
    totals.returnVisits += row.returnVisits;
    totals.rewards += row.rewards ?? 0;
  }
  return totals;
}
