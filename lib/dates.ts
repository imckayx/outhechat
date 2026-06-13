// Tiny date helpers that treat ISO "YYYY-MM-DD" strings as local
// calendar dates. We avoid `new Date("YYYY-MM-DD")` because it parses
// as UTC, which shifts dates west of Greenwich by one day.

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function eachDateInRange(startIso: string, endIso: string): string[] {
  const start = parseISODate(startIso);
  const end = parseISODate(endIso);
  const out: string[] = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    out.push(formatISODate(d));
  }
  return out;
}

export function isInRange(iso: string, startIso: string, endIso: string): boolean {
  return iso >= startIso && iso <= endIso;
}

export function dayOfWeek(iso: string): number {
  return parseISODate(iso).getDay();
}

export function monthLabel(year: number, month0: number): string {
  return new Date(year, month0, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}
