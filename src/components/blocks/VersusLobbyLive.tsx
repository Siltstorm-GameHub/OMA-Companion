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
import { ChevronRight, Plus, Swords, Trophy, Users } from "@/components/icons";
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
    <section aria-label="Versus" className="glass rounded-2xl p-4 sm:p-5 flex flex-col gap-3 h-full">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(192,132,252,0.12)", border: "1px solid rgba(192,132,252,0.25)" }}>
          <Swords className="w-5 h-5 text-violet-300" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-violet-300/90">Versus</p>
          <p className="text-xs text-gray-400">Echtzeit gegen bis zu 7 Leute, volle Linien schicken Garbage rüber.</p>
        </div>
      </div>

      {live ? (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs text-gray-300">
            <span className={`w-2 h-2 rounded-full ${live.online > 0 ? "bg-emerald-400 animate-pulse" : "bg-gray-600"}`} />
            {live.online === 0
              ? "Gerade spielt niemand. Öffne einen Raum und teile den Link im Discord."
              : `${live.online} online` + (running > 0 ? ` · ${running} ${running === 1 ? "Runde läuft" : "Runden laufen"}` : "")}
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
      ) : (
        <p className="text-xs text-gray-500">Öffne einen Raum oder tritt über einen geteilten Link bei.</p>
      )}

      <Link href="/games/blocks/versus"
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/15 hover:bg-violet-500/25 text-violet-100 font-semibold text-sm px-5 py-2.5 transition-colors">
        <Plus className="w-4 h-4" /> Raum öffnen
      </Link>

      {/* Eigenes Versus-Turnier als Event planen (Event-Assistent mit OMA Blocks vorausgewählt) */}
      <Link href="/events/verwalten/neu?mode=event&blocks=1"
        className="flex items-center gap-2 text-[11px] text-gray-500 hover:text-white group">
        <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
        <span className="flex-1">Versus-Turnier planen, mit Gruppen, Finale und Anmeldung</span>
        <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white shrink-0" />
      </Link>
    </section>
  );
}
