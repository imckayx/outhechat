import Link from "next/link";
import { notFound } from "next/navigation";

import { WindowsList } from "@/components/windows-list";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAppBaseUrl } from "@/lib/app-url";
import { getAdminView } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { tripId } = await params;
  const { t: token } = await searchParams;

  if (!token) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Admin link missing token</h1>
        <p className="text-sm text-muted-foreground">
          The link you opened is missing the <code>?t=…</code> token. Use the
          full admin link you got when you created the trip.
        </p>
      </main>
    );
  }

  const result = await getAdminView(tripId, token);

  if ("kind" in result && result.kind === "not-found") {
    notFound();
  }
  if ("kind" in result && result.kind === "forbidden") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Invalid admin link</h1>
        <p className="text-sm text-muted-foreground">
          The token in this link doesn&apos;t match this trip. Double-check
          the link you saved when you created the trip.
        </p>
      </main>
    );
  }

  const { trip, members, windows } = result as Exclude<
    typeof result,
    { kind: unknown }
  >;
  const shareUrl = buildShareUrl(trip.id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Admin view
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {trip.name}
        </h1>
        {trip.destination && (
          <p className="text-sm text-muted-foreground">{trip.destination}</p>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Responses</CardTitle>
          <CardDescription>
            {trip.responseCount} of {trip.expectedGroupSize} responded
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ResponseRoster
            members={members}
            expected={trip.expectedGroupSize}
          />
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Share link
            </p>
            <Link
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sm underline-offset-4 hover:underline"
            >
              {shareUrl}
            </Link>
          </div>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">
            Top windows
          </h2>
          <span className="text-xs text-muted-foreground">
            Ranked by group fit
          </span>
        </div>
        <WindowsList windows={windows} />
      </section>

      <footer className="flex flex-col gap-2">
        <Link
          href={shareUrl}
          className={buttonVariants({ variant: "outline" })}
          target="_blank"
          rel="noreferrer"
        >
          Open share view
        </Link>
      </footer>
    </main>
  );
}

function buildShareUrl(tripId: string): string {
  return `${getAppBaseUrl()}/trips/${tripId}`;
}

function ResponseRoster({
  members,
  expected,
}: {
  members: { name: string; blockedDates: string[] }[];
  expected: number;
}) {
  const slots: { name: string | null; blocked: number }[] = members.map((m) => ({
    name: m.name,
    blocked: m.blockedDates.length,
  }));
  for (let i = members.length; i < expected; i++) {
    slots.push({ name: null, blocked: 0 });
  }

  return (
    <ul className="flex flex-col divide-y rounded-md border">
      {slots.map((s, i) => (
        <li
          key={i}
          className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
        >
          {s.name ? (
            <>
              <span className="font-medium">{s.name}</span>
              <span className="text-xs text-muted-foreground">
                {s.blocked === 0
                  ? "no conflicts"
                  : `${s.blocked} ${s.blocked === 1 ? "day" : "days"} blocked`}
              </span>
            </>
          ) : (
            <>
              <span className="text-muted-foreground">Waiting…</span>
              <span className="text-xs text-muted-foreground">no response</span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
