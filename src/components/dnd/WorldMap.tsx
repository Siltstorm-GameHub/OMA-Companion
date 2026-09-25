"use client";

// ============================================
// OMA-Quest-Weltkarte — Hex-Karte (Hex-Map-Paket, Seed 21) mit Zoom/Pan
// ============================================
// Die Weltkarte ist das Hauptmenü von OMA Quest: Das Kartenbild ist vorgerendert
// (public/dnd/hex-world.webp), Gelände und Wege kommen aus src/lib/dnd/hex. Gereist wird nur
// von Location zu Location (die 10 goldenen Felder mit Marker-Bild); Spieler erscheinen mit ihrem
// Profilbild an ihrer Location bzw. unterwegs auf dem Pfad. Angekommen geht es über "Ort betreten"
// in die begehbare Welt des Ortes (/oma-quest/<slug>).
// Alle Positionen liegen in Bild-Pixeln des Kartenbilds; der Viewport skaliert das
// Ganze per Transform. Marker/Beschriftungen werden gegengleich skaliert, damit sie
// beim Herauszoomen lesbar bleiben.
// Client-Polling statt SSE (plan Abschnitt 3.1): alle 25s + Refetch bei
// document.visibilitychange.

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import Link from "next/link";
import { useNotice } from "@/components/te-map/play/GameFeed";
import { Loader2, Minus, Plus } from "@/components/icons";
import { hexCenter, hexCorners, pointToHex, sameHex, type Hex } from "@/lib/dnd/hex/grid";
import { planTravel, positionAlongPath } from "@/lib/dnd/hex/pathfinding";
import { TERRAIN } from "@/lib/dnd/hex/terrain";
import {
  WORLD_COLS, WORLD_IMAGE, WORLD_LAYOUT, WORLD_ROWS, stepMinutesOf, terrainAt,
} from "@/lib/dnd/hex/world";
import { travelLogEntries } from "@/lib/dnd/travel-flavor";

const POLL_INTERVAL_MS = 25_000;
const MAX_SCALE = 1.6;
const DRAG_THRESHOLD_PX = 5;

interface DndLocationRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  locationType: string;
  hexCol: number;
  hexRow: number;
}

interface DndCharacterRow {
  cardId: string;
  name: string;
  discordId: string | null;
  hex: Hex;
  locationId: string | null;
  inTransit: boolean;
  path: [number, number][] | null;
  departedAt: string | null;
  arrivesAt: string | null;
  avatarUrl: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  SETTLEMENT: "Siedlung",
  DUNGEON: "Verlies",
  WILDERNESS: "Wildnis",
  LANDMARK: "Wahrzeichen",
};

const GOLD = "#f5b942";

