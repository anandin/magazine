import { NextResponse } from "next/server";
import { z } from "zod";
import { generateIssue } from "@/lib/agents/editor";
import { DEFAULT_USER_ID } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Article generation runs many model calls in parallel — give it room.
export const maxDuration = 300;

const Body = z.object({
  mode: z.enum(["real", "parallel"]).default("real"),
});

export async function POST(req: Request) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  try {
    const id = await generateIssue(parsed.mode, DEFAULT_USER_ID);
    return NextResponse.json({ issue_id: id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
