import Link from "next/link";
import { supabaseServer, DEFAULT_USER_ID } from "@/lib/supabase/server";
import { getPreferences } from "@/lib/personalize";
import { ModeToggle } from "@/components/ModeToggle";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sb = supabaseServer();
  const prefs = await getPreferences();
  const { data: latest } = await sb
    .from("issues")
    .select("id, title, cover_blurb, mode, published_at, created_at")
    .eq("user_id", DEFAULT_USER_ID)
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <section className="border-b border-rule pb-8 mb-8">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-5xl md:text-6xl leading-none">
              The Parallel Press
            </h1>
            <p className="text-ink/70 mt-2 max-w-xl">
              A small, opinionated magazine. A team of writers — each with a
              voice — assemble each issue from what's actually happening, and
              sometimes from what could be.
            </p>
          </div>
          <ModeToggle defaultMode={prefs.default_mode} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl mb-4">Recent issues</h2>
        {(!latest || latest.length === 0) && (
          <p className="text-ink/60 italic">
            No issues yet. Pick a mode and hit <em>Generate issue</em> — the
            team takes a few minutes to research and file copy.
          </p>
        )}
        <div className="grid md:grid-cols-2 gap-4">
          {(latest ?? []).map((iss) => (
            <Link
              key={iss.id}
              href={`/issue/${iss.id}`}
              className="border border-rule p-5 hover:bg-white transition"
            >
              <div className="text-xs uppercase tracking-widest text-ink/60 mb-1">
                {iss.mode === "parallel" ? "Parallel universe" : "Real news"} ·{" "}
                {new Date(iss.published_at ?? iss.created_at).toLocaleDateString()}
              </div>
              <div className="font-display text-2xl leading-tight">
                {iss.title}
              </div>
              {iss.cover_blurb && (
                <p className="text-ink/70 mt-2">{iss.cover_blurb}</p>
              )}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
