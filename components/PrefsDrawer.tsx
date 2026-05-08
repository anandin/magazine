"use client";

import { useEffect, useState } from "react";
import type { Preferences } from "@/lib/types";

const ALL_TOPICS = [
  "Politics & City Hall",
  "Technology & AI Policy",
  "Science & Health",
  "Culture",
  "Sports",
  "Opinion",
  "Business",
  "Climate",
  "Local",
];

const TONES = [
  { id: "as-written", label: "As written", sub: "Trust the writer" },
  { id: "dry", label: "Dry", sub: "Just the facts" },
  { id: "witty", label: "Witty", sub: "Voice forward" },
  { id: "deep-dive", label: "Deep dive", sub: "Show the work" },
  { id: "snappy", label: "Snappy", sub: "Get me moving" },
] as const;

interface Props {
  open: boolean;
  prefs: Preferences;
  firstRun: boolean;
  onClose: () => void;
  onSave: (next: Preferences) => Promise<void> | void;
}

export function PrefsDrawer({ open, prefs, firstRun, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<Preferences>(prefs);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setDraft(prefs);
  }, [open, prefs]);

  if (!open) return null;

  const toggleTopic = (t: string) =>
    setDraft((d) => ({
      ...d,
      topics: d.topics.includes(t)
        ? d.topics.filter((x) => x !== t)
        : [...d.topics, t],
    }));

  const toggleBanned = (t: string) =>
    setDraft((d) => ({
      ...d,
      banned: d.banned.includes(t)
        ? d.banned.filter((x) => x !== t)
        : [...d.banned, t],
    }));

  async function save() {
    setBusy(true);
    try {
      await onSave({ ...draft, onboarded: true });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="mag-drawer-scrim"
      onClick={firstRun ? undefined : onClose}
    >
      <div className="mag-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="mag-drawer-head">
          <div>
            <h2>{firstRun ? "Welcome — let's set your edition" : "My Edition"}</h2>
            <p>
              Tell the writers what you want. They'll read this and you can change it
              any week.
            </p>
          </div>
          {!firstRun && (
            <button type="button" className="mag-chat-x" onClick={onClose}>
              ×
            </button>
          )}
        </header>

        <section className="mag-pref-sect">
          <label className="mag-pref-label">Your name (optional)</label>
          <input
            type="text"
            className="mag-pref-input"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="So we can address you on the cover"
          />
        </section>

        <section className="mag-pref-sect">
          <label className="mag-pref-label">City for the local section</label>
          <input
            type="text"
            className="mag-pref-input"
            value={draft.city}
            onChange={(e) => setDraft({ ...draft, city: e.target.value })}
            placeholder="Cedar Hollow"
          />
        </section>

        <section className="mag-pref-sect">
          <label className="mag-pref-label">What you'd like covered</label>
          <div className="mag-pref-tags">
            {ALL_TOPICS.map((t) => (
              <button
                key={t}
                type="button"
                className="mag-pref-tag"
                data-on={draft.topics.includes(t)}
                onClick={() => toggleTopic(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <section className="mag-pref-sect">
          <label className="mag-pref-label">Tone of writing</label>
          <div className="mag-pref-tones">
            {TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                className="mag-pref-tone"
                data-on={draft.tone === t.id}
                onClick={() => setDraft({ ...draft, tone: t.id })}
              >
                <b>{t.label}</b>
                <span>{t.sub}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mag-pref-sect mag-pref-row2">
          <div>
            <label className="mag-pref-label">Length preference</label>
            <div className="mag-pref-seg">
              {(["short", "medium", "long"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  data-on={draft.length === v}
                  onClick={() => setDraft({ ...draft, length: v })}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mag-pref-label">Visual weight</label>
            <div className="mag-pref-seg">
              {(["text-heavy", "balanced", "image-heavy"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  data-on={draft.visual_weight === v}
                  onClick={() => setDraft({ ...draft, visual_weight: v })}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mag-pref-label">Reading level</label>
            <div className="mag-pref-seg">
              {(
                [
                  ["skim", "skim"],
                  ["engaged-adult", "engaged"],
                  ["wonk", "wonk"],
                ] as const
              ).map(([id, lbl]) => (
                <button
                  key={id}
                  type="button"
                  data-on={draft.reading_level === id}
                  onClick={() => setDraft({ ...draft, reading_level: id })}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mag-pref-sect">
          <label className="mag-pref-label">
            Local priority{" "}
            <span className="mag-pref-hint">
              how much of the issue should be your city
            </span>
          </label>
          <div className="mag-pref-slider">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={draft.local_priority}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  local_priority: parseFloat(e.target.value),
                })
              }
            />
            <span>{Math.round(draft.local_priority * 100)}% local</span>
          </div>
        </section>

        <section className="mag-pref-sect">
          <label className="mag-pref-label">Topics to keep out</label>
          <div className="mag-pref-tags">
            {ALL_TOPICS.map((t) => (
              <button
                key={t}
                type="button"
                className="mag-pref-tag mag-pref-tag-ban"
                data-on={draft.banned.includes(t)}
                onClick={() => toggleBanned(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <section className="mag-pref-sect">
          <label className="mag-pref-label">
            What you expect from this magazine
          </label>
          <textarea
            className="mag-pref-textarea"
            rows={3}
            value={draft.expectations}
            onChange={(e) =>
              setDraft({ ...draft, expectations: e.target.value })
            }
            placeholder="“I want one piece that surprises me each week. Skip the celebrity stuff. I want to learn one thing I can use.”"
          />
        </section>

        <footer className="mag-drawer-foot">
          <span className="mag-drawer-foot-note">
            Saved to your account. The writers will see your settings on the next
            issue.
          </span>
          <button
            type="button"
            className="mag-drawer-save"
            onClick={save}
            disabled={busy}
          >
            {busy ? "Saving…" : firstRun ? "Open my issue →" : "Save preferences"}
          </button>
        </footer>
      </div>
    </div>
  );
}
