"use client";

import { useMemo } from "react";

import {
  dayOfWeek,
  formatISODate,
  isInRange,
  monthLabel,
  parseISODate,
} from "@/lib/dates";
import type { DayOfWeek } from "@/lib/types";
import { cn } from "@/lib/utils";

export type CalendarPickerMode = "unavailable" | "available";

type CalendarPickerProps = {
  searchWindowStart: string;
  searchWindowEnd: string;
  allowedDaysOfWeek: DayOfWeek[];
  selectedDates: string[];
  mode: CalendarPickerMode;
  onChange: (selected: string[]) => void;
};

type MonthCell = {
  iso: string | null;
  day: number | null;
  inWindow: boolean;
  allowed: boolean;
};

type MonthGrid = {
  key: string;
  label: string;
  cells: MonthCell[];
};

const WEEKDAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];

function buildMonths(
  startIso: string,
  endIso: string,
  allowedDays: DayOfWeek[]
): MonthGrid[] {
  const start = parseISODate(startIso);
  const end = parseISODate(endIso);
  const months: MonthGrid[] = [];

  // Walk one month at a time from the start month to the end month.
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const finalMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= finalMonth) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: MonthCell[] = [];
    // Leading blanks so the 1st aligns to its weekday column.
    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ iso: null, day: null, inWindow: false, allowed: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = formatISODate(new Date(year, month, day));
      const inWindow = isInRange(iso, startIso, endIso);
      const allowed = inWindow && allowedDays.includes(dayOfWeek(iso) as DayOfWeek);
      cells.push({ iso, day, inWindow, allowed });
    }
    // Trailing blanks to fill the last row to a multiple of 7. Keeps
    // the grid rectangular so adjacent months don't shift around.
    while (cells.length % 7 !== 0) {
      cells.push({ iso: null, day: null, inWindow: false, allowed: false });
    }

    months.push({
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: monthLabel(year, month),
      cells,
    });

    cursor = new Date(year, month + 1, 1);
  }

  return months;
}

export function CalendarPicker({
  searchWindowStart,
  searchWindowEnd,
  allowedDaysOfWeek,
  selectedDates,
  mode,
  onChange,
}: CalendarPickerProps) {
  const selectedSet = useMemo(() => new Set(selectedDates), [selectedDates]);
  const months = useMemo(
    () => buildMonths(searchWindowStart, searchWindowEnd, allowedDaysOfWeek),
    [searchWindowStart, searchWindowEnd, allowedDaysOfWeek]
  );

  function toggle(iso: string) {
    const next = new Set(selectedSet);
    if (next.has(iso)) {
      next.delete(iso);
    } else {
      next.add(iso);
    }
    onChange(Array.from(next).sort());
  }

  // Selected-cell styling and legend wording flip based on whether
  // the user is marking conflicts (red) or marking dates they can
  // make (emerald). The data the calendar emits is the same shape;
  // only its meaning changes with mode.
  const isAvailableMode = mode === "available";
  const selectedClass = isAvailableMode
    ? "border-emerald-600 bg-emerald-500/15 text-emerald-700"
    : "border-destructive bg-destructive/15 text-destructive";
  const selectedSwatchClass = isAvailableMode
    ? "border border-emerald-600 bg-emerald-500/15"
    : "border border-destructive bg-destructive/15";
  const unselectedLegend = isAvailableMode ? "Not marked" : "Available";
  const selectedLegend = isAvailableMode ? "Can make it" : "Can't make it";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Swatch className="border border-input bg-background" /> {unselectedLegend}
        <Swatch className={selectedSwatchClass} />
        {selectedLegend}
      </div>

      {months.map((month) => (
        <div key={month.key} className="flex flex-col gap-2">
          <div className="text-sm font-medium">{month.label}</div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_HEADERS.map((h, i) => (
              <div
                key={`${month.key}-h-${i}`}
                className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                {h}
              </div>
            ))}
            {month.cells.map((cell, idx) => {
              const key = `${month.key}-${idx}`;
              if (cell.iso === null) {
                return <div key={key} />;
              }
              const selected = selectedSet.has(cell.iso);
              if (!cell.inWindow) {
                return (
                  <div
                    key={key}
                    className="flex h-10 items-center justify-center text-sm text-muted-foreground/40"
                  >
                    {cell.day}
                  </div>
                );
              }
              if (!cell.allowed) {
                return (
                  <div
                    key={key}
                    className="flex h-10 items-center justify-center rounded-md text-sm text-muted-foreground/50 line-through"
                    title="Not allowed by trip day-of-week filter"
                  >
                    {cell.day}
                  </div>
                );
              }
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggle(cell.iso!)}
                  aria-pressed={selected}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-md border text-sm transition-colors",
                    selected
                      ? selectedClass
                      : "border-input bg-background hover:bg-accent"
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Swatch({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-3 w-3 rounded-sm", className)}
    />
  );
}
