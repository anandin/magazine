import { supabaseServer, DEFAULT_USER_ID } from "@/lib/supabase/server";
import type { Mode, Preferences } from "@/lib/types";

const DEFAULTS: Omit<Preferences, "user_id"> = {
  name: "",
  city: "Cedar Hollow",
  topics: [
    "Politics & City Hall",
    "Technology & AI Policy",
    "Science & Health",
    "Culture",
  ],
  tone: "as-written",
  length: "medium",
  visual_weight: "balanced",
  reading_level: "engaged-adult",
  local_priority: 0.6,
  banned: [],
  expectations: "",
  default_mode: "real",
  onboarded: false,
  tier: "free",
  auto_publish: false,
};

export async function getPreferences(
  userId: string = DEFAULT_USER_ID,
): Promise<Preferences> {
  const sb = supabaseServer();
  const { data } = await sb
    .from("preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return data as Preferences;
  return { user_id: userId, ...DEFAULTS };
}

// Recent feedback notes for a persona feed back into the next prompt for that
// persona. We pull both real- and parallel-mode feedback, since the writer
// drafts both registers each issue.
export async function recentFeedbackForPersona(
  personaId: string,
  userId: string = DEFAULT_USER_ID,
  limit = 6,
): Promise<string[]> {
  const sb = supabaseServer();
  const { data: articles } = await sb
    .from("articles")
    .select("id")
    .eq("agent_id", personaId)
    .order("created_at", { ascending: false })
    .limit(20);
  const ids = (articles ?? []).map((a) => a.id);
  if (ids.length === 0) return [];
  const { data: fb } = await sb
    .from("article_feedback")
    .select(
      "mode, verdict, notes, style_score, storytelling_score, format_score, content_score, relevance_score",
    )
    .eq("user_id", userId)
    .in("article_id", ids)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (fb ?? [])
    .map((row) => {
      const tags: string[] = [`(${row.mode})`];
      if (row.verdict === "up") tags.push("worth it");
      if (row.verdict === "down") tags.push("skip next time");
      if (row.verdict === "more") tags.push("more like this");
      const scores = [
        ["style", row.style_score],
        ["story", row.storytelling_score],
        ["format", row.format_score],
        ["content", row.content_score],
        ["relevance", row.relevance_score],
      ]
        .filter(([, v]) => typeof v === "number")
        .map(([k, v]) => `${k}:${v}/5`)
        .join(" ");
      const note = (row.notes ?? "").trim();
      return [tags.join(" "), scores, note].filter(Boolean).join(" — ");
    })
    .filter(Boolean);
}

const TONE_HINT: Record<Preferences["tone"], string> = {
  "as-written": "Trust your own voice; the reader has not asked you to change it.",
  dry: "Strip ornament. Plain words, short clauses, facts before color.",
  witty: "Voice forward. Reach for the unexpected image; earn it once per piece.",
  "deep-dive": "Show your work. Bring the reporting trail into the prose.",
  snappy: "Move. Short paragraphs. End every section with momentum.",
};
const LENGTH_HINT: Record<Preferences["length"], string> = {
  short: "Aim for ~350-500 words.",
  medium: "Aim for ~600-800 words.",
  long: "Aim for ~900-1200 words.",
};
const READING_HINT: Record<Preferences["reading_level"], string> = {
  skim: "Front-load the news. Tight paragraphs, plain language, no jargon.",
  "engaged-adult":
    "Assume an attentive reader. Define terms once, then trust them.",
  wonk: "Assume domain familiarity. Cite the precise mechanism, not the vibe.",
};

export function preferencesBlock(
  prefs: Preferences,
  feedback: string[],
): string {
  const lines = ["READER PREFERENCES:"];
  if (prefs.name) lines.push(`- reader: ${prefs.name}`);
  if (prefs.city) lines.push(`- local city: ${prefs.city}`);
  if (prefs.topics.length)
    lines.push(`- topics they want: ${prefs.topics.join(", ")}`);
  if (prefs.banned.length)
    lines.push(`- topics to AVOID: ${prefs.banned.join(", ")}`);
  lines.push(`- tone: ${prefs.tone} — ${TONE_HINT[prefs.tone]}`);
  lines.push(`- length: ${prefs.length} — ${LENGTH_HINT[prefs.length]}`);
  lines.push(
    `- reading level: ${prefs.reading_level} — ${READING_HINT[prefs.reading_level]}`,
  );
  lines.push(
    `- local priority: ${Math.round(prefs.local_priority * 100)}% (how much of the issue should bend toward ${prefs.city || "their city"})`,
  );
  if (prefs.expectations)
    lines.push(`- expectations: ${prefs.expectations}`);

  if (feedback.length) {
    lines.push("RECENT FEEDBACK FROM THIS READER:");
    for (const f of feedback) lines.push(`- ${f}`);
    lines.push("Adjust accordingly without abandoning your voice.");
  }
  return lines.join("\n");
}

export function mastheadDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function modeLabel(mode: Mode): string {
  return mode === "parallel" ? "Sigma edition" : "Real news";
}
