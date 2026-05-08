import { listPersonas } from "@/lib/agents/personas";
import { PersonaCard } from "@/components/PersonaCard";

export const dynamic = "force-dynamic";

export default async function PersonasPage() {
  const personas = await listPersonas();
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="font-display text-4xl mb-2">The team</h1>
      <p className="text-ink/70 mb-8 max-w-2xl">
        Each writer has a beat, a voice, and a persona prompt. Click in to read
        their bio, see what they've filed, and leave a review.
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        {personas.map((p) => (
          <PersonaCard key={p.id} persona={p} />
        ))}
      </div>
    </div>
  );
}
