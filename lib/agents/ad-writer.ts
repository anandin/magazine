import { anthropic, MODEL_FAST } from "@/lib/anthropic";
import { supabaseServer, DEFAULT_USER_ID } from "@/lib/supabase/server";
import { getPreferences } from "@/lib/personalize";
import { fetchRealClassifieds } from "@/lib/agents/reddit-classifieds";

interface DisplayDraft {
  headline: string;
  tagline: string;
  body: string;
  meta: string;
}
interface DisplayPair {
  real: DisplayDraft;
  parallel: DisplayDraft;
}
interface ClassifiedPair {
  category: string;
  real_body: string;
  parallel_body: string;
}

const AD_DESK_PROMPT_BASE = `You are the Ad Desk for a small newspaper-style magazine. You write two registers of every ad: REAL (warm, neighborly, plausible local advertiser) and PARALLEL (the Sigma timeline — the same business, slightly off-kilter; "Joe's Diner-Mirrorside", "Calloway Books, Verso"). Voice stays warm even when the world bends.`;

function displayPromptFor(city: string): string {
  return `Write 4 display ads for today's issue. The reader is in ${city}. Each ad MUST be a plausible, warm, locally-anchored business in ${city} — invent the business, but anchor it on a REAL named neighborhood or street in ${city} (e.g. for Toronto: Roncesvalles, Leslieville, Kensington Market, the Annex, Queen West, Riverdale, the Beaches; pick four DIFFERENT neighborhoods across the four ads). Pick four different KINDS of business: a bakery or diner; a hardware store or florist; a bookstore or record shop; a service like dental / tailoring / barber. The address line MUST include a real street name plausibly in that neighborhood.

Each ad needs both a REAL and a PARALLEL variant.

OUTPUT FORMAT (strict): emit exactly this XML.

<ads>
<ad>
<real>
<headline>BUSINESS NAME (uppercase)</headline>
<tagline>One witty line.</tagline>
<body>1-2 sentence body.</body>
<meta>Real street address in [neighborhood] · phone or detail</meta>
</real>
<parallel>
<headline>BUSINESS NAME-MIRRORSIDE or Σ-variant</headline>
<tagline>One witty line in the Sigma register.</tagline>
<body>1-2 sentence body — same business, weirder world.</body>
<meta>Address · the way it travels in the Sigma timeline</meta>
</parallel>
</ad>
... 4 ads total, one per neighborhood ...
</ads>`;
}

const FILL_CLASSIFIEDS_PROMPT = (city: string, missing: string[]) =>
  `Write classifieds for the categories below. The reader is in ${city} — anchor street/neighborhood references in real ${city} places. Each classified gets both a REAL body and a PARALLEL body.

Missing categories: ${missing.join(", ")}.

OUTPUT FORMAT (strict):

<classifieds>
${missing
  .map(
    (c) => `<entry category="${c}">
<real>Body of the real classified, a few short sentences. Plausible details, ${city}-specific.</real>
<parallel>Body of the Sigma-timeline classified — same shape, slightly off-kilter.</parallel>
</entry>`,
  )
  .join("\n")}
</classifieds>`;

export async function writeAds(issueId: string): Promise<void> {
  const sb = supabaseServer();
  const prefs = await getPreferences(DEFAULT_USER_ID);
  const city = prefs.city || "Cedar Hollow";

  // Reddit classifieds first — rough edges, real local life.
  let realClassifieds: Awaited<ReturnType<typeof fetchRealClassifieds>> = [];
  try {
    realClassifieds = await fetchRealClassifieds(city, 1);
  } catch {
    realClassifieds = [];
  }

  const REQUIRED = ["LOST & FOUND", "COMMUNITY", "FOR SALE", "PERSONALS"];
  const haveCats = new Set(realClassifieds.map((r) => r.category));
  const missing = REQUIRED.filter((c) => !haveCats.has(c));

  // Generate display ads + any classified categories Reddit didn't fill.
  const [displays, fillerClassifieds] = await Promise.all([
    generateDisplay(city),
    missing.length > 0
      ? generateClassifieds(city, missing)
      : Promise.resolve([] as ClassifiedPair[]),
  ]);

  const rows: Array<Record<string, unknown>> = [];

  displays.forEach((ad, i) => {
    rows.push({
      issue_id: issueId,
      kind: "display",
      position: i,
      source_kind: "ai",
      real_headline: ad.real.headline,
      real_tagline: ad.real.tagline,
      real_body: ad.real.body,
      real_meta: ad.real.meta,
      parallel_headline: ad.parallel.headline,
      parallel_tagline: ad.parallel.tagline,
      parallel_body: ad.parallel.body,
      parallel_meta: ad.parallel.meta,
    });
  });

  // Real Reddit classifieds. The real body is the original poster's excerpt;
  // the parallel body is a tiny Sigma-twist of it generated below.
  const sigmaTwists = realClassifieds.length
    ? await sigmaTwistAll(realClassifieds.map((c) => c.body))
    : [];
  realClassifieds.forEach((c, i) => {
    rows.push({
      issue_id: issueId,
      kind: "classified",
      category: c.category,
      position: i,
      source_kind: "reddit",
      source_url: c.source_url,
      source_author: c.source_author,
      source_subreddit: c.source_subreddit,
      real_body: c.body,
      parallel_body: sigmaTwists[i] ?? c.body,
    });
  });

  fillerClassifieds.forEach((c, i) => {
    rows.push({
      issue_id: issueId,
      kind: "classified",
      category: c.category,
      position: realClassifieds.length + i,
      source_kind: "ai",
      real_body: c.real_body,
      parallel_body: c.parallel_body,
    });
  });

  if (rows.length) await sb.from("ads").insert(rows);
}

