import Link from "next/link";
import type { ReactNode } from "react";
import type { Article, Persona, Source } from "@/lib/types";

// Tiny markdown renderer — handles paragraphs, ## headings, *italic*, **bold**.
// Avoids a heavy dependency; switch to react-markdown if you need lists/links.
function renderBody(md: string) {
  const blocks = md.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((block, i) => {
    if (block.startsWith("## ")) {
      return (
        <h2 key={i} className="font-display text-xl mt-6 mb-2">
          {inline(block.slice(3))}
        </h2>
      );
    }
    return (
      <p key={i} className={i === 0 ? "dropcap" : ""}>
        {inline(block)}
      </p>
    );
  });
}

function inline(text: string): ReactNode {
  // Very small inline parser for **bold** and *italic*.
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const seg = m[0];
    if (seg.startsWith("**")) {
      parts.push(<strong key={key++}>{seg.slice(2, -2)}</strong>);
    } else {
      parts.push(<em key={key++}>{seg.slice(1, -1)}</em>);
    }
    last = m.index + seg.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function ArticleBody({
  article,
  persona,
}: {
  article: Article;
  persona: Persona;
}) {
  const sources = (article.sources ?? []) as Source[];
  return (
    <article className="prose-mag">
      <div className="text-xs uppercase tracking-widest text-ink/60 mb-1">
        {article.section} · by {persona.name}
        {article.mode === "parallel" && (
          <span className="ml-2 text-accent">[parallel universe]</span>
        )}
      </div>
      <h1 className="font-display text-3xl md:text-4xl leading-tight mb-2">
        {article.headline}
      </h1>
      {article.dek && (
        <p className="text-lg italic text-ink/70 mb-6">{article.dek}</p>
      )}
      <div>{renderBody(article.body_md)}</div>
      {sources.length > 0 && (
        <div className="mt-8 border-t border-rule pt-4 text-sm">
          <div className="uppercase tracking-widest text-xs text-ink/60 mb-2">
            Sources
          </div>
          <ol className="space-y-1">
            {sources.map((s, i) => (
              <li key={i}>
                [{i + 1}]{" "}
                <Link
                  href={s.url}
                  target="_blank"
                  className="underline decoration-rule hover:text-accent"
                >
                  {s.title}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}
