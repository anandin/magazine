import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer, DEFAULT_USER_ID } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Body = z.object({
  kind: z.enum(["article", "persona"]),
  target_id: z.string().uuid(),
  // article-only:
  mode: z.enum(["real", "parallel"]).optional(),
  verdict: z.enum(["up", "down", "more"]).optional(),
  style_score: z.number().int().min(1).max(5).optional(),
  storytelling_score: z.number().int().min(1).max(5).optional(),
  format_score: z.number().int().min(1).max(5).optional(),
  content_score: z.number().int().min(1).max(5).optional(),
  relevance_score: z.number().int().min(1).max(5).optional(),
  // persona-only:
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const sb = supabaseServer();
  if (body.kind === "article") {
    if (!body.mode) {
      return NextResponse.json(
        { error: "mode required for article feedback" },
        { status: 400 },
      );
    }
    const { error } = await sb.from("article_feedback").insert({
      user_id: DEFAULT_USER_ID,
      article_id: body.target_id,
      mode: body.mode,
      verdict: body.verdict,
      style_score: body.style_score,
      storytelling_score: body.storytelling_score,
      format_score: body.format_score,
      content_score: body.content_score,
      relevance_score: body.relevance_score,
      notes: body.notes ?? "",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await sb.from("persona_feedback").insert({
      user_id: DEFAULT_USER_ID,
      persona_id: body.target_id,
      rating: body.rating,
      notes: body.notes ?? "",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
