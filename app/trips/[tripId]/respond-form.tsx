"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";

import { CalendarPicker, type CalendarPickerMode } from "@/components/calendar-picker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MemberPrefill } from "@/lib/data";
import { dayOfWeek, eachDateInRange } from "@/lib/dates";
import type { DayOfWeek } from "@/lib/types";
import { cn } from "@/lib/utils";

type RespondFormProps = {
  tripId: string;
  searchWindowStart: string;
  searchWindowEnd: string;
  allowedDaysOfWeek: DayOfWeek[];
  prefill: MemberPrefill | null;
  disabled: boolean;
};

type SubmitResponse = {
  memberId: string;
  memberToken: string;
  editUrl: string;
};

type FieldErrors = Partial<Record<string, string>>;

type ZodTree = {
  errors?: string[];
  properties?: Record<string, ZodTree>;
};

function flattenErrors(tree: ZodTree | undefined): FieldErrors {
  const out: FieldErrors = {};
  if (!tree?.properties) return out;
  for (const [field, node] of Object.entries(tree.properties)) {
    if (node.errors && node.errors.length > 0) {
      out[field] = node.errors[0];
    }
  }
  return out;
}

export function RespondForm({
  tripId,
  searchWindowStart,
  searchWindowEnd,
  allowedDaysOfWeek,
  prefill,
  disabled,
}: RespondFormProps) {
  const [name, setName] = useState(prefill?.name ?? "");
  // `mode` controls how the calendar selection is interpreted at
  // submit time. Default is "unavailable" so prefilled blocked dates
  // round-trip without any flipping.
  const [mode, setMode] = useState<CalendarPickerMode>("unavailable");
  const [selectedDates, setSelectedDates] = useState<string[]>(
    prefill?.blockedDates ?? []
  );

  // All in-window dates whose weekday is in `allowedDaysOfWeek`. Used
  // both to invert the selection on mode switch and to derive the
  // blockedDates payload when submitting in "available" mode.
  const allowedDates = useMemo(() => {
    const allowed = new Set(allowedDaysOfWeek);
    return eachDateInRange(searchWindowStart, searchWindowEnd).filter((iso) =>
      allowed.has(dayOfWeek(iso) as DayOfWeek)
    );
  }, [searchWindowStart, searchWindowEnd, allowedDaysOfWeek]);

  function switchMode(next: CalendarPickerMode) {
    if (next === mode) return;
    // Invert: dates the user did NOT pick in the old mode are the
    // dates that carry their intent into the new mode. This way
    // "I can't make these 3" flips to "I can make all the others"
    // without losing work.
    const prev = new Set(selectedDates);
    setSelectedDates(allowedDates.filter((iso) => !prev.has(iso)));
    setMode(next);
  }

  const [submitting, setSubmitting] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<SubmitResponse | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled) return;
    setSubmitting(true);
    setTopError(null);
    setFieldErrors({});

    // The API only knows about blocked dates. In "available" mode,
    // every allowed in-window date the user did NOT pick becomes a
    // conflict.
    const selectedSet = new Set(selectedDates);
    const blockedDates =
      mode === "unavailable"
        ? selectedDates
        : allowedDates.filter((iso) => !selectedSet.has(iso));

    try {
      const res = await fetch(`/api/trips/${tripId}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          blockedDates,
          memberToken: prefill ? getMemberTokenFromUrl() : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setTopError(body.error ?? "Could not save response");
        if (body.issues) setFieldErrors(flattenErrors(body.issues));
        return;
      }
      setResult(body as SubmitResponse);
    } catch {
      setTopError("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return <ConfirmationView editUrl={result.editUrl} isUpdate={!!prefill} />;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">
          Your name<span className="text-destructive"> *</span>
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Alex"
          maxLength={50}
          required
          disabled={disabled}
        />
        {fieldErrors.name && (
          <p className="text-xs text-destructive">{fieldErrors.name}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>
            {mode === "unavailable"
              ? "Tap the dates you can't make it"
              : "Tap the dates you can make it"}
          </Label>
          <ModeToggle mode={mode} onChange={switchMode} disabled={disabled} />
        </div>
        <p className="text-xs text-muted-foreground">
          {mode === "unavailable"
            ? "Default is available. Only mark conflicts."
            : "Default is unavailable. Mark every date you can make it."}
        </p>
        <div className="rounded-lg border p-3 sm:p-4">
          <CalendarPicker
            searchWindowStart={searchWindowStart}
            searchWindowEnd={searchWindowEnd}
            allowedDaysOfWeek={allowedDaysOfWeek}
            selectedDates={selectedDates}
            mode={mode}
            onChange={setSelectedDates}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {selectionHint(mode, selectedDates.length)}
        </p>
      </div>

      {topError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {topError}
        </div>
      )}

      <Button type="submit" size="lg" disabled={submitting || disabled}>
        {submitting
          ? "Saving…"
          : prefill
            ? "Update response"
            : "Submit response"}
      </Button>
    </form>
  );
}

function selectionHint(mode: CalendarPickerMode, count: number): string {
  if (mode === "unavailable") {
    return count === 0
      ? "You haven't marked any conflicts."
      : `${count} ${count === 1 ? "day" : "days"} marked unavailable`;
  }
  return count === 0
    ? "You haven't marked any dates yet."
    : `${count} ${count === 1 ? "day" : "days"} marked available`;
}

function ModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: CalendarPickerMode;
  onChange: (m: CalendarPickerMode) => void;
  disabled: boolean;
}) {
  const options: { value: CalendarPickerMode; label: string }[] = [
    { value: "unavailable", label: "Mark conflicts" },
    { value: "available", label: "Mark availability" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Selection mode"
      className="inline-flex rounded-md border bg-muted p-0.5 text-xs"
    >
      {options.map((opt) => {
        const active = opt.value === mode;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded px-2.5 py-1 font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
              disabled && "pointer-events-none opacity-50"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function getMemberTokenFromUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  return params.get("m") ?? undefined;
}

function ConfirmationView({
  editUrl,
  isUpdate,
}: {
  editUrl: string;
  isUpdate: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(editUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isUpdate ? "Response updated" : "Got it — thanks!"}</CardTitle>
        <CardDescription>
          Want to change your answer later? Bookmark or save this link — it
          opens your response pre-filled so you can edit it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1.5">
          <Label>Edit link</Label>
          <div className="flex gap-2">
            <Input
              value={editUrl}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copy}
              aria-label="Copy edit link"
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