function formatDuration(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} Min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} Std ${rest} Min` : `${h} Std`;
}

function polygonPoints(center: { x: number; y: number }): string {
  return hexCorners(WORLD_LAYOUT).map(([dx, dy]) => `${center.x + dx},${center.y + dy}`).join(" ");
}

/** Gestrichelter Reisepfad mit dunkler Unterlage (auf Sand/Schnee sonst kaum zu sehen), Kantenstärke bleibt auf dem Bildschirm gleich. */
function PathLine({ points, color }: { points: { x: number; y: number }[]; color: string }) {
  const pts = points.map((p) => `${p.x},${p.y}`).join(" ");
  const common = { fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, vectorEffect: "non-scaling-stroke" as const };
  return (
    <>
      <polyline points={pts} stroke="#000" strokeOpacity={0.55} strokeWidth={7} {...common} />
      <polyline points={pts} stroke={color} strokeWidth={3.5} strokeDasharray="9 7" {...common} />
      {points.slice(1).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={WORLD_LAYOUT.hexW * 0.07} fill={color} stroke="#000" strokeOpacity={0.6} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      ))}
    </>
  );
}

/** Gegengleich zur Karte skaliert: bleibt auf dem Bildschirm gleich groß, sitzt aber am Bildpunkt (x, y). */
function ScreenAnchor({ x, y, scale, children, zIndex = 20, below = false, dx = 0 }: { x: number; y: number; scale: number; children: ReactNode; zIndex?: number; below?: boolean; dx?: number }) {
  return (
    <div className="absolute" style={{ left: x, top: y, transform: `scale(${1 / scale}) translate(${dx}px, 0)`, transformOrigin: "0 0", zIndex }}>
      <div style={{ transform: below ? "translate(-50%, 0)" : "translate(-50%, -100%)" }}>{children}</div>
    </div>
  );
}

/** Profilbild eines Spielers auf der Karte (Discord-Avatar), Initiale als Ersatz. Gold = du, Türkis = unterwegs. */
function AvatarChip({ name, url, mine, travelling }: { name: string; url: string | null; mine: boolean; travelling: boolean }) {
  const [failed, setFailed] = useState(false);
  const ring = mine ? "#fcd34d" : travelling ? "#5eead4" : "#ffffff";
  return (
    <div className="flex flex-col items-center pointer-events-none" title={name}>
      <div
        className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-[12px] font-bold text-white"
        style={{ border: `2.5px solid ${ring}`, boxShadow: "0 2px 6px rgba(0,0,0,0.7)" }}
      >
        {url && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="w-full h-full object-cover" onError={() => setFailed(true)} draggable={false} referrerPolicy="no-referrer" />
        ) : (
          name.trim().charAt(0).toUpperCase() || "?"
        )}
      </div>
      {mine && <span className="text-[9px] font-black text-black bg-amber-300 rounded-full px-1.5 mt-0.5 shadow">Du</span>}
    </div>
  );
}

/** Kleine Location-Illustration als Marker (/dnd/locations/<slug>.jpg) — fällt bei Ladefehler auf einen Kreis zurück. */
function LocationBadge({ slug, name, highlighted }: { slug: string; name: string; highlighted: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex flex-col items-center gap-1 pointer-events-auto cursor-pointer">
      <div
        className="w-11 h-11 rounded-full overflow-hidden shadow-lg"
        style={{ border: `2.5px solid ${GOLD}`, boxShadow: highlighted ? `0 0 0 3px ${GOLD}66, 0 2px 8px #000a` : "0 2px 8px #000a" }}
      >
        {failed ? (
          <div className="w-full h-full" style={{ background: "radial-gradient(circle at 35% 28%, #8b5cf6, #6d28d9)" }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/dnd/locations/${slug}.jpg`} alt="" className="w-full h-full object-cover" onError={() => setFailed(true)} draggable={false} />
        )}
      </div>
      <span className="text-[10px] font-bold text-white bg-black/70 rounded px-1.5 py-0.5 whitespace-nowrap" style={{ borderBottom: `2px solid ${GOLD}` }}>
        {name}
      </span>
      {/* Zeiger auf das Feld darunter */}
      <span className="w-0 h-0" style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `7px solid ${GOLD}` }} />
    </div>
  );
}

export default function WorldMap({ myCardId }: { myCardId: string | null }) {
  const { notify, node: noticeNode } = useNotice();
  const [locations, setLocations] = useState<DndLocationRow[] | null>(null);
  const [characters, setCharacters] = useState<DndCharacterRow[]>([]);
  const [clockOffset, setClockOffset] = useState(0); // Serverzeit − Clientzeit (ms)
  const [error, setError] = useState<string | null>(null);
  const [clientNow, setClientNow] = useState(() => Date.now()); // sekündlich aktualisiert, solange jemand unterwegs ist
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<Hex | null>(null);
  const [hover, setHover] = useState<Hex | null>(null);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Viewport ────────────────────────────────────────────────
  const boxRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ scale: 0.2, x: 0, y: 0 });
  const [fitScale, setFitScale] = useState(0.2);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ startX: number; startY: number; viewX: number; viewY: number; moved: boolean; pinchDist?: number; pinchScale?: number } | null>(null);
  const userMoved = useRef(false); // true, sobald der User Zoom/Pan selbst bedient hat

  const clampView = useCallback((v: { scale: number; x: number; y: number }) => {
    const el = boxRef.current;
    if (!el) return v;
    const w = WORLD_LAYOUT.width * v.scale;
    const h = WORLD_LAYOUT.height * v.scale;
    const x = w <= el.clientWidth ? (el.clientWidth - w) / 2 : Math.min(0, Math.max(el.clientWidth - w, v.x));
    const y = h <= el.clientHeight ? (el.clientHeight - h) / 2 : Math.min(0, Math.max(el.clientHeight - h, v.y));
    return { scale: v.scale, x, y };
  }, []);

  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    setView((v) => {
      const scale = Math.min(MAX_SCALE, Math.max(fitScale, v.scale * factor));
      const k = scale / v.scale;
      return clampView({ scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k });
    });
  }, [clampView, fitScale]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dnd/world-map");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Weltkarte konnte nicht geladen werden.");
        return;
      }
      setLocations(data.locations);
      setCharacters(data.characters);
      setClockOffset(new Date(data.now).getTime() - Date.now());
      setClientNow(Date.now());
      setError(null);
    } catch {
      setError("Netzwerkfehler.");
    }
  }, []);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, POLL_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // Sekundentakt nur, solange jemand unterwegs ist (Figuren laufen flüssig über die Karte).
  const anyTravelling = characters.some((c) => c.inTransit);
  useEffect(() => {
    if (!anyTravelling) return;
    const id = setInterval(() => setClientNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [anyTravelling]);

  const me = characters.find((c) => c.cardId === myCardId) ?? null;

  // Erstansicht: Karte einpassen bzw. auf den eigenen Charakter zentrieren. Läuft bei jeder
  // Größenänderung des Containers erneut, solange der User die Ansicht nicht selbst bewegt hat
  // (das Layout ist beim ersten Rendern oft noch nicht final).
  const meHex = me?.hex ?? null;
  const meCol = meHex?.col;
  const meRow = meHex?.row;
  const hasLocations = !!locations;
  useEffect(() => {
    const el = boxRef.current;
    if (!el || !hasLocations) return;
    const apply = () => {
      const fit = el.clientWidth / WORLD_LAYOUT.width;
      setFitScale(fit);
      if (userMoved.current) {
        setView((v) => clampView({ ...v, scale: Math.max(v.scale, fit) }));
        return;
      }
      const focus = meCol != null && meRow != null ? hexCenter({ col: meCol, row: meRow }, WORLD_LAYOUT) : null;
      const scale = focus ? Math.max(fit, 0.45) : fit;
      setView(clampView({
        scale,
        x: focus ? el.clientWidth / 2 - focus.x * scale : 0,
        y: focus ? el.clientHeight / 2 - focus.y * scale : 0,
      }));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasLocations, meCol, meRow, clampView]);

  // Wheel-Zoom braucht ein nicht-passives Listener-Objekt (preventDefault gegen Seiten-Scroll).
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      userMoved.current = true;
      const r = el.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt, locations]);

  function toContent(clientX: number, clientY: number): { x: number; y: number } | null {
    const el = boxRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: (clientX - r.left - view.x) / view.scale, y: (clientY - r.top - view.y) / view.scale };
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    userMoved.current = true;
    boxRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { startX: 0, startY: 0, viewX: view.x, viewY: view.y, moved: true, pinchDist: Math.hypot(a.x - b.x, a.y - b.y), pinchScale: view.scale };
    } else {
      gesture.current = { startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y, moved: false };
    }
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (g && pointers.current.size === 2 && g.pinchDist && g.pinchScale) {
      const [a, b] = [...pointers.current.values()];
      const el = boxRef.current!;
      const r = el.getBoundingClientRect();
      const factor = (Math.hypot(a.x - b.x, a.y - b.y) / g.pinchDist) * g.pinchScale / view.scale;
      zoomAt(factor, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      return;
    }
    if (g && pointers.current.size === 1 && e.buttons !== 0) {
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      if (!g.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) { g.moved = true; setDragging(true); }
      if (g.moved) setView((v) => clampView({ ...v, x: g.viewX + dx, y: g.viewY + dy }));
      return;
    }
    if (e.pointerType === "mouse") {
      const p = toContent(e.clientX, e.clientY);
      const h = p ? pointToHex(p.x, p.y, WORLD_LAYOUT, WORLD_COLS, WORLD_ROWS) : null;
      setHover((prev) => (prev && h && sameHex(prev, h) ? prev : h));
    }
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      gesture.current = null;
      setDragging(false);
      if (g && !g.moved) {
        // Klick: Marker tragen ihr Feld selbst (data-hex), sonst zählt der Bildpunkt.
        const marked = (e.target as HTMLElement).closest<HTMLElement>("[data-hex]")?.dataset.hex;
        if (marked) {
          const [col, row] = marked.split(",").map(Number);
          setSelected({ col, row });
        } else {
          const p = toContent(e.clientX, e.clientY);
          setSelected(p ? pointToHex(p.x, p.y, WORLD_LAYOUT, WORLD_COLS, WORLD_ROWS) : null);
        }
      }
    }
  }

  // ── Abgeleitete Daten ───────────────────────────────────────
  const locByHex = useMemo(() => new Map((locations ?? []).map((l) => [`${l.hexCol},${l.hexRow}`, l])), [locations]);
  const nowMs = clientNow + clockOffset;

  /** Bildpunkt + Blickrichtung eines Charakters — unterwegs entlang des Pfads interpoliert. */
  function placeOf(c: DndCharacterRow): { x: number; y: number } {
    if (c.inTransit && c.path && c.departedAt) {
      const path = c.path.map(([col, row]) => ({ col, row }));
      const elapsedMin = (nowMs - new Date(c.departedAt).getTime()) / 60000;
      const { index, t } = positionAlongPath(stepMinutesOf(path), elapsedMin);
      const a = hexCenter(path[index], WORLD_LAYOUT);
      const b = hexCenter(path[Math.min(index + 1, path.length - 1)], WORLD_LAYOUT);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    return hexCenter(c.hex, WORLD_LAYOUT);
  }

  // Reiseziele sind nur die festen Locations (Vorschau des Wegs nur dafür).
  const plan = useMemo(() => {
    if (!selected || !me || me.inTransit || !locByHex.has(`${selected.col},${selected.row}`)) return null;
    return planTravel(me.hex, selected, WORLD_COLS, WORLD_ROWS, terrainAt);
  }, [selected, me, locByHex]);

  async function travelTo(hex: Hex) {
    setBusy(true);
    try {
      const res = await fetch("/api/dnd/character/travel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hex),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Reise konnte nicht gestartet werden.");
      notify("info", `Reise gestartet — Ankunft in ${formatDuration(json.totalMinutes)}`);
      await load();
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Unbekannter Fehler.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelTravel() {
    setBusy(true);
    try {
      const res = await fetch("/api/dnd/character/travel/cancel", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Reise konnte nicht abgebrochen werden.");
      notify("info", "Reise abgebrochen — du bleibst auf dem Feld stehen.");
      await load();
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Unbekannter Fehler.");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!locations) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
      </div>
    );
  }

  const selectedLocation = selected ? locByHex.get(`${selected.col},${selected.row}`) : undefined;
  const selectedTerrain = selected ? terrainAt(selected) : null;
  const atLocation = me && !me.inTransit && me.locationId ? locations.find((l) => l.id === me.locationId) : undefined;
  const meArrives = me?.inTransit && me.arrivesAt ? new Date(me.arrivesAt).getTime() - nowMs : null;

  // Kleine Beobachtungen unterwegs, statt nur eines Countdowns (Spielerlebnis-
  // Review, Vorschlag 3 — "tote Zeit" während der Reise). Bewusst kein
  // useMemo: billige Berechnung (max. 4 Einträge), und nach den frühen
  // returns oben wäre ein Hook hier ohnehin regelwidrig.
  const myTravelLog =
    me?.inTransit && me.path && me.departedAt && me.arrivesAt
      ? travelLogEntries(
          me.path.map(([col, row]) => ({ col, row })),
          new Date(me.departedAt).getTime(),
          new Date(me.arrivesAt).getTime(),
          nowMs,
          `${me.cardId}:${me.arrivesAt}`
        )
      : [];

  // Wer steht gemeinsam auf einem Feld? → seitlich versetzen.
  const slotByCard = new Map<string, number>();
  const hexCounts = new Map<string, number>();
  for (const c of characters.filter((x) => !x.inTransit)) {
    const k = `${c.hex.col},${c.hex.row}`;
    const n = hexCounts.get(k) ?? 0;
    slotByCard.set(c.cardId, n);
    hexCounts.set(k, n + 1);
  }

  return (
    <div className="space-y-3">
      {noticeNode}
      <div
        ref={boxRef}
        className="relative w-full h-[62vh] min-h-[380px] overflow-hidden oq-panel select-none bg-[#0b1524]"
        style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setHover(null)}
      >
        <div
          className="absolute left-0 top-0"
          style={{
            width: WORLD_LAYOUT.width,
            height: WORLD_LAYOUT.height,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: "0 0",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={WORLD_IMAGE} alt="Weltkarte" width={WORLD_LAYOUT.width} height={WORLD_LAYOUT.height} draggable={false} className="block max-w-none" />

          {/* Feld-Umrandungen: Locations (Gold), Hover, Auswahl, Reisepfad */}
          <svg className="absolute inset-0 pointer-events-none" width={WORLD_LAYOUT.width} height={WORLD_LAYOUT.height}>
            {locations.map((l) => (
              <g key={l.id}>
                <polygon points={polygonPoints(hexCenter({ col: l.hexCol, row: l.hexRow }, WORLD_LAYOUT))} fill={`${GOLD}26`} stroke={GOLD} strokeWidth={3} vectorEffect="non-scaling-stroke" strokeLinejoin="round">
                  <animate attributeName="stroke-opacity" values="1;0.45;1" dur="2.8s" repeatCount="indefinite" />
                </polygon>
              </g>
            ))}
            {hover && !(selected && sameHex(hover, selected)) && (
              <polygon points={polygonPoints(hexCenter(hover, WORLD_LAYOUT))} fill="#ffffff22" stroke="#fff" strokeOpacity={0.8} strokeWidth={2} vectorEffect="non-scaling-stroke" />
            )}
            {plan && <PathLine points={plan.path.map((h) => hexCenter(h, WORLD_LAYOUT))} color="#c4b5fd" />}
            {me?.inTransit && me.path && <PathLine points={me.path.map(([col, row]) => hexCenter({ col, row }, WORLD_LAYOUT))} color="#5eead4" />}
            {selected && (
              <polygon points={polygonPoints(hexCenter(selected, WORLD_LAYOUT))} fill="#8b5cf633" stroke="#c4b5fd" strokeWidth={3.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            )}
          </svg>

          {/* Profilbilder der Spieler: an ihrer Location bzw. unterwegs auf dem Pfad */}
          {characters.flatMap((c) => {
            const p = placeOf(c);
            const slot = slotByCard.get(c.cardId) ?? 0;
            if (slot > 4) return [];
            const overflow = slot === 4 ? (hexCounts.get(`${c.hex.col},${c.hex.row}`) ?? 5) - 4 : 0;
            return [(
              <ScreenAnchor key={c.cardId} x={p.x} y={p.y + WORLD_LAYOUT.hexW * 0.06} scale={view.scale} zIndex={c.cardId === myCardId ? 30 : 12} below dx={(slot - (Math.min(c.inTransit ? 1 : hexCounts.get(`${c.hex.col},${c.hex.row}`) ?? 1, 5) - 1) / 2) * 24}>
                {slot === 4 ? (
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-white/70 flex items-center justify-center text-[10px] font-bold text-white pointer-events-none" title={`${overflow} weitere`}>+{overflow}</div>
                ) : (
                  <AvatarChip name={c.name} url={c.avatarUrl} mine={c.cardId === myCardId} travelling={c.inTransit} />
                )}
              </ScreenAnchor>
            )];
          })}

          {/* Location-Marker (klickbar, tragen ihr Feld) */}
          {locations.map((l) => {
            const center = hexCenter({ col: l.hexCol, row: l.hexRow }, WORLD_LAYOUT);
            const isMine = !!me && !me.inTransit && me.locationId === l.id;
            return (
              <ScreenAnchor key={l.id} x={center.x} y={center.y - WORLD_LAYOUT.hexW * 0.28} scale={view.scale} zIndex={15}>
                <div data-hex={`${l.hexCol},${l.hexRow}`}>
                  <LocationBadge slug={l.slug} name={l.name} highlighted={isMine} />
                </div>
              </ScreenAnchor>
            );
          })}

        </div>

        <div className="absolute bottom-2 right-2 z-40 flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => { userMoved.current = true; const el = boxRef.current!; zoomAt(1 / 1.4, el.clientWidth / 2, el.clientHeight / 2); }}
            disabled={view.scale <= fitScale + 0.001}
            aria-label="Verkleinern"
            className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 disabled:opacity-30 transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => { userMoved.current = true; const el = boxRef.current!; zoomAt(1.4, el.clientWidth / 2, el.clientHeight / 2); }}
            disabled={view.scale >= MAX_SCALE - 0.001}
            aria-label="Vergrößern"
            className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 disabled:opacity-30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="absolute top-2 left-2 z-40 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] text-gray-200 pointer-events-none">
          <span className="inline-block w-3 h-3 rotate-45 rounded-[3px]" style={{ border: `2px solid ${GOLD}` }} /> Feste Location
        </div>
      </div>

      {/* Angekommen: direkt in die Welt des Ortes */}
      {me && !me.inTransit && atLocation && (
        <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3" style={{ borderColor: `${GOLD}66`, background: `${GOLD}14` }}>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: GOLD }}>Du bist angekommen</p>
            <p className="font-battle text-sm text-white truncate">{atLocation.name}</p>
          </div>
          <Link href={`/oma-quest/${atLocation.slug}`} className="shrink-0 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-4 py-2 transition-colors">
            Ort betreten
          </Link>
        </div>
      )}

      {/* Unterwegs: Countdown + kleine Beobachtungen, statt nur toter Wartezeit (immer
          sichtbar, unabhängig davon ob gerade ein Feld ausgewählt ist). */}
      {me?.inTransit && (
        <div className="oq-panel p-4 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-xs text-amber-300">
              Du bist unterwegs{meArrives != null ? ` — Ankunft in ${formatDuration(Math.max(0, meArrives / 60000))}` : ""}.
            </p>
            <button type="button" disabled={busy} onClick={cancelTravel} className="text-xs underline text-gray-400 hover:text-white transition-colors disabled:opacity-50">
              Reise abbrechen
            </button>
          </div>
          {myTravelLog.length > 0 && (
            <ul className="space-y-1 border-t border-white/10 pt-2">
              {myTravelLog.map((entry) => (
                <li key={entry.key} className="text-[11px] text-gray-400 italic">— {entry.text}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Info-Panel zum gewählten Feld */}
      <div className="oq-panel p-4 space-y-2 min-h-[92px]">
        {!selected || !selectedTerrain ? (
          <p className="text-xs text-gray-500">
            Reiseziele sind die goldenen Felder — tippe eine Location an, um die Reise zu planen.
          </p>
        ) : (
          <>
            <div className="min-w-0">
              {selectedLocation ? (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: GOLD }}>
                    Location · {TYPE_LABEL[selectedLocation.locationType] ?? selectedLocation.locationType}
                  </p>
                  <p className="font-battle text-base text-white">{selectedLocation.name}</p>
                  {selectedLocation.description && <p className="text-xs text-gray-400 mt-0.5">{selectedLocation.description}</p>}
                </>
              ) : (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Freies Feld</p>
                  <p className="font-battle text-base text-white">{TERRAIN[selectedTerrain].label}</p>
                </>
              )}
              <p className="text-[10px] text-gray-500 mt-1">
                {TERRAIN[selectedTerrain].label}{TERRAIN[selectedTerrain].cost === null ? " · nicht betretbar" : ""}
              </p>
            </div>

            {!selectedLocation ? (
              <p className="text-xs text-gray-500">Hier gibt es nichts zu tun — reise zu einer Location.</p>
            ) : !me ? null : me.inTransit ? (
              // Countdown + Reise-Log stehen jetzt im immer sichtbaren Block oben.
              <p className="text-xs text-gray-500">Du bist bereits unterwegs.</p>
            ) : sameHex(me.hex, selected) ? (
              <Link href={`/oma-quest/${selectedLocation.slug}`} className="inline-flex rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-4 py-2 transition-colors">
                Ort betreten
              </Link>
            ) : plan ? (
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => travelTo(selected)}
                  className="rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-xs font-bold px-4 py-2 transition-colors"
                >
                  Reise beginnen
                </button>
                <span className="text-xs text-gray-400">{formatDuration(plan.totalMinutes)} · {plan.path.length - 1} Felder</span>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Von deiner Position gibt es keinen Weg dorthin.</p>
            )}
          </>
        )}
      </div>

      {anyTravelling && (
        <p className="text-[11px] text-gray-500 text-center">
          {characters.filter((c) => c.inTransit).length} Charakter(e) gerade unterwegs
        </p>
      )}
    </div>
  );
}
