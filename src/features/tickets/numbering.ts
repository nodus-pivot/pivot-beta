/**
 * Ticket numbers follow the old app: prefix + two-digit year + running
 * four-digit counter, e.g. NW260041. The counter restarts each year.
 */
export function ticketNumberPrefix(prefix: string, now: Date = new Date()): string {
  return `${prefix}${String(now.getFullYear()).slice(-2)}`;
}

export function nextTicketNumber(prefix: string, existing: string[], now: Date = new Date()): string {
  const head = ticketNumberPrefix(prefix, now);
  let max = 0;
  for (const n of existing) {
    if (!n.startsWith(head)) continue;
    const tail = Number(n.slice(head.length));
    if (Number.isInteger(tail) && tail > max) max = tail;
  }
  return `${head}${String(max + 1).padStart(4, "0")}`;
}
