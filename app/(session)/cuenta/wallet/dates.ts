const day = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "America/Mexico_City" });

/** "24 nov", in the same time zone as the daily stamp limit. */
export function shortDate(time: number) {
  return day.format(time);
}
