"use client";

// ============================================
// OMA Quest — Spielmenü in der Spielfläche: Charakter, Inventar, Quests, Gruppe, Chat, Spielleiter
// ============================================

import type { ReactNode } from "react";
import QuestLog from "@/components/dnd/QuestLog";
import type { ChatMessage } from "@/components/te-map/TeWorld";
import type { Notify } from "@/components/te-map/play/GameFeed";
import { CharacterPanel, GmPanel, InventoryPanel, PartyPanel, SocialPanel } from "@/components/te-map/play/PlayPanels";

export type MenuTab = "character" | "inventory" | "quests" | "party" | "chat" | "gm";

const TABS: { key: MenuTab; icon: string; label: string; hotkey?: string }[] = [
  { key: "character", icon: "🧙", label: "Charakter", hotkey: "C" },
  { key: "inventory", icon: "🎒", label: "Inventar", hotkey: "I" },
  { key: "quests", icon: "📜", label: "Quests", hotkey: "Q" },
  { key: "party", icon: "👥", label: "Gruppe", hotkey: "G" },
  { key: "chat", icon: "💬", label: "Chat", hotkey: "T" },
  { key: "gm", icon: "🎭", label: "Spielleiter" },
];

interface Props {
  tab: MenuTab;
  onTab: (t: MenuTab) => void;
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

export default function GameMenu({ tab, onTab, onClose, slug, present, myCardId, chat, isMod, isGm, onEmote, onChatRemoved, notify, refreshKey, onChanged }: Props) {
  let body: ReactNode = null;
  if (tab === "character") body = <CharacterPanel refreshKey={refreshKey} />;
  else if (tab === "inventory") body = <InventoryPanel refreshKey={refreshKey} onChanged={onChanged} notify={notify} />;
  else if (tab === "quests") body = <QuestLog notify={notify} />;
  else if (tab === "party") body = <PartyPanel present={present} myCardId={myCardId} notify={notify} />;
  else if (tab === "chat") body = <SocialPanel slug={slug} chat={chat} onEmote={onEmote} isMod={isMod} myCardId={myCardId} onRemoved={onChatRemoved} notify={notify} />;
  else if (tab === "gm" && isGm) body = <GmPanel slug={slug} notify={notify} />;

  return (
    <div className="absolute inset-0 z-40 bg-black/70 p-2 sm:p-4 flex" role="dialog" aria-label="Spielmenü">
      <div className="oq-panel w-full max-w-4xl mx-auto flex flex-col min-h-0 max-h-full">
        <div className="flex items-center gap-1 p-2 border-b-2 border-[#4a3b1c] overflow-x-auto">
          {TABS.filter((t) => t.key !== "gm" || isGm).map((t) => (
            <button key={t.key} type="button" onClick={() => onTab(t.key)} className={`oq-btn text-xs px-3 py-1.5 whitespace-nowrap ${tab === t.key ? "oq-btn-gold" : ""}`} title={t.hotkey ? `Taste ${t.hotkey}` : undefined}>
              {t.icon} {t.label}
            </button>
          ))}
          <button type="button" onClick={onClose} className="oq-btn text-xs px-3 py-1.5 ml-auto" aria-label="Menü schließen" title="Esc">✕ Schließen</button>
        </div>
        <div className="p-3 overflow-y-auto min-h-0">{body}</div>
      </div>
    </div>
  );
}
