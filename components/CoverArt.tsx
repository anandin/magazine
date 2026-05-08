"use client";

// Hand-drawn duotone illustrations from the design. The parallel variant is a
// mirror skyline under a second sun.
export function CoverArt({ parallel }: { parallel: boolean }) {
  if (parallel) {
    return (
      <svg
        viewBox="0 0 320 320"
        className="mag-cover-art mag-cover-art-parallel"
      >
        <defs>
          <radialGradient id="par-sky" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#3b1f5e" />
            <stop offset="60%" stopColor="#1a0f30" />
            <stop offset="100%" stopColor="#0a0518" />
          </radialGradient>
          <pattern
            id="par-stipple"
            width="3"
            height="3"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1.5" cy="1.5" r="0.5" fill="#c8b8e8" opacity="0.5" />
          </pattern>
        </defs>
        <rect width="320" height="320" fill="url(#par-sky)" />
        <rect width="320" height="320" fill="url(#par-stipple)" />
        <circle cx="220" cy="100" r="44" fill="#e8d8ff" opacity="0.85" />
        <circle
          cx="220"
          cy="100"
          r="44"
          fill="none"
          stroke="#c8b8e8"
          strokeWidth="1"
          strokeDasharray="2 4"
        />
        <path
          d="M 0 220 L 30 200 L 30 220 L 70 190 L 70 220 L 110 175 L 110 220 L 160 200 L 160 220 L 220 180 L 220 220 L 260 195 L 260 220 L 320 205 L 320 320 L 0 320 Z"
          fill="#0a0518"
          opacity="0.95"
        />
        <path
          d="M 0 220 L 30 240 L 30 220 L 70 250 L 70 220 L 110 265 L 110 220 L 160 240 L 160 220 L 220 260 L 220 220 L 260 245 L 260 220 L 320 235 L 320 220 Z"
          fill="#5a3d8a"
          opacity="0.4"
        />
        {Array.from({ length: 14 }).map((_, i) => (
          <rect
            key={i}
            x={20 + i * 22}
            y={210 - (i % 4) * 8}
            width="2"
            height="2"
            fill="#fff7c8"
            opacity="0.85"
          />
        ))}
        <text x="20" y="40" fill="#c8b8e8" fontSize="11" letterSpacing="3">
          SIGMA EDITION
        </text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 320 320" className="mag-cover-art">
      <defs>
        <pattern
          id="real-stipple"
          width="3"
          height="3"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1.5" cy="1.5" r="0.5" fill="#1a1612" opacity="0.7" />
        </pattern>
        <linearGradient id="real-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#efe7d7" />
          <stop offset="100%" stopColor="#dccdb0" />
        </linearGradient>
      </defs>
      <rect width="320" height="320" fill="url(#real-sky)" />
      <circle
        cx="240"
        cy="90"
        r="36"
        fill="none"
        stroke="#1a1612"
        strokeWidth="1.5"
      />
      <g stroke="#1a1612" strokeWidth="1.2" opacity="0.6">
        {Array.from({ length: 18 }).map((_, i) => {
          const a = (i / 18) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={240 + Math.cos(a) * 40}
              y1={90 + Math.sin(a) * 40}
              x2={240 + Math.cos(a) * (50 + (i % 2) * 6)}
              y2={90 + Math.sin(a) * (50 + (i % 2) * 6)}
            />
          );
        })}
      </g>
      <path
        d="M 0 220 L 30 200 L 30 220 L 70 190 L 70 220 L 110 175 L 110 220 L 160 200 L 160 220 L 220 180 L 220 220 L 260 195 L 260 220 L 320 205 L 320 320 L 0 320 Z"
        fill="#1a1612"
      />
      <rect
        x="0"
        y="220"
        width="320"
        height="100"
        fill="url(#real-stipple)"
      />
      <g
        transform="translate(56 250)"
        stroke="#efe7d7"
        strokeWidth="1.5"
        fill="none"
      >
        <circle cx="0" cy="-10" r="3" />
        <line x1="0" y1="-7" x2="0" y2="6" />
        <line x1="-5" y1="2" x2="5" y2="2" />
        <line x1="-3" y1="14" x2="0" y2="6" />
        <line x1="3" y1="14" x2="0" y2="6" />
      </g>
      <g
        transform="translate(180 270)"
        stroke="#efe7d7"
        strokeWidth="1.5"
        fill="none"
      >
        <circle cx="-10" cy="0" r="8" />
        <circle cx="14" cy="0" r="8" />
        <path d="M -10 0 L 0 -10 L 14 0" />
        <path d="M 0 -10 L 4 -16" />
      </g>
    </svg>
  );
}
