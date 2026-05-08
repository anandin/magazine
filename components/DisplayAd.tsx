"use client";

import type { Ad, Mode } from "@/lib/types";

export function DisplayAd({ ad, mode }: { ad: Ad; mode: Mode }) {
  const parallel = mode === "parallel";
  const v = parallel
    ? {
        headline: ad.parallel_headline,
        tagline: ad.parallel_tagline,
        body: ad.parallel_body,
        meta: ad.parallel_meta,
      }
    : {
        headline: ad.real_headline,
        tagline: ad.real_tagline,
        body: ad.real_body,
        meta: ad.real_meta,
      };
  return (
    <div className={`mag-ad mag-ad-display ${parallel ? "mag-ad-parallel" : ""}`}>
      <div className="mag-ad-rule" />
      <div className="mag-ad-tag">— ADVERTISEMENT —</div>
      {v.headline && <h3 className="mag-ad-headline">{v.headline}</h3>}
      {v.tagline && <p className="mag-ad-tagline">{v.tagline}</p>}
      <p className="mag-ad-body">{v.body}</p>
      {v.meta && <div className="mag-ad-meta">{v.meta}</div>}
      <div className="mag-ad-rule" />
    </div>
  );
}
