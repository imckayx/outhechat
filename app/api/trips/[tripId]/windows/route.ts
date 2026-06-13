import { NextResponse } from "next/server";

import { getAdminView } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await ctx.params;
  const url = new URL(req.url);
  const token = url.searchParams.get("t");

  if (!token) {
    return NextResponse.json(
      { error: "Missing admin token" },
      { status: 400 }
    );
  }

  const result = await getAdminView(tripId, token);

  if ("kind" in result) {
    if (result.kind === "not-found") {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(result);
}
