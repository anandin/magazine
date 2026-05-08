"use client";

import { AgentAvatar } from "./AgentAvatar";
import type { Mode, Persona } from "@/lib/types";

interface Props {
  agent: Persona;
  mode: Mode;
  onTalk: () => void;
}

export function Byline({ agent, mode, onTalk }: Props) {
  const parallel = mode === "parallel";
  const handle = parallel ? agent.parallel_handle : agent.name;
  const firstName = handle.split(" ")[0].replace(/[.-Σ]+$/, "") || handle;
  return (
    <div className="mag-byline">
      <AgentAvatar agent={agent} size={44} parallel={parallel} onClick={onTalk} />
      <div className="mag-byline-meta">
        <div className="mag-byline-name">By {handle}</div>
        <div className="mag-byline-beat">
          {agent.beat} · {agent.years_on_beat} yrs on beat
        </div>
      </div>
      <button type="button" className="mag-byline-talk" onClick={onTalk}>
        Ask {firstName} →
      </button>
    </div>
  );
}
