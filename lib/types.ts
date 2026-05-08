export type Mode = "real" | "parallel";

export type AgentSlug =
  | "voss"
  | "kenji"
  | "okafor"
  | "ash"
  | "marigold"
  | "solanke";

export interface Persona {
  id: string;
  slug: AgentSlug;
  name: string;
  beat: string;
  initials: string;
  color: string;
  portrait_tone: string;
  years_on_beat: number;
  bio: string;
  voice: string;
  method: string;
  parallel_handle: string;
  parallel_bio: string;
  sources_template: string[];
  system_prompt: string;
}

export interface Source {
  title: string;
  url: string;
}

export interface ArticleVariant {
  kicker: string;
  headline: string;
  dek: string;
  body: string[];
  sources: Source[];
  research_notes: string;
}

export interface Article {
  id: string;
  issue_id: string;
  agent_id: string;
  section: string;
  position: number;

  real_kicker: string | null;
  real_headline: string;
  real_dek: string | null;
  real_body: string[];
  real_sources: Source[];
  real_research_notes: string;

  parallel_kicker: string | null;
  parallel_headline: string;
  parallel_dek: string | null;
  parallel_body: string[];
  parallel_sources: Source[];
  parallel_research_notes: string;

  created_at: string;
}

export interface Issue {
  id: string;
  user_id: string;
  issue_number: number;
  title: string;
  cover_blurb: string | null;
  status: "draft" | "published";
  created_at: string;
  published_at: string | null;
}

export interface Ad {
  id: string;
  issue_id: string;
  kind: "display" | "classified";
  category: string | null;
  position: number;

  real_headline: string | null;
  real_tagline: string | null;
  real_body: string;
  real_meta: string | null;

  parallel_headline: string | null;
  parallel_tagline: string | null;
  parallel_body: string;
  parallel_meta: string | null;
}

export interface Preferences {
  user_id: string;
  name: string;
  city: string;
  topics: string[];
  tone: "as-written" | "dry" | "witty" | "deep-dive" | "snappy";
  length: "short" | "medium" | "long";
  visual_weight: "text-heavy" | "balanced" | "image-heavy";
  reading_level: "skim" | "engaged-adult" | "wonk";
  local_priority: number;
  banned: string[];
  expectations: string;
  default_mode: Mode;
  onboarded: boolean;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  article_id: string;
  mode: Mode;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}
