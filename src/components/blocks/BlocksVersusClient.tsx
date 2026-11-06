"use client";
// ============================================
// OMA Blocks — Versus (Echtzeit-Multiplayer über den WebSocket-Server im Bot auf Render)
// ============================================
// Anmeldung: Token von /api/blocks/mp-token holen → WebSocket öffnen → "hello". Danach Räume:
// Schnelles Spiel (öffentlicher Raum), privater Raum mit Code/Einladungslink. Alle Spieler einer
// Runde bekommen denselben Seed. Eigene Angriffe gehen an den Server, der Ziel und Lücke wählt.
// Turnier-Modus (tournamentEventId, Seite /gems/blocks/turnier/[eventId]): Statt Räume zu wählen, holt der
// Client ein Ticket und betritt damit den Raum seiner Gruppe bzw. das Finale — Runden starten automatisch.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { encodeVisibleBoard, type BlocksEngine, type EngineEvent } from "@/lib/blocks/engine";
import type { ClientMessage, PublicRoomInfo, RoomState, ServerMessage } from "@/lib/blocks/protocol";
import { MAX_ROOM_PLAYERS, ROOM_CODE_LENGTH } from "@/lib/blocks/protocol";
import BlocksPlayfield from "./BlocksPlayfield";
import SettingsPanel from "./SettingsPanel";
import FullscreenShell, { useIsPhone } from "./FullscreenShell";
import { drawMiniBoard } from "./render";
import { useBlocksSettings } from "./settings";
import type { BlocksRunner } from "./runner";
import { Button, Modal } from "@/components/ui";
import { ArrowLeft, Copy, Crown, Loader2, LogOut, Play, RefreshCw, Settings, Skull, Users, Zap } from "@/components/icons";
import { toast } from "sonner";
import { groupLabel } from "@/lib/blocks/tournament-shared";
import TournamentStandings, { PHASE_LABEL, useTournamentState } from "./TournamentStandings";

type ConnStatus = "connecting" | "ready" | "closed" | "unavailable";

interface Game {
  seed: number;
  round: number;
  players: string[];
}

interface EndInfo {
  round: number;
  placements: { id: string; place: number }[];
  winnerId: string | null;
}

function clearTimers(list: ReturnType<typeof setTimeout>[]): void {
  list.forEach(clearTimeout);
  list.length = 0;
}

