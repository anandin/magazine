"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function SignInButton({
  label = "Sign in with Google",
  next = "/",
  className,
}: {
  label?: string;
  next?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setBusy(false);
      alert(error.message);
    }
    // On success, the OAuth flow takes over the window; no further work.
  }

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={busy}
      className={className ?? "mag-cover-lead-jump"}
    >
      {busy ? "Redirecting…" : label}
    </button>
  );
}

export function SignOutButton({ className }: { className?: string }) {
  async function signOut() {
    const sb = supabaseBrowser();
    await sb.auth.signOut();
    window.location.href = "/";
  }
  return (
    <button
      type="button"
      onClick={signOut}
      className={className ?? "mag-util-left-button"}
      style={{
        background: "transparent",
        color: "inherit",
        border: "1px solid rgba(255,255,255,.18)",
        padding: "6px 12px",
        borderRadius: 999,
        letterSpacing: ".04em",
        fontFamily: "var(--sans)",
        fontSize: 12,
      }}
    >
      Sign out
    </button>
  );
}
