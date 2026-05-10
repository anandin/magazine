import { supabaseServer } from "@/lib/supabase/server";
import type { Preferences } from "@/lib/types";

export type UsageKind = "regen" | "chat";

// Free vs premium daily allowance per kind. Tweak as we learn.
const LIMITS: Record<"free" | "premium", Record<UsageKind, number>> = {
  free: { regen: 2, chat: 50 },
  premium: { regen: 20, chat: 1000 },
};

export interface UsageDecision {
  ok: boolean;
  remaining: number;
  limit: number;
  tier: "free" | "premium";
}

// Bump usage by 1 atomically, then check whether the user is at or under
// their limit. Bumping first means a hot-loop client can't beat us with
// concurrent requests.
export async function bumpAndCheck(
  userId: string,
  kind: UsageKind,
  prefsTier?: "free" | "premium",
): Promise<UsageDecision> {
  const sb = supabaseServer();

  let tier: "free" | "premium" = prefsTier ?? "free";
  if (!prefsTier) {
    const { data } = await sb
      .from("preferences")
      .select("tier")
      .eq("user_id", userId)
      .maybeSingle();
    tier = ((data as Pick<Preferences, "tier"> | null)?.tier ?? "free") as
      | "free"
      | "premium";
  }
  const limit = LIMITS[tier][kind];

  const { data: post, error } = await sb.rpc("bump_usage", {
    p_user: userId,
    p_kind: kind,
  });
  if (error) {
    // Fail open if the counter itself broke; we'd rather serve a request
    // than wedge the app on a transient DB error.
    return { ok: true, remaining: limit, limit, tier };
  }
  const count = (post as number) ?? 1;
  const remaining = Math.max(0, limit - count);
  return { ok: count <= limit, remaining, limit, tier };
}

export async function getRemaining(
  userId: string,
  kind: UsageKind,
  tier: "free" | "premium" = "free",
): Promise<number> {
  const sb = supabaseServer();
  const { data } = await sb
    .from("daily_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("day", new Date().toISOString().slice(0, 10))
    .eq("kind", kind)
    .maybeSingle();
  const used = (data as { count?: number } | null)?.count ?? 0;
  return Math.max(0, LIMITS[tier][kind] - used);
}
