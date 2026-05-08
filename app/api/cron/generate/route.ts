import { NextResponse } from "next/server";
import { generateIssue } from "@/lib/agents/editor";
import { supabaseServer, DEFAULT_USER_ID } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

// Hit by Vercel Cron twice a day (morning + evening). Vercel sends
// `Authorization: Bearer <CRON_SECRET>` when the env var is set; we reject
// anything else so the route can't be triggered from the public internet.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // At-least-once delivery guard: if an issue was created in the last 4 hours,
  // skip. Prevents double-runs on retry.
  const sb = supabaseServer();
  const since = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await sb
    .from("issues")
    .select("id")
    .eq("user_id", DEFAULT_USER_ID)
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
    const id = await generateIssue(DEFAULT_USER_ID);
    return NextResponse.json({ ok: true, issue_id: id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
