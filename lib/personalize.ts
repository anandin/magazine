import { supabaseServer, DEFAULT_USER_ID } from "@/lib/supabase/server";
import type { Preferences } from "@/lib/types";

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
  return {
    user_id: userId,
    preferred_sections: [],
    style_notes: "",
    expectations: "",
    default_mode: "real",
  };
}

// Pull recent feedback notes for a persona so we can fold them into the next prompt.
export async function recentFeedbackForPersona(
  personaId: string,
  userId: string = DEFAULT_USER_ID,
  limit = 5,
): Promise<string[]> {
  const sb = supabaseServer();
  const { data: articles } = await sb
    .from("articles")
    .select("id")
    .eq("persona_id", personaId)
    .order("created_at", { ascending: false })
    .limit(20);
  const ids = (articles ?? []).map((a) => a.id);
  if (ids.length === 0) return [];
  const { data: fb } = await sb
    .from("article_feedback")
    .select("liked, notes, style_score, storytelling_score, content_score, relevance_score")
    .eq("user_id", userId)
    .in("article_id", ids)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (fb ?? [])
    .map((row) => {
      const tags: string[] = [];
      if (row.liked === true) tags.push("liked");
      if (row.liked === false) tags.push("disliked");
      const scores = [
        ["style", row.style_score],
        ["story", row.storytelling_score],
        ["content", row.content_score],
        ["relevance", row.relevance_score],
      ]
        .filter(([, v]) => typeof v === "number")
        .map(([k, v]) => `${k}:${v}/5`)
        .join(" ");
      const note = row.notes?.trim();
      return [tags.join(","), scores, note].filter(Boolean).join(" — ");
    })
    .filter(Boolean);
}

export function preferencesBlock(prefs: Preferences, feedback: string[]): string {
  const lines = ["READER PREFERENCES:"];
  if (prefs.preferred_sections.length)
    lines.push(`- favorite sections: ${prefs.preferred_sections.join(", ")}`);
  if (prefs.style_notes) lines.push(`- style notes: ${prefs.style_notes}`);
  if (prefs.expectations) lines.push(`- expectations: ${prefs.expectations}`);
  if (feedback.length) {
    lines.push("RECENT FEEDBACK ON YOUR WORK FROM THIS READER:");
    for (const f of feedback) lines.push(`- ${f}`);
    lines.push("Adjust accordingly without abandoning your voice.");
  }
  return lines.join("\n");
}
