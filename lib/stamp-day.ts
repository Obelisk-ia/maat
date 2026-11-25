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
