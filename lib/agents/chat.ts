import { anthropic, MODEL_FAST } from "@/lib/anthropic";
import { supabaseServer, DEFAULT_USER_ID } from "@/lib/supabase/server";
import { getPersonaById } from "@/lib/agents/personas";
import { variantOf } from "@/lib/agents/writer";
import type {
  Article,
  ChatMessage,
  Mode,
  Persona,
  Source,
} from "@/lib/types";

interface ChatArgs {
  articleId: string;
  mode: Mode;
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

  const persona = await getPersonaById(article.agent_id);
  if (!persona) throw new Error("Persona not found");

  const v = variantOf(article as Article, args.mode);

  const { data: history } = await sb
    .from("chat_messages")
    .select("*")
    .eq("article_id", args.articleId)
    .eq("mode", args.mode)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(40);

  const sourceList = v.sources.length
    ? v.sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`).join("\n")
    : "(no sources cited)";

  const handle =
    args.mode === "parallel" ? persona.parallel_handle : persona.name;

  const system = `${persona.system_prompt}

You are answering reader questions about an article you wrote. Stay in character as ${handle}. Keep replies under 90 words. No lists. No headers. Conversational.${
    args.mode === "parallel"
      ? `\nYou are speaking as your Sigma-timeline counterpart. Lean into the parallel framing while keeping your underlying voice and method.`
      : ""
  }

ARTICLE: "${v.headline}"
${v.dek ? `(${v.dek})` : ""}

YOUR PRIVATE RESEARCH NOTES:
${v.research_notes || "(none)"}

ARTICLE BODY:
${v.body.join("\n\n")}

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
    max_tokens: 600,
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
      mode: args.mode,
      role: "user",
      content: args.userMessage,
    },
    {
      user_id: userId,
      article_id: args.articleId,
      mode: args.mode,
      role: "assistant",
      content: reply,
    },
  ]);

  return { reply, persona, article: article as Article };
}
