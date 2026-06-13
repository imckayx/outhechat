import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Two clients, one for each context:
//
// - getServerClient() uses the service-role key and bypasses RLS.
//   Only ever call this from server code (route handlers, server
//   components, server actions). Never expose the service-role key
//   to the browser.
//
// - getBrowserClient() uses the anon key. Safe to ship to the client,
//   but our schema has RLS enabled with no public policies, so it
//   cannot read or write tables directly. Reserved for future
//   client-side reads gated behind a policy.

let serverClient: SupabaseClient<Database> | null = null;
let browserClient: SupabaseClient<Database> | null = null;

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. ` +
        `Set it in .env.local for development and in your Vercel project settings for production.`
    );
  }
  return value;
}

export function getServerClient(): SupabaseClient<Database> {
  if (serverClient) return serverClient;
  const url = required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  serverClient = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serverClient;
}

export function getBrowserClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;
  const url = required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  browserClient = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return browserClient;
}
