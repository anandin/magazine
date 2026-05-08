import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { ArticleBody } from "@/components/Article";
import { ChatPanel } from "@/components/ChatPanel";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { PersonaAvatar } from "@/components/PersonaAvatar";
import type { Article, Persona } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = supabaseServer();
  const { data } = await sb
    .from("articles")
    .select("*, personas(*)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  const article = data as Article & { personas: Persona };
  const persona = article.personas;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <Link
          href={`/issue/${article.issue_id}`}
          className="text-sm text-ink/60 hover:text-accent"
        >
          ← back to the issue
        </Link>
        <div className="mt-4">
          <ArticleBody article={article} persona={persona} />
        </div>
        <div className="mt-10">
          <FeedbackWidget articleId={article.id} />
        </div>
      </div>
      <aside className="space-y-6">
        <div className="border border-rule p-4 bg-white/40">
          <div className="flex items-center gap-3">
            <PersonaAvatar persona={persona} size={48} />
            <div>
              <div className="font-display text-lg leading-tight">
                {persona.name}
              </div>
              <div className="text-xs uppercase tracking-widest text-ink/60">
                {persona.section}
              </div>
            </div>
          </div>
          <p className="text-sm text-ink/80 mt-3">{persona.bio}</p>
          <Link
            href={`/personas/${persona.slug}`}
            className="text-xs underline text-ink/60 mt-2 inline-block"
          >
            Review this writer →
          </Link>
        </div>
        <ChatPanel articleId={article.id} persona={persona} />
      </aside>
    </div>
  );
}
