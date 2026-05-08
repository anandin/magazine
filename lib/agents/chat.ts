import { anthropic, MODEL_FAST } from "@/lib/anthropic";
import { supabaseServer, DEFAULT_USER_ID } from "@/lib/supabase/server";
import { getPersonaById } from "@/lib/agents/personas";
import type { Article, ChatMessage, Persona, Source } from "@/lib/types";

interface ChatArgs {
  articleId: string;
  userMessage: string;
  userId?: string;
}

export async function chatWithPersona(
  args: ChatArgs,
): Promise<{ reply: string; persona: Persona; article: Article }> {
  const userId = args.userId ?? DEFAULT_USER_ID;
  const sb = supabaseServer();

  const { data: article } = await sb
    .from("articles")
    .select("*")
    .eq("id", args.articleId)
    .single();
  if (!article) throw new Error("Article not found");

  const persona = await getPersonaById(article.persona_id);
  if (!persona) throw new Error("Persona not found");

  const { data: history } = await sb
    .from("chat_messages")
    .select("*")
    .eq("article_id", args.articleId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(40);

  const sources = (article.sources as Source[]) ?? [];
  const sourceList = sources.length
    ? sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`).join("\n")
    : "(no sources cited)";

  const system = `${persona.system_prompt}

You are answering reader questions about an article you wrote. Stay in character. You have access to the article body, your private research notes, and the source list. If a reader asks something you don't know or didn't research, say so plainly — don't invent. Keep replies conversational, 1-3 short paragraphs.

ARTICLE: "${article.headline}"
${article.dek ? `(${article.dek})` : ""}

YOUR RESEARCH NOTES (private):
${article.research_notes || "(none)"}

ARTICLE BODY:
${article.body_md}

SOURCES:
${sourceList}`;

  const messages = [
    ...((history ?? []) as ChatMessage[]).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: args.userMessage },
  ];

  const response = await anthropic().messages.create({
    model: MODEL_FAST,
    max_tokens: 800,
    system,
    messages,
  });

  const reply = response.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  await sb.from("chat_messages").insert([
    {
      user_id: userId,
      article_id: args.articleId,
      role: "user",
      content: args.userMessage,
    },
    {
      user_id: userId,
      article_id: args.articleId,
      role: "assistant",
      content: reply,
    },
  ]);

  return { reply, persona, article: article as Article };
}
