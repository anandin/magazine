import type { Ad } from "@/lib/types";

export function AdSlot({ ad }: { ad: Ad }) {
  const sizeClass =
    ad.size === "banner"
      ? "col-span-full"
      : ad.size === "half"
        ? "md:col-span-2"
        : "";
  return (
    <aside
      className={`border-2 border-dashed border-rule p-4 bg-white/60 ${sizeClass}`}
    >
      <div className="text-[10px] uppercase tracking-widest text-ink/50 mb-1">
        Advertisement
      </div>
      <div className="font-display text-lg leading-tight">{ad.advertiser}</div>
      <p className="text-sm mt-1 text-ink/80">{ad.copy}</p>
      {ad.cta && (
        <div className="text-sm mt-2 font-semibold text-accent">{ad.cta}</div>
      )}
    </aside>
  );
}
