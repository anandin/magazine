// Pulls real classifieds from city-local subreddits via Reddit's public JSON
// endpoint. We send a descriptive User-Agent (per Reddit's API rules), filter
// out NSFW / removed / low-score posts, and keep an excerpt + link back.
//
// We don't rewrite the post body — readers see what the original poster wrote,
// with attribution. That's the trade for "real": rougher edges, more local
// flavor, and the magazine stops feeling synthetic.

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  permalink: string;
  author: string;
  subreddit: string;
  score: number;
  num_comments: number;
  over_18: boolean;
  is_self: boolean;
  removed_by_category: string | null;
  created_utc: number;
}

export interface RealClassified {
  category: string; // LOST & FOUND | FOR SALE | COMMUNITY | PERSONALS
  body: string; // ready-to-render excerpt
  source_url: string;
  source_author: string;
  source_subreddit: string;
}

// Subreddit priority order per city. The general city sub catches the long
// tail of community posts; the marketplace/classifieds subs catch buy/sell.
function subsForCity(city: string): string[] {
  const c = city.toLowerCase().split(",")[0].trim().replace(/\s+/g, "");
  // Toronto's known subs are the most consistent for a Canadian reader.
  if (/toronto/.test(c)) {
    return [
      "torontoclassifieds",
      "TorontoMarketplace",
      "askTO",
      "toronto",
    ];
  }
  // Generic fallback: try {city} and {city}Classifieds.
  return [c, `${c}classifieds`, `${c}Marketplace`];
}

const UA =
  "web:cedar-hollow-sentinel:0.2 (by /u/anandin) — small-magazine local-classifieds aggregator";

async function fetchSub(sub: string): Promise<RedditPost[]> {
  // Top of the week is the right window: enough to fill a magazine, but
  // recent enough to feel like local life right now.
  const url = `https://www.reddit.com/r/${encodeURIComponent(sub)}/top.json?t=week&limit=30`;
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json: { data?: { children?: { data: RedditPost }[] } } = await res.json();
  const posts = (json.data?.children ?? [])
    .map((c) => c.data)
    .filter((p): p is RedditPost => !!p && !p.over_18 && !p.removed_by_category)
    .filter((p) => p.score >= 2)
    // Skip community megathreads + meta links — only self-posts read like ads.
    .filter((p) => p.is_self || /\$|free|sale|lost|found|seeking|looking|wanted|missed/i.test(p.title));
  return posts;
}

function categorize(title: string, body: string): string | null {
  const t = `${title}\n${body}`.toLowerCase();
  if (/\b(lost|found|missing|stolen)\b/.test(t)) return "LOST & FOUND";
  if (/\$|\bfor sale\b|\bselling\b|\bfree\b|moving sale|garage sale/.test(t))
    return "FOR SALE";
  if (/\b(missed connection|m4f|f4m|m4m|f4f|ride share|rideshare|carpool)\b/.test(t))
    return "PERSONALS";
  if (
    /\b(looking for|seeking|wanted|need(ed|s)?|recommend|advice|help|where can i)\b/.test(t)
  )
    return "COMMUNITY";
  return null;
}

function excerpt(post: RedditPost, maxLen = 220): string {
  const title = post.title.trim();
  const body = (post.selftext || "").trim();
  // Pull the first sentence or two of the body, paragraph-collapsed.
  const flat = body.replace(/\s+/g, " ").trim();
  const tail = flat.length > 0 ? ` ${flat}` : "";
  let s = `${title}.${tail}`;
  if (s.length > maxLen) s = s.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
  return s;
}

export async function fetchRealClassifieds(
  city: string,
  perCategory = 1,
): Promise<RealClassified[]> {
  const subs = subsForCity(city);
  const all: RedditPost[] = [];
  // Sequential fetches — Reddit rate-limits parallel anonymous requests harder.
  for (const sub of subs) {
    try {
      const posts = await fetchSub(sub);
      all.push(...posts);
    } catch {
      // Best-effort. If a sub is private or 404s, skip it.
    }
  }

  // Bucket by category, prefer higher-scoring posts.
  const byCat: Record<string, RedditPost[]> = {};
  for (const p of all.sort((a, b) => b.score - a.score)) {
    const cat = categorize(p.title, p.selftext);
    if (!cat) continue;
    byCat[cat] ??= [];
    if (byCat[cat].length < perCategory) byCat[cat].push(p);
  }

  // Stable order matching the design's classifieds row.
  const ORDER = ["LOST & FOUND", "COMMUNITY", "FOR SALE", "PERSONALS"];
  const out: RealClassified[] = [];
  for (const cat of ORDER) {
    for (const p of byCat[cat] ?? []) {
      out.push({
        category: cat,
        body: excerpt(p),
        source_url: `https://www.reddit.com${p.permalink}`,
        source_author: p.author,
        source_subreddit: p.subreddit,
      });
    }
  }
  return out;
}
