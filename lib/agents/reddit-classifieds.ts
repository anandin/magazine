// Pulls real classifieds from city-local subreddits via Composio's Reddit
// toolkit. Composio holds the OAuth client credentials and our connected
// account holds the user grant; we just call REDDIT_RETRIEVE_REDDIT_POST
// per subreddit and categorize the results.
//
// Required envs:
//   COMPOSIO_API_KEY            — account-level key
//   COMPOSIO_REDDIT_USER_ID     — the user_id we passed when creating the
//                                 connection (e.g. "cedar-hollow-default")
//
// If either is missing, fetchRealClassifieds() returns [] and the ad-writer
// falls back to AI-generated city-grounded copy.

interface RedditPost {
  id?: string;
  name?: string; // fullname like "t3_xxxxx"
  title: string;
  selftext?: string;
  permalink: string;
  author: string;
  subreddit: string;
  score?: number;
  ups?: number;
  num_comments?: number;
  over_18?: boolean;
  is_self?: boolean;
  created_utc?: number;
  url?: string;
}

export interface RealClassified {
  category: string;
  body: string;
  source_url: string;
  source_author: string;
  source_subreddit: string;
}

function subsForCity(city: string): string[] {
  const c = city.toLowerCase().split(",")[0].trim().replace(/\s+/g, "");
  if (/toronto/.test(c)) {
    return ["torontoclassifieds", "TorontoMarketplace", "askTO", "toronto"];
  }
  return [c, `${c}classifieds`, `${c}Marketplace`];
}

async function executeReddit(
  subreddit: string,
  size = 25,
): Promise<RedditPost[]> {
  const key = process.env.COMPOSIO_API_KEY;
  const userId = process.env.COMPOSIO_REDDIT_USER_ID;
  if (!key || !userId) return [];

  const res = await fetch(
    "https://backend.composio.dev/api/v3/tools/execute/REDDIT_RETRIEVE_REDDIT_POST",
    {
      method: "POST",
      headers: {
        "x-api-key": key,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        arguments: { subreddit, size },
      }),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn(`[composio] /${subreddit} HTTP ${res.status}: ${text.slice(0, 200)}`);
    return [];
  }
  const json: {
    data?: { children?: { data: RedditPost }[]; posts?: RedditPost[] };
    successful?: boolean;
    error?: string;
  } = await res.json();
  if (json.successful === false) {
    console.warn(`[composio] /${subreddit} action failed: ${json.error}`);
    return [];
  }
  // Composio returns either {data:{children:[{data:post}]}} (Reddit-shaped)
  // or {data:{posts:[post]}} depending on the action version. Handle both.
  const children = json.data?.children;
  if (children && Array.isArray(children)) {
    return children.map((c) => c.data).filter(Boolean);
  }
  const posts = json.data?.posts;
  if (posts && Array.isArray(posts)) return posts;
  return [];
}

function isUsable(p: RedditPost): boolean {
  if (!p.title) return false;
  if (p.over_18) return false;
  const score = p.score ?? p.ups ?? 0;
  if (score < 2) return false;
  // Skip pure link posts unless the title itself screams classified.
  if (
    !(p.is_self ?? true) &&
    !/\$|free|sale|lost|found|seeking|looking|wanted|missed/i.test(p.title)
  )
    return false;
  return true;
}

function categorize(title: string, body: string): string | null {
  const t = `${title}\n${body}`.toLowerCase();
  if (/\b(lost|found|missing|stolen)\b/.test(t)) return "LOST & FOUND";
  if (/\$|\bfor sale\b|\bselling\b|\bfree\b|moving sale|garage sale/.test(t))
    return "FOR SALE";
  if (
    /\b(missed connection|m4f|f4m|m4m|f4f|ride share|rideshare|carpool)\b/.test(t)
  )
    return "PERSONALS";
  if (
    /\b(looking for|seeking|wanted|need(ed|s)?|recommend|advice|help|where can i)\b/.test(
      t,
    )
  )
    return "COMMUNITY";
  return null;
}

function excerpt(post: RedditPost, maxLen = 220): string {
  const title = post.title.trim();
  const body = (post.selftext || "").trim();
  const flat = body.replace(/\s+/g, " ").trim();
  const tail = flat ? ` ${flat}` : "";
  let s = `${title}.${tail}`;
  if (s.length > maxLen) s = s.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
  return s;
}

export async function fetchRealClassifieds(
  city: string,
  perCategory = 1,
): Promise<RealClassified[]> {
  if (!process.env.COMPOSIO_API_KEY || !process.env.COMPOSIO_REDDIT_USER_ID) {
    console.info("[composio] not configured; falling back to AI classifieds.");
    return [];
  }
  const subs = subsForCity(city);
  const all: RedditPost[] = [];
  for (const sub of subs) {
    try {
      const posts = await executeReddit(sub, 25);
      all.push(...posts);
    } catch (e) {
      console.warn(`[composio] /${sub} threw`, e);
    }
  }
  console.info(
    `[composio] fetched ${all.length} candidate posts across ${subs.length} subs`,
  );

  const usable = all.filter(isUsable);
  const byCat: Record<string, RedditPost[]> = {};
  for (const p of usable.sort(
    (a, b) => (b.score ?? b.ups ?? 0) - (a.score ?? a.ups ?? 0),
  )) {
    const cat = categorize(p.title, p.selftext ?? "");
    if (!cat) continue;
    byCat[cat] ??= [];
    if (byCat[cat].length < perCategory) byCat[cat].push(p);
  }

  const ORDER = ["LOST & FOUND", "COMMUNITY", "FOR SALE", "PERSONALS"];
  const out: RealClassified[] = [];
  for (const cat of ORDER) {
    for (const p of byCat[cat] ?? []) {
      const link =
        p.permalink && p.permalink.startsWith("/")
          ? `https://www.reddit.com${p.permalink}`
          : (p.permalink || p.url || "");
      out.push({
        category: cat,
        body: excerpt(p),
        source_url: link,
        source_author: p.author,
        source_subreddit: p.subreddit,
      });
    }
  }
  return out;
}
