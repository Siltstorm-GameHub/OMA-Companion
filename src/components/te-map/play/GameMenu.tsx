"use client";

// ============================================
// OMA Quest — Spielmenü in der Spielfläche: Charakter, Inventar, Quests, Gruppe, Chat, Spielleiter
// ============================================

import type { ReactNode } from "react";
import QuestLog from "@/components/dnd/QuestLog";
import type { ChatMessage } from "@/components/te-map/TeWorld";
import type { Notify } from "@/components/te-map/play/GameFeed";
import CombatPanel from "@/components/te-map/play/CombatPanel";
import SkillTreePanel from "@/components/te-map/play/SkillTreePanel";
import CoinShopPanel from "@/components/te-map/play/CoinShopPanel";
import { CharacterPanel, GmPanel, InventoryPanel, PartyPanel, ProgressPanel, SocialPanel } from "@/components/te-map/play/PlayPanels";

export type MenuTab = "character" | "progress" | "inventory" | "quests" | "combat" | "skills" | "coins" | "party" | "chat" | "gm";

const TAB_LABEL: Record<MenuTab, string> = {
  character: "Charakter",
  progress: "Fortschritt",
  inventory: "Inventar",
  quests: "Quests",
  combat: "Kampf",
  skills: "Talente",
  coins: "Münzen-Laden",
  party: "Gruppe",
  chat: "Chat",
  gm: "Spielleiter",
};

interface Props {
  tab: MenuTab;
  onClose: () => void;
  slug: string;
  present: { id: string; name: string }[];
  myCardId: string | null;
  chat: ChatMessage[];
  isMod: boolean;
  isGm: boolean;
  onEmote: (id: string) => void;
  onChatRemoved: (id: string) => void;
  notify: Notify;
  refreshKey: number;
  onChanged: () => void;
}

export default function GameMenu({ tab, onClose, slug, present, myCardId, chat, isMod, isGm, onEmote, onChatRemoved, notify, refreshKey, onChanged }: Props) {
  let body: ReactNode = null;
  if (tab === "character") body = <CharacterPanel refreshKey={refreshKey} onChanged={onChanged} notify={notify} />;
  else if (tab === "progress") body = <ProgressPanel refreshKey={refreshKey} />;
  else if (tab === "inventory") body = <InventoryPanel refreshKey={refreshKey} onChanged={onChanged} notify={notify} />;
  else if (tab === "quests") body = <QuestLog notify={notify} />;
  else if (tab === "combat") body = <CombatPanel refreshKey={refreshKey} onChanged={onChanged} notify={notify} />;
  else if (tab === "skills") body = <SkillTreePanel refreshKey={refreshKey} onChanged={onChanged} notify={notify} />;
  else if (tab === "coins") body = <CoinShopPanel refreshKey={refreshKey} onChanged={onChanged} notify={notify} />;
  else if (tab === "party") body = <PartyPanel present={present} myCardId={myCardId} notify={notify} />;
  else if (tab === "chat") body = <SocialPanel slug={slug} chat={chat} onEmote={onEmote} isMod={isMod} myCardId={myCardId} onRemoved={onChatRemoved} notify={notify} />;
  else if (tab === "gm" && isGm) body = <GmPanel slug={slug} notify={notify} />;

  // Kein eigener Tab-Umschalter mehr hier — die Buttons unten in der Spielfläche
  // (QuestWorld.tsx extraControls) reichen als Menü und schalten auch um, wenn
  // dieses Panel schon offen ist. Nur noch ein schlanker Titel + Schließen-Button.
  return (
    <div className="absolute inset-0 z-40 bg-black/70 p-2 sm:p-4 flex" role="dialog" aria-label="Spielmenü">
      <div className="oq-panel w-full max-w-4xl mx-auto flex flex-col min-h-0 max-h-full">
        <div className="flex items-center gap-2 p-2 border-b-2 border-[#4a3b1c]">
          <p className="text-xs font-bold text-amber-300 uppercase tracking-widest px-1">{TAB_LABEL[tab]}</p>
          <button type="button" onClick={onClose} className="oq-btn text-xs px-3 py-1.5 ml-auto" aria-label="Menü schließen" title="Esc">✕ Schließen</button>
        </div>
        <div className="p-3 overflow-y-auto min-h-0">{body}</div>
      </div>
    </div>
  );
}
