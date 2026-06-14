import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getMemberByToken, getPublicTrip } from "@/lib/data";

import { RespondForm } from "./respond-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tripId: string }>;
}): Promise<Metadata> {
  const { tripId } = await params;
  const trip = await getPublicTrip(tripId);
  if (!trip) {
    return { title: "Trip not found — Group Trip Planner" };
  }

  const subtitle = trip.destination
    ? `${trip.destination} · ${trip.responseCount} of ${trip.expectedGroupSize} responded`
    : `${trip.responseCount} of ${trip.expectedGroupSize} responded`;

  const title = `${trip.name} — Group Trip Planner`;
  const description = `${subtitle}. Tap to mark dates you can't make it.`;

  return {
    title,
    description,
    openGraph: {
      title: trip.name,
      description: subtitle,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: trip.name,
      description: subtitle,
    },
  };
}

export default async function TripRespondPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const { tripId } = await params;
  const { m: memberToken } = await searchParams;

  const trip = await getPublicTrip(tripId);
  if (!trip) notFound();

  const prefill = memberToken
    ? await getMemberByToken(tripId, memberToken)
    : null;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {trip.name}
        </h1>
        {trip.destination && (
          <p className="text-sm text-muted-foreground">{trip.destination}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {trip.tripLengthDays}-day trip · between{" "}
          <FormattedDate iso={trip.searchWindowStart} /> and{" "}
          <FormattedDate iso={trip.searchWindowEnd} />
        </p>
        {trip.status !== "open" && (
          <p className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            This trip is no longer accepting responses.
          </p>
        )}
      </header>

      <RespondForm
        tripId={trip.id}
        searchWindowStart={trip.searchWindowStart}
        searchWindowEnd={trip.searchWindowEnd}
        allowedDaysOfWeek={trip.allowedDaysOfWeek}
        prefill={prefill}
        disabled={trip.status !== "open"}
      />
    </main>
  );
}

function FormattedDate({ iso }: { iso: string }) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return (
    <span>
      {date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}
    </span>
  );
}
