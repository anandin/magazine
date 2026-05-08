import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client using the service role key.
// Used by API routes and server components for trusted reads/writes.
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export const DEFAULT_USER_ID =
  process.env.DEFAULT_USER_ID ?? "00000000-0000-0000-0000-000000000001";
