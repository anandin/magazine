import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer, DEFAULT_USER_ID } from "@/lib/supabase/server";
import { getPreferences } from "@/lib/personalize";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().max(120).default(""),
  city: z.string().max(120).default("Cedar Hollow"),
  topics: z.array(z.string()).default([]),
  tone: z
    .enum(["as-written", "dry", "witty", "deep-dive", "snappy"])
    .default("as-written"),
  length: z.enum(["short", "medium", "long"]).default("medium"),
  visual_weight: z
    .enum(["text-heavy", "balanced", "image-heavy"])
    .default("balanced"),
  reading_level: z
    .enum(["skim", "engaged-adult", "wonk"])
    .default("engaged-adult"),
  local_priority: z.number().min(0).max(1).default(0.6),
  banned: z.array(z.string()).default([]),
  expectations: z.string().max(2000).default(""),
  default_mode: z.enum(["real", "parallel"]).default("real"),
  onboarded: z.boolean().default(true),
});

export async function GET() {
  const prefs = await getPreferences();
  return NextResponse.json(prefs);
}

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const sb = supabaseServer();
  const { error } = await sb.from("preferences").upsert({
    user_id: DEFAULT_USER_ID,
    ...body,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
