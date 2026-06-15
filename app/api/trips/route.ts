import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppBaseUrl } from "@/lib/app-url";
import { getServerClient } from "@/lib/supabase";
import { generateAdminToken, generateTripId } from "@/lib/tokens";
import { createTripSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = createTripSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const tripId = generateTripId();
  const adminToken = generateAdminToken();

  const supabase = getServerClient();
  const { error } = await supabase.from("trips").insert({
    id: tripId,
    admin_token: adminToken,
    name: input.name,
    destination: input.destination ?? null,
    trip_length_days: input.tripLengthDays,
    search_window_start: input.searchWindowStart,
    search_window_end: input.searchWindowEnd,
    allowed_days_of_week: input.allowedDaysOfWeek,
    expected_group_size: input.expectedGroupSize,
    context: input.context ?? null,
  });

  if (error) {
    return NextResponse.json(
      { error: "Could not create trip", details: error.message },
      { status: 500 }
    );
  }

  const base = getAppBaseUrl(req);
  return NextResponse.json({
    tripId,
    adminToken,
    shareUrl: `${base}/trips/${tripId}`,
    adminUrl: `${base}/trips/${tripId}/admin?t=${adminToken}`,
  });
}
