import { NextResponse } from "next/server";
import { z } from "zod";
import { chatWithPersona } from "@/lib/agents/chat";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  message: z.string().min(1).max(4000),
  mode: z.enum(["real", "parallel"]),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  try {
    const { reply, persona } = await chatWithPersona({
      articleId: id,
      mode: body.mode,
      userMessage: body.message,
    });
    return NextResponse.json({
      reply,
      persona: { name: persona.name, slug: persona.slug },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
