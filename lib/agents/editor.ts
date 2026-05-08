import { anthropic, MODEL_FAST, WEB_SEARCH_TOOL } from "@/lib/anthropic";
import { getPreferences } from "@/lib/personalize";
import { listPersonas } from "@/lib/agents/personas";
import { writeArticle } from "@/lib/agents/writer";
import { writeAds } from "@/lib/agents/ad-writer";
import { supabaseServer, DEFAULT_USER_ID } from "@/lib/supabase/server";
import type { Persona } from "@/lib/types";

interface Assignment {
  agent_slug: string;
  topic: string;
}

interface IssuePlan {
  title: string;
  cover_blurb: string;
  assignments: Assignment[];
}

const EDITOR_SYSTEM = `You are the Editor-in-Chief of "The Cedar Hollow Sentinel" — a small magazine that mixes a local-newspaper feel with longer-form writing. You assemble each issue: pick the title, write a short cover blurb, and assign one story to each writer based on what's actually happening in the world right now. Use web_search to scan recent news.

Each writer drafts BOTH a real-news version and a Sigma-timeline (parallel-universe) version of their story; you only assign the underlying topic. Pick stories that are vivid, reported, and a little local where possible.

OUTPUT FORMAT (strict): output only this XML, nothing else.
<issue>
<title>Issue title (short, evocative)</title>
<blurb>One sentence cover blurb.</blurb>
<assignments>
<assign agent="agent-slug">A specific, concrete story angle for this writer (one sentence).</assign>
... one per writer ...
</assignments>
</issue>`;

export async function planIssue(
  userId: string = DEFAULT_USER_ID,
): Promise<IssuePlan> {
  const personas = await listPersonas();
  const prefs = await getPreferences(userId);

  const userPrompt = `Plan today's issue.

Available writers:
${personas
  .map(
    (p) =>
      `- ${p.slug} (${p.beat}): ${p.voice}. Method: ${p.method}.`,
  )
  .join("\n")}

Reader preferences:
- name: ${prefs.name || "(not set)"}
- city for local section: ${prefs.city}
- topics they want: ${prefs.topics.join(", ") || "(none specified)"}
- topics to AVOID: ${prefs.banned.join(", ") || "(none)"}
- expectations: ${prefs.expectations || "(none)"}
- local priority: ${Math.round(prefs.local_priority * 100)}%

Use web_search to find real recent stories from the last week, then assign one to each writer (one story per writer) that fits their beat. Lean toward ${prefs.city} where it makes sense and the local-priority is high.`;

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
  const re = /<assign\s+agent="([^"]+)"\s*>([\s\S]*?)<\/assign>/gi;
  let m: RegExpExecArray | null;
  const validSlugs = new Set(personas.map((p) => p.slug));
  while ((m = re.exec(block)) !== null) {
    if (!validSlugs.has(m[1])) continue;
    assignments.push({ agent_slug: m[1], topic: m[2].trim() });
  }
  return { title, cover_blurb: blurb, assignments };
}

// Generate a full issue end-to-end: plan -> write all articles -> write ads -> persist.
export async function generateIssue(
  userId: string = DEFAULT_USER_ID,
): Promise<string> {
  const sb = supabaseServer();
  const personas = await listPersonas();
  const personaBySlug = new Map(personas.map((p) => [p.slug, p]));

  const plan = await planIssue(userId);

  // Compute next issue number for the masthead.
  const { data: lastIssue } = await sb
    .from("issues")
    .select("issue_number")
    .eq("user_id", userId)
    .order("issue_number", { ascending: false })
    .limit(1);
  const nextNumber = (lastIssue?.[0]?.issue_number ?? 217) + 1;

  const { data: issue, error: issueErr } = await sb
    .from("issues")
    .insert({
      user_id: userId,
      issue_number: nextNumber,
      title: plan.title,
      cover_blurb: plan.cover_blurb,
      status: "draft",
    })
    .select("id")
    .single();
  if (issueErr || !issue) throw issueErr ?? new Error("Failed to create issue");

  // Articles in parallel — independent.
  await Promise.all(
    plan.assignments.map(async (a, position) => {
      const persona = personaBySlug.get(a.agent_slug);
      if (!persona) return;
      const written = await writeArticle({
        persona,
        topic: a.topic,
        userId,
      });
      await sb.from("articles").insert({
        issue_id: issue.id,
        agent_id: persona.id,
        section: persona.beat,
        position,
        real_kicker: written.real.kicker,
        real_headline: written.real.headline,
        real_dek: written.real.dek,
        real_body: written.real.body,
        real_sources: written.real.sources,
        real_research_notes: written.real.research_notes,
        parallel_kicker: written.parallel.kicker,
        parallel_headline: written.parallel.headline,
        parallel_dek: written.parallel.dek,
        parallel_body: written.parallel.body,
        parallel_sources: written.parallel.sources,
        parallel_research_notes: written.parallel.research_notes,
      });
    }),
  );

  await writeAds(issue.id);

  await sb
    .from("issues")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", issue.id);

  return issue.id;
}
