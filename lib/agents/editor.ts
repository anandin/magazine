import { anthropic, MODEL_FAST, WEB_SEARCH_TOOL } from "@/lib/anthropic";
import { getPreferences } from "@/lib/personalize";
import { listWritingPersonas } from "@/lib/agents/personas";
import { writeArticle } from "@/lib/agents/writer";
import { writeAds } from "@/lib/agents/ad-writer";
import { supabaseServer, DEFAULT_USER_ID } from "@/lib/supabase/server";
import type { Mode, Persona } from "@/lib/types";

interface Assignment {
  persona_slug: string;
  topic: string;
}

interface IssuePlan {
  title: string;
  cover_blurb: string;
  assignments: Assignment[];
}

const EDITOR_SYSTEM = `You are the Editor-in-Chief of a small magazine that mixes a local-newspaper feel with longer-form writing. You assemble each issue: pick the title, write a one-sentence cover blurb, and assign one story to each writer based on what's actually happening in the world right now. Use web_search to scan recent news, then make assignments.

OUTPUT FORMAT (strict): output only this XML, nothing else.
<issue>
<title>Issue title</title>
<blurb>One sentence cover blurb.</blurb>
<assignments>
<assign persona="persona-slug">Specific story angle for this writer (one sentence — concrete, not a topic dump).</assign>
... one per writer ...
</assignments>
</issue>`;

export async function planIssue(
  mode: Mode,
  userId: string = DEFAULT_USER_ID,
): Promise<IssuePlan> {
  const personas = await listWritingPersonas();
  const prefs = await getPreferences(userId);

  const userPrompt = `Plan today's issue. Mode: ${mode === "real" ? "REAL NEWS" : "PARALLEL UNIVERSE (creative writeups grounded in real events)"}.

Available writers:
${personas.map((p) => `- ${p.slug} (${p.section}): ${p.voice}. ${p.bio}`).join("\n")}

Reader preferences:
- favorite sections: ${prefs.preferred_sections.join(", ") || "none specified"}
- style notes: ${prefs.style_notes || "none"}
- expectations: ${prefs.expectations || "none"}

Use web_search to find real recent stories, then assign one to each writer (one story per writer) that fits their beat. ${
    mode === "parallel"
      ? "For parallel-universe mode, the assignment should still reference a real recent event the writer can build a divergence from."
      : ""
  }`;

  const response = await anthropic().messages.create({
    model: MODEL_FAST,
    max_tokens: 2048,
    system: EDITOR_SYSTEM,
    tools: [WEB_SEARCH_TOOL],
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  return parsePlan(text, personas);
}

function parsePlan(raw: string, personas: Persona[]): IssuePlan {
  const get = (tag: string) => {
    const m = raw.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
    return m ? m[1].trim() : "";
  };
  const title = get("title") || "Today's Issue";
  const blurb = get("blurb") || "";
  const block = get("assignments");
  const assignments: Assignment[] = [];
  const re = /<assign\s+persona="([^"]+)"\s*>([\s\S]*?)<\/assign>/gi;
  let m: RegExpExecArray | null;
  const validSlugs = new Set(personas.map((p) => p.slug));
  while ((m = re.exec(block)) !== null) {
    if (!validSlugs.has(m[1])) continue;
    assignments.push({ persona_slug: m[1], topic: m[2].trim() });
  }
  return { title, cover_blurb: blurb, assignments };
}

// Generate a full issue end-to-end: plan -> write all articles -> write ads -> persist.
export async function generateIssue(
  mode: Mode,
  userId: string = DEFAULT_USER_ID,
): Promise<string> {
  const sb = supabaseServer();
  const personas = await listWritingPersonas();
  const personaBySlug = new Map(personas.map((p) => [p.slug, p]));

  const plan = await planIssue(mode, userId);

  const { data: issue, error: issueErr } = await sb
    .from("issues")
    .insert({
      user_id: userId,
      mode,
      title: plan.title,
      cover_blurb: plan.cover_blurb,
      status: "draft",
    })
    .select("id")
    .single();
  if (issueErr || !issue) throw issueErr ?? new Error("Failed to create issue");

  // Write all articles in parallel — they're independent.
  await Promise.all(
    plan.assignments.map(async (a) => {
      const persona = personaBySlug.get(a.persona_slug);
      if (!persona) return;
      const written = await writeArticle({
        persona,
        topic: a.topic,
        mode,
        userId,
      });
      await sb.from("articles").insert({
        issue_id: issue.id,
        persona_id: persona.id,
        mode,
        section: persona.section,
        headline: written.headline,
        dek: written.dek,
        body_md: written.body_md,
        research_notes: written.research_notes,
        sources: written.sources,
      });
    }),
  );

  // Ads run alongside the editorial.
  await writeAds(issue.id, mode);

  await sb
    .from("issues")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", issue.id);

  return issue.id;
}
