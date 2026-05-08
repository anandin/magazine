import { NextResponse } from "next/server";
import { generateIssue } from "@/lib/agents/editor";
import { supabaseServer, DEFAULT_USER_ID } from "@/lib/supabase/server";
import type { Mode } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

// Hit by Vercel Cron twice a day. Vercel sends `Authorization: Bearer <CRON_SECRET>`
// when the env var is set; we reject anything else so the route can't be
// triggered from the public internet.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const mode = (url.searchParams.get("mode") as Mode) || "real";
  if (mode !== "real" && mode !== "parallel") {
    return NextResponse.json({ error: "invalid mode" }, { status: 400 });
  }

  // At-least-once delivery guard: if an issue in this mode was created in the
  // last 4 hours for the default user, skip. Prevents double-runs on retry.
  const sb = supabaseServer();
  const since = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await sb
    .from("issues")
    .select("id")
    .eq("user_id", DEFAULT_USER_ID)
    .eq("mode", mode)
    .gte("created_at", since)
    .limit(1);
  if (recent && recent.length > 0) {
    return NextResponse.json({
      skipped: true,
      reason: "issue already generated in last 4h",
      issue_id: recent[0].id,
    });
  }

  try {
    const id = await generateIssue(mode, DEFAULT_USER_ID);
    return NextResponse.json({ ok: true, issue_id: id, mode });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
