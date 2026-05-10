import { NextResponse } from "next/server";
import { generateIssue } from "@/lib/agents/editor";
import { requireUserId } from "@/lib/supabase/auth";
import { bumpAndCheck } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const decision = await bumpAndCheck(userId, "regen");
  if (!decision.ok) {
    return NextResponse.json(
      {
        error: "daily limit reached",
        tier: decision.tier,
        limit: decision.limit,
        remaining: 0,
      },
      { status: 429 },
    );
  }

  try {
    const id = await generateIssue(userId);
    return NextResponse.json({
      issue_id: id,
      remaining: decision.remaining,
      tier: decision.tier,
    });
  } catch (e) {
    // Surface the real error — "unknown error" was hiding Supabase RLS
    // rejections and Anthropic 4xx responses, which made debugging hard.
    const msg =
      e instanceof Error
        ? e.message
        : typeof e === "object" && e !== null
          ? JSON.stringify(e)
          : String(e);
    console.error("[generate] failed:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
