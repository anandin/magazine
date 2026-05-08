import { anthropic, MODEL, WEB_SEARCH_TOOL } from "@/lib/anthropic";
import {
  getPreferences,
  preferencesBlock,
  recentFeedbackForPersona,
} from "@/lib/personalize";
import type { Mode, Persona, Source } from "@/lib/types";

interface WriteArgs {
  persona: Persona;
  topic: string;
  mode: Mode;
  userId: string;
}

interface WrittenArticle {
  headline: string;
  dek: string;
  body_md: string;
  sources: Source[];
  research_notes: string;
}

const REAL_MODE_INSTRUCTION = `MODE: REAL NEWS.
Report what is verifiably true. Use web_search to gather sources. Cite sources inline as [1], [2] referring to the sources list. Do not invent quotes or facts. If a claim cannot be sourced, omit or hedge it.`;

const PARALLEL_MODE_INSTRUCTION = `MODE: PARALLEL UNIVERSE.
Start from the actual events you found via web_search. Then deliberately diverge: pick one plausible alternative — a decision that went the other way, a person who showed up where they didn't, a system that worked differently — and report the consequences as if you were a journalist in that timeline. Keep the prose grounded; the speculation lives in the premise, not the prose. Note the divergence point in the dek. Sources should still cite the real-world events you built from.`;

const OUTPUT_INSTRUCTION = `OUTPUT FORMAT (strict): Output exactly these XML tags, in order, nothing else after the closing </article> tag:
<article>
<research_notes>2-4 sentences of your private notes — what you learned, what surprised you, what you decided to focus on.</research_notes>
<headline>The headline. No quotes around it.</headline>
<dek>One-sentence subhead under the headline.</dek>
<body>
The full article body in markdown. 500-900 words. Use ## for section breaks if needed. Cite sources inline as [1], [2] etc.
</body>
<sources>
1. Title — https://url
2. Title — https://url
</sources>
</article>`;

export async function writeArticle(args: WriteArgs): Promise<WrittenArticle> {
  const { persona, topic, mode, userId } = args;
  const prefs = await getPreferences(userId);
  const feedback = await recentFeedbackForPersona(persona.id, userId);

  const system = [
    persona.system_prompt,
    "",
    mode === "real" ? REAL_MODE_INSTRUCTION : PARALLEL_MODE_INSTRUCTION,
    "",
    preferencesBlock(prefs, feedback),
    "",
    OUTPUT_INSTRUCTION,
  ].join("\n");

  const userPrompt = `Topic for your ${persona.section} piece: ${topic}

Research the topic using web_search before writing. Then write the article in your voice.`;

  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 4096,
    system,
    tools: [WEB_SEARCH_TOOL],
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .filter((block): block is { type: "text"; text: string } => block.type === "text")
    .map((b) => b.text)
    .join("\n");

  return parseArticle(text);
}

function parseArticle(raw: string): WrittenArticle {
  const get = (tag: string) => {
    const m = raw.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
    return m ? m[1].trim() : "";
  };
  const research_notes = get("research_notes");
  const headline = get("headline").replace(/^["']|["']$/g, "");
  const dek = get("dek");
  const body_md = get("body");
  const sourcesBlock = get("sources");
  const sources: Source[] = [];
  for (const line of sourcesBlock.split(/\n/)) {
    const m = line.match(/^\s*\d+\.\s*(.+?)\s+[—–-]\s+(https?:\/\/\S+)/);
    if (m) sources.push({ title: m[1].trim(), url: m[2].trim() });
  }
  if (!headline || !body_md) {
    // Fallback: return whatever we got so we don't lose work; surface raw text as body.
    return {
      research_notes: research_notes || "(parser fallback)",
      headline: headline || "Untitled",
      dek: dek || "",
      body_md: body_md || raw,
      sources,
    };
  }
  return { research_notes, headline, dek, body_md, sources };
}

