"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarDefs, AgentAvatar } from "./AgentAvatar";
import { PrefsDrawer } from "./PrefsDrawer";
import { CoverArt } from "./CoverArt";
import type { Persona, Preferences } from "@/lib/types";

// Shown when no issue exists yet. Onboards the reader and lets them kick off
// the first issue manually (the cron will handle subsequent ones).
export function EmptyPress({
  prefs: initialPrefs,
  agents,
}: {
  prefs: Preferences;
  agents: Persona[];
}) {
  const router = useRouter();
  const [prefs, setPrefs] = useState(initialPrefs);
  const [drawerOpen, setDrawerOpen] = useState(!initialPrefs.onboarded);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>("");

  async function savePrefs(next: Preferences) {
    setPrefs(next);
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: next.name,
        city: next.city,
        topics: next.topics,
        tone: next.tone,
        length: next.length,
        visual_weight: next.visual_weight,
        reading_level: next.reading_level,
        local_priority: next.local_priority,
        banned: next.banned,
        expectations: next.expectations,
        default_mode: next.default_mode,
        onboarded: true,
      }),
    });
  }

  async function generate() {
    setBusy(true);
    setProgress("The team is gathering the morning's news…");
    try {
      const res = await fetch("/api/issues/generate", { method: "POST" });
      const json = await res.json();
      if (json.issue_id) {
        router.refresh();
      } else {
        setProgress(`Trouble: ${json.error ?? "unknown"}`);
      }
    } catch (e) {
      setProgress("Couldn't reach the wire. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mag-root mag-real">
      <AvatarDefs />
      <div className="mag-paper">
        <header className="mag-cover">
          <div className="mag-cover-rule mag-cover-rule-top" />
          <div className="mag-cover-meta">
            <span>Vol. LIV · No. 218</span>
            <span>The first issue</span>
            <span>
              {prefs.name ? `For ${prefs.name}` : "Getting ready for the press"}
            </span>
          </div>
          <div className="mag-cover-rule" />
          <h1 className="mag-masthead">The Cedar Hollow Sentinel</h1>
          <div className="mag-cover-tagline">
            “Reported on foot. Edited on paper. Printed for the people who actually
            read.”
          </div>
          <div className="mag-cover-rule" />

          <div className="mag-cover-lead">
            <div className="mag-cover-lead-section">
              <div className="mag-cover-lead-kicker">FROM THE EDITOR</div>
              <h2 className="mag-cover-lead-headline">
                The press is warm. The team is here. We just need a story.
              </h2>
              <p className="mag-cover-lead-dek">
                {prefs.onboarded
                  ? "Hit the button below to commission today's issue. Our six writers will scan the wire, file their drafts (real and Sigma both), and the Ad Desk will set the classifieds."
                  : "Set your edition first — the writers want to know what you read for. Then we'll go to press."}
              </p>
              {prefs.onboarded ? (
                <button
                  className="mag-cover-lead-jump"
                  onClick={generate}
                  disabled={busy}
                >
                  {busy ? "Going to press…" : "Commission today's issue →"}
                </button>
              ) : (
                <button
                  className="mag-cover-lead-jump"
                  onClick={() => setDrawerOpen(true)}
                >
                  Set my edition →
                </button>
              )}
              {progress && (
                <p
                  style={{
                    marginTop: 16,
                    fontFamily: "var(--sans)",
                    fontSize: 12,
                    color: "var(--ink-mute)",
                  }}
                >
                  {progress}
                </p>
              )}
            </div>
            <div className="mag-cover-lead-art">
              <CoverArt parallel={false} />
            </div>
          </div>

          <div className="mag-cover-rule" />
          <div style={{ padding: "24px 0" }}>
            <h3
              style={{
                fontFamily: "var(--serif-display)",
                fontWeight: 800,
                margin: "0 0 16px",
                fontSize: 28,
              }}
            >
              The Masthead
            </h3>
            <div className="mag-masthead-grid">
              {agents.map((a) => (
                <div key={a.id} className="mag-masthead-card">
                  <div className="mag-masthead-card-top">
                    <AgentAvatar agent={a} size={64} />
                    <div>
                      <div className="mag-masthead-card-name">{a.name}</div>
                      <div className="mag-masthead-card-beat">{a.beat}</div>
                      <div className="mag-masthead-card-years">
                        {a.years_on_beat} years on beat
                      </div>
                    </div>
                  </div>
                  <p className="mag-masthead-card-bio">{a.bio}</p>
                  <p className="mag-masthead-card-voice">
                    <b>Voice.</b> {a.voice}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="mag-cover-rule mag-cover-rule-bot" />
        </header>
      </div>

      <PrefsDrawer
        open={drawerOpen}
        prefs={prefs}
        firstRun={!prefs.onboarded}
        onClose={() => setDrawerOpen(false)}
        onSave={savePrefs}
        onRegenerate={generate}
      />
    </div>
  );
}
