// ============================================
// OMA Blocks — Multiplayer-Server (WebSocket)
// ============================================
// Vercel kann keine offenen WebSocket-Verbindungen halten — der Server hängt sich deshalb an einen
// dauerhaft laufenden Node-Prozess: im Normalfall an den HTTP-Server des Discord-Bots auf Render
// (src/bot/index.ts, Pfad /blocks), alternativ eigenständig über `npm run blocks:start`
// (src/blocks-server/index.ts). Siehe docs/oma-blocks.md. Kein eigener Datenbankzugriff:
//  - Anmeldung über ein von der App signiertes Token (/api/blocks/mp-token, BLOCKS_MP_SECRET),
//  - Rundenergebnisse gehen signiert an APP_URL/api/blocks/match-result.
//
// Der Server führt Räume (bis 8 Spieler), vergibt pro Runde einen gemeinsamen Seed (alle bekommen
// dieselbe Teile-Reihenfolge), leitet Feld-Vorschauen weiter, prüft gemeldete Angriffe gegen die
// Angriffstabelle, wählt Ziel und Lücke der Garbage und bestimmt K.o.-Reihenfolge und Sieger.
//
// Umgebungsvariablen: BLOCKS_MP_SECRET, APP_URL, ALLOWED_ORIGINS (optional, kommagetrennt).

import type http from "node:http";
import { randomInt } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import { attackFor, isValidBoardString, MAX_ATTACK_PER_CLEAR, WIDTH } from "../lib/blocks/engine";
import {
  BLOCKS_WS_PATH, COUNTDOWN_MS, MAX_ROOM_PLAYERS, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, isRoomCode,
  type ClientMessage, type RoomPhase, type RoomState, type ServerMessage,
} from "../lib/blocks/protocol";
import { hmac, verifyMpToken, SIGNATURE_HEADER, type MatchResultPayload } from "../lib/blocks/mp-token";

const SECRET = process.env.BLOCKS_MP_SECRET ?? "";
const APP_URL = (process.env.APP_URL ?? "").replace(/\/$/, "");
/** Erlaubte Browser-Origins (ohne abschließenden Schrägstrich, Groß-/Kleinschreibung egal). Leer = alle. */
const normalizeOrigin = (o: string) => o.trim().replace(/\/+$/, "").toLowerCase();
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "").split(",").map(normalizeOrigin).filter(Boolean);


const HELLO_TIMEOUT_MS = 10_000;
const HEARTBEAT_MS = 30_000;
const RESULTS_MS = 5_000;
const MAX_MESSAGE_BYTES = 4096;
const MAX_MSGS_PER_SECOND = 60;
const MAX_ATTACK_PER_SECOND = 40;

interface Client {
  ws: WebSocket;
  userId: string | null;
  name: string;
  image: string | null;
  room: Room | null;
  msgWindowStart: number;
  msgCount: number;
  attackWindowStart: number;
  attackCount: number;
}

interface Member {
  client: Client;
  host: boolean;
  inRound: boolean;
  alive: boolean;
  place: number | null;
  wins: number;
  lastAttacker: string | null;
}

