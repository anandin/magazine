"use client";

import { useState } from "react";
import { PersonaAvatar } from "./PersonaAvatar";
import type { Persona } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatPanel({
  articleId,
  persona,
}: {
  articleId: string;
  persona: Pick<Persona, "name" | "avatar_url" | "voice">;
}) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next);
    setLoading(true);
    try {
      const res = await fetch(`/api/articles/${articleId}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const json = await res.json();
      if (json.reply) {
        setMsgs([...next, { role: "assistant", content: json.reply }]);
      } else {
        setMsgs([
          ...next,
          { role: "assistant", content: `(error: ${json.error ?? "unknown"})` },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-rule bg-white/40 p-4">
      <div className="flex items-center gap-2 pb-3 border-b border-rule">
        <PersonaAvatar persona={persona} size={36} />
        <div>
          <div className="font-display text-base leading-tight">
            Talk to {persona.name}
          </div>
          <div className="text-xs italic text-ink/60">{persona.voice}</div>
        </div>
      </div>
      <div className="space-y-3 max-h-80 overflow-y-auto py-3 text-sm">
        {msgs.length === 0 && (
          <p className="text-ink/50 italic">
            Ask about a claim, a source, or why they framed it that way.
          </p>
        )}
        {msgs.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "text-right"
                : "text-left border-l-2 border-accent pl-3"
            }
          >
            <p className="whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}
        {loading && <p className="italic text-ink/50">…thinking</p>}
      </div>
      <div className="flex gap-2 pt-3 border-t border-rule">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={`Ask ${persona.name.split(" ")[0]} anything…`}
          className="flex-1 border border-rule px-2 py-1 bg-paper text-sm"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-ink text-paper px-3 py-1 text-sm disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
