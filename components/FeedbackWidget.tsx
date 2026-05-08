"use client";

import { useState } from "react";

const DIMENSIONS = [
  { key: "style_score", label: "Style" },
  { key: "storytelling_score", label: "Storytelling" },
  { key: "format_score", label: "Format" },
  { key: "content_score", label: "Content" },
  { key: "relevance_score", label: "Relevance" },
] as const;

export function FeedbackWidget({ articleId }: { articleId: string }) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [liked, setLiked] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "article",
          target_id: articleId,
          liked: liked ?? undefined,
          ...scores,
          notes,
        }),
      });
      if (res.ok) setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="border border-rule p-4 text-sm italic text-ink/70">
        Thanks — the team will see it before the next issue.
      </div>
    );
  }

  return (
    <div className="border border-rule p-4 bg-white/40">
      <div className="font-display text-lg mb-3">How was this piece?</div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setLiked(true)}
          className={`px-3 py-1 border ${liked === true ? "bg-ink text-paper" : "border-rule"}`}
        >
          Liked it
        </button>
        <button
          onClick={() => setLiked(false)}
          className={`px-3 py-1 border ${liked === false ? "bg-ink text-paper" : "border-rule"}`}
        >
          Didn't land
        </button>
      </div>
      <div className="space-y-2 mb-4 text-sm">
        {DIMENSIONS.map((d) => (
          <div key={d.key} className="flex items-center gap-2">
            <label className="w-28 text-ink/70">{d.label}</label>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setScores({ ...scores, [d.key]: n })}
                className={`w-7 h-7 border ${
                  scores[d.key] === n
                    ? "bg-accent text-paper border-accent"
                    : "border-rule"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        ))}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        placeholder="Anything specific — pacing, sources, voice?"
        className="w-full border border-rule p-2 bg-paper text-sm"
      />
      <button
        onClick={submit}
        disabled={submitting}
        className="mt-3 bg-ink text-paper px-4 py-1.5 text-sm uppercase tracking-wider disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send feedback"}
      </button>
    </div>
  );
}
