"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { CalendarPicker } from "@/components/calendar-picker";
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
import type { DayOfWeek } from "@/lib/types";

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
  const [blockedDates, setBlockedDates] = useState<string[]>(
    prefill?.blockedDates ?? []
  );

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
        <Label>Tap the dates you can&apos;t make it</Label>
        <p className="text-xs text-muted-foreground">
          Default is available. Only mark conflicts.
        </p>
        <div className="rounded-lg border p-3 sm:p-4">
          <CalendarPicker
            searchWindowStart={searchWindowStart}
            searchWindowEnd={searchWindowEnd}
            allowedDaysOfWeek={allowedDaysOfWeek}
            blockedDates={blockedDates}
            onChange={setBlockedDates}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {blockedDates.length === 0
            ? "You haven't marked any conflicts."
            : `${blockedDates.length} ${
                blockedDates.length === 1 ? "day" : "days"
              } marked unavailable`}
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
