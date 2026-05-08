import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { AdSlot } from "@/components/AdSlot";
import { PersonaAvatar } from "@/components/PersonaAvatar";
import type { Ad, Article, Issue, Persona } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ArticleWithPersona extends Article {
  personas: Persona;
}

export default async function IssuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = supabaseServer();
  const [{ data: issue }, { data: articles }, { data: ads }] = await Promise.all([
    sb.from("issues").select("*").eq("id", id).maybeSingle(),
    sb.from("articles").select("*, personas(*)").eq("issue_id", id),
    sb.from("ads").select("*").eq("issue_id", id),
  ]);
  if (!issue) notFound();

  const arts = (articles ?? []) as ArticleWithPersona[];
  const adsList = (ads ?? []) as Ad[];

  // Interleave one ad after every two articles for that local-paper feel.
  const items: (
    | { kind: "article"; data: ArticleWithPersona }
    | { kind: "ad"; data: Ad }
  )[] = [];
  let adIdx = 0;
  arts.forEach((a, i) => {
    items.push({ kind: "article", data: a });
    if ((i + 1) % 2 === 0 && adIdx < adsList.length) {
      items.push({ kind: "ad", data: adsList[adIdx++] });
    }
  });
  while (adIdx < adsList.length) {
    items.push({ kind: "ad", data: adsList[adIdx++] });
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <header className="border-b-2 border-ink pb-6 mb-8">
        <div className="text-xs uppercase tracking-widest text-ink/60 mb-1">
          {(issue as Issue).mode === "parallel"
            ? "Parallel universe edition"
            : "Real news edition"}{" "}
          ·{" "}
          {new Date(
            (issue as Issue).published_at ?? (issue as Issue).created_at,
          ).toLocaleDateString()}
        </div>
        <h1 className="font-display text-5xl leading-tight">
          {(issue as Issue).title}
        </h1>
        {(issue as Issue).cover_blurb && (
          <p className="text-ink/70 italic text-lg mt-2">
            {(issue as Issue).cover_blurb}
          </p>
        )}
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        {items.map((item, i) =>
          item.kind === "article" ? (
            <ArticlePreview key={item.data.id} article={item.data} />
          ) : (
            <AdSlot key={`ad-${i}`} ad={item.data} />
          ),
        )}
      </div>
    </div>
  );
}

function ArticlePreview({ article }: { article: ArticleWithPersona }) {
  const persona = article.personas;
  const excerpt = article.body_md
    .replace(/[#*_]/g, "")
    .split(/\n{2,}/)[0]
    .slice(0, 220);
  return (
    <Link
      href={`/article/${article.id}`}
      className="border border-rule p-5 hover:bg-white transition flex flex-col"
    >
      <div className="text-xs uppercase tracking-widest text-ink/60 mb-1">
        {article.section}
      </div>
      <h2 className="font-display text-2xl leading-tight mb-1">
        {article.headline}
      </h2>
      {article.dek && (
        <p className="italic text-ink/70 text-sm mb-3">{article.dek}</p>
      )}
      <p className="text-sm text-ink/80 line-clamp-4">{excerpt}…</p>
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-rule">
        <PersonaAvatar persona={persona} size={28} />
        <div className="text-xs text-ink/60">by {persona.name}</div>
      </div>
    </Link>
  );
}
