import { NextResponse } from "next/server";
import { generateIssue } from "@/lib/agents/editor";
import { DEFAULT_USER_ID } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Article generation runs many model calls in parallel — give it room.
export const maxDuration = 300;

export async function POST() {
  try {
    const id = await generateIssue(DEFAULT_USER_ID);
    return NextResponse.json({ issue_id: id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
