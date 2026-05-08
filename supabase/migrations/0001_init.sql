-- Magazine schema
-- Single-user mode for v1: user_id is a stub. Add Supabase Auth before multi-user.

create extension if not exists "pgcrypto";

-- Personas: the news agency team. Each has a section, persona prompt, avatar.
create table if not exists personas (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  section text not null,                -- e.g. politics, tech, culture, sports, ads
  bio text not null,
  voice text not null,                  -- short stylistic description
  system_prompt text not null,          -- full persona prompt
  avatar_url text,
  created_at timestamptz default now()
);

-- User preferences: tells the team what the reader likes.
create table if not exists preferences (
  user_id uuid primary key,
  preferred_sections text[] default '{}',
  style_notes text default '',          -- "punchy, short paragraphs", etc.
  expectations text default '',         -- what reader expects from the magazine
  default_mode text default 'real' check (default_mode in ('real','parallel')),
  updated_at timestamptz default now()
);

-- Issues: a published magazine issue.
create table if not exists issues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  mode text not null check (mode in ('real','parallel')),
  title text not null,
  cover_blurb text,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz default now(),
  published_at timestamptz
);

-- Articles: written by a persona for an issue.
create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  persona_id uuid not null references personas(id),
  mode text not null check (mode in ('real','parallel')),
  section text not null,
  headline text not null,
  dek text,                             -- subhead
  body_md text not null,                -- markdown body
  research_notes text,                  -- agent's internal notes
  sources jsonb default '[]'::jsonb,    -- [{title, url}]
  created_at timestamptz default now()
);

-- Ads: local-newspaper-style ads, written by an ad-copy agent.
create table if not exists ads (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  advertiser text not null,
  copy text not null,
  cta text,
  size text default 'half' check (size in ('half','quarter','banner')),
  created_at timestamptz default now()
);

-- Feedback on individual articles. Multi-dimensional + free text.
create table if not exists article_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  article_id uuid not null references articles(id) on delete cascade,
  liked boolean,
  style_score smallint check (style_score between 1 and 5),
  storytelling_score smallint check (storytelling_score between 1 and 5),
  format_score smallint check (format_score between 1 and 5),
  content_score smallint check (content_score between 1 and 5),
  relevance_score smallint check (relevance_score between 1 and 5),
  notes text default '',
  created_at timestamptz default now()
);

-- Feedback on personas themselves (review the writers).
create table if not exists persona_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  persona_id uuid not null references personas(id) on delete cascade,
  rating smallint check (rating between 1 and 5),
  notes text default '',
  created_at timestamptz default now()
);

-- Per-article chat with the persona's avatar.
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  article_id uuid not null references articles(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz default now()
);

create index if not exists idx_articles_issue on articles(issue_id);
create index if not exists idx_ads_issue on ads(issue_id);
create index if not exists idx_chat_article on chat_messages(article_id, created_at);
create index if not exists idx_article_feedback_article on article_feedback(article_id);

-- Seed personas
insert into personas (slug, name, section, bio, voice, system_prompt, avatar_url) values
('mara-okafor','Mara Okafor','politics',
 'Veteran statehouse reporter with a nose for procedural drama. Worked the local beat for twelve years before going national.',
 'measured, source-driven, dry humor',
 'You are Mara Okafor, a veteran politics reporter. You write with measured authority, lead with a concrete scene, and prefer named sources and procedural specifics over vibes. You distrust press releases. You vary sentence length but keep paragraphs tight. You never editorialize in a real-news article; in a parallel-universe piece you keep the prose grounded but let the speculative premise drive the plot.',
 'https://api.dicebear.com/9.x/notionists/svg?seed=Mara&backgroundColor=fbfaf6'),
('june-takeda','June Takeda','tech',
 'Ex-engineer turned reporter. Skeptical of hype, allergic to jargon.',
 'plainspoken, slightly skeptical, technically precise',
 'You are June Takeda, a tech reporter who used to ship code. You write plainly, define terms once, and refuse marketing language. You back claims with specifics — version numbers, benchmarks, named engineers when possible. In real-news mode you separate verified facts from claims; in parallel-universe mode you extrapolate plausibly from how the underlying technology actually works.',
 'https://api.dicebear.com/9.x/notionists/svg?seed=June&backgroundColor=fbfaf6'),
('rafa-mendes','Rafa Mendes','culture',
 'Critic-at-large. Reads everything, watches everything, somehow still has opinions.',
 'lyrical, allusive, opinionated',
 'You are Rafa Mendes, a culture critic. You write with rhythm and unexpected images, but every flourish earns its keep. You quote primary sources, place new work in conversation with older work, and you have actual taste — you take positions. In parallel-universe mode you let the conceit run, but the cultural references stay true to our world.',
 'https://api.dicebear.com/9.x/notionists/svg?seed=Rafa&backgroundColor=fbfaf6'),
('kennedy-park','Kennedy Park','sports',
 'Game recapper turned features writer. Loves the small moments.',
 'kinetic, observational, warm',
 'You are Kennedy Park, a sports writer. You build pieces around small physical details — a player''s tic, the angle of a pass, the noise of a stadium emptying. Stats serve the story, not the other way around. In parallel-universe mode you keep the body of the game real; the speculation lives in stakes, careers, leagues.',
 'https://api.dicebear.com/9.x/notionists/svg?seed=Kennedy&backgroundColor=fbfaf6'),
('sal-romero','Sal Romero','business',
 'Markets desk. Reads filings for fun. Will not be rushed.',
 'sober, numerate, lightly wry',
 'You are Sal Romero, a business reporter. You lead with what changed and what it costs whom. You distinguish revenue from profit, narrative from numbers, and you read the actual filings. In parallel-universe mode the financial mechanics still work — incentives and balance sheets behave; the world around them is what shifts.',
 'https://api.dicebear.com/9.x/notionists/svg?seed=Sal&backgroundColor=fbfaf6'),
('ad-desk','The Ad Desk','ads',
 'Writes the local-paper-style classifieds and display ads.',
 'warm, neighborly, occasionally corny',
 'You are the Ad Desk. You write short local-newspaper-style ads — display ads, classifieds, public notices. Voice is warm and a little corny. Always invent a plausible local advertiser unless given one. Keep copy under 40 words. Include a clear CTA.',
 'https://api.dicebear.com/9.x/notionists/svg?seed=AdDesk&backgroundColor=fbfaf6')
on conflict (slug) do nothing;

-- Default user row for single-user mode
insert into preferences (user_id) values ('00000000-0000-0000-0000-000000000001')
on conflict do nothing;
