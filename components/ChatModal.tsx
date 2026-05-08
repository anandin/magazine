"use client";

import { useEffect, useRef, useState } from "react";
import { AgentAvatar } from "./AgentAvatar";
import type { Article, Mode, Persona } from "@/lib/types";
import { variantOf } from "@/lib/agents/writer";

interface Msg {
  role: "agent" | "reader";
  text: string;
}

interface Props {
  agent: Persona;
  article: Article;
  mode: Mode;
  onClose: () => void;
}

export function ChatModal({ agent, article, mode, onClose }: Props) {
  const parallel = mode === "parallel";
  const v = variantOf(article, mode);

  const [msgs, setMsgs] = useState<Msg[]>(() => [
    { role: "agent", text: openingLine(agent, parallel, v.headline) },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, busy]);

  async function send(text?: string) {
    const trimmed = (text ?? input).trim();
    if (!trimmed || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "reader", text: trimmed }]);
    setBusy(true);
    try {
      const res = await fetch(`/api/articles/${article.id}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed, mode }),
      });
      const json = await res.json();
      if (json.reply) {
        setMsgs((m) => [...m, { role: "agent", text: json.reply.trim() }]);
      } else {
        setMsgs((m) => [
          ...m,
          { role: "agent", text: "(connection unsteady — try once more)" },
        ]);
      }
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "agent", text: "(connection unsteady — try once more)" },
      ]);
    } finally {
      setBusy(false);
    }
  }

  const handle = parallel ? agent.parallel_handle : agent.name;
  const firstName = handle.split(" ")[0].replace(/[.-Σ]+$/, "") || handle;
  const starters = [
    "What did you cut?",
    "Who did you talk to that I won't see in the piece?",
    parallel
      ? "Why does the parallel version land harder?"
      : "What's the strongest counter-argument?",
  ];

  return (
    <div className="mag-chat-scrim" onClick={onClose}>
      <div className="mag-chat" onClick={(e) => e.stopPropagation()}>
        <header className="mag-chat-head">
          <AgentAvatar agent={agent} size={56} parallel={parallel} ring />
          <div className="mag-chat-id">
            <div className="mag-chat-name">{handle}</div>
            <div className="mag-chat-beat">{agent.beat}</div>
          </div>
          <button
            type="button"
            className="mag-chat-x"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className="mag-chat-bio">
          <p>
            <strong>Voice.</strong> {agent.voice}
          </p>
          <p>
            <strong>How I report.</strong> {agent.method}
          </p>
          <p>
            <strong>About.</strong> {parallel ? agent.parallel_bio : agent.bio}
          </p>
        </div>
        <div className="mag-chat-thread" ref={scrollRef}>
          {msgs.map((m, i) => (
            <div key={i} className={`mag-chat-msg mag-chat-${m.role}`}>
              {m.role === "agent" && (
                <AgentAvatar agent={agent} size={28} parallel={parallel} />
              )}
              <div className="mag-chat-bubble">{m.text}</div>
            </div>
          ))}
          {busy && (
            <div className="mag-chat-msg mag-chat-agent">
              <AgentAvatar agent={agent} size={28} parallel={parallel} />
              <div className="mag-chat-bubble mag-chat-typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
        </div>
        <div className="mag-chat-starters">
          {starters.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => send(s)}
              disabled={busy}
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="mag-chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${firstName} about this piece…`}
            disabled={busy}
          />
          <button type="submit" disabled={busy || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

function openingLine(
  agent: Persona,
  parallel: boolean,
  headline: string,
): string {
  const lines: Record<string, string> = {
    voss: "Voss. I filed this one Tuesday after the vote. Ask me what I left out — there's always something.",
    kenji:
      "Hey. Kenji. I'm happy to walk through how the system works, who profits from each arrow, and what I think the second-order effects are. What do you want to dig into?",
    okafor:
      "Hello. I had three sound systems and a cup of cold tea while writing this. Tell me what you'd like me to defend or take back.",
    ash: "Reuben Ash. Effect size first: this is a clean rodent result, not a human one. Where would you like to start?",
    marigold:
      "Theo. Friday's game wasn't pretty, but it was on time. What part of the night do you want to talk about?",
    solanke:
      "Solanke. Steelman me first. Then I'll concede what's real and we can argue from there.",
  };
  const base = lines[agent.slug] ?? `Hello. Ask me about “${headline}.”`;
  return parallel ? base + " (Speaking from the Sigma timeline tonight.)" : base;
}
