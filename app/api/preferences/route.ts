import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer, DEFAULT_USER_ID } from "@/lib/supabase/server";
import { getPreferences } from "@/lib/personalize";

export const runtime = "nodejs";

const Body = z.object({
  preferred_sections: z.array(z.string()).default([]),
  style_notes: z.string().max(2000).default(""),
  expectations: z.string().max(2000).default(""),
  default_mode: z.enum(["real", "parallel"]).default("real"),
});

export async function GET() {
  const prefs = await getPreferences();
  return NextResponse.json(prefs);
}

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
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
