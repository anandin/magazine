"use client";

import type { Persona } from "@/lib/types";

interface Props {
  agent: Persona;
  size?: number;
  parallel?: boolean;
  ring?: boolean;
  label?: boolean;
  onClick?: () => void;
  title?: string;
}

// Slugs that have a photoreal portrait under /public/agents/{slug}.png.
// Anything not in this set falls back to the hand-drawn SVG bust.
const PHOTO_SLUGS = new Set([
  "voss",
  "kenji",
  "okafor",
  "ash",
  "marigold",
  "solanke",
]);

// Hand-built portrait: tinted bust on a paper background. When a photoreal
// portrait exists for this writer, we render that instead and apply a subtle
// duotone shift in parallel mode to keep the Sigma palette.
export function AgentAvatar({
  agent,
  size = 56,
  parallel = false,
  ring = false,
  label = false,
  onClick,
  title,
}: Props) {
  const tone = parallel ? shiftToneParallel(agent.portrait_tone) : agent.portrait_tone;
  const ink = parallel ? "#1a1326" : "#1a1612";
  const hasPhoto = PHOTO_SLUGS.has(agent.slug);
  return (
    <button
      type="button"
      onClick={onClick}
      className="mag-avatar"
      title={title ?? `Talk with ${agent.name}`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: parallel ? "#1a1326" : "#efe7d7",
        border: ring
          ? `1.5px solid ${parallel ? "#c8b8e8" : "#3a2f22"}`
          : "1px solid rgba(0,0,0,.18)",
        boxShadow: "inset 0 0 0 2px rgba(255,255,255,.45)",
        position: "relative",
        overflow: "hidden",
        padding: 0,
        cursor: onClick ? "pointer" : "default",
        flex: "0 0 auto",
      }}
    >
      {hasPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/agents/${agent.slug}.png`}
          alt={agent.name}
          width={size}
          height={size}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            // In Sigma mode, push the photo toward the dusky-purple register.
            filter: parallel
              ? "saturate(.55) hue-rotate(220deg) brightness(.82) contrast(1.05)"
              : "saturate(.95) contrast(1.02)",
          }}
        />
      ) : (
        <svg viewBox="0 0 56 56" width={size} height={size} aria-hidden="true">
          <defs>
            <radialGradient
              id={`g-${agent.slug}-${parallel ? "p" : "r"}`}
              cx="50%"
              cy="40%"
              r="60%"
            >
              <stop offset="0%" stopColor={lighten(tone, 0.18)} />
              <stop offset="100%" stopColor={tone} />
            </radialGradient>
          </defs>
          <path
            d="M -2 60 Q 8 42 28 42 Q 48 42 58 60 Z"
            fill={agent.color}
            opacity={parallel ? 0.55 : 0.85}
          />
          <circle
            cx="28"
            cy="24"
            r="13"
            fill={`url(#g-${agent.slug}-${parallel ? "p" : "r"})`}
          />
          <path
            d={hairPath(agent.slug)}
            fill={agent.color}
            opacity={parallel ? 0.7 : 0.92}
          />
          <rect width="56" height="56" fill="url(#paper-grain)" opacity="0.18" />
        </svg>
      )}
      {label && !hasPhoto && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            fontFamily: "ui-sans-serif,system-ui",
            fontSize: size * 0.28,
            fontWeight: 700,
            color: ink,
            textShadow: "0 0 4px rgba(255,255,255,.6)",
            letterSpacing: ".02em",
          }}
        >
          {agent.initials}
        </span>
      )}
    </button>
  );
}

function hairPath(slug: string): string {
  const map: Record<string, string> = {
    voss: "M 14 18 Q 14 8 28 8 Q 44 8 44 19 Q 40 14 28 14 Q 18 14 14 18 Z",
    kenji: "M 15 17 Q 18 7 30 8 Q 42 9 42 18 Q 39 13 30 13 Q 22 13 15 17 Z",
    okafor: "M 13 19 Q 12 6 28 6 Q 46 6 45 22 Q 42 16 35 14 Q 30 13 22 14 Q 16 16 13 19 Z",
    ash: "M 17 17 Q 22 11 28 11 Q 34 11 39 17 Q 34 14 28 14 Q 22 14 17 17 Z",
    marigold:
      "M 13 18 Q 14 9 22 8 Q 28 7 34 9 Q 44 11 44 20 Q 38 14 28 14 Q 18 14 13 18 Z",
    solanke: "M 14 18 Q 14 7 28 7 Q 42 7 44 18 Q 38 12 28 12 Q 18 12 14 18 Z",
  };
  return map[slug] ?? map.voss;
}

function lighten(hex: string, amt: number): string {
  if (hex.startsWith("rgb")) return hex;
  const c = hex.replace("#", "");
  const n = parseInt(c, 16);
  const r = Math.min(255, ((n >> 16) & 255) + Math.round(255 * amt));
  const g = Math.min(255, ((n >> 8) & 255) + Math.round(255 * amt));
  const b = Math.min(255, (n & 255) + Math.round(255 * amt));
  return `rgb(${r},${g},${b})`;
}

function shiftToneParallel(hex: string): string {
  const c = hex.replace("#", "");
  const n = parseInt(c, 16);
  const r = Math.round(((n >> 16) & 255) * 0.55 + 50);
  const g = Math.round(((n >> 8) & 255) * 0.4 + 30);
  const b = Math.round((n & 255) * 0.7 + 80);
  return `rgb(${r},${g},${b})`;
}

// Reusable SVG defs (paper grain) — render once at the app root.
export function AvatarDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <filter id="paper-noise">
          <feTurbulence baseFrequency="0.9" numOctaves={2} />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0" />
        </filter>
        <pattern id="paper-grain" width="80" height="80" patternUnits="userSpaceOnUse">
          <rect width="80" height="80" filter="url(#paper-noise)" />
        </pattern>
      </defs>
    </svg>
  );
}
