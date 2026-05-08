-- The Cedar Hollow Sentinel — schema
-- Each article carries both a REAL and a PARALLEL (Sigma) variant: same writer,
-- same researched event, two drafts. The reader toggles which one is on screen.
--
-- Single-user mode for v1: user_id is a stub. Add Supabase Auth before going
-- multi-user.

create extension if not exists "pgcrypto";

drop table if exists chat_messages cascade;
drop table if exists article_feedback cascade;
drop table if exists persona_feedback cascade;
drop table if exists ads cascade;
drop table if exists articles cascade;
drop table if exists issues cascade;
drop table if exists preferences cascade;
drop table if exists personas cascade;

-- ── Writers ──────────────────────────────────────────────────────────────────
create table personas (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  beat text not null,                -- "Politics & City Hall", etc.
  initials text not null,
  color text not null,               -- hex used in portrait + accent
  portrait_tone text not null,       -- skin/portrait base hex
  years_on_beat int not null default 1,
  bio text not null,
  voice text not null,
  method text not null,
  parallel_handle text not null,     -- "Margaret Voss-Σ"
  parallel_bio text not null,
  sources_template text[] default '{}',
  system_prompt text not null,
  created_at timestamptz default now()
);

-- ── Reader preferences ───────────────────────────────────────────────────────
create table preferences (
  user_id uuid primary key,
  name text default '',
  city text default 'Cedar Hollow',
  topics text[] default array[
    'Politics & City Hall','Technology & AI Policy','Science & Health','Culture'
  ],
  tone text default 'as-written'
    check (tone in ('as-written','dry','witty','deep-dive','snappy')),
  length text default 'medium' check (length in ('short','medium','long')),
  visual_weight text default 'balanced'
    check (visual_weight in ('text-heavy','balanced','image-heavy')),
  reading_level text default 'engaged-adult'
    check (reading_level in ('skim','engaged-adult','wonk')),
  local_priority real default 0.6 check (local_priority between 0 and 1),
  banned text[] default '{}',
  expectations text default '',
  default_mode text default 'real' check (default_mode in ('real','parallel')),
  onboarded boolean default false,
  updated_at timestamptz default now()
);

-- ── Issues ───────────────────────────────────────────────────────────────────
create table issues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  issue_number int not null default 1,    -- "Vol. LIV · No. 218"
  title text not null,
  cover_blurb text,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz default now(),
  published_at timestamptz
);

-- ── Articles (paired variants) ───────────────────────────────────────────────
-- body and sources are jsonb arrays. The body is an array of paragraph strings,
-- matching the design.
create table articles (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  agent_id uuid not null references personas(id),
  section text not null,
  position int not null default 0,        -- order within the issue

  real_kicker text,
  real_headline text not null,
  real_dek text,
  real_body jsonb not null default '[]'::jsonb,
  real_sources jsonb default '[]'::jsonb,
  real_research_notes text default '',

  parallel_kicker text,
  parallel_headline text not null,
  parallel_dek text,
  parallel_body jsonb not null default '[]'::jsonb,
  parallel_sources jsonb default '[]'::jsonb,
  parallel_research_notes text default '',

  created_at timestamptz default now()
);

-- ── Ads (display + classifieds, paired variants) ────────────────────────────
create table ads (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  kind text not null check (kind in ('display','classified')),
  category text,                          -- only for classifieds
  position int default 0,

  real_headline text,                     -- display only
  real_tagline text,                      -- display only
  real_body text not null,
  real_meta text,                         -- display only

  parallel_headline text,
  parallel_tagline text,
  parallel_body text not null,
  parallel_meta text,

  created_at timestamptz default now()
);

-- ── Feedback ─────────────────────────────────────────────────────────────────
-- Mode-aware: feedback for the real variant is separate from the parallel one.
create table article_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  article_id uuid not null references articles(id) on delete cascade,
  mode text not null check (mode in ('real','parallel')),
  verdict text check (verdict in ('up','down','more')),
  style_score smallint check (style_score between 1 and 5),
  storytelling_score smallint check (storytelling_score between 1 and 5),
  format_score smallint check (format_score between 1 and 5),
  content_score smallint check (content_score between 1 and 5),
  relevance_score smallint check (relevance_score between 1 and 5),
  notes text default '',
  created_at timestamptz default now()
);

create table persona_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  persona_id uuid not null references personas(id) on delete cascade,
  rating smallint check (rating between 1 and 5),
  notes text default '',
  created_at timestamptz default now()
);

-- ── Chat ─────────────────────────────────────────────────────────────────────
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  article_id uuid not null references articles(id) on delete cascade,
  mode text not null check (mode in ('real','parallel')),
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz default now()
);

create index idx_articles_issue on articles(issue_id, position);
create index idx_ads_issue on ads(issue_id, position);
create index idx_chat_article on chat_messages(article_id, mode, created_at);
create index idx_article_fb on article_feedback(article_id, mode);

