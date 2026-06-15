import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppBaseUrl } from "@/lib/app-url";
import { isInRange } from "@/lib/dates";
import { getServerClient } from "@/lib/supabase";
import { generateMemberToken } from "@/lib/tokens";
import { submitAvailabilitySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = submitAvailabilitySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { name, blockedDates, memberToken } = parsed.data;
  const supabase = getServerClient();

  // Look up the trip first — we need its window for filtering, and we
  // need to reject submissions to a locked or missing trip.
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id, status, search_window_start, search_window_end")
    .eq("id", tripId)
    .maybeSingle();

  if (tripError || !trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }
  if (trip.status !== "open") {
    return NextResponse.json(
      { error: "This trip is no longer accepting responses" },
      { status: 409 }
    );
  }

  // Per TECH_SPEC: silently filter out blocked dates outside the
  // search window. De-dupe so the unique (member_id, date) constraint
  // can't trip on a duplicate input.
  const inWindow = Array.from(
    new Set(
      blockedDates.filter((d) =>
        isInRange(d, trip.search_window_start, trip.search_window_end)
      )
    )
  );

  let memberId: string;
  let resolvedToken: string;

  if (memberToken) {
    // Update path: validate the token against this trip's members.
    const { data: existing } = await supabase
      .from("members")
      .select("id, member_token")
      .eq("trip_id", tripId)
      .eq("member_token", memberToken)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: "Edit link is invalid or has expired" },
        { status: 403 }
      );
    }

    memberId = existing.id;
    resolvedToken = existing.member_token;

    const { error: nameError } = await supabase
      .from("members")
      .update({ name })
      .eq("id", memberId);
    if (nameError) {
      return NextResponse.json(
        { error: "Could not update response", details: nameError.message },
        { status: 500 }
      );
    }

    // Replace availability rows wholesale rather than diffing.
    const { error: delError } = await supabase
      .from("availability")
      .delete()
      .eq("member_id", memberId);
    if (delError) {
      return NextResponse.json(
        { error: "Could not update response", details: delError.message },
        { status: 500 }
      );
    }
  } else {
    // Create path: new member with a fresh token.
    const { customAlphabet } = await import("nanoid");
    const newMemberId = customAlphabet(
      "23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ",
      14
    )();
    resolvedToken = generateMemberToken();

    const { error: insertError } = await supabase.from("members").insert({
      id: newMemberId,
      trip_id: tripId,
      name,
      member_token: resolvedToken,
    });
    if (insertError) {
      return NextResponse.json(
        { error: "Could not save response", details: insertError.message },
        { status: 500 }
      );
    }
    memberId = newMemberId;
  }

  if (inWindow.length > 0) {
    const rows = inWindow.map((date) => ({ member_id: memberId, date }));
    const { error: availError } = await supabase
      .from("availability")
      .insert(rows);
    if (availError) {
      return NextResponse.json(
        { error: "Could not save availability", details: availError.message },
        { status: 500 }
      );
    }
  }

  const base = getAppBaseUrl(req);
  return NextResponse.json({
    memberId,
    memberToken: resolvedToken,
    editUrl: `${base}/trips/${tripId}?m=${resolvedToken}`,
  });
}
