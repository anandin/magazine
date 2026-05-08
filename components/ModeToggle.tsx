"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ModeToggle({ defaultMode }: { defaultMode: "real" | "parallel" }) {
  const [mode, setMode] = useState(defaultMode);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/issues/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const json = await res.json();
      if (json.issue_id) {
        router.push(`/issue/${json.issue_id}`);
      } else {
        alert(json.error ?? "Failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex border border-rule rounded-full overflow-hidden text-sm">
        <button
          onClick={() => setMode("real")}
          className={`px-3 py-1 ${mode === "real" ? "bg-ink text-paper" : ""}`}
        >
          Real news
        </button>
        <button
          onClick={() => setMode("parallel")}
          className={`px-3 py-1 ${mode === "parallel" ? "bg-accent text-paper" : ""}`}
        >
          Parallel universe
        </button>
      </div>
      <button
        onClick={generate}
        disabled={loading}
        className="bg-ink text-paper px-4 py-1.5 text-sm uppercase tracking-wider disabled:opacity-50"
      >
        {loading ? "Going to press…" : "Generate issue"}
      </button>
    </div>
  );
}
