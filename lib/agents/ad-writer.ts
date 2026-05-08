import { anthropic, MODEL_FAST } from "@/lib/anthropic";
import { getPersona } from "@/lib/agents/personas";
import { supabaseServer } from "@/lib/supabase/server";
import type { Mode } from "@/lib/types";

interface AdDraft {
  advertiser: string;
  copy: string;
  cta: string;
  size: "half" | "quarter" | "banner";
}

const SIZES: AdDraft["size"][] = ["banner", "half", "quarter", "quarter"];

export async function writeAds(issueId: string, mode: Mode): Promise<void> {
  const persona = await getPersona("ad-desk");
  if (!persona) return;
  const sb = supabaseServer();

  const flavor =
    mode === "parallel"
      ? "These ads run in a parallel-universe issue, so the advertisers can be slightly off-kilter (e.g. a hardware store that also rents owls), but the voice stays warm-neighborly."
      : "These are real-feeling local ads — hardware store, dentist, library book sale, bakery, used bookstore, that sort of thing.";

  const prompt = `Write 4 short local-newspaper-style ads for today's issue. ${flavor}

OUTPUT FORMAT (strict): one <ad> block per ad, nothing else.
<ad>
<advertiser>Business name</advertiser>
<size>banner|half|quarter</size>
<copy>The ad copy. Under 40 words.</copy>
<cta>Short call to action.</cta>
</ad>`;

  const response = await anthropic().messages.create({
    model: MODEL_FAST,
    max_tokens: 1024,
    system: persona.system_prompt,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const ads = parseAds(text);
  if (!ads.length) return;
  await sb.from("ads").insert(
    ads.slice(0, SIZES.length).map((a, i) => ({
      issue_id: issueId,
      advertiser: a.advertiser,
      copy: a.copy,
      cta: a.cta,
      size: a.size || SIZES[i],
    })),
  );
}

function parseAds(raw: string): AdDraft[] {
  const out: AdDraft[] = [];
  const re = /<ad>([\s\S]*?)<\/ad>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const block = m[1];
    const get = (tag: string) => {
      const mm = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
      return mm ? mm[1].trim() : "";
    };
    const advertiser = get("advertiser");
    const copy = get("copy");
    if (!advertiser || !copy) continue;
    const sizeRaw = get("size").toLowerCase();
    const size: AdDraft["size"] =
      sizeRaw === "banner" || sizeRaw === "half" || sizeRaw === "quarter"
        ? sizeRaw
        : "quarter";
    out.push({ advertiser, copy, cta: get("cta"), size });
  }
  return out;
}