async function generateDisplay(city: string): Promise<DisplayPair[]> {
  const r = await anthropic().messages.create({
    model: MODEL_FAST,
    max_tokens: 1800,
    system: AD_DESK_PROMPT_BASE,
    messages: [{ role: "user", content: displayPromptFor(city) }],
  });
  const text = r.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("\n");
  return parseDisplayAds(text);
}

async function generateClassifieds(
  city: string,
  missing: string[],
): Promise<ClassifiedPair[]> {
  const r = await anthropic().messages.create({
    model: MODEL_FAST,
    max_tokens: 1500,
    system: AD_DESK_PROMPT_BASE,
    messages: [{ role: "user", content: FILL_CLASSIFIEDS_PROMPT(city, missing) }],
  });
  const text = r.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("\n");
  return parseClassifieds(text);
}

// Take a real classified body and produce a one-paragraph Sigma-timeline twist
// of the same notice — same shape, slightly off-kilter.
async function sigmaTwistAll(bodies: string[]): Promise<string[]> {
  const prompt = `For each of the following real classifieds, write a one-paragraph Sigma-timeline (parallel-universe) version. Keep the same length and shape. Same kind of object lost, same kind of thing for sale, same tone — but slightly off-kilter, in the way the magazine's Sigma edition usually is. Output exactly this XML, one <twist> per input, in order:

<twists>
${bodies.map((_, i) => `<twist index="${i}">parallel version</twist>`).join("\n")}
</twists>

INPUTS:
${bodies.map((b, i) => `[${i}] ${b}`).join("\n\n")}`;

  const r = await anthropic().messages.create({
    model: MODEL_FAST,
    max_tokens: 1500,
    system: AD_DESK_PROMPT_BASE,
    messages: [{ role: "user", content: prompt }],
  });
  const text = r.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("\n");
  const out: string[] = new Array(bodies.length).fill("");
  const re = /<twist\s+index="(\d+)"\s*>([\s\S]*?)<\/twist>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const idx = parseInt(m[1], 10);
    if (idx >= 0 && idx < bodies.length) out[idx] = m[2].trim();
  }
  // Fallback: if a twist is missing, reuse the original body so we always
  // have something to render.
  return out.map((t, i) => t || bodies[i]);
}

function parseDisplayAds(raw: string): DisplayPair[] {
  const out: DisplayPair[] = [];
  const re = /<ad>([\s\S]*?)<\/ad>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const block = m[1];
    const real = pickDisplay(extract(block, "real"));
    const parallel = pickDisplay(extract(block, "parallel"));
    if (real.headline && parallel.headline) out.push({ real, parallel });
  }
  return out;
}

function parseClassifieds(raw: string): ClassifiedPair[] {
  const out: ClassifiedPair[] = [];
  const re =
    /<entry\s+category="([^"]+)"\s*>([\s\S]*?)<\/entry>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const cat = m[1].trim();
    const block = m[2];
    out.push({
      category: cat,
      real_body: extract(block, "real").trim(),
      parallel_body: extract(block, "parallel").trim(),
    });
  }
  return out;
}

function pickDisplay(block: string): DisplayDraft {
  return {
    headline: extract(block, "headline"),
    tagline: extract(block, "tagline"),
    body: extract(block, "body"),
    meta: extract(block, "meta"),
  };
}

function extract(block: string, name: string): string {
  const mm = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"));
  return mm ? mm[1].trim() : "";
}
