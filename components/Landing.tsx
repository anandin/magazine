"use client";

import { AvatarDefs, AgentAvatar } from "./AgentAvatar";
import { CoverArt } from "./CoverArt";
import { SignInButton } from "./SignInButton";
import type { Persona } from "@/lib/types";

// Anonymous landing — what unsigned-in visitors see at /. The masthead, the
// team, the pitch, and the sign-in CTA. Same paper aesthetic as the issue
// pages so the brand reads consistent before and after auth.
export function Landing({ agents }: { agents: Persona[] }) {
  return (
    <div className="mag-root mag-real">
      <AvatarDefs />
      <div className="mag-paper">
        <header className="mag-cover">
          <div className="mag-cover-rule mag-cover-rule-top" />
          <div className="mag-cover-meta">
            <span>Vol. LIV · No. 1</span>
            <span>A magazine for one reader at a time</span>
            <span>Sign in to commission yours</span>
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
                A small magazine, written for you, by a team you can talk to.
              </h2>
              <p className="mag-cover-lead-dek">
                Six writers — Politics, Tech, Culture, Science, Sports, Opinion —
                file two drafts of every story: a real one, and a Sigma-timeline
                one. Your edition is shaped by your city, your topics, your tone.
                You can chat with the writer about any piece. Sign in and the
                team will commission your first issue in about two minutes.
              </p>
              <SignInButton label="Sign in with Google →" />
              <p
                style={{
                  marginTop: 14,
                  fontFamily: "var(--sans)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                }}
              >
                Free tier: 2 fresh issues per day, 50 chat messages. No card
                required.
              </p>
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
                margin: "0 0 4px",
                fontSize: 28,
              }}
            >
              The Masthead
            </h3>
            <p
              style={{
                fontFamily: "var(--sans)",
                fontSize: 12,
                color: "var(--ink-mute)",
                margin: "0 0 16px",
              }}
            >
              Six writers. Distinct voices. You can talk back to every one.
            </p>
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

          <div className="mag-cover-rule" />

          <div style={{ padding: "24px 0", textAlign: "center" }}>
            <SignInButton label="Sign in to commission your first issue →" />
          </div>

          <div className="mag-cover-rule mag-cover-rule-bot" />
        </header>
      </div>
    </div>
  );
}
