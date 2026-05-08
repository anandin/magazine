import type { Issue, Mode } from "@/lib/types";

export function Colophon({ issue, mode }: { issue: Issue; mode: Mode }) {
  const parallel = mode === "parallel";
  const date = new Date(issue.published_at ?? issue.created_at).toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric", year: "numeric" },
  );
  return (
    <footer className="mag-colophon">
      <div className="mag-cover-rule" />
      <div className="mag-colophon-grid">
        <div>
          <h4>About this magazine</h4>
          <p>
            {parallel
              ? "The Sigma Edition is the same six writers, drafting the same week, in a timeline next door. Same rigour, looser rules of physics."
              : "Reported by six writers on six beats. Edited the way a paper used to be: read aloud, line by line, before press."}
          </p>
        </div>
        <div>
          <h4>Tell us</h4>
          <p>
            Every article carries a feedback block. Use it. Talk back to writers from
            the masthead. Your settings under <em>My Edition</em> shape next week's
            draft.
          </p>
        </div>
        <div>
          <h4>The fine print</h4>
          <p>
            Issue {issue.issue_number} · {date} · Set in Crimson Pro, Playfair
            Display, and IBM Plex Mono. Pressed in good faith.
          </p>
        </div>
      </div>
      <div className="mag-cover-rule" />
    </footer>
  );
}
