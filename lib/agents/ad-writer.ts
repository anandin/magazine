import { anthropic, MODEL_FAST } from "@/lib/anthropic";
import { supabaseServer } from "@/lib/supabase/server";

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

const AD_DESK_PROMPT = `You are the Ad Desk for a small newspaper-style magazine. You write two registers of every ad: REAL (warm, neighborly, plausible local advertiser) and PARALLEL (the Sigma timeline — the same business, slightly off-kilter; "Joe's Diner-Mirrorside", "Calloway Books, Verso"). Voice stays warm even when the world bends.`;

const DISPLAY_PROMPT = `Write 4 display ads for today's issue. Each ad needs both a REAL and a PARALLEL variant.

OUTPUT FORMAT (strict): emit exactly this XML.

<ads>
<ad>
<real>
<headline>BUSINESS NAME (uppercase)</headline>
<tagline>One witty line.</tagline>
<body>1-2 sentence body.</body>
<meta>Address · phone or detail</meta>
</real>
<parallel>
<headline>BUSINESS NAME-MIRRORSIDE or Σ-variant</headline>
<tagline>One witty line in the Sigma register.</tagline>
<body>1-2 sentence body — same business, weirder world.</body>
<meta>Address · the way it travels in the Sigma timeline</meta>
</parallel>
</ad>
... 4 ads total ...
</ads>`;

const CLASSIFIEDS_PROMPT = `Write 4 classifieds for today's issue, one each in these categories: LOST & FOUND, LESSONS, YARD SALE, PERSONALS. Each classified gets both a REAL body and a PARALLEL body.

OUTPUT FORMAT (strict):

<classifieds>
<entry category="LOST & FOUND">
<real>Body of the real classified, a few short sentences. Plausible details.</real>
<parallel>Body of the Sigma-timeline classified — same shape, slightly off-kilter.</parallel>
</entry>
<entry category="LESSONS">...</entry>
<entry category="YARD SALE">...</entry>
<entry category="PERSONALS">...</entry>
</classifieds>`;

export async function writeAds(issueId: string): Promise<void> {
  const sb = supabaseServer();

  const [displays, classifieds] = await Promise.all([
    generateDisplay(),
    generateClassifieds(),
  ]);

  const rows: Array<Record<string, unknown>> = [];
  displays.forEach((ad, i) => {
    rows.push({
      issue_id: issueId,
      kind: "display",
      position: i,
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
  classifieds.forEach((c, i) => {
    rows.push({
      issue_id: issueId,
      kind: "classified",
      category: c.category,
      position: i,
      real_body: c.real_body,
      parallel_body: c.parallel_body,
    });
  });
  if (rows.length) await sb.from("ads").insert(rows);
}

async function generateDisplay(): Promise<DisplayPair[]> {
  const r = await anthropic().messages.create({
    model: MODEL_FAST,
    max_tokens: 1500,
    system: AD_DESK_PROMPT,
    messages: [{ role: "user", content: DISPLAY_PROMPT }],
  });
  const text = r.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("\n");
  return parseDisplayAds(text);
}

async function generateClassifieds(): Promise<ClassifiedPair[]> {
  const r = await anthropic().messages.create({
    model: MODEL_FAST,
    max_tokens: 1200,
    system: AD_DESK_PROMPT,
    messages: [{ role: "user", content: CLASSIFIEDS_PROMPT }],
  });
  const text = r.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("\n");
  return parseClassifieds(text);
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
