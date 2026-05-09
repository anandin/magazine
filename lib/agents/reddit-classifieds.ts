// Pulls real classifieds from city-local subreddits via Reddit's OAuth API.
// Reddit broadly blocks anonymous reads in 2026, so we authenticate with the
// "installed_client" flow (read-only, no user password, just a CLIENT_ID).
//
// To enable: register an "installed app" at https://www.reddit.com/prefs/apps
// and set REDDIT_CLIENT_ID in the Vercel env. If unset, we return [] and the
// ad-writer falls back to AI-generated city-grounded classifieds.

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
  category: string;
  body: string;
  source_url: string;
  source_author: string;
  source_subreddit: string;
}

const UA = "web:cedar-hollow-sentinel:0.3 by /u/anandin";

function subsForCity(city: string): string[] {
  const c = city.toLowerCase().split(",")[0].trim().replace(/\s+/g, "");
  if (/toronto/.test(c)) {
    return ["torontoclassifieds", "TorontoMarketplace", "askTO", "toronto"];
  }
  return [c, `${c}classifieds`, `${c}Marketplace`];
}

// In-process token cache. Vercel cold starts per request → on-demand only.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  if (!clientId) return null;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET ?? ""; // installed apps have no secret

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }

  // Stable per-deployment device id; Reddit accepts any string >= 20 chars.
  const deviceId = "ced-hollow-sentinel-vercel";
  const body = new URLSearchParams({
    grant_type: "https://oauth.reddit.com/grants/installed_client",
    device_id: deviceId,
  });

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      "user-agent": UA,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    console.warn(`[reddit] token fetch failed: ${res.status}`);
    return null;
  }
  const json: { access_token?: string; expires_in?: number } = await res.json();
  if (!json.access_token) return null;
  cachedToken = {
    value: json.access_token,
    expiresAt: now + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

async function fetchSub(token: string, sub: string): Promise<RedditPost[]> {
  const url = `https://oauth.reddit.com/r/${encodeURIComponent(sub)}/top?t=week&limit=30`;
  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      "user-agent": UA,
      accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    console.warn(`[reddit] /${sub} fetch failed: ${res.status}`);
    return [];
  }
  const json: { data?: { children?: { data: RedditPost }[] } } = await res.json();
  return (json.data?.children ?? [])
    .map((c) => c.data)
    .filter((p): p is RedditPost => !!p && !p.over_18 && !p.removed_by_category)
    .filter((p) => p.score >= 2)
    .filter(
      (p) =>
        p.is_self ||
        /\$|free|sale|lost|found|seeking|looking|wanted|missed/i.test(p.title),
    );
}

function categorize(title: string, body: string): string | null {
  const t = `${title}\n${body}`.toLowerCase();
  if (/\b(lost|found|missing|stolen)\b/.test(t)) return "LOST & FOUND";
  if (/\$|\bfor sale\b|\bselling\b|\bfree\b|moving sale|garage sale/.test(t))
    return "FOR SALE";
  if (/\b(missed connection|m4f|f4m|m4m|f4f|ride share|rideshare|carpool)\b/.test(t))
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
  const tail = flat.length > 0 ? ` ${flat}` : "";
  let s = `${title}.${tail}`;
  if (s.length > maxLen) s = s.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
  return s;
}

export async function fetchRealClassifieds(
  city: string,
  perCategory = 1,
): Promise<RealClassified[]> {
  const token = await getToken();
  if (!token) {
    console.info(
      "[reddit] REDDIT_CLIENT_ID not set; skipping real-source classifieds.",
    );
    return [];
  }

  const subs = subsForCity(city);
  const all: RedditPost[] = [];
  for (const sub of subs) {
    try {
      const posts = await fetchSub(token, sub);
      all.push(...posts);
    } catch (e) {
      console.warn(`[reddit] /${sub} threw`, e);
    }
  }
  console.info(
    `[reddit] fetched ${all.length} candidate posts across ${subs.length} subs`,
  );

  const byCat: Record<string, RedditPost[]> = {};
  for (const p of all.sort((a, b) => b.score - a.score)) {
    const cat = categorize(p.title, p.selftext);
    if (!cat) continue;
    byCat[cat] ??= [];
    if (byCat[cat].length < perCategory) byCat[cat].push(p);
  }

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