function Avatar({ src, name, size = 28 }: { src: string | null; name: string; size?: number }) {
  if (!src) {
    return (
      <span className="rounded-full bg-white/10 flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ width: size, height: size }}>
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return <Image src={src} alt={name} width={size} height={size} className="rounded-full shrink-0" />;
}

function MiniBoard({
  board, garbage, dead, place, name, compact = false,
}: { board: string | null; garbage: number; dead: boolean; place: number | null; name: string; compact?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth * dpr;
    const h = c.clientHeight * dpr;
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    const ctx = c.getContext("2d");
    if (ctx) drawMiniBoard(ctx, board, garbage, dead);
  }, [board, garbage, dead]);
  return (
    <div className={compact ? "space-y-0.5" : "space-y-1"}>
      <div className="relative">
        <canvas ref={ref} className="block w-full aspect-[1/2]" />
        {dead && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/40">
            <Skull className={compact ? "w-3.5 h-3.5 text-red-400" : "w-5 h-5 text-red-400"} />
            {place && <span className={`${compact ? "text-[10px]" : "text-xs"} font-black text-white`}>#{place}</span>}
          </div>
        )}
      </div>
      <p className={`${compact ? "text-[9px]" : "text-[11px]"} text-center text-gray-300 truncate font-semibold`}>{name}</p>
    </div>
  );
}

export default function BlocksVersusClient({
  initialRoomCode, tournamentEventId = null,
}: { initialRoomCode: string | null; tournamentEventId?: string | null }) {
  const [settings, saveSettings] = useBlocksSettings();
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const [statusText, setStatusText] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [publicRooms, setPublicRooms] = useState<PublicRoomInfo[]>([]);
  const [game, setGame] = useState<Game | null>(null);
  const [running, setRunning] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [boards, setBoards] = useState<Record<string, { b: string; g: number }>>({});
  const [kos, setKos] = useState<Record<string, number>>({});
  const [end, setEnd] = useState<EndInfo | null>(null);
  const [joinCode, setJoinCode] = useState(initialRoomCode ?? "");
  const [showSettings, setShowSettings] = useState(false);
  const [connectNonce, setConnectNonce] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const runnerRef = useRef<BlocksRunner | null>(null);
  const myIdRef = useRef<string | null>(null);
  const deadSentRef = useRef(false);
  const lastBoardRef = useRef("");
  const pendingJoinRef = useRef<string | null>(initialRoomCode);
  const tourMode = !!tournamentEventId;
  const [tourState, reloadTour] = useTournamentState(tournamentEventId, 5000);
  const [tourError, setTourError] = useState<string | null>(null);
  const [tourJoining, setTourJoining] = useState(false);
  /** Für welche Phase/Gruppe schon automatisch beigetreten wurde (nach dem Verlassen nicht erneut hineinziehen) */
  const autoJoinRef = useRef<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const countdownTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  const onMessage = useCallback((msg: ServerMessage) => {
    switch (msg.t) {
      case "welcome":
        myIdRef.current = msg.userId;
        setMyId(msg.userId);
        setStatus("ready");
        autoJoinRef.current = null;
        if (pendingJoinRef.current) {
          send({ t: "join", code: pendingJoinRef.current });
          pendingJoinRef.current = null;
        }
        break;
      case "room":
        setRoom(msg.room);
        break;
      case "rooms":
        setPublicRooms(msg.rooms);
        break;
      case "left":
        setRoom(null);
        setGame(null);
        setRunning(false);
        setEnd(null);
        break;
      case "start": {
        clearTimers(countdownTimers.current);
        deadSentRef.current = false;
        lastBoardRef.current = "";
        setBoards({});
        setKos({});
        setEnd(null);
        setRunning(false);
        setGame({ seed: msg.seed, round: msg.round, players: msg.players });
        const steps = Math.ceil(msg.countdownMs / 1000);
        setCountdown(steps);
        for (let i = 1; i <= steps; i++) {
          countdownTimers.current.push(
            setTimeout(() => {
              const left = steps - i;
              setCountdown(left > 0 ? left : null);
              if (left <= 0 && myIdRef.current && msg.players.includes(myIdRef.current)) setRunning(true);
            }, (msg.countdownMs / steps) * i),
          );
        }
        break;
      }
      case "board":
        setBoards((prev) => ({ ...prev, [msg.id]: { b: msg.b, g: msg.g } }));
        break;
      case "garbage":
        runnerRef.current?.queueGarbage(msg.lines, msg.hole);
        break;
      case "ko":
        setKos((prev) => ({ ...prev, [msg.id]: msg.place }));
        if (msg.id === myIdRef.current) {
          deadSentRef.current = true;
          setRunning(false);
        }
        break;
      case "end":
        clearTimers(countdownTimers.current);
        setCountdown(null);
        setRunning(false);
        setEnd({ round: msg.round, placements: msg.placements, winnerId: msg.winnerId });
        break;
      case "error":
        toast.error(msg.message);
        break;
    }
  }, [send]);

  // Verbindung aufbauen
  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    const timers = countdownTimers.current;
    (async () => {
      setStatus("connecting");
      setStatusText(null);
      try {
        const res = await fetch("/api/blocks/mp-token", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setStatus(res.status === 503 ? "unavailable" : "closed");
          setStatusText(data.error ?? "Verbindung fehlgeschlagen.");
          return;
        }
        ws = new WebSocket(data.url);
        wsRef.current = ws;
        let opened = false;
        let welcomed = false;
        let host = String(data.url);
        try {
          host = new URL(data.url).host;
        } catch {
          /* Rohwert anzeigen */
        }
        ws.onopen = () => {
          opened = true;
          ws?.send(JSON.stringify({ t: "hello", token: data.token } satisfies ClientMessage));
        };
        ws.onmessage = (ev) => {
          try {
            const parsed = JSON.parse(String(ev.data)) as ServerMessage;
            if (parsed.t === "welcome") welcomed = true;
            onMessage(parsed);
          } catch {
            /* ungültige Nachricht ignorieren */
          }
        };
        ws.onclose = (ev) => {
          if (cancelled) return;
          setStatus("closed");
          // Möglichst genau sagen, woran es liegt — hilft beim Einrichten (siehe docs/oma-blocks.md).
          if (!opened) {
            setStatusText(`Versus-Server nicht erreichbar (${host}). Läuft der Bot, und ist dort BLOCKS_MP_SECRET gesetzt?`);
          } else if (ev.code === 4001 && !welcomed) {
            setStatusText("Anmeldung am Versus-Server abgelehnt — BLOCKS_MP_SECRET muss in Vercel und Render identisch sein.");
          } else if (ev.code === 4002) {
            setStatusText("OMA Blocks Versus ist in einem anderen Tab geöffnet.");
          } else {
            setStatusText(`Verbindung zum Versus-Server getrennt (Code ${ev.code}).`);
          }
          setRunning(false);
        };
      } catch {
        if (!cancelled) {
          setStatus("closed");
          setStatusText("Versus-Server nicht erreichbar.");
        }
      }
    })();
    return () => {
      cancelled = true;
      clearTimers(timers);
      ws?.close();
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [connectNonce, onMessage]);

  const onEvents = useCallback((events: EngineEvent[]) => {
    for (const ev of events) {
      if (ev.type === "clear" && ev.sent > 0) {
        send({ t: "attack", sent: ev.sent, clear: ev.info });
      } else if (ev.type === "gameover" && !deadSentRef.current) {
        deadSentRef.current = true;
        send({ t: "dead" });
      }
    }
  }, [send]);

  const onSync = useCallback((engine: BlocksEngine) => {
    const b = encodeVisibleBoard(engine);
    const key = b + engine.pendingGarbageTotal;
    if (key === lastBoardRef.current) return;
    lastBoardRef.current = key;
    send({ t: "board", b, g: engine.pendingGarbageTotal });
  }, [send]);

  // ── Turnier: Ticket holen und Raum betreten ──
  const joinTournament = useCallback(async () => {
    if (!tournamentEventId) return;
    setTourJoining(true);
    try {
      const res = await fetch(`/api/blocks/tournaments/${tournamentEventId}/ticket`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTourError(data.error ?? "Kein Zugang zum Turnier-Raum.");
        return;
      }
      setTourError(null);
      send({ t: "tjoin", ticket: data.ticket });
    } catch {
      setTourError("Turnier-Raum gerade nicht erreichbar.");
    } finally {
      setTourJoining(false);
    }
  }, [tournamentEventId, send]);

  // Automatisch beitreten, sobald man spielen darf — auch nach der Vorrunde ins Finale wechseln.
  useEffect(() => {
    if (!tourMode || status !== "ready" || !tourState?.me.canPlay) return;
    if (room && !room.tour?.done) return;
    const key = `${tourState.phase}:${tourState.me.group ?? "f"}`;
    if (autoJoinRef.current === key) return;
    autoJoinRef.current = key;
    void joinTournament();
  }, [tourMode, status, tourState, room, joinTournament]);

  // Stand nach jeder Runde sofort neu laden
  useEffect(() => {
    if (tourMode && end) void reloadTour();
  }, [tourMode, end, reloadTour]);

  // Countdown bis zum automatischen Rundenstart
  const tourStartsAt = room?.tour?.startsAt ?? null;
  useEffect(() => {
    if (!tourStartsAt) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [tourStartsAt]);

  const me = room?.players.find((p) => p.id === myId) ?? null;
  const isHost = !!me?.host;
  const inGame = !!room && room.phase !== "lobby";
  const iPlay = !!game && !!myId && !!me?.inRound && game.players.includes(myId);
  const isPhone = useIsPhone();
  const fullscreen = isPhone && inGame && iPlay;
  const playerById = new Map((room?.players ?? []).map((p) => [p.id, p]));

  const copyInvite = async (code = room?.code) => {
    if (!code) return;
    const url = `${window.location.origin}/gems/blocks/versus?raum=${code}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Einladungslink kopiert");
    } catch {
      toast(url);
    }
  };

  // ── Ansichten ──

  const header = (
    <div className="flex items-center justify-between gap-2">
      <Link
        href={tourMode ? `/tournament/${tournamentEventId}` : "/gems?spiel=blocks"}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> {tourMode ? "Zum Event" : "OMA Blocks"}
      </Link>
      <div className="flex items-center gap-1">
        {room && !inGame && (
          <Button variant="ghost" size="sm" onClick={() => send({ t: "leave" })} icon={<LogOut className="w-4 h-4" />}>
            Raum verlassen
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)} icon={<Settings className="w-4 h-4" />}>
          <span className="hidden sm:inline">Einstellungen</span>
        </Button>
      </div>
    </div>
  );

  let body: React.ReactNode;

  if (status === "connecting") {
    body = (
      <div className="glass rounded-2xl p-8 flex flex-col items-center gap-3 text-sm text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" /> Verbinde mit dem Versus-Server …
      </div>
    );
  } else if (status === "unavailable" || status === "closed") {
    body = (
      <div className="glass rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-gray-300">{statusText}</p>
        {status === "closed" && (
          <Button onClick={() => setConnectNonce((n) => n + 1)} icon={<RefreshCw className="w-4 h-4" />}>
            Neu verbinden
          </Button>
        )}
        <Link href="/gems/blocks" className="text-xs text-gray-400 hover:text-white">Solange Solo spielen →</Link>
      </div>
    );
  } else if (tourMode && !room) {
    // Turnier: noch in keinem Raum
    let text = tourError;
    if (!text && tourState) {
      if (tourState.phase === "pending") text = "Das Turnier wurde noch nicht gestartet — diese Seite tritt automatisch bei, sobald es losgeht.";
      else if (tourState.phase === "done") text = "Das Turnier ist beendet.";
      else if (!tourState.me.canPlay) {
        text = tourState.phase === "groups" && tourState.me.group !== null
          ? `${groupLabel(tourState.me.group)} ist fertig — sobald das Finale beginnt, geht es hier weiter.`
          : "Du spielst in dieser Phase nicht mit — unten siehst du den Stand.";
      }
    }
    body = (
      <div className="space-y-4">
        <div className="glass rounded-2xl p-5 space-y-3 text-center">
          <p className="text-[10px] font-semibold text-violet-300 uppercase tracking-widest">{tourState ? PHASE_LABEL[tourState.phase] : "Turnier"}</p>
          {text ? <p className="text-sm text-gray-300">{text}</p> : <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />}
          {tourState?.me.canPlay && (
            <Button onClick={() => void joinTournament()} loading={tourJoining} icon={<Play className="w-4 h-4" />}>
              Turnier-Raum betreten
            </Button>
          )}
        </div>
        {tourState && tourState.phase !== "pending" && (
          <div className="glass rounded-2xl p-4"><TournamentStandings state={tourState} viewerId={myId} /></div>
        )}
      </div>
    );
  } else if (!room) {
    body = (
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-teal-300" />
            <h2 className="font-display text-lg font-bold text-white">Schnelles Spiel</h2>
          </div>
          <p className="text-xs text-gray-400">Tritt einem offenen Raum bei oder eröffne einen — andere können jederzeit dazukommen.</p>
          <Button onClick={() => send({ t: "quick" })} className="w-full" icon={<Play className="w-4 h-4" />}>
            Mitspielen
          </Button>
        </div>
        <div className="glass rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-300" />
            <h2 className="font-display text-lg font-bold text-white">Privater Raum</h2>
          </div>
          <p className="text-xs text-gray-400">Erstelle einen Raum und schick den Link an deine Freunde — oder tritt mit Code bei.</p>
          <Button variant="outline" onClick={() => send({ t: "create", isPublic: false })} className="w-full">
            Raum erstellen
          </Button>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (joinCode.length === ROOM_CODE_LENGTH) send({ t: "join", code: joinCode });
            }}
          >
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ROOM_CODE_LENGTH))}
              placeholder="CODE"
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono tracking-widest text-white placeholder:text-gray-600"
            />
            <Button type="submit" variant="outline" disabled={joinCode.length !== ROOM_CODE_LENGTH}>
              Beitreten
            </Button>
          </form>
        </div>

        <div className="glass rounded-2xl p-5 space-y-3 sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-white">Offene Räume</h2>
            <span className="text-[11px] text-gray-500 tabular-nums">{publicRooms.length}</span>
          </div>
          {publicRooms.length === 0 ? (
            <p className="text-xs text-gray-500">Gerade ist kein Raum offen — eröffne einen über „Mitspielen“, dann sehen ihn alle hier.</p>
          ) : (
            <ul className="space-y-2">
              {publicRooms.map((r) => {
                const full = r.playerCount >= MAX_ROOM_PLAYERS;
                const host = r.players[0]?.name ?? "Spieler";
                return (
                  <li key={r.code} className="flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2">
                    <div className="flex -space-x-2 shrink-0">
                      {r.players.map((p, i) => (
                        <span key={i} className="rounded-full ring-2 ring-[#0b0f17]">
                          <Avatar src={p.image} name={p.name} size={26} />
                        </span>
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">Raum von {host}</p>
                      <p className="text-[11px] text-gray-500">
                        <span className="tabular-nums">{r.playerCount}/{MAX_ROOM_PLAYERS}</span> Spieler ·{" "}
                        {r.phase === "lobby" ? (
                          <span className="text-teal-300">wartet auf Spieler</span>
                        ) : (
                          <span className="text-amber-300">Runde läuft — du spielst ab der nächsten mit</span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyInvite(r.code)}
                      title="Einladungslink kopieren"
                      aria-label="Einladungslink kopieren"
                      className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <Button size="sm" variant={r.phase === "lobby" ? "primary" : "outline"} disabled={full} onClick={() => send({ t: "join", code: r.code })}>
                      {full ? "Voll" : "Beitreten"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  } else if (!inGame && room.tour) {
    // Turnier-Warteraum
    const tour = room.tour;
    const present = new Set(room.players.map((p) => p.id));
    const knownRows = [...(tourState?.groups.flatMap((g) => g.rows) ?? []), ...(tourState?.final?.rows ?? [])];
    const rosterNames = new Map(knownRows.map((r) => [r.userId, r.name]));
    const secs = tour.startsAt ? Math.max(0, Math.ceil((tour.startsAt - now) / 1000)) : null;
    body = (
      <div className="space-y-4">
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-semibold text-violet-300 uppercase tracking-widest">{tourState?.title ?? "Live-Turnier"}</p>
              <p className="font-display text-2xl font-black text-white">{tour.stage === "final" ? "Finale" : groupLabel(tour.group)}</p>
            </div>
            <p className="text-sm font-bold text-white tabular-nums">
              {tour.done ? "Alle Runden gespielt" : `Runde ${room.round + 1} von ${tour.rounds}`}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-1.5">
            {tour.roster.map((id) => {
              const p = playerById.get(id);
              const name = p?.name ?? rosterNames.get(id) ?? "Spieler";
              return (
                <div key={id} className={`flex items-center gap-3 rounded-xl px-3 py-2 bg-white/[0.03] ${id === myId ? "ring-1 ring-teal-500/40" : ""} ${present.has(id) ? "" : "opacity-40"}`}>
                  <Avatar src={p?.image ?? null} name={name} />
                  <span className="flex-1 min-w-0 truncate text-sm font-semibold text-white">{name}</span>
                  <span className={`text-[11px] ${present.has(id) ? "text-teal-300" : "text-gray-500"}`}>{present.has(id) ? "da" : "fehlt"}</span>
                </div>
              );
            })}
          </div>

          {tour.done ? (
            <p className="text-center text-sm text-gray-300">
              {tour.stage === "final"
                ? "Das Finale ist gespielt — der Endstand steht unten."
                : "Deine Gruppe ist fertig. Wer weiterkommt, wechselt automatisch ins Finale, sobald alle Gruppen durch sind."}
            </p>
          ) : secs !== null ? (
            <p className="text-center text-sm text-white">Nächste Runde startet in <span className="font-black tabular-nums">{secs}</span> s</p>
          ) : (
            <p className="text-center text-xs text-gray-400">
              Wartet auf Mitspieler — die Runde startet automatisch, sobald alle da sind (spätestens 90 Sekunden nachdem der zweite Spieler da ist).
            </p>
          )}
        </div>
        {tourState && <div className="glass rounded-2xl p-4"><TournamentStandings state={tourState} viewerId={myId} /></div>}
      </div>
    );
  } else if (!inGame) {
    // Lobby
    body = (
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{room.isPublic ? "Öffentlicher Raum" : "Privater Raum"}</p>
            <p className="font-mono text-2xl font-black text-white tracking-[0.3em]">{room.code}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void copyInvite()} icon={<Copy className="w-4 h-4" />}>
            Einladungslink
          </Button>
        </div>

        <div className="space-y-1.5">
          {room.players.map((p) => (
            <div key={p.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 bg-white/[0.03] ${p.id === myId ? "ring-1 ring-teal-500/40" : ""}`}>
              <Avatar src={p.image} name={p.name} />
              <span className="flex-1 min-w-0 truncate text-sm font-semibold text-white">{p.name}</span>
              {p.host && <Crown className="w-4 h-4 text-amber-300" />}
              <span className="text-xs text-gray-400 tabular-nums">{p.wins} {p.wins === 1 ? "Sieg" : "Siege"}</span>
            </div>
          ))}
        </div>

        {end && (
          <p className="text-xs text-gray-400">
            Letzte Runde: <span className="text-white font-semibold">{end.winnerId ? playerById.get(end.winnerId)?.name ?? "—" : "kein Sieger"}</span> hat gewonnen.
          </p>
        )}

        {isHost ? (
          <Button onClick={() => send({ t: "start" })} disabled={room.players.length < 2} className="w-full" icon={<Play className="w-4 h-4" />}>
            {room.players.length < 2 ? "Warte auf Mitspieler …" : "Runde starten"}
          </Button>
        ) : (
          <p className="text-center text-xs text-gray-500">Warte, bis der Host die Runde startet …</p>
        )}
      </div>
    );
  } else {
    // Laufende Runde
    const opponents = (room?.players ?? []).filter((p) => p.inRound && p.id !== myId).map((p) => p.id);
    const myPlace = myId ? kos[myId] ?? end?.placements.find((p) => p.id === myId)?.place ?? null : null;
    let overlay: React.ReactNode = null;
    if (countdown !== null) {
      overlay = <p className="font-display text-6xl font-black text-white drop-shadow-lg">{countdown}</p>;
    } else if (end) {
      overlay = (
        <div className="glass-heavy rounded-2xl p-4 w-64 max-w-[90%] space-y-2 text-center">
          <p className="font-display text-xl font-black text-white">
            {end.winnerId === myId ? "Gewonnen!" : myPlace ? `Platz ${myPlace}` : "Runde vorbei"}
          </p>
          <ol className="space-y-1 text-left">
            {end.placements.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-xs">
                <span className="w-5 text-gray-500 tabular-nums">{p.place}.</span>
                <span className={`truncate ${p.id === myId ? "text-teal-300 font-bold" : "text-white"}`}>{playerById.get(p.id)?.name ?? "Spieler"}</span>
              </li>
            ))}
          </ol>
          <p className="text-[10px] text-gray-500">Gleich geht es zurück in den Raum.</p>
        </div>
      );
    } else if (myPlace) {
      overlay = (
        <div className="glass-heavy rounded-2xl p-4 text-center">
          <p className="font-display text-xl font-black text-white">Platz {myPlace}</p>
          <p className="text-xs text-gray-400">Du schaust den anderen zu …</p>
        </div>
      );
    }

    const opponentBoards = (compact: boolean) =>
      opponents.map((id) => {
        const p = playerById.get(id);
        const board = (
          <MiniBoard
            key={id}
            board={boards[id]?.b ?? null}
            garbage={boards[id]?.g ?? 0}
            dead={kos[id] != null || !p}
            place={kos[id] ?? null}
            name={p?.name ?? "Weg"}
            compact={compact}
          />
        );
        return compact ? <div key={id} className="w-9 shrink-0">{board}</div> : board;
      });
    const aliveCount = opponents.filter((id) => kos[id] == null && playerById.has(id)).length;

    body = (
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Handy-Vollbild: Gegner als schmale Leiste über dem eigenen Feld */}
        {fullscreen && opponents.length > 0 && (
          <div className="w-full flex items-start gap-2 -mb-2">
            <div className="shrink-0 pt-1 text-center">
              <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest">Gegner</p>
              <p className="text-sm font-black text-white tabular-nums">{aliveCount}<span className="text-gray-500">/{opponents.length}</span></p>
            </div>
            <div className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto pb-1">{opponentBoards(true)}</div>
          </div>
        )}
        <div className="w-full lg:flex-1">
          {iPlay && game ? (
            <BlocksPlayfield
              key={`${game.round}-${game.seed}`}
              seed={game.seed}
              mode="versus"
              handling={settings.handling}
              ghost={settings.ghost}
              touchControls={settings.touchControls}
              gestures={settings.gestures}
              gestureSensitivity={settings.gestureSensitivity}
              haptics={settings.haptics}
              keyBindings={settings.keys}
              gamepad={settings.gamepad}
              padBindings={settings.pad}
              running={running}
              runnerRef={runnerRef}
              onEvents={onEvents}
              onSync={onSync}
              reserveHeight={fullscreen ? 190 : 180}
              overlay={overlay}
            />
          ) : (
            <div className="glass rounded-2xl p-6 text-center text-sm text-gray-400">Diese Runde läuft schon — du bist in der nächsten dabei.</div>
          )}
        </div>
        {!fullscreen && (
          <div className="w-full lg:w-[360px] grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-3">{opponentBoards(false)}</div>
        )}
      </div>
    );
  }

  return (
    <FullscreenShell active={fullscreen}>
    <div className="space-y-4">
      {header}
      <div className={fullscreen ? "hidden" : undefined}>
        <h1 className="font-display text-2xl font-black text-white tracking-tight">{tourMode ? `OMA Blocks · ${tourState?.title ?? "Turnier"}` : "OMA Blocks · Versus"}</h1>
        <p className="text-xs text-gray-500">
          {tourMode
            ? "Live-Turnier: Punkte je Runde nach Platz, die Besten jeder Gruppe kommen ins Finale."
            : "Echtzeit gegen bis zu 7 andere — abgeräumte Linien landen als Garbage beim Gegner."}
        </p>
      </div>
      {body}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Einstellungen">
        <SettingsPanel settings={settings} onChange={saveSettings} />
        <p className="text-[11px] text-gray-500 mt-4">Geänderte Steuerung gilt ab der nächsten Runde.</p>
      </Modal>
    </div>
    </FullscreenShell>
  );
}
