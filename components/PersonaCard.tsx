import Link from "next/link";
import { PersonaAvatar } from "./PersonaAvatar";
import type { Persona } from "@/lib/types";

export function PersonaCard({ persona }: { persona: Persona }) {
  return (
    <Link
      href={`/personas/${persona.slug}`}
      className="block border border-rule p-4 hover:bg-white transition"
    >
      <div className="flex items-center gap-3">
        <PersonaAvatar persona={persona} size={56} />
        <div>
          <div className="font-display text-lg leading-tight">{persona.name}</div>
          <div className="text-xs uppercase tracking-wider text-ink/60">
            {persona.section}
          </div>
        </div>
      </div>
      <p className="text-sm mt-3 text-ink/80">{persona.bio}</p>
      <p className="text-xs italic mt-2 text-ink/60">Voice: {persona.voice}</p>
    </Link>
  );
}
