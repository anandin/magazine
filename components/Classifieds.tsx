"use client";

import { useMemo } from "react";
import type { Ad, Mode } from "@/lib/types";

export function Classifieds({ ads, mode }: { ads: Ad[]; mode: Mode }) {
  const parallel = mode === "parallel";
  const grouped = useMemo(() => {
    const m: Record<string, Ad[]> = {};
    for (const a of ads) {
      if (a.kind !== "classified" || !a.category) continue;
      m[a.category] ??= [];
      m[a.category].push(a);
    }
    return m;
  }, [ads]);

  const entries = Object.entries(grouped);
  if (entries.length === 0) return null;

  return (
    <section className="mag-classifieds">
      <header className="mag-classifieds-head">
        <h2>Classifieds</h2>
        <p>
          {parallel
            ? "Notices from elsewhere. Box numbers honored."
            : "Twenty-five cents a line. Submit by Thursday for the weekend issue."}
        </p>
      </header>
      <div className="mag-classifieds-grid">
        {entries.map(([cat, list]) => (
          <div key={cat} className="mag-classifieds-col">
            <h4>{cat}</h4>
            {list.map((a) => (
              <p key={a.id} className="mag-classifieds-entry">
                {parallel ? a.parallel_body : a.real_body}
              </p>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
