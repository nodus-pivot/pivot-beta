/** Nodus works in Los Angeles; render every timestamp there until user time zones exist. */
export const APP_TZ = "America/Los_Angeles";

const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: APP_TZ });
const dateYear = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: APP_TZ });
const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: false, timeZone: APP_TZ });
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ });

/** "Sep 5", or "Sep 5, 2025" when not this year. */
export function formatDate(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() ? date.format(d) : dateYear.format(d);
}

/** "today, 8:50" or "Sep 4, 14:02". */
export function formatDateTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const day = dayKey.format(d) === dayKey.format(now) ? "today" : formatDate(iso, now);
  return `${day}, ${time.format(d)}`;
}

export function formatMinutes(min: number | null | undefined): string {
  if (!min) return "—";
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60 ? `${min % 60}m` : ""}`.trim() : `${min} min`;
}
