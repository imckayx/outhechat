"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import type { RankedWindow } from "@/lib/ranking";
import { cn } from "@/lib/utils";

type WindowsListProps = {
  windows: RankedWindow[];
};

export function WindowsList({ windows }: WindowsListProps) {
  if (windows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No candidate windows yet. Check that the search window is at least as
        long as the trip length, and that the allowed days of week aren&apos;t
        too restrictive.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {windows.map((w, idx) => (
        <li key={`${w.start}-${w.end}`}>
          <WindowCard window={w} rank={idx + 1} />
        </li>
      ))}
    </ol>
  );
}

function WindowCard({ window: w, rank }: { window: RankedWindow; rank: number }) {
  const [open, setOpen] = useState(false);
  const hasConflicts = w.blockedMembers.length > 0;

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              #{rank}
            </span>
            <span className="text-base font-semibold tracking-tight">
              {formatRange(w.start, w.end)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Dot className="bg-emerald-500" />
              {w.fullyAvailable} fully available
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Dot className="bg-amber-500" />
              {w.partiallyAvailable} with conflicts
            </span>
          </div>
        </div>
        {hasConflicts && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-accent"
            aria-expanded={open}
          >
            {open ? <ChevronDown /> : <ChevronRight />}
            {open ? "Hide" : "Show"} conflicts
          </button>
        )}
      </div>
      {hasConflicts && open && (
        <ul className="flex flex-col gap-2 border-t px-4 py-3 text-sm">
          {w.blockedMembers.map((m) => (
            <li key={m.name} className="flex flex-col gap-1">
              <span className="font-medium">{m.name}</span>
              <span className="text-muted-foreground">
                Out on{" "}
                {m.conflicts
                  .map((d) =>
                    formatDate(d, { month: "short", day: "numeric" })
                  )
                  .join(", ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Dot({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-2 w-2 rounded-full", className)}
    />
  );
}

function formatRange(startIso: string, endIso: string): string {
  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = endIso.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  const sameYear = sy === ey;
  const sameMonth = sameYear && sm === em;

  if (sameMonth) {
    return `${start.toLocaleString("en-US", { month: "short" })} ${sd}–${ed}, ${sy}`;
  }
  if (sameYear) {
    return `${start.toLocaleString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleString(
      "en-US",
      { month: "short", day: "numeric" }
    )}, ${sy}`;
  }
  return `${start.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  )}`;
}

function formatDate(iso: string, opts: Intl.DateTimeFormatOptions): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", opts);
}
