import { addDays, dayOfWeek, formatISODate, parseISODate } from "@/lib/dates";

export type RankingTripParams = {
  tripLengthDays: number;
  searchWindowStart: string;
  searchWindowEnd: string;
  allowedDaysOfWeek: number[];
};

export type RankingMember = {
  id: string;
  name: string;
  blockedDates: string[];
};

export type RankedWindow = {
  start: string;
  end: string;
  fullyAvailable: number;
  partiallyAvailable: number;
  blockedMembers: { name: string; conflicts: string[] }[];
  score: number;
};

const MAX_RESULTS = 5;

// Generate every N-day window inside the search range, keep only the
// ones whose every date sits on an allowed weekday, partition members
// into fully- and partially-available per window, score, and return
// the top 5. Algorithm and tie-breakers per TECH_SPEC.md.

export function rankWindows(
  trip: RankingTripParams,
  members: RankingMember[]
): RankedWindow[] {
  const allowed = new Set(trip.allowedDaysOfWeek);
  const start = parseISODate(trip.searchWindowStart);
  const end = parseISODate(trip.searchWindowEnd);
  const n = trip.tripLengthDays;

  const windows: RankedWindow[] = [];

  for (let s = new Date(start); ; s = addDays(s, 1)) {
    const lastDay = addDays(s, n - 1);
    if (lastDay > end) break;

    const dates: string[] = [];
    let ok = true;
    for (let i = 0; i < n; i++) {
      const d = addDays(s, i);
      const iso = formatISODate(d);
      if (!allowed.has(dayOfWeek(iso))) {
        ok = false;
        break;
      }
      dates.push(iso);
    }
    if (!ok) continue;

    const windowSet = new Set(dates);
    let fullyAvailable = 0;
    let partiallyAvailable = 0;
    const blockedMembers: { name: string; conflicts: string[] }[] = [];

    for (const m of members) {
      const conflicts = m.blockedDates.filter((d) => windowSet.has(d));
      if (conflicts.length === 0) {
        fullyAvailable++;
      } else {
        partiallyAvailable++;
        blockedMembers.push({ name: m.name, conflicts: conflicts.sort() });
      }
    }

    windows.push({
      start: dates[0],
      end: dates[dates.length - 1],
      fullyAvailable,
      partiallyAvailable,
      blockedMembers,
      score: fullyAvailable * 2 + partiallyAvailable * 1,
    });
  }

  windows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.fullyAvailable !== a.fullyAvailable) {
      return b.fullyAvailable - a.fullyAvailable;
    }
    return a.start < b.start ? -1 : a.start > b.start ? 1 : 0;
  });

  return windows.slice(0, MAX_RESULTS);
}
