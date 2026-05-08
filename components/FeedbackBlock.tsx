"use client";

import { useState } from "react";
import type { Mode } from "@/lib/types";

const FEEDBACK_DIMS = [
  { id: "style", label: "Style" },
  { id: "storytelling", label: "Storytelling" },
  { id: "format", label: "Format" },
  { id: "content", label: "Content" },
  { id: "relevance", label: "Relevance" },
] as const;

type DimId = (typeof FEEDBACK_DIMS)[number]["id"];
type Verdict = "up" | "down" | "more" | null;

interface State {
  verdict: Verdict;
  scores: Partial<Record<DimId, number>>;
  comment: string;
}

export function FeedbackBlock({
  articleId,
  mode,
}: {
  articleId: string;
  mode: Mode;
}) {
  const [state, setState] = useState<State>({
    verdict: null,
    scores: {},
    comment: "",
  });
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function setDim(id: DimId, v: number) {
    setState((s) => ({
      ...s,
      scores: { ...s.scores, [id]: s.scores[id] === v ? 0 : v },
    }));
  }

  function setVerdict(v: Verdict) {
    setState((s) => ({ ...s, verdict: s.verdict === v ? null : v }));
  }

  async function send() {
    setBusy(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "article",
          target_id: articleId,
          mode,
          verdict: state.verdict ?? undefined,
          style_score: state.scores.style,
          storytelling_score: state.scores.storytelling,
          format_score: state.scores.format,
          content_score: state.scores.content,
          relevance_score: state.scores.relevance,
          notes: state.comment,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1400);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mag-feedback">
      <div className="mag-feedback-head">
        <span>Reader feedback</span>
        <span className="mag-feedback-sub">
          The writer reads every one before next week's draft
        </span>
      </div>
      <div className="mag-feedback-grid">
        {FEEDBACK_DIMS.map((d) => (
          <div key={d.id} className="mag-fb-dim">
            <div className="mag-fb-dim-row">
              <span className="mag-fb-dim-lbl">{d.label}</span>
              <span className="mag-fb-dim-val">
                {state.scores[d.id] ? `${state.scores[d.id]}/5` : "—"}
              </span>
            </div>
            <div className="mag-fb-dim-stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="mag-fb-star"
                  data-on={(state.scores[d.id] ?? 0) >= n}
                  onClick={() => setDim(d.id, n)}
                  aria-label={`${d.label} ${n} of 5`}
                >
                  ●
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mag-feedback-row">
        <div className="mag-feedback-verdict">
          <button
            type="button"
            data-on={state.verdict === "up"}
            onClick={() => setVerdict("up")}
          >
            ↑ Worth it
          </button>
          <button
            type="button"
            data-on={state.verdict === "down"}
            onClick={() => setVerdict("down")}
          >
            ↓ Skip next time
          </button>
          <button
            type="button"
            data-on={state.verdict === "more"}
            onClick={() => setVerdict("more")}
          >
            ＋ More like this
          </button>
        </div>
      </div>
      <div className="mag-feedback-comment">
        <textarea
          rows={2}
          placeholder="A line to the writer — what worked, what didn't…"
          value={state.comment}
          onChange={(e) => setState((s) => ({ ...s, comment: e.target.value }))}
        />
        <button
          type="button"
          className="mag-feedback-send"
          onClick={send}
          disabled={busy}
        >
          {saved ? "Sent ✓" : busy ? "Sending…" : "Send to writer"}
        </button>
      </div>
    </div>
  );
}
