import { anthropic, WEB_SEARCH_TOOLS } from "@/lib/anthropic";
import {
  getPreferences,
  preferencesBlock,
  recentFeedbackForPersona,
} from "@/lib/personalize";
import type {
  ArticleVariant,
  Mode,
  Persona,
  Source,
} from "@/lib/types";

interface WriteArgs {
  persona: Persona;
  topic: string;
  userId: string;
}

export interface WrittenArticle {
  real: ArticleVariant;
  parallel: ArticleVariant;
}

const REGISTER_INSTRUCTION = `You will produce TWO drafts of the same story.

  REAL — verifiably true. Use web_search. Cite sources you actually found, with real URLs.
  PARALLEL (Sigma edition) — start from the same reported events, then deliberately diverge: pick one plausible alternative (a vote that went the other way, a body that doesn't exist in our world, a system that worked differently) and report the consequences as if you were a journalist in that timeline. Sign as "{parallel_handle}". Keep the prose grounded; the speculation lives in the premise, not the language.

CRITICAL: both drafts must read like YOUR specific writing — not generic-magazine prose. Your voice anchor and structural rules below are non-negotiable. They override any habit toward smooth, balanced, "well-written" copy. Specificity over polish.`;

const OUTPUT_INSTRUCTION = `OUTPUT FORMAT (strict): emit exactly this XML, nothing else after the closing </piece> tag.

<piece>
<real>
<kicker>SHORT ALL-CAPS KICKER · LOCATION</kicker>
<headline>One headline in your specific voice.</headline>
<dek>One-sentence subhead.</dek>
<body>
Paragraph.
||
Paragraph.
||
Paragraph.
</body>
<research_notes>2-4 sentences of your private notes — what you found, what surprised you, what you cut.</research_notes>
<sources>
1. Source title — https://url
2. Source title — https://url
</sources>
</real>
<parallel>
<kicker>SHORT ALL-CAPS KICKER · LOCATION</kicker>
<headline>Headline in your voice, in the Sigma timeline.</headline>
<dek>One-sentence subhead naming the divergence point.</dek>
<body>
Paragraph.
||
Paragraph.
</body>
<research_notes>2-4 sentences of your notes about the divergence and what stayed real.</research_notes>
<sources>
1. Real-world anchor — https://url
</sources>
</parallel>
</piece>`;

export async function writeArticle(args: WriteArgs): Promise<WrittenArticle> {
  const { persona, topic, userId } = args;
  const prefs = await getPreferences(userId);
  const feedback = await recentFeedbackForPersona(persona.id, userId);

  const system = [
    persona.system_prompt,
    "",
    `Your beat: ${persona.beat}. Your method: ${persona.method}.`,
    `When filing the parallel draft, sign as: ${persona.parallel_handle}.`,
    "",
    persona.voice_sample || "",
    "",
    persona.structural_rules || "",
    "",
    REGISTER_INSTRUCTION.replace("{parallel_handle}", persona.parallel_handle),
    "",
    preferencesBlock(prefs, feedback),
    "",
    OUTPUT_INSTRUCTION,
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = `Today's assignment, ${persona.name}: ${topic}

Research the topic with web_search. Then file BOTH drafts in YOUR voice — not the magazine's house voice, yours. Re-read the structural rules before you start the second paragraph of each draft. Cut anything that sounds like it could have been written by another reporter on this masthead.`;

  // Per-writer model + sampling parameters. Voss runs cold on Opus; Marigold
  // runs hot on Haiku; Okafor is loose on Opus; etc. The whole point is that
  // these dimensions vary so the prose varies.
  //
  // Opus 4.7 has deprecated `temperature`, so for that model we vary only via
  // top_p and the structural rules. Sonnet/Haiku still take both.
  const model = persona.model_id || "claude-opus-4-7";
  const supportsTemperature = !/opus-4-7/i.test(model);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = {
    model,
    max_tokens: 6000,
    top_p: persona.top_p ?? 1.0,
    system,
    tools: WEB_SEARCH_TOOLS,
    messages: [{ role: "user", content: userPrompt }],
  };
  if (supportsTemperature) {
    params.temperature = persona.temperature ?? 0.7;
  }
  const response = await anthropic().messages.create(params);

  const text = response.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("\n");

  return parsePiece(text);
}

function tag(raw: string, name: string): string {
  const m = raw.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].trim() : "";
}

function parseSources(block: string): Source[] {
  const out: Source[] = [];
  for (const line of block.split(/\n/)) {
    const m = line.match(/^\s*\d+\.\s*(.+?)\s+[—–-]\s+(https?:\/\/\S+)/);
    if (m) out.push({ title: m[1].trim(), url: m[2].trim() });
  }
  return out;
}

function parseBody(block: string): string[] {
  return block
    .split(/\n*\|\|\n*/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function parseVariant(block: string): ArticleVariant {
  return {
    kicker: tag(block, "kicker"),
    headline: tag(block, "headline").replace(/^["']|["']$/g, ""),
    dek: tag(block, "dek"),
    body: parseBody(tag(block, "body")),
    sources: parseSources(tag(block, "sources")),
    research_notes: tag(block, "research_notes"),
  };
}

function parsePiece(raw: string): WrittenArticle {
  const real = tag(raw, "real");
  const parallel = tag(raw, "parallel");
  const realV = parseVariant(real);
  const parallelV = parseVariant(parallel);
  // Defensive fallbacks so a malformed variant doesn't sink the whole issue.
  if (!realV.headline) realV.headline = "Untitled";
  if (!parallelV.headline)
    parallelV.headline = realV.headline + " (Sigma timeline)";
  if (realV.body.length === 0) realV.body = [raw];
  if (parallelV.body.length === 0) parallelV.body = realV.body.slice(0, 2);
  return { real: realV, parallel: parallelV };
}

export function variantOf(
  article: {
    real_kicker: string | null;
    real_headline: string;
    real_dek: string | null;
    real_body: string[];
    real_sources: Source[];
    real_research_notes: string;
    parallel_kicker: string | null;
    parallel_headline: string;
    parallel_dek: string | null;
    parallel_body: string[];
    parallel_sources: Source[];
    parallel_research_notes: string;
  },
  mode: Mode,
): ArticleVariant {
  if (mode === "real") {
    return {
      kicker: article.real_kicker ?? "",
      headline: article.real_headline,
      dek: article.real_dek ?? "",
      body: article.real_body ?? [],
      sources: article.real_sources ?? [],
      research_notes: article.real_research_notes ?? "",
    };
  }
  return {
    kicker: article.parallel_kicker ?? "",
    headline: article.parallel_headline,
    dek: article.parallel_dek ?? "",
    body: article.parallel_body ?? [],
    sources: article.parallel_sources ?? [],
    research_notes: article.parallel_research_notes ?? "",
  };
}
