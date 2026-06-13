"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const DAY_LABELS: { value: number; label: string }[] = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

type CreateTripResponse = {
  tripId: string;
  adminToken: string;
  shareUrl: string;
  adminUrl: string;
};

type FieldErrors = Partial<Record<string, string>>;

// Extract a per-field message from zod's treeified error structure.
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

export function CreateTripForm() {
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [tripLengthDays, setTripLengthDays] = useState("4");
  const [searchWindowStart, setSearchWindowStart] = useState("");
  const [searchWindowEnd, setSearchWindowEnd] = useState("");
  const [expectedGroupSize, setExpectedGroupSize] = useState("4");
  const [allowedDays, setAllowedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [context, setContext] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<CreateTripResponse | null>(null);

  function toggleDay(value: number) {
    setAllowedDays((prev) =>
      prev.includes(value)
        ? prev.filter((d) => d !== value)
        : [...prev, value].sort((a, b) => a - b)
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTopError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          destination: destination || undefined,
          tripLengthDays: Number(tripLengthDays),
          searchWindowStart,
          searchWindowEnd,
          allowedDaysOfWeek: allowedDays,
          expectedGroupSize: Number(expectedGroupSize),
          context: context || undefined,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setTopError(body.error ?? "Could not create trip");
        if (body.issues) {
          setFieldErrors(flattenErrors(body.issues));
        }
        return;
      }

      setResult(body as CreateTripResponse);
    } catch {
      setTopError("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return <ShareLinks result={result} />;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <Field
        id="name"
        label="Trip name"
        error={fieldErrors.name}
        required
      >
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Lisbon 2026"
          maxLength={100}
          required
        />
      </Field>

      <Field
        id="destination"
        label="Destination"
        hint="Optional"
        error={fieldErrors.destination}
      >
        <Input
          id="destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Lisbon, Portugal"
          maxLength={100}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="tripLengthDays"
          label="Trip length (days)"
          error={fieldErrors.tripLengthDays}
          required
        >
          <Input
            id="tripLengthDays"
            type="number"
            inputMode="numeric"
            min={1}
            value={tripLengthDays}
            onChange={(e) => setTripLengthDays(e.target.value)}
            required
          />
        </Field>

        <Field
          id="expectedGroupSize"
          label="Group size"
          error={fieldErrors.expectedGroupSize}
          required
        >
          <Input
            id="expectedGroupSize"
            type="number"
            inputMode="numeric"
            min={1}
            value={expectedGroupSize}
            onChange={(e) => setExpectedGroupSize(e.target.value)}
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="searchWindowStart"
          label="Earliest possible date"
          error={fieldErrors.searchWindowStart}
          required
        >
          <Input
            id="searchWindowStart"
            type="date"
            value={searchWindowStart}
            onChange={(e) => setSearchWindowStart(e.target.value)}
            required
          />
        </Field>

        <Field
          id="searchWindowEnd"
          label="Latest possible date"
          error={fieldErrors.searchWindowEnd}
          required
        >
          <Input
            id="searchWindowEnd"
            type="date"
            value={searchWindowEnd}
            onChange={(e) => setSearchWindowEnd(e.target.value)}
            min={searchWindowStart || undefined}
            required
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Allowed days of week</Label>
        <p className="text-xs text-muted-foreground">
          For a long-weekend trip, pick only Thu–Sun. Default is all 7.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {DAY_LABELS.map(({ value, label }) => {
            const active = allowedDays.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleDay(value)}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-foreground hover:bg-accent"
                )}
                aria-pressed={active}
              >
                {label}
              </button>
            );
          })}
        </div>
        {fieldErrors.allowedDaysOfWeek && (
          <p className="text-xs text-destructive">
            {fieldErrors.allowedDaysOfWeek}
          </p>
        )}
      </div>

      <Field
        id="context"
        label="Notes"
        hint="Optional — reserved for future smarter suggestions"
        error={fieldErrors.context}
      >
        <Textarea
          id="context"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="e.g. 2 of us have kids, prefer not the week of July 4"
          maxLength={2000}
          rows={3}
        />
      </Field>

      {topError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {topError}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Creating…" : "Create trip"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
        {hint && (
          <span className="text-xs text-muted-foreground">{hint}</span>
        )}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ShareLinks({ result }: { result: CreateTripResponse }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Trip created</CardTitle>
          <CardDescription>
            Send the share link to your group. Keep the admin link to
            yourself — it lets you see all responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <LinkRow label="Share with group" url={result.shareUrl} />
          <LinkRow label="Admin link (private)" url={result.adminUrl} />
        </CardContent>
      </Card>
    </div>
  );
}

function LinkRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Older browsers / restricted contexts: fall back to selecting the text.
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input value={url} readOnly onFocus={(e) => e.currentTarget.select()} />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={copy}
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
    </div>
  );
}
