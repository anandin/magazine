"use client";

import { useEffect, useMemo, useState } from "react";
import { Cover } from "./Cover";
import { Article } from "./Article";
import { DisplayAd } from "./DisplayAd";
import { Classifieds } from "./Classifieds";
import { Colophon } from "./Colophon";
import { UtilityBar } from "./UtilityBar";
import { ChatModal } from "./ChatModal";
import { PrefsDrawer } from "./PrefsDrawer";
import { MastheadModal } from "./MastheadModal";
import { AvatarDefs } from "./AgentAvatar";
import type {
  Ad,
  Article as ArticleT,
  Issue,
  Mode,
  Persona,
  Preferences,
} from "@/lib/types";

interface Props {
  issue: Issue;
  articles: ArticleT[];
  ads: Ad[];
  agents: Persona[];
  prefs: Preferences;
}

export function MagazineApp({
  issue,
  articles,
  ads,
  agents,
  prefs: initialPrefs,
}: Props) {
  const [mode, setMode] = useState<Mode>(initialPrefs.default_mode);
  const [prefs, setPrefs] = useState<Preferences>(initialPrefs);
  const [drawerOpen, setDrawerOpen] = useState(!initialPrefs.onboarded);
  const [mastheadOpen, setMastheadOpen] = useState(false);
  const [chat, setChat] = useState<{
    agent: Persona;
    article: ArticleT;
  } | null>(null);
  const [phase, setPhase] = useState<"flip" | "settle" | null>(null);

  const agentById = useMemo(
    () => new Map(agents.map((a) => [a.id, a])),
    [agents],
  );

  const spread = useMemo(() => buildSpread(articles, ads), [articles, ads]);

  const toggleMode = () => {
    setPhase("flip");
    setTimeout(() => {
      setMode((m) => (m === "real" ? "parallel" : "real"));
      setPhase("settle");
      setTimeout(() => setPhase(null), 700);
    }, 280);
  };

  const scrollToFirst = () =>
    document
      .getElementById("issue-start")
      ?.scrollIntoView({ behavior: "smooth" });

  const openChatForArticle = (agent: Persona, article: ArticleT) =>
    setChat({ agent, article });

  const openChatForAgent = (agent: Persona) => {
    const owned = articles.find((a) => a.agent_id === agent.id) ?? articles[0];
    if (owned) setChat({ agent, article: owned });
  };

  async function savePrefs(next: Preferences) {
    setPrefs(next);
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: next.name,
        city: next.city,
        topics: next.topics,
        tone: next.tone,
        length: next.length,
        visual_weight: next.visual_weight,
        reading_level: next.reading_level,
        local_priority: next.local_priority,
        banned: next.banned,
        expectations: next.expectations,
        default_mode: next.default_mode,
        onboarded: true,
      }),
    });
  }

  useEffect(() => {
    document.documentElement.classList.toggle(
      "mag-parallel",
      mode === "parallel",
    );
    return () => document.documentElement.classList.remove("mag-parallel");
  }, [mode]);

  const toneNote = prefs.tone === "as-written" ? null : prefs.tone;

  return (
    <div
      className={`mag-root ${mode === "parallel" ? "mag-parallel" : "mag-real"} ${
        phase ? `mag-phase-${phase}` : ""
      }`}
    >
      <AvatarDefs />

      <UtilityBar
        mode={mode}
        issue={issue}
        onToggleMode={toggleMode}
        onOpenPrefs={() => setDrawerOpen(true)}
        onOpenMasthead={() => setMastheadOpen(true)}
      />

      <div className="mag-paper">
        <Cover
          issue={issue}
          articles={articles}
          prefs={prefs}
          mode={mode}
          onScrollIn={scrollToFirst}
        />

        <div id="issue-start" />

        <main className="mag-issue">
          {spread.map((slot, i) => {
            if (slot.kind === "article") {
              const agent = agentById.get(slot.data.agent_id);
              if (!agent) return null;
              return (
                <Article
                  key={slot.data.id}
                  article={slot.data}
                  agent={agent}
                  mode={mode}
                  toneNote={toneNote}
                  onTalk={(a) => openChatForArticle(a, slot.data)}
                />
              );
            }
            return <DisplayAd key={`ad-${i}`} ad={slot.data} mode={mode} />;
          })}
          <Classifieds ads={ads} mode={mode} />
          <Colophon issue={issue} mode={mode} />
        </main>
      </div>

      {phase === "flip" && <div className="mag-flip-curtain" />}

      <PrefsDrawer
        open={drawerOpen}
        prefs={prefs}
        firstRun={!prefs.onboarded}
        onClose={() => setDrawerOpen(false)}
        onSave={savePrefs}
      />

      <MastheadModal
        open={mastheadOpen}
        mode={mode}
        agents={agents}
        onClose={() => setMastheadOpen(false)}
        onOpenAgent={(a) => {
          setMastheadOpen(false);
          openChatForAgent(a);
        }}
      />

      {chat && (
        <ChatModal
          agent={chat.agent}
          article={chat.article}
          mode={mode}
          onClose={() => setChat(null)}
        />
      )}
    </div>
  );
}

type Slot =
  | { kind: "article"; data: ArticleT }
  | { kind: "ad"; data: Ad };

// Pattern: article, article, display-ad, article, display-ad, article, ...
function buildSpread(articles: ArticleT[], ads: Ad[]): Slot[] {
  const displays = ads.filter((a) => a.kind === "display");
  const out: Slot[] = [];
  let di = 0;
  articles.forEach((art, i) => {
    out.push({ kind: "article", data: art });
    if ((i + 1) % 2 === 0 && di < displays.length) {
      out.push({ kind: "ad", data: displays[di++] });
    }
  });
  while (di < displays.length) out.push({ kind: "ad", data: displays[di++] });
  return out;
}
