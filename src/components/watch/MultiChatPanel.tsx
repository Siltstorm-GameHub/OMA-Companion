"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, Loader2, MessageCircle } from "@/components/icons";
import type { ChatMessage } from "@/lib/twitch-irc";
import { useMultiChat } from "./useMultiChat";
import ChatComposer from "./ChatComposer";

export type ChatChannel = { login: string; name: string; color: string };

/**
 * Chat-Spalte von "Zusammen ansehen": Reiter "Gemeinsam" (alle Kanäle in einer Liste, je Kanal
 * eine Farbe; mitschreiben per Twitch-Login über ChatComposer) plus je Kanal Twitchs eigener Chat.
 */
export default function MultiChatPanel({ channels, activeChannel = null }: { channels: ChatChannel[]; /** Stream mit Ton — Standard-Ziel beim Schreiben. */ activeChannel?: string | null }) {
  const [tab, setTab] = useState<string>("all");
  const { messages, status } = useMultiChat(channels.map(c => c.login));
  const byLogin = new Map(channels.map(c => [c.login, c]));
  const [host, setHost] = useState<string | null>(null);
  useEffect(() => { const t = setTimeout(() => setHost(window.location.hostname), 0); return () => clearTimeout(t); }, []);

  // Zeigt Twitchs eigenen Chat, falls das gemeinsame Mitlesen dauerhaft scheitert.
  const failed = status === "failed";

  return (
    <div className="flex flex-col h-full min-h-0 rounded-2xl border border-white/[0.08] bg-black/40 overflow-hidden">
      <div className="flex gap-1 p-1.5 border-b border-white/[0.06] overflow-x-auto shrink-0">
        <TabButton active={tab === "all"} onClick={() => setTab("all")}>
          <MessageCircle className="w-3.5 h-3.5" /> Gemeinsam
        </TabButton>
        {channels.map(c => (
          <TabButton key={c.login} active={tab === c.login} onClick={() => setTab(c.login)}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} /> {c.name}
          </TabButton>
        ))}
      </div>

      {tab === "all" ? (
        failed ? (
          <div className="p-4 text-sm text-gray-400">
            Der gemeinsame Chat ist gerade nicht erreichbar. Oben findest du den Twitch-Chat jedes Kanals.
          </div>
        ) : (
          <>
            <CombinedChat messages={messages} byLogin={byLogin} status={status} />
            <ChatComposer channels={channels} activeChannel={activeChannel} />
          </>
        )
      ) : (
        <div className="flex-1 min-h-0">
          {host && (
            <iframe
              key={tab}
              title={`Twitch-Chat ${tab}`}
              src={`https://www.twitch.tv/embed/${encodeURIComponent(tab)}/chat?parent=${encodeURIComponent(host)}&darkpopout`}
              className="w-full h-full border-0"
            />
          )}
        </div>
      )}
      {tab !== "all" && (
        <p className="px-3 py-1.5 text-[11px] text-gray-500 border-t border-white/[0.06] shrink-0">
          Zum Schreiben im Browser bei Twitch angemeldet sein.
        </p>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 shrink-0 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
        active ? "bg-teal-500/20 text-teal-200" : "text-gray-400 hover:text-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

function CombinedChat({ messages, byLogin, status }: { messages: ChatMessage[]; byLogin: Map<string, ChatChannel>; status: string }) {
  const listRef = useRef<HTMLDivElement>(null);
  // Automatisch mitscrollen, außer der Zuschauer hat nach oben gescrollt (dann Knopf "Neue Nachrichten").
  const [pinned, setPinned] = useState(true);

  useEffect(() => {
    const el = listRef.current;
    if (el && pinned) el.scrollTop = el.scrollHeight;
  }, [messages, pinned]);

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={listRef}
        onScroll={e => {
          const el = e.currentTarget;
          setPinned(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
        }}
        className="absolute inset-0 overflow-y-auto px-3 py-2 space-y-1 text-[13px] leading-snug"
      >
        {messages.length === 0 && (
          <p className="flex items-center gap-2 text-xs text-gray-500 py-2">
            {status === "connected" ? "Noch keine Nachrichten – sobald jemand schreibt, erscheint es hier." : <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verbinde mit den Chats …</>}
          </p>
        )}
        {messages.map(m => {
          const ch = byLogin.get(m.channel);
          return (
            <div key={m.id} className="break-words">
              <span
                className="inline-block mr-1.5 px-1 rounded text-[10px] font-semibold align-middle"
                style={{ background: `${ch?.color ?? "#64748b"}33`, color: ch?.color ?? "#94a3b8" }}
                title={`Chat von ${ch?.name ?? m.channel}`}
              >
                {(ch?.name ?? m.channel).slice(0, 10)}
              </span>
              <span className="font-semibold" style={{ color: m.color ?? "#cbd5e1" }}>{m.user}</span>
              <span className={m.action ? "italic" : ""} style={m.action ? { color: m.color ?? undefined } : undefined}>
                {m.action ? " " : ": "}
                {m.parts.map((p, i) => p.type === "text"
                  ? <span key={i} className="text-gray-200">{p.text}</span>
                  : (
                    // eslint-disable-next-line @next/next/no-img-element -- Twitch-Emote, externe Quelle
                    <img key={i} src={`https://static-cdn.jtvnw.net/emoticons/v2/${p.id}/default/dark/1.0`} alt={p.name} title={p.name} className="inline h-6 align-middle" />
                  ))}
              </span>
            </div>
          );
        })}
      </div>
      {!pinned && (
        <button
          onClick={() => setPinned(true)}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-teal-600 text-white shadow-lg"
        >
          <ArrowDown className="w-3.5 h-3.5" /> Neue Nachrichten
        </button>
      )}
    </div>
  );
}
