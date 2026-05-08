"use client";

import type { Issue, Mode } from "@/lib/types";

interface Props {
  mode: Mode;
  issue?: Issue | null;
  onToggleMode: () => void;
  onOpenPrefs: () => void;
  onOpenMasthead: () => void;
}

export function UtilityBar({
  mode,
  issue,
  onToggleMode,
  onOpenPrefs,
  onOpenMasthead,
}: Props) {
  const parallel = mode === "parallel";
  const stamp = issue
    ? `Issue ${issue.issue_number} · ${new Date(
        issue.published_at ?? issue.created_at,
      ).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`
    : "Press warming up…";
  return (
    <div className={`mag-util ${parallel ? "mag-util-parallel" : ""}`}>
      <div className="mag-util-inner">
        <div className="mag-util-left">
          <button type="button" onClick={onOpenMasthead}>
            Masthead
          </button>
          <button type="button" onClick={onOpenPrefs}>
            My Edition
          </button>
        </div>
        <div className="mag-util-mode">
          <button
            type="button"
            className={`mag-mode-toggle ${parallel ? "is-parallel" : ""}`}
            onClick={onToggleMode}
            aria-label="Toggle reality mode"
          >
            <span className="mag-mode-track">
              <span className={`mag-mode-pill ${!parallel ? "is-active" : ""}`}>
                REAL
              </span>
              <span className={`mag-mode-pill ${parallel ? "is-active" : ""}`}>
                PARALLEL Σ
              </span>
              <span className="mag-mode-thumb" />
            </span>
          </button>
        </div>
        <div className="mag-util-right">
          <span className="mag-util-stamp">{stamp}</span>
        </div>
      </div>
    </div>
  );
}
