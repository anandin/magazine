"use client";

import { useState } from "react";

export function PersonaReview({ personaId }: { personaId: string }) {
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!rating) return;
    setBusy(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "persona",
          target_id: personaId,
          rating,
          notes,
        }),
      });
      if (res.ok) setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="border border-rule p-3 text-sm italic text-ink/70">
        Filed. Thanks.
      </div>
    );
  }

  return (
    <div className="border border-rule p-3">
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            className={`text-2xl ${n <= rating ? "text-accent" : "text-ink/30"}`}
            aria-label={`${n} stars`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        placeholder="What's working, what isn't?"
        className="w-full border border-rule p-2 bg-paper text-sm"
      />
      <button
        onClick={submit}
        disabled={busy || !rating}
        className="mt-2 bg-ink text-paper px-4 py-1.5 text-sm uppercase tracking-wider disabled:opacity-50"
      >
        {busy ? "Sending…" : "Submit review"}
      </button>
    </div>
  );
}
