// A customer earns at most one stamp per business each day.
// A day is the calendar day in Mexico City, so it resets at midnight rather than 24 hours later.
const day = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit",
});

/** The Mexico City calendar day a moment falls on, as YYYY-MM-DD. */
export function dayKey(time: number) {
  const parts = Object.fromEntries(day.formatToParts(time).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function sameStampDay(first: number, second: number) {
  return dayKey(first) === dayKey(second);
}

const hour = new Intl.DateTimeFormat("en-US", { timeZone: "America/Mexico_City", hour: "2-digit", hourCycle: "h23" });

/** The Mexico City hour a moment falls in, 0 to 23. */
export function hourOf(time: number) {
  return Number(hour.format(time));
}

/** The moment a Mexico City day reaches a given hour. */
export function timeAt(day: string, atHour: number) {
  // Read as UTC, then moved by however far the zone is from UTC at that time.
  const wanted = Date.parse(`${day}T${String(atHour).padStart(2, "0")}:00:00Z`);
  let time = wanted;
  for (let pass = 0; pass < 2; pass++) {
    const shown = Date.parse(`${dayKey(time)}T${String(hourOf(time)).padStart(2, "0")}:00:00Z`);
    time += wanted - shown;
  }
  return time;
}

/** Calendar days from one YYYY-MM-DD day to another. */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}
