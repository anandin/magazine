"use client";

import { CoverArt } from "./CoverArt";
import type { Article, Issue, Mode, Preferences } from "@/lib/types";
import { variantOf } from "@/lib/agents/writer";

interface Props {
  issue: Issue;
  articles: Article[];
  prefs: Preferences;
  mode: Mode;
  onScrollIn: () => void;
}

export function Cover({ issue, articles, prefs, mode, onScrollIn }: Props) {
  const parallel = mode === "parallel";
  const lead = articles[0];
  const leadV = lead ? variantOf(lead, mode) : null;
  const date = new Date(
    issue.published_at ?? issue.created_at,
  ).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="mag-cover">
      <div className="mag-cover-rule mag-cover-rule-top" />
      <div className="mag-cover-meta">
        <span>Vol. LIV · No. {issue.issue_number}</span>
        <span>{date}</span>
        <span>
          {prefs.name ? `For ${prefs.name}` : "For the discerning reader"} ·{" "}
          {prefs.city}
        </span>
      </div>
      <div className="mag-cover-rule" />
      <h1 className="mag-masthead">
        The Cedar Hollow Sentinel
        {parallel && <span className="mag-masthead-sigma"> Σ</span>}
      </h1>
      <div className="mag-cover-tagline">
        {parallel
          ? "“The news as it might have been, told by the same writers, in a different draft.”"
          : "“Reported on foot. Edited on paper. Printed for the people who actually read.”"}
      </div>
      <div className="mag-cover-rule" />

      {leadV && (
        <div className="mag-cover-lead">
          <div className="mag-cover-lead-section">
            <div className="mag-cover-lead-kicker">{leadV.kicker}</div>
            <h2 className="mag-cover-lead-headline">{leadV.headline}</h2>
            <p className="mag-cover-lead-dek">{leadV.dek}</p>
            <button
              type="button"
              className="mag-cover-lead-jump"
              onClick={onScrollIn}
            >
              Begin reading ↓
            </button>
          </div>
          <div className="mag-cover-lead-art">
            <CoverArt parallel={parallel} />
          </div>
        </div>
      )}

      <div className="mag-cover-rule" />
      <div className="mag-cover-index">
        <span>
          <b>Inside:</b>
        </span>{" "}
        {articles.map((a, i) => {
          const v = variantOf(a, mode);
          const short = v.headline.split(";")[0].split(",")[0];
          return (
            <span key={a.id}>
              <a href={`#a-${a.id}`}>{short}</a>
              {i < articles.length - 1 && (
                <span className="mag-cover-index-dot"> · </span>
              )}
            </span>
          );
        })}
      </div>
      <div className="mag-cover-rule mag-cover-rule-bot" />
    </header>
  );
}
