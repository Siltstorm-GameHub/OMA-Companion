"use client";

// ============================================
// OMA Blocks — Versus-Einstieg im Games-Hub mit Live-Raumliste
// ============================================
// Verbindet sich als Zuschauer ("observe", siehe blocks-server) mit dem Versus-Server: Das zählt nicht als
// Spieler-Verbindung, eine offene Versus-Runde in einem anderen Tab bleibt also bestehen. Zeigt, wie
// viele gerade verbunden sind, und die offenen öffentlichen Räume mit „Beitreten“ (?raum=CODE tritt auf
// der Versus-Seite direkt bei). Ist Versus nicht eingerichtet oder der Server nicht erreichbar, bleibt
// nur die normale Kachel.

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Swords, Users } from "@/components/icons";
import type { ClientMessage, PublicRoomInfo, ServerMessage } from "@/lib/blocks/protocol";

type Live = { rooms: PublicRoomInfo[]; online: number } | null;

export default function VersusLobbyLive() {
  const [live, setLive] = useState<Live>(null);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    (async () => {
      try {
        const res = await fetch("/api/blocks/mp-token", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const { url, token } = (await res.json()) as { url: string; token: string };
        ws = new WebSocket(url);
        ws.onopen = () => ws?.send(JSON.stringify({ t: "observe", token } satisfies ClientMessage));
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(String(ev.data)) as ServerMessage;
            if (msg.t === "rooms" && !cancelled) setLive({ rooms: msg.rooms, online: msg.online ?? 0 });
          } catch {
            /* ungültige Nachricht ignorieren */
          }
        };
        ws.onclose = () => {
          if (!cancelled) setLive(null);
        };
      } catch {
        /* Versus nicht erreichbar — nur die Kachel zeigen */
      }
    })();
    return () => {
      cancelled = true;
      ws?.close();
    };
  }, []);

  const open = live?.rooms.filter((r) => r.phase === "lobby") ?? [];
  const running = live ? live.rooms.length - open.length : 0;

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <Link href="/games/blocks/versus" className="flex items-center gap-4 group">
        <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(192,132,252,0.12)", border: "1px solid rgba(192,132,252,0.25)" }}>
          <Swords className="w-5 h-5 text-violet-300" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-display text-lg font-bold text-white">Versus</span>
          <span className="block text-xs text-gray-400">Echtzeit gegen bis zu 7 Leute — Linien schicken Garbage rüber.</span>
        </span>
        <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white shrink-0" />
      </Link>

      {live && (
        <div className="space-y-2 border-t border-white/5 pt-3">
          <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className={`w-2 h-2 rounded-full ${live.online > 0 ? "bg-emerald-400 animate-pulse" : "bg-gray-600"}`} />
            {live.online === 0
              ? "Gerade spielt niemand Versus — öffne einen Raum und teile den Link im Discord."
              : `${live.online} Spieler online` +
                (running > 0 ? ` · ${running} ${running === 1 ? "Runde läuft" : "Runden laufen"}` : "")}
          </p>
          {open.slice(0, 3).map((r) => (
            <Link
              key={r.code}
              href={`/games/blocks/versus?raum=${r.code}`}
              className="flex items-center gap-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] px-3 py-2 transition-colors"
            >
              <span className="flex -space-x-1.5 shrink-0">
                {r.players.map((p, i) =>
                  p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={p.image} alt="" className="w-6 h-6 rounded-full ring-2 ring-[#15151b] object-cover" />
                  ) : (
                    <span key={i} className="w-6 h-6 rounded-full ring-2 ring-[#15151b] bg-white/10 flex items-center justify-center">
                      <Users className="w-3 h-3 text-gray-400" />
                    </span>
                  )
                )}
              </span>
              <span className="flex-1 min-w-0 text-xs text-gray-300 truncate">
                Raum von <span className="text-white font-semibold">{r.players[0]?.name ?? "?"}</span> · {r.playerCount}/8
              </span>
              <span className="text-xs font-semibold text-violet-300 shrink-0">Beitreten</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
