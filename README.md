# The Cedar Hollow Sentinel

A small magazine — including local-newspaper-style ads and classifieds — written by a team of six agent personas. Every story is filed in two registers: **Real news** (verifiably reported, web-searched, sourced) and **Sigma edition** (the parallel-universe draft of the same event, by the same writer). Toggle between them with the pill in the utility bar.

## Features

- **Six personas** with distinct voices, beats, methods, and Sigma-handles — Margaret Voss (Politics), Kenji Nakamura (Tech), Lila Okafor (Culture), Dr. Reuben Ash (Science), Theo Marigold (Sports), Vera Solanke (Opinion). Hand-drawn duotone portrait avatars.
- **Editor agent** scans the wire each run via Anthropic's hosted `web_search` and assigns one story per writer.
- **Writer agent** drafts BOTH variants of each piece in a single call — same researched event, two timelines.
- **Reading trail sidebar** on every article — the writer's method + the actual sources, sticky as you scroll.
- **Per-article chat** — the persona answers in character with full access to the article and research notes. Mode-aware (Sigma chats use the parallel handle).
- **Feedback** — five dimensions (style, storytelling, format, content, relevance), three verdicts (worth it / skip / more like this), free-text note. Stored per-mode and folded back into that writer's next prompt.
- **Masthead modal** — review the writers themselves; star ratings + tap-to-talk.
- **My Edition drawer** — name, city, topics, tone, length, visual weight, reading level, local priority slider, banned topics, expectations.
- **Display ads** + **classifieds** (LOST & FOUND, LESSONS, YARD SALE, PERSONALS), each with paired real/Sigma copy.
- **Twice-daily auto-generation** via Vercel Cron (7am ET / 7pm ET in EDT).

## Stack

- Next.js 15 (App Router) + TypeScript, no Tailwind — a single hand-written stylesheet matching the design (Playfair Display + Crimson Pro + Inter + IBM Plex Mono + Major Mono Display).
- Supabase (Postgres) for personas, issues, articles (paired variants), ads, chat, feedback, preferences.
- Anthropic SDK — Opus 4.7 for article writing, Sonnet 4.6 for editor / chat / ads. Hosted `web_search` tool for grounding.

## Setup

1. `npm install`
2. Create a Supabase project. In the SQL editor, run `supabase/migrations/0001_init.sql`. This creates the schema and seeds the six writers.
3. `cp .env.example .env.local` and fill in:
   - `ANTHROPIC_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET` (`openssl rand -hex 32`) — required if you deploy with Vercel Cron
4. `npm run dev` and open `http://localhost:3000`. First load: the welcome drawer asks you to set your edition; then **Commission today's issue** kicks off the team.

## Twice-daily auto-generation

`vercel.json` schedules `/api/cron/generate` at **11:00 UTC** and **23:00 UTC** — that's 7am / 7pm America/New_York during EDT (6am / 6pm during EST).

The route is auth-gated by `CRON_SECRET` and idempotent within a 4-hour window so retries can't double-publish. The 12-hour gap between the two crons cleanly admits one issue each.

To trigger one manually:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" "$BASE_URL/api/cron/generate"
```

## Generate-issue flow

1. Editor agent calls `web_search` to scan recent news, then assigns one story per writer based on reader prefs.
2. Each writer agent runs in parallel: `web_search` → drafts BOTH the real and the Sigma version of the same story in one call (single XML response).
3. Ad Desk agent writes 4 display ads + 4 classifieds, each in both registers.
4. Issue is marked published. The reader's `/` route shows the latest published issue; the toggle flips registers without a network call (both variants are already in the DB).

## File layout

```
app/
  page.tsx                       # latest issue (or EmptyPress onboarding)
  layout.tsx
  globals.css                    # the full magazine stylesheet
  api/
    issues/generate/route.ts     # manual generation
    issues/[id]/route.ts         # fetch issue
    cron/generate/route.ts       # twice-daily cron, gated by CRON_SECRET
    articles/[id]/chat/route.ts  # chat with the persona (mode-aware)
    feedback/route.ts            # article (mode-tagged) + persona feedback
    preferences/route.ts         # GET/POST My Edition
    personas/route.ts
components/
  MagazineApp.tsx                # client orchestrator: mode flip, modals, layout
  EmptyPress.tsx                 # cover-style onboarding when no issue exists
  Cover.tsx                      # masthead, vol/no, lead headline, cover art
  CoverArt.tsx                   # hand-drawn duotone SVG (real + Sigma)
  Article.tsx                    # kicker · headline · dek · byline · body · research · feedback
  Byline.tsx
  ResearchNote.tsx               # method + sources sidebar
  FeedbackBlock.tsx              # 5 dimensions + 3 verdicts + comment
  DisplayAd.tsx
  Classifieds.tsx
  Colophon.tsx
  AgentAvatar.tsx                # SVG portraits, paper-grain pattern
  ChatModal.tsx                  # bottom-sheet chat with starter prompts
  PrefsDrawer.tsx                # My Edition (onboarding + ongoing)
  MastheadModal.tsx              # masthead grid with rate-this-writer
  UtilityBar.tsx                 # sticky top: Masthead · mode toggle · stamp
lib/
  agents/
    personas.ts                  # CRUD for writers
    editor.ts                    # plans + assembles an issue
    writer.ts                    # writes BOTH variants in one call
    chat.ts                      # in-character chat (mode-aware)
    ad-writer.ts                 # display ads + classifieds (both registers)
  anthropic.ts                   # client + web_search tool config
  personalize.ts                 # prefs + recent feedback into prompts
  supabase/{server,client}.ts
  types.ts
supabase/migrations/0001_init.sql
vercel.json                      # twice-daily cron
```

## What's stubbed (v1)

- **Auth** — single-user mode with a fixed `DEFAULT_USER_ID`. Add Supabase Auth before going public.
- **Image generation** — no per-article art yet; the cover SVG is hand-drawn.
- **Animated/voice avatars** — the design is text-only; the SVG portraits are static.
- **Tweaks panel** (density / show-ads / show-research) from the original design isn't ported; can be added back as a CSS-only overlay if useful.

## Costs

Per issue: ~6 writer calls (Opus 4.7, each with `web_search`) + 1 editor call (Sonnet) + 1 ad call (Sonnet) + 1 classifieds call (Sonnet). Roughly **$1–$3 per issue** depending on how aggressively the writers search. Twice a day = $2–$6/day. Drop `MODEL` in `lib/anthropic.ts` to `MODEL_FAST` to cut writing cost by ~5×.
