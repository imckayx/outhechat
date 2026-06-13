import { describe, expect, test } from "vitest";

import { rankWindows, type RankingMember, type RankingTripParams } from "./ranking";

const baseTrip: RankingTripParams = {
  tripLengthDays: 3,
  searchWindowStart: "2026-07-01", // Wednesday
  searchWindowEnd: "2026-07-10", // Friday
  allowedDaysOfWeek: [0, 1, 2, 3, 4, 5, 6],
};

describe("rankWindows", () => {
  test("all members fully available — highest score wins", () => {
    const members: RankingMember[] = [
      { id: "a", name: "Alice", blockedDates: [] },
      { id: "b", name: "Bob", blockedDates: [] },
      { id: "c", name: "Cara", blockedDates: [] },
    ];

    const windows = rankWindows(baseTrip, members);

    expect(windows.length).toBeGreaterThan(0);
    for (const w of windows) {
      expect(w.fullyAvailable).toBe(3);
      expect(w.partiallyAvailable).toBe(0);
      expect(w.blockedMembers).toEqual([]);
      expect(w.score).toBe(6);
    }
    // Tie-break: earliest start first.
    expect(windows[0].start).toBe("2026-07-01");
  });

  test("one member always conflicting appears in blockedMembers for every window", () => {
    const allDays = [
      "2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05",
      "2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10",
    ];
    const members: RankingMember[] = [
      { id: "a", name: "Alice", blockedDates: [] },
      { id: "b", name: "Bob", blockedDates: [] },
      { id: "c", name: "Cara", blockedDates: allDays },
    ];

    const windows = rankWindows(baseTrip, members);

    expect(windows.length).toBeGreaterThan(0);
    for (const w of windows) {
      expect(w.fullyAvailable).toBe(2);
      expect(w.partiallyAvailable).toBe(1);
      expect(w.blockedMembers).toHaveLength(1);
      expect(w.blockedMembers[0].name).toBe("Cara");
      expect(w.blockedMembers[0].conflicts.length).toBe(baseTrip.tripLengthDays);
      expect(w.score).toBe(2 * 2 + 1);
    }
  });

  test("score ordering: full availability beats partial", () => {
    // Two 3-day windows possible. In the first window everyone's free.
    // In every later window, one member has a conflict.
    const members: RankingMember[] = [
      { id: "a", name: "Alice", blockedDates: [] },
      { id: "b", name: "Bob", blockedDates: ["2026-07-04"] },
    ];

    const windows = rankWindows(baseTrip, members);
    expect(windows[0].start).toBe("2026-07-01"); // both free here
    expect(windows[0].fullyAvailable).toBe(2);
    expect(windows[0].partiallyAvailable).toBe(0);
  });

  test("allowedDaysOfWeek filter excludes invalid windows", () => {
    // Thu(4)–Sun(0) long-weekend trip of 4 days. Starting Thursday in
    // July 2026: Thu 2026-07-02, Thu 2026-07-09. Other starts span a
    // disallowed weekday and must be skipped.
    const trip: RankingTripParams = {
      tripLengthDays: 4,
      searchWindowStart: "2026-07-01",
      searchWindowEnd: "2026-07-15",
      allowedDaysOfWeek: [0, 4, 5, 6],
    };
    const members: RankingMember[] = [
      { id: "a", name: "Alice", blockedDates: [] },
    ];

    const windows = rankWindows(trip, members);

    // Only the two Thursday-starting windows should make the cut.
    expect(windows.map((w) => w.start)).toEqual([
      "2026-07-02",
      "2026-07-09",
    ]);
    for (const w of windows) {
      const startDow = new Date(w.start + "T00:00:00").getDay();
      expect(startDow).toBe(4); // Thursday
    }
  });

  test("returns at most 5 windows, sorted desc by score", () => {
    const trip: RankingTripParams = {
      tripLengthDays: 2,
      searchWindowStart: "2026-07-01",
      searchWindowEnd: "2026-07-15",
      allowedDaysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    };
    const members: RankingMember[] = [{ id: "a", name: "Alice", blockedDates: [] }];

    const windows = rankWindows(trip, members);
    expect(windows.length).toBe(5);
    for (let i = 1; i < windows.length; i++) {
      expect(windows[i - 1].score).toBeGreaterThanOrEqual(windows[i].score);
    }
  });

  test("trip exactly fills the search window", () => {
    const trip: RankingTripParams = {
      tripLengthDays: 5,
      searchWindowStart: "2026-07-01",
      searchWindowEnd: "2026-07-05",
      allowedDaysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    };
    const windows = rankWindows(trip, []);
    expect(windows).toHaveLength(1);
    expect(windows[0].start).toBe("2026-07-01");
    expect(windows[0].end).toBe("2026-07-05");
  });

  test("no candidate windows when allowed-days-of-week excludes them all", () => {
    // Wed-only allowed, 3-day trip — no 3-consecutive-Wed window exists.
    const trip: RankingTripParams = {
      tripLengthDays: 3,
      searchWindowStart: "2026-07-01",
      searchWindowEnd: "2026-07-31",
      allowedDaysOfWeek: [3],
    };
    expect(rankWindows(trip, [])).toEqual([]);
  });
});