interface Room {
  code: string;
  isPublic: boolean;
  phase: RoomPhase;
  round: number;
  members: Map<string, Member>;
  roundStartedAt: Date | null;
  timer: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, Room>();
/** userId → aktive Verbindung (eine Verbindung je Nutzer; eine neue ersetzt die alte). */
const clientsByUser = new Map<string, Client>();

// ── Hilfen ──

function send(c: Client, msg: ServerMessage): void {
  if (c.ws.readyState === WebSocket.OPEN) c.ws.send(JSON.stringify(msg));
}

function broadcast(room: Room, msg: ServerMessage, exceptUserId?: string): void {
  const data = JSON.stringify(msg);
  for (const [uid, m] of room.members) {
    if (uid === exceptUserId) continue;
    if (m.client.ws.readyState === WebSocket.OPEN) m.client.ws.send(data);
  }
}

function roomState(room: Room): RoomState {
  return {
    code: room.code,
    isPublic: room.isPublic,
    phase: room.phase,
    round: room.round,
    players: [...room.members.entries()].map(([id, m]) => ({
      id,
      name: m.client.name,
      image: m.client.image,
      host: m.host,
      inRound: m.inRound,
      alive: m.alive,
      place: m.place,
      wins: m.wins,
    })),
  };
}

function pushRoom(room: Room): void {
  broadcast(room, { t: "room", room: roomState(room) });
}

function newCode(): string {
  for (;;) {
    let code = "";
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
    if (!rooms.has(code)) return code;
  }
}

function createRoom(isPublic: boolean): Room {
  const room: Room = {
    code: newCode(), isPublic, phase: "lobby", round: 0, members: new Map(), roundStartedAt: null, timer: null,
  };
  rooms.set(room.code, room);
  return room;
}

function joinRoom(c: Client, room: Room): void {
  if (!c.userId) return;
  if (c.room === room) return pushRoom(room);
  leaveRoom(c);
  if (room.members.size >= MAX_ROOM_PLAYERS) return send(c, { t: "error", message: "Der Raum ist voll." });
  room.members.set(c.userId, {
    client: c, host: room.members.size === 0, inRound: false, alive: false, place: null, wins: 0, lastAttacker: null,
  });
  c.room = room;
  pushRoom(room);
}

function leaveRoom(c: Client): void {
  const room = c.room;
  if (!room || !c.userId) return;
  const member = room.members.get(c.userId);
  c.room = null;
  if (!member) return;
  if ((room.phase === "playing" || room.phase === "countdown") && member.inRound && member.alive) {
    knockOut(room, c.userId);
  }
  room.members.delete(c.userId);
  send(c, { t: "left" });
  if (room.members.size === 0) {
    if (room.timer) clearTimeout(room.timer);
    rooms.delete(room.code);
    return;
  }
  if (member.host) {
    const next = room.members.values().next().value;
    if (next) next.host = true;
  }
  checkRoundEnd(room);
  pushRoom(room);
}

// ── Runden ──

function startRound(room: Room): void {
  const players = [...room.members.keys()];
  if (players.length < 2) return;
  room.round++;
  room.phase = "countdown";
  room.roundStartedAt = new Date(Date.now() + COUNTDOWN_MS);
  for (const m of room.members.values()) {
    m.inRound = true;
    m.alive = true;
    m.place = null;
    m.lastAttacker = null;
  }
  const seed = randomInt(1, 2 ** 31 - 1);
  broadcast(room, { t: "start", seed, round: room.round, countdownMs: COUNTDOWN_MS, players });
  pushRoom(room);
  room.timer = setTimeout(() => {
    room.timer = null;
    if (room.phase !== "countdown") return;
    room.phase = "playing";
    pushRoom(room);
  }, COUNTDOWN_MS);
}

function aliveMembers(room: Room): [string, Member][] {
  return [...room.members.entries()].filter(([, m]) => m.inRound && m.alive);
}

function knockOut(room: Room, userId: string): void {
  const m = room.members.get(userId);
  if (!m || !m.inRound || !m.alive) return;
  m.alive = false;
  m.place = aliveMembers(room).length + 1;
  rememberPlacement(room, userId, m.place);
  broadcast(room, { t: "ko", id: userId, place: m.place, by: m.lastAttacker });
}

/** Sieger-Platz kann auch an Spieler gehen, die die Runde schon verlassen haben — deshalb merken wir
 *  die Platzierungen beim K.o. zusätzlich hier (Member wird beim Verlassen gelöscht). */
const roundPlacements = new WeakMap<Room, Map<string, number>>();

function checkRoundEnd(room: Room): void {
  if (room.phase !== "playing" && room.phase !== "countdown") return;
  const alive = aliveMembers(room);
  if (alive.length > 1) return;
  if (alive.length === 1) {
    const [, winner] = alive[0];
    winner.alive = false;
    winner.place = 1;
    winner.wins++;
  }
  if (room.timer) clearTimeout(room.timer);
  room.phase = "results";
  const placements = collectPlacements(room);
  broadcast(room, {
    t: "end",
    round: room.round,
    placements: placements.map((p) => ({ id: p.userId, place: p.place })),
    winnerId: placements.find((p) => p.place === 1)?.userId ?? null,
  });
  pushRoom(room);
  void reportResult(room, placements);
  roundPlacements.delete(room);
  room.timer = setTimeout(() => {
    room.timer = null;
    room.phase = "lobby";
    for (const m of room.members.values()) {
      m.inRound = false;
      m.alive = false;
    }
    pushRoom(room);
  }, RESULTS_MS);
}

function rememberPlacement(room: Room, userId: string, place: number): void {
  let map = roundPlacements.get(room);
  if (!map) roundPlacements.set(room, (map = new Map()));
  map.set(userId, place);
}

function collectPlacements(room: Room): { userId: string; place: number }[] {
  const map = new Map(roundPlacements.get(room) ?? []);
  for (const [uid, m] of room.members) if (m.inRound && m.place != null) map.set(uid, m.place);
  return [...map.entries()].map(([userId, place]) => ({ userId, place })).sort((a, b) => a.place - b.place);
}

async function reportResult(room: Room, placements: { userId: string; place: number }[]): Promise<void> {
  if (!APP_URL || placements.length < 2 || !room.roundStartedAt) return;
  const payload: MatchResultPayload = {
    roomCode: room.code,
    round: room.round,
    startedAt: room.roundStartedAt.toISOString(),
    endedAt: new Date().toISOString(),
    placements,
  };
  const body = JSON.stringify(payload);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${APP_URL}/api/blocks/match-result`, {
        method: "POST",
        headers: { "Content-Type": "application/json", [SIGNATURE_HEADER]: hmac(SECRET, body) },
        body,
      });
      if (res.ok) return;
      console.warn(`⚠ Ergebnis-Meldung ${res.status} (Versuch ${attempt})`);
      if (res.status < 500) return;
    } catch (err) {
      console.warn(`⚠ Ergebnis-Meldung fehlgeschlagen (Versuch ${attempt})`, err);
    }
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
}

// ── Nachrichten ──

function rateLimited(c: Client): boolean {
  const now = Date.now();
  if (now - c.msgWindowStart > 1000) {
    c.msgWindowStart = now;
    c.msgCount = 0;
  }
  return ++c.msgCount > MAX_MSGS_PER_SECOND;
}

function handle(c: Client, msg: ClientMessage): void {
  if (msg.t === "ping") return send(c, { t: "pong" });

  if (msg.t === "hello") {
    const p = verifyMpToken(SECRET, msg.token);
    if (!p) {
      console.warn("⚠ OMA Blocks Versus: ungültiges Token (abgelaufen oder BLOCKS_MP_SECRET passt nicht zur App)");
      send(c, { t: "error", message: "Anmeldung abgelaufen — bitte Seite neu laden." });
      c.ws.close(4001, "auth");
      return;
    }
    const previous = clientsByUser.get(p.uid);
    if (previous && previous !== c) {
      send(previous, { t: "error", message: "Du hast OMA Blocks in einem anderen Tab geöffnet." });
      leaveRoom(previous);
      previous.ws.close(4002, "replaced");
    }
    c.userId = p.uid;
    c.name = p.name;
    c.image = p.img;
    clientsByUser.set(p.uid, c);
    return send(c, { t: "welcome", userId: p.uid });
  }

  if (!c.userId) return;
  const room = c.room;
  const me = room?.members.get(c.userId);

  switch (msg.t) {
    case "quick": {
      const open = [...rooms.values()].find((r) => r.isPublic && r.phase === "lobby" && r.members.size < MAX_ROOM_PLAYERS);
      joinRoom(c, open ?? createRoom(true));
      return;
    }
    case "create":
      joinRoom(c, createRoom(!!msg.isPublic));
      return;
    case "join": {
      const code = typeof msg.code === "string" ? msg.code.toUpperCase() : "";
      const target = isRoomCode(code) ? rooms.get(code) : undefined;
      if (!target) return send(c, { t: "error", message: "Raum nicht gefunden." });
      joinRoom(c, target);
      return;
    }
    case "leave":
      leaveRoom(c);
      return;
    case "start":
      if (!room || !me?.host) return;
      if (room.phase !== "lobby") return;
      if (room.members.size < 2) return send(c, { t: "error", message: "Mindestens 2 Spieler nötig." });
      startRound(room);
      return;
    case "board":
      if (!room || !me?.inRound || room.phase !== "playing") return;
      if (!isValidBoardString(msg.b)) return;
      broadcast(room, { t: "board", id: c.userId, b: msg.b, g: Math.max(0, Math.min(99, Number(msg.g) | 0)) }, c.userId);
      return;
    case "attack": {
      if (!room || !me?.inRound || !me.alive || room.phase !== "playing") return;
      const cl = msg.clear;
      const sent = Number(msg.sent) | 0;
      if (!cl || typeof cl !== "object") return;
      const lines = Number(cl.lines) | 0;
      const combo = Number(cl.combo) | 0;
      if (lines < 1 || lines > 4 || combo < 0 || combo > 40) return;
      if (!["none", "mini", "full"].includes(cl.spin)) return;
      const max = attackFor({ lines, spin: cl.spin, combo, b2b: !!cl.b2b, perfectClear: !!cl.perfectClear });
      if (sent <= 0 || sent > max || sent > MAX_ATTACK_PER_CLEAR) return;
      const now = Date.now();
      if (now - c.attackWindowStart > 1000) {
        c.attackWindowStart = now;
        c.attackCount = 0;
      }
      c.attackCount += sent;
      if (c.attackCount > MAX_ATTACK_PER_SECOND) return;
      const targets = aliveMembers(room).filter(([uid]) => uid !== c.userId);
      if (targets.length === 0) return;
      const [, target] = targets[randomInt(targets.length)];
      target.lastAttacker = c.userId;
      send(target.client, { t: "garbage", lines: sent, hole: randomInt(WIDTH), from: c.userId });
      return;
    }
    case "dead":
      if (!room || !me?.inRound || !me.alive) return;
      if (room.phase !== "playing" && room.phase !== "countdown") return;
      knockOut(room, c.userId);
      checkRoundEnd(room);
      pushRoom(room);
      return;
  }
}

// ── Server ──

/** Aktuelle Auslastung (für Health-Checks). */
export function getBlocksStats(): { rooms: number; players: number } {
  return { rooms: rooms.size, players: clientsByUser.size };
}

/**
 * Hängt den Versus-WebSocket an einen bestehenden HTTP-Server (Pfad BLOCKS_WS_PATH). Ohne
 * BLOCKS_MP_SECRET passiert nichts (Rückgabe false) — so läuft der Bot auch ohne Versus-Konfiguration.
 */
export function attachBlocksServer(server: http.Server): boolean {
  if (!SECRET) {
    console.warn("⚠ OMA Blocks Versus: BLOCKS_MP_SECRET fehlt — Versus-Server nicht gestartet.");
    return false;
  }
  const wss = new WebSocketServer({
    server,
    path: BLOCKS_WS_PATH,
    maxPayload: MAX_MESSAGE_BYTES,
    verifyClient: ({ origin }: { origin: string }) => {
      if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(normalizeOrigin(origin ?? ""))) return true;
      console.warn(`⚠ OMA Blocks Versus: Verbindung von ${origin} abgelehnt (nicht in ALLOWED_ORIGINS)`);
      return false;
    },
  });

  const alive = new WeakMap<WebSocket, boolean>();

  wss.on("connection", (ws) => {
    const c: Client = {
      ws, userId: null, name: "", image: null, room: null,
      msgWindowStart: Date.now(), msgCount: 0, attackWindowStart: Date.now(), attackCount: 0,
    };
    alive.set(ws, true);
    ws.on("pong", () => alive.set(ws, true));

    const helloTimer = setTimeout(() => {
      if (!c.userId) ws.close(4001, "auth timeout");
    }, HELLO_TIMEOUT_MS);

    ws.on("message", (data) => {
      if (rateLimited(c)) return;
      let msg: ClientMessage;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      if (!msg || typeof msg !== "object" || typeof msg.t !== "string") return;
      try {
        handle(c, msg);
      } catch (err) {
        console.error("Fehler bei Nachricht", msg.t, err);
      }
    });

    ws.on("close", () => {
      clearTimeout(helloTimer);
      leaveRoom(c);
      if (c.userId && clientsByUser.get(c.userId) === c) clientsByUser.delete(c.userId);
    });
  });

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!alive.get(ws)) {
        ws.terminate();
        continue;
      }
      alive.set(ws, false);
      ws.ping();
    }
  }, HEARTBEAT_MS);
  wss.on("close", () => clearInterval(heartbeat));

  console.log(`🧱 OMA Blocks Versus-Server bereit (Pfad ${BLOCKS_WS_PATH})`);
  if (!APP_URL) console.warn("⚠ OMA Blocks Versus: APP_URL fehlt — Ergebnisse werden nicht gespeichert.");
  return true;
}
