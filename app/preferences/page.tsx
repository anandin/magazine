import { getPreferences } from "@/lib/personalize";
import { listPersonas } from "@/lib/agents/personas";
import { PreferencesForm } from "./PreferencesForm";

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const [prefs, personas] = await Promise.all([
    getPreferences(),
    listPersonas(),
  ]);
  const sections = Array.from(new Set(personas.map((p) => p.section))).filter(
    (s) => s !== "ads",
  );
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-display text-4xl mb-2">Your preferences</h1>
      <p className="text-ink/70 mb-8">
        Tell the team what you like. They'll factor it into the next issue, and
        feedback you leave on individual pieces will refine each writer's
        voice over time.
      </p>
      <PreferencesForm initial={prefs} sections={sections} />
    </div>
  );
}
