import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const sb = supabaseServer();
  const [{ data: issue }, { data: articles }, { data: ads }] = await Promise.all([
    sb.from("issues").select("*").eq("id", id).maybeSingle(),
    sb
      .from("articles")
      .select("*")
      .eq("issue_id", id)
      .order("position", { ascending: true }),
    sb
      .from("ads")
      .select("*")
      .eq("issue_id", id)
      .order("position", { ascending: true }),
  ]);
  if (!issue) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ issue, articles: articles ?? [], ads: ads ?? [] });
}
