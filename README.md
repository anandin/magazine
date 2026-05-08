# The Parallel Press

A small magazine — including local-newspaper-style ads — written by a team of agent personas. Two modes: **Real news** and **Parallel universe** (creative writeups grounded in actual events).

## What's here

- **Reader UI** — cover, issue page with interleaved ads, full article view with author sidebar.
- **Per-persona agents** — six writers (Politics, Tech, Culture, Sports, Business, Ads), each with a distinct voice and system prompt.
- **Editor agent** — picks topics for each issue using web search, assigns one story per writer.
- **Writer agent** — researches via Anthropic's hosted `web_search` tool, then files a 500-900 word article in its persona's voice. Real and parallel-universe modes use the same persona but different mode instructions.
- **Per-article chat** — talk to the writer about their piece. The persona answers in character with full access to the article and research notes.
- **Feedback loop** — per-article scores (style, storytelling, format, content, relevance) + free text. Feedback is loaded back into that persona's next prompt.
- **Persona reviews** — review the writers themselves; star rating + notes.
- **Preferences** — tell the team what sections you like, your style notes, your expectations, your default mode.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Supabase (Postgres) for issues, articles, ads, chat, feedback, preferences
- Anthropic SDK with the hosted `web_search` tool — Opus 4.7 for article writing, Sonnet 4.6 for editor + chat + ads

## Setup

1. Install:
   ```bash
   npm install
   ```
2. Create a Supabase project. In the SQL editor, run:
   ```
   supabase/migrations/0001_init.sql
   ```
   This creates the schema and seeds the six personas.
3. Copy env:
   ```bash
   cp .env.example .env.local
   ```
   Fill in `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4. Dev:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000`. Pick a mode and click **Generate issue**. The team takes 1-3 minutes to research and file.

## Generate-issue flow

`POST /api/issues/generate { mode }`

1. Editor agent calls `web_search` to scan recent news, then assigns one topic per writer.
2. Each writer agent runs in parallel: web-searches its topic, then drafts an article with citations.
3. Ad Desk writes 4 local-paper-style ads.
4. The issue is marked published.

## Where things live

```
app/
  page.tsx                       # cover, recent issues, mode toggle + generate button
  issue/[id]/page.tsx            # full issue: articles + interleaved ads
  article/[id]/page.tsx          # article + persona sidebar + chat + feedback
  preferences/                   # reader preferences page
  personas/                      # team browser + per-persona pages with reviews
  api/
    issues/generate/route.ts     # kick off issue generation
    issues/[id]/route.ts         # fetch issue
    articles/[id]/chat/route.ts  # chat with the persona
    feedback/route.ts            # article + persona feedback
    preferences/route.ts         # GET/POST preferences
    personas/route.ts            # list personas
lib/
  agents/
    personas.ts                  # CRUD for personas
    editor.ts                    # plans + assembles an issue
    writer.ts                    # writes one article (real or parallel)
    chat.ts                      # talks to a persona about its article
    ad-writer.ts                 # writes ads
  anthropic.ts                   # Anthropic client + web_search tool config
  personalize.ts                 # loads prefs + recent feedback into prompts
  supabase/{server,client}.ts
  types.ts
components/                      # Header, PersonaAvatar, PersonaCard, AdSlot,
                                 # ModeToggle, ChatPanel, FeedbackWidget, Article
supabase/migrations/0001_init.sql
```

## Single-user mode

v1 uses a fixed `DEFAULT_USER_ID` for preferences and feedback. Before going multi-user, swap in Supabase Auth and replace `DEFAULT_USER_ID` references with the authenticated user's id.

## What's stubbed

- **Avatars** are static SVGs from DiceBear keyed off the persona name. Animated/voice avatars are a v2.
- **Auth** — single-user, no sessions.
- **No image generation** for cover art or article art. Easy to add: an `image_url` column on `articles`/`issues` and a generation step in the editor.
- **No moderation** — agents are trusted to follow their prompts. Add an output filter if you expose this publicly.

## Costs

Each issue is ~6 model calls (1 editor + ~5 writers + 1 ad desk), each with web_search. Expect ~$0.50–$2 per issue depending on how much the writers search. Switch `MODEL` in `lib/anthropic.ts` to `MODEL_FAST` (Sonnet) to drop that ~5×.
