import { supabaseServer } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/supabase/auth";
import { getPreferences } from "@/lib/personalize";
import { listPersonas } from "@/lib/agents/personas";
import { MagazineApp } from "@/components/MagazineApp";
import { EmptyPress } from "@/components/EmptyPress";
import { Landing } from "@/components/Landing";
import type { Ad, Article, Issue, Persona } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const agents = (await listPersonas()) as Persona[];
  const userId = await getCurrentUserId();

  // Anonymous → marketing landing. Sign in to do anything else.
  if (!userId) {
    return <Landing agents={agents} />;
  }

  const sb = supabaseServer();
  const [{ data: latest }, prefs] = await Promise.all([
    sb
      .from("issues")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getPreferences(userId),
  ]);

  // Signed in but no issue yet → onboarding cover with "commission first issue".
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
      agents={agents}
      prefs={prefs}
    />
  );
}
