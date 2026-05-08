"use client";

import type { Persona, Source } from "@/lib/types";

interface Props {
  agent: Persona;
  sources: Source[];
}

export function ResearchNote({ agent, sources }: Props) {
  const list =
    sources.length > 0
      ? sources.map((s, i) => (
          <li key={i}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.title}
            </a>
          </li>
        ))
      : agent.sources_template.map((s, i) => <li key={i}>{s}</li>);

  return (
    <aside className="mag-research">
      <div className="mag-research-head">Reporting trail · {agent.name}</div>
      <div className="mag-research-method">{agent.method}</div>
      <ol className="mag-research-list">{list}</ol>
    </aside>
  );
}
