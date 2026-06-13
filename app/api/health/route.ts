import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

// Smoke-test route. Verifies the server can connect to Supabase and
// query the schema created by supabase/migrations/0001_init.sql.
// Safe to leave shipped — it returns counts only, no secrets.

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getServerClient();
    const { count, error } = await supabase
      .from("trips")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, tripCount: count ?? 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
