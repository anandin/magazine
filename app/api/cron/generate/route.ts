import { NextResponse } from "next/server";
import { generateIssue } from "@/lib/agents/editor";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

// Vercel Cron hits this twice a day. We only generate for users who have
// explicitly opted in via auto_publish=true (premium feature) and haven't
// already received an issue in the last 4 hours.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sb = supabaseServer();
  const { data: optedIn } = await sb
    .from("preferences")
    .select("user_id, tier")
    .eq("auto_publish", true)
    .eq("tier", "premium");

  if (!optedIn || optedIn.length === 0) {
    return NextResponse.json({ ok: true, generated: 0, reason: "no opted-in users" });
  }

  const since = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  const results: Array<{ user_id: string; issue_id?: string; skipped?: boolean }> = [];

  // Sequential; running issue generation in parallel against many users
  // would saturate Anthropic rate limits.
  for (const row of optedIn) {
    const userId = row.user_id as string;
    const { data: recent } = await sb
      .from("issues")
      .select("id")
      .eq("user_id", userId)
      .gte("created_at", since)
      .limit(1);
    if (recent && recent.length > 0) {
      results.push({ user_id: userId, skipped: true });
      continue;
    }
    try {
      const id = await generateIssue(userId);
      results.push({ user_id: userId, issue_id: id });
    } catch (e) {
      console.warn(`[cron] generate failed for ${userId}:`, e);
      results.push({ user_id: userId, skipped: true });
    }
  }

  return NextResponse.json({ ok: true, generated: results.length, results });
}
