"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { customEmojiToken, customEmojiUrl, type CustomEmoji } from "@/lib/discord-emoji";

/**
 * Emoji-Auswahl als Panel (bewusst im normalen Fluss statt als Overlay, damit es in Modals nicht abgeschnitten
 * wird): Reiter "Standard" (gängige Unicode-Emojis) und "Server" (Discord-Server-Emojis, sofern der Bot sie
 * abrufen kann). Ein Klick liefert den Text zum Einfügen — Unicode direkt, Server-Emojis als `<:name:id>`.
 */

const UNICODE_GROUPS: { label: string; emojis: string[] }[] = [
  { label: "Smileys", emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😋", "😎", "🤩", "🥳", "😏", "🤔", "🤨", "😐", "😴", "😢", "😭", "😤", "😡", "🤯", "😱", "🥶", "🥵", "🤗", "🙄", "😬", "🤝"] },
  { label: "Gesten", emojis: ["👍", "👎", "👏", "🙌", "🙏", "💪", "👌", "✌️", "🤞", "🤘", "🤙", "👋", "🫡", "🫶", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💔", "💯", "🔥", "✨", "⭐", "🌟", "💥", "💢", "💤"] },
  { label: "Gaming & Events", emojis: ["🎮", "🕹️", "🎯", "🎲", "♟️", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "👑", "🎉", "🎊", "🎁", "📣", "📢", "🔔", "📅", "⏰", "⚔️", "🛡️", "💣", "🚀", "👾", "🤖", "🎧", "🎤", "📸", "🎬", "📰", "💡", "📌", "🔗", "📈", "💰"] },
  { label: "Symbole", emojis: ["✅", "❌", "⚠️", "❗", "❓", "➡️", "⬆️", "⬇️", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🆕", "🆒", "🔝", "➕", "➖", "✔️", "™️", "♾️"] },
];

interface Props {
  /** Wird mit dem einzufügenden Text aufgerufen. */
  onPick: (text: string) => void;
  onClose: () => void;
}

export default function EmojiPanel({ onPick, onClose }: Props) {
  const [tab, setTab] = useState<"standard" | "server">("standard");
  const [server, setServer] = useState<CustomEmoji[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/community-jobs/discord-emojis")
      .then(r => (r.ok ? r.json() : { emojis: [] }))
      .then((d: { emojis: CustomEmoji[] }) => setServer(d.emojis ?? []))
      .catch(() => setServer([]));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hasServer = (server?.length ?? 0) > 0;
  const q = query.trim().toLowerCase();
  const filteredServer = (server ?? []).filter(e => !q || e.name.toLowerCase().includes(q));

  return (
    <div className="rounded-lg border border-white/10 bg-gray-900/95 p-2 space-y-2" role="dialog" aria-label="Emoji auswählen">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 text-[11px] font-semibold" role="tablist">
          <button role="tab" aria-selected={tab === "standard"} onClick={() => setTab("standard")}
            className={`px-2.5 py-1 rounded-md ${tab === "standard" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}>Standard</button>
          {hasServer && (
            <button role="tab" aria-selected={tab === "server"} onClick={() => setTab("server")}
              className={`px-2.5 py-1 rounded-md ${tab === "server" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}>Server ({server!.length})</button>
          )}
        </div>
        <button onClick={onClose} aria-label="Emoji-Auswahl schließen" className="text-gray-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
      </div>

      {tab === "standard" || !hasServer ? (
        <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
          {UNICODE_GROUPS.map(g => (
            <div key={g.label} className="space-y-1">
              <p className="text-[10px] text-gray-500">{g.label}</p>
              <div className="flex flex-wrap gap-0.5">
                {g.emojis.map(e => (
                  <button key={e} onClick={() => onPick(e)} aria-label={e}
                    className="w-8 h-8 flex items-center justify-center text-lg rounded-md hover:bg-white/10 transition-colors">{e}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Server-Emoji suchen…" aria-label="Server-Emoji suchen"
            className="w-full bg-white/[0.04] border border-white/10 rounded-md px-2 py-1 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40" />
          <div className="max-h-48 overflow-y-auto flex flex-wrap gap-0.5 pr-1">
            {filteredServer.length === 0 && <p className="text-[11px] text-gray-600 p-1">Kein Emoji gefunden.</p>}
            {filteredServer.map(e => (
              <button key={e.id} onClick={() => onPick(customEmojiToken(e))} title={`:${e.name}:`} aria-label={`:${e.name}:`}
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors">
                {/* eslint-disable-next-line @next/next/no-img-element -- Discord-CDN */}
                <img src={customEmojiUrl(e, 32)} alt="" loading="lazy" className="w-6 h-6 object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
