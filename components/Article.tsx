"use client";

import { Byline } from "./Byline";
import { ResearchNote } from "./ResearchNote";
import { FeedbackBlock } from "./FeedbackBlock";
import { variantOf } from "@/lib/agents/writer";
import type { Article as ArticleT, Mode, Persona } from "@/lib/types";

interface Props {
  article: ArticleT;
  agent: Persona;
  mode: Mode;
  toneNote?: string | null;
  onTalk: (agent: Persona) => void;
}

export function Article({ article, agent, mode, toneNote, onTalk }: Props) {
  const v = variantOf(article, mode);
  return (
    <article className="mag-article" id={`a-${article.id}`}>
      <div className="mag-article-section">
        {article.section.toUpperCase()}
      </div>
      {v.kicker && <div className="mag-article-kicker">{v.kicker}</div>}
      <h1 className="mag-article-headline">{v.headline}</h1>
      {v.dek && <p className="mag-article-dek">{v.dek}</p>}
      <Byline agent={agent} mode={mode} onTalk={() => onTalk(agent)} />

      <div className="mag-article-cols">
        <div className="mag-article-body">
          {v.body.map((p, i) => (
            <p key={i} className={i === 0 ? "mag-dropcap" : undefined}>
              {p}
            </p>
          ))}
          {toneNote && (
            <div className="mag-tone-note">
              Tone preference noted: <em>{toneNote}</em>. The next issue will be drafted with that in mind.
            </div>
          )}
        </div>
        <ResearchNote agent={agent} sources={v.sources} />
      </div>

      <FeedbackBlock articleId={article.id} mode={mode} />
    </article>
  );
}
