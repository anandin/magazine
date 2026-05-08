"use client";

import { useEffect, useState } from "react";
import { AgentAvatar } from "./AgentAvatar";
import type { Mode, Persona } from "@/lib/types";

interface Props {
  open: boolean;
  mode: Mode;
  agents: Persona[];
  onClose: () => void;
  onOpenAgent: (a: Persona) => void;
}

export function MastheadModal({
  open,
  mode,
  agents,
  onClose,
  onOpenAgent,
}: Props) {
  if (!open) return null;
  return (
    <div className="mag-drawer-scrim" onClick={onClose}>
      <div className="mag-masthead-modal" onClick={(e) => e.stopPropagation()}>
        <header className="mag-drawer-head">
          <div>
            <h2>The Masthead</h2>
            <p>
              Six writers. Each piece in the issue is theirs. You can review them, and
              you can talk with them about what they wrote.
            </p>
          </div>
          <button type="button" className="mag-chat-x" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="mag-masthead-grid">
          {agents.map((a) => (
            <AgentCard
              key={a.id}
              agent={a}
              mode={mode}
              onOpen={() => onOpenAgent(a)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AgentCard({
  agent,
  mode,
  onOpen,
}: {
  agent: Persona;
  mode: Mode;
  onOpen: () => void;
}) {
  const parallel = mode === "parallel";
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setScore(0);
  }, [agent.id]);

  async function setS(n: number) {
    const v = n === score ? 0 : n;
    setScore(v);
    if (v === 0) return;
    setBusy(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "persona",
          target_id: agent.id,
          rating: v,
        }),
      });
    } finally {
      setBusy(false);
    }
  }

  const handle = parallel ? agent.parallel_handle : agent.name;
  const firstName = agent.name.split(" ")[0];
  return (
    <div className="mag-masthead-card">
      <div className="mag-masthead-card-top">
        <AgentAvatar
          agent={agent}
          size={72}
          parallel={parallel}
          onClick={onOpen}
          ring
        />
        <div>
          <div className="mag-masthead-card-name">{handle}</div>
          <div className="mag-masthead-card-beat">{agent.beat}</div>
          <div className="mag-masthead-card-years">
            {agent.years_on_beat} years on beat
          </div>
        </div>
      </div>
      <p className="mag-masthead-card-bio">
        {parallel ? agent.parallel_bio : agent.bio}
      </p>
      <p className="mag-masthead-card-voice">
        <b>Voice.</b> {agent.voice}
      </p>
      <div className="mag-masthead-card-foot">
        <div className="mag-masthead-card-rate">
          <span>Rate this writer</span>
          <div className="mag-fb-dim-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="mag-fb-star"
                data-on={score >= n}
                onClick={() => setS(n)}
                disabled={busy}
              >
                ●
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="mag-masthead-card-talk" onClick={onOpen}>
          Talk with {firstName} →
        </button>
      </div>
    </div>
  );
}
