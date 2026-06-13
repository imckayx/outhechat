import { NextResponse } from "next/server";

import { getPublicTrip } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await ctx.params;
  const trip = await getPublicTrip(tripId);

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  return NextResponse.json(trip);
}
