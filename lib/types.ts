export type Mode = "real" | "parallel";

export type PersonaSlug =
  | "mara-okafor"
  | "june-takeda"
  | "rafa-mendes"
  | "kennedy-park"
  | "sal-romero"
  | "ad-desk";

export interface Persona {
  id: string;
  slug: PersonaSlug;
  name: string;
  section: string;
  bio: string;
  voice: string;
  system_prompt: string;
  avatar_url: string | null;
}

export interface Source {
  title: string;
  url: string;
}

export interface Article {
  id: string;
  issue_id: string;
  persona_id: string;
  mode: Mode;
  section: string;
  headline: string;
  dek: string | null;
  body_md: string;
  research_notes: string | null;
  sources: Source[];
  created_at: string;
}

export interface Issue {
  id: string;
  user_id: string;
  mode: Mode;
  title: string;
  cover_blurb: string | null;
  status: "draft" | "published";
  created_at: string;
  published_at: string | null;
}

export interface Ad {
  id: string;
  issue_id: string;
  advertiser: string;
  copy: string;
  cta: string | null;
  size: "half" | "quarter" | "banner";
}

export interface Preferences {
  user_id: string;
  preferred_sections: string[];
  style_notes: string;
  expectations: string;
  default_mode: Mode;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  article_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ArticleFeedback {
  liked?: boolean;
  style_score?: number;
  storytelling_score?: number;
  format_score?: number;
  content_score?: number;
  relevance_score?: number;
  notes?: string;
}
