"use client";

import { useState } from "react";
import type { Preferences } from "@/lib/types";

export function PreferencesForm({
  initial,
  sections,
}: {
  initial: Preferences;
  sections: string[];
}) {
  const [prefs, setPrefs] = useState<Preferences>(initial);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function toggleSection(s: string) {
    setPrefs((p) => ({
      ...p,
      preferred_sections: p.preferred_sections.includes(s)
        ? p.preferred_sections.filter((x) => x !== s)
        : [...p.preferred_sections, s],
    }));
  }

  async function save() {
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          preferred_sections: prefs.preferred_sections,
          style_notes: prefs.style_notes,
          expectations: prefs.expectations,
          default_mode: prefs.default_mode,
        }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm uppercase tracking-widest text-ink/60 mb-2">
          Favorite sections
        </label>
        <div className="flex flex-wrap gap-2">
          {sections.map((s) => (
            <button
              key={s}
              onClick={() => toggleSection(s)}
              className={`px-3 py-1 border ${
                prefs.preferred_sections.includes(s)
                  ? "bg-ink text-paper"
                  : "border-rule"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm uppercase tracking-widest text-ink/60 mb-2">
          Default mode
        </label>
        <div className="flex gap-2">
          {(["real", "parallel"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setPrefs({ ...prefs, default_mode: m })}
              className={`px-3 py-1 border ${
                prefs.default_mode === m ? "bg-ink text-paper" : "border-rule"
              }`}
            >
              {m === "real" ? "Real news" : "Parallel universe"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm uppercase tracking-widest text-ink/60 mb-2">
          Style notes
        </label>
        <textarea
          value={prefs.style_notes}
          onChange={(e) => setPrefs({ ...prefs, style_notes: e.target.value })}
          rows={3}
          placeholder="e.g. punchy short paragraphs, no jargon, more concrete scenes"
          className="w-full border border-rule p-2 bg-paper"
        />
      </div>

      <div>
        <label className="block text-sm uppercase tracking-widest text-ink/60 mb-2">
          What you expect from this magazine
        </label>
        <textarea
          value={prefs.expectations}
          onChange={(e) =>
            setPrefs({ ...prefs, expectations: e.target.value })
          }
          rows={4}
          placeholder="e.g. surprise me with stories I wouldn't otherwise see; cite primary sources; keep parallel-universe pieces grounded"
          className="w-full border border-rule p-2 bg-paper"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="bg-ink text-paper px-4 py-2 text-sm uppercase tracking-wider disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save preferences"}
        </button>
        {saved && <span className="text-sm text-ink/60 italic">Saved.</span>}
      </div>
    </div>
  );
}
