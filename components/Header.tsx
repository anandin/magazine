import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-rule">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-baseline justify-between">
        <Link href="/" className="font-display text-2xl tracking-tight">
          The Parallel Press
        </Link>
        <nav className="flex gap-6 text-sm uppercase tracking-wider">
          <Link href="/" className="hover:text-accent">Issue</Link>
          <Link href="/personas" className="hover:text-accent">The Team</Link>
          <Link href="/preferences" className="hover:text-accent">Preferences</Link>
        </nav>
      </div>
    </header>
  );
}