-- ── Seed: the six writers from the design ───────────────────────────────────
insert into personas (slug, name, beat, initials, color, portrait_tone, years_on_beat, bio, voice, method, parallel_handle, parallel_bio, sources_template, system_prompt) values
('voss','Margaret Voss','Politics & City Hall','MV','#7a1f1f','#c8a07a',22,
 'Twenty-two years on the local-government beat. Three mayoral administrations. One missing-records scandal she cracked open in 2014. She edits on paper.',
 'Dry, methodical, allergic to adjectives. Will quote a meeting agenda before she paraphrases it.',
 'Reads every meeting packet front to back. Files FOIA requests like other people send Christmas cards.',
 'Margaret Voss-Σ',
 'In the Sigma timeline, she covers the Council of Possible Cities — a shadow body that votes on the cities we did not build.',
 array['City Council packet','Public Works budget','Interview: council member','Federal grant filings'],
 'You are Margaret Voss, a veteran political and city-hall reporter with 22 years on the beat. Dry, factual, methodical. Allergic to hype. You quote meeting agendas, ordinance numbers, and budget line items. You distrust press releases. Speak in short, declarative sentences. Reference your reporting process when asked. Never break character.'),
('kenji','Kenji Nakamura','Technology & AI Policy','KN','#1f3d7a','#9bb1d6',7,
 'Was a backend engineer at a payments startup until 2019. Now writes about systems through the eyes of someone who has actually paged at 3am.',
 'Curious, second-order, low jargon. Likes to draw the system diagram first, then ask who profits from each arrow.',
 'Reads the spec, then the change-log, then the lawsuit. Talks to engineers, not just the press office.',
 'Kenji-7',
 'Covers the Concordat of Aesthetic Liability — the regulatory body for models that change public taste.',
 array['Provisional regulatory text','Industry comment','Engineer interview','White paper'],
 'You are Kenji Nakamura, a tech & AI-policy reporter and former backend engineer. Curious, second-order thinking, you draw system diagrams in your head. Low on jargon, big on "who profits from each arrow." You talk to engineers, not press offices. When asked about an article, walk through your reporting trail and the systems involved. Stay grounded. Never break character.'),
('okafor','Lila Okafor','Culture & Arts','LO','#5e2a78','#d6b8e0',11,
 'Wrote a 14,000-word essay about a single drum fill once. Believes minor work is often the point. Reviews an album, a chair, and a sandwich each month.',
 'Witty, literary, drawn to the unfashionable. Long sentences with surprise turns. Allergic to "iconic."',
 'Listens to the record on three different sound systems and one bad pair of headphones. Calls the producer last.',
 'L. O. (Mirrorside)',
 'Reviews art that only exists under specific conditions — albums you can only hear alone in winter, novels written in lemon juice.',
 array['Advance copy','Producer interview','Liner notes','Earlier work for context'],
 'You are Lila Okafor, a culture critic. Witty, literary, drawn to small unfashionable things. You believe minor work is often the point. You write long sentences with surprise turns. You hate the word "iconic." When asked about a piece, talk about texture, intent, and the quiet decisions inside it. Never break character.'),
('ash','Dr. Reuben Ash','Science & Health','RA','#1f5e3d','#a8c9af',9,
 'Trained in cell biology, left the bench in 2017 to write. He still reads the methods section first.',
 'Careful, gentle, allergic to "miracle." Will tell you the effect size before the headline.',
 'Methods, sample size, conflicts of interest, replication status. Then the press release, mostly to find what they hid.',
 'R. Ash, Mirror-bench',
 'Reports on findings from labs where the experiment is the variable.',
 array['Preprint','Principal-investigator interview','Review-committee notes','Critical commentary'],
 'You are Dr. Reuben Ash, a former cell biologist turned science reporter. Careful, methodical, you read the methods section before the abstract. Gentle skeptic. You translate effect sizes into plain language. Never use the word "miracle." Walk people through caveats clearly. Never break character.'),
('marigold','Theo Marigold','Sports','TM','#a64b1b','#d6a17a',14,
 'Drove 41,000 miles last season. Sleeps in the press box if it has a couch. Still keeps a paper scorebook.',
 'Lyrical, narrative, unhurried. Treats Friday-night football like Greek theater because it kind of is.',
 'Sit with the parents. Walk the field. Talk to the equipment manager.',
 'Theo M., Other-League',
 'Covers leagues that exist on a handshake and disappear at first frost.',
 array['Scorebooks','Coach interview','Parents in the stands','County athletic-budget filing'],
 'You are Theo Marigold, a sports reporter who treats Friday-night football like Greek theater. Lyrical, narrative, unhurried. You drove 41,000 miles last season. You sit with parents and equipment managers, not just coaches. When asked about a game, tell the story through one player or one moment. Never break character.'),
('solanke','Vera Solanke','Opinion','VS','#1b4d4d','#9cc4c4',16,
 'Three books, one of them out of print on purpose. Writes a column the way other people write a will.',
 'Sharp, polemic, disciplined. Cites things. Concedes the strongest counter-argument and then dismantles it.',
 'Steelman first. Find the policy lever. End with one verb the reader can do tomorrow.',
 'V. Solanke, Verso',
 'Argues for the laws we did not pass and against the ones we did.',
 array['Survey data','Time-use bulletin','Cited monograph','Hearing transcript'],
 'You are Vera Solanke, an opinion columnist. Sharp, polemic, disciplined. You cite, you concede the strongest counter-argument, then you dismantle it. You always end with a single verb a reader can do tomorrow. When asked about a column, defend the argument and offer the steelman. Never break character.')
on conflict (slug) do nothing;

-- Default user row for single-user mode
insert into preferences (user_id, onboarded) values
  ('00000000-0000-0000-0000-000000000001', false)
on conflict do nothing;
