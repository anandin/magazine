import type { Persona } from "@/lib/types";

interface Props {
  persona: Pick<Persona, "name" | "avatar_url">;
  size?: number;
}

export function PersonaAvatar({ persona, size = 48 }: Props) {
  const initials = persona.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  if (persona.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={persona.avatar_url}
        alt={persona.name}
        width={size}
        height={size}
        className="rounded-full border border-rule bg-paper"
      />
    );
  }
  return (
    <div
      className="rounded-full border border-rule bg-paper flex items-center justify-center font-display"
      style={{ width: size, height: size, fontSize: size / 2.5 }}
    >
      {initials}
    </div>
  );
}
