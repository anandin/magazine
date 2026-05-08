import { notFound } from "next/navigation";
import Link from "next/link";
import { getPersona } from "@/lib/agents/personas";
import { supabaseServer } from "@/lib/supabase/server";
import { PersonaAvatar } from "@/components/PersonaAvatar";
import { PersonaReview } from "./PersonaReview";
import type { PersonaSlug } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PersonaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const persona = await getPersona(slug as PersonaSlug);
  if (!persona) notFound();
  const sb = supabaseServer();
  const [{ data: articles }, { data: reviews }] = await Promise.all([
    sb
      .from("articles")
      .select("id, headline, dek, mode, created_at, issue_id")
      .eq("persona_id", persona.id)
      .order("created_at", { ascending: false })
      .limit(20),
    sb
      .from("persona_feedback")
      .select("rating, notes, created_at")
      .eq("persona_id", persona.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-start gap-5 border-b border-rule pb-6 mb-6">
        <PersonaAvatar persona={persona} size={96} />
        <div>
          <div className="text-xs uppercase tracking-widest text-ink/60">
            {persona.section}
          </div>
          <h1 className="font-display text-4xl">{persona.name}</h1>
          <p className="text-ink/80 mt-2 max-w-2xl">{persona.bio}</p>
          <p className="text-ink/60 italic mt-1 text-sm">Voice: {persona.voice}</p>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="font-display text-2xl mb-3">Recent files</h2>
        {(!articles || articles.length === 0) && (
          <p className="text-ink/60 italic">Nothing on the wire yet.</p>
        )}
        <ul className="space-y-3">
          {(articles ?? []).map((a) => (
            <li key={a.id} className="border-b border-rule pb-3">
              <Link
                href={`/article/${a.id}`}
                className="font-display text-lg hover:text-accent"
              >
                {a.headline}
              </Link>
              {a.dek && <div className="text-sm italic text-ink/70">{a.dek}</div>}
              <div className="text-xs text-ink/60 mt-1">
                {a.mode === "parallel" ? "parallel universe" : "real news"} ·{" "}
                {new Date(a.created_at).toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-display text-2xl mb-3">Review {persona.name.split(" ")[0]}</h2>
          <PersonaReview personaId={persona.id} />
        </div>
        <div>
          <h2 className="font-display text-2xl mb-3">Recent reviews</h2>
          {(!reviews || reviews.length === 0) && (
            <p className="text-ink/60 italic">No reviews yet.</p>
          )}
          <ul className="space-y-3">
            {(reviews ?? []).map((r, i) => (
              <li key={i} className="border border-rule p-3">
                <div className="text-sm">{"★".repeat(r.rating ?? 0)}</div>
                {r.notes && <p className="text-sm mt-1">{r.notes}</p>}
                <div className="text-xs text-ink/50 mt-1">
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
