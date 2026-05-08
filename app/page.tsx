import { supabaseServer, DEFAULT_USER_ID } from "@/lib/supabase/server";
import { getPreferences } from "@/lib/personalize";
import { listPersonas } from "@/lib/agents/personas";
import { MagazineApp } from "@/components/MagazineApp";
import { EmptyPress } from "@/components/EmptyPress";
import type { Ad, Article, Issue, Persona } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sb = supabaseServer();
  const [{ data: latest }, prefs, agents] = await Promise.all([
    sb
      .from("issues")
      .select("*")
      .eq("user_id", DEFAULT_USER_ID)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getPreferences(),
    listPersonas(),
  ]);

  if (!latest) {
    return <EmptyPress prefs={prefs} agents={agents} />;
  }

  const issue = latest as Issue;
  const [{ data: articles }, { data: ads }] = await Promise.all([
    sb
      .from("articles")
      .select("*")
      .eq("issue_id", issue.id)
      .order("position", { ascending: true }),
    sb
      .from("ads")
      .select("*")
      .eq("issue_id", issue.id)
      .order("position", { ascending: true }),
  ]);

  return (
    <MagazineApp
      issue={issue}
      articles={(articles ?? []) as Article[]}
      ads={(ads ?? []) as Ad[]}
      agents={agents as Persona[]}
      prefs={prefs}
    />
  );
}
