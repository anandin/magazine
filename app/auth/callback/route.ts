import { NextResponse } from "next/server";
import { supabaseAuth } from "@/lib/supabase/auth";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

// OAuth providers redirect here with ?code=... after the user signs in.
// We exchange the code for a session, ensure a preferences row exists for
// this auth.uid(), and bounce them back to the magazine.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", url.origin));
  }

  const sb = await supabaseAuth();
  const { data, error } = await sb.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error?.message ?? "auth")}`, url.origin),
    );
  }

  // Seed a default preferences row for new users so the rest of the app
  // doesn't have to check for nulls.
  const admin = supabaseServer();
  await admin
    .from("preferences")
    .upsert(
      {
        user_id: data.user.id,
        name: data.user.user_metadata?.full_name ?? "",
        onboarded: false,
      },
      { onConflict: "user_id", ignoreDuplicates: true },
    );

  return NextResponse.redirect(new URL(next, url.origin));
}
