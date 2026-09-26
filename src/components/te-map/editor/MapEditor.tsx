"use client";

// ============================================
// Welten-Editor: Karte malen (Boden, Objekte, Gebäude, NPCs, Truhen, Schilder, Startpunkt)
// ============================================
// Die Zeichenfläche zeigt die ganze Karte in Originalgröße (16 px je Kachel), per CSS vergrößert. Jede
// Änderung erzeugt ein neues Dokument (siehe lib/te-map/custom-world-edit.ts); die Vorschau nutzt dieselbe
// Umwandlung (docToWorld) und dieselben Zeichenfunktionen wie das Spiel — was man sieht, wird gespielt.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import TeCharacterEditor from "@/components/te-character/TeCharacterEditor";
import { drawTeFrame, loadTeLayerSets, type TeLayerSets } from "@/components/te-character/TeCharacter";
import { bakeStatic, drawBuilding, drawStamp, loadSheets, T, type Sheets } from "@/components/te-map/TeWorld";
import { docToWorld, LIMITS, type BorderStyle, type CustomWorldDoc } from "@/lib/te-map/custom-world";
import {
  canPlaceBuilding, duplicateSelection, fillGround, hitTest, moveActor, moveBuilding, moveStamp, paintGround, placeActor, placeBuilding, placeStamp, rectGround, removeAt, removeBuilding, removeInterior, resizeDoc,
  setInteriorFromTemplate, setSpawn, setStampSay, setTheme, setWall, updateActor,
  type ActorKind,
} from "@/lib/te-map/custom-world-edit";
import { ITEMS } from "@/lib/dnd/items";
import { TEXTURES } from "@/lib/dnd/oq-assets-manifest";
import { getMonster, MONSTERS } from "@/lib/dnd/combat";
import { INTERIOR_TEMPLATES } from "@/lib/te-map/interior";
import { STAMPS, type StampDef, type StampId } from "@/lib/te-map/stamps";
import { STAMP_LABELS } from "@/lib/te-map/stamp-labels";
import { GROUND, type Building, type GroundType } from "@/lib/te-map/types";
import InteriorEditor from "./InteriorEditor";
import BuildingDesigner, { type BuildingLook } from "./BuildingDesigner";
import StampPicker from "./StampPicker";
import Minimap from "./Minimap";

type Tool =
  | { kind: "select" }
  | { kind: "ground" }
  | { kind: "fill" }
  | { kind: "rect" }
  | { kind: "wall" }
  | { kind: "erase" }
  | { kind: "stamp"; id: StampId }
  | { kind: "building" }
  | { kind: "actor"; actor: ActorKind }
  | { kind: "spawn" };

type Selection = { type: "actor"; id: string } | { type: "building"; index: number } | { type: "stamp"; index: number } | null;

/** Von außen (Prüfung) angeforderte Auswahl; `nonce` zählt hoch, damit dasselbe Ziel erneut angesprungen werden kann. */
export interface MapFocus { nonce: number; target: { type: "actor"; id: string } | { type: "building"; index: number } | { type: "spawn" } | null }

const GROUND_LABEL: Record<GroundType, { outdoor: string; cave: string; color: string }> = {
  [GROUND.base]: { outdoor: "Gras", cave: "Höhlenboden", color: "#4d8a3c" },
  [GROUND.dirt]: { outdoor: "Erde", cave: "Erde", color: "#8a6a3c" },
  [GROUND.cobble]: { outdoor: "Pflaster", cave: "Pflaster", color: "#8c8c96" },
  [GROUND.stone]: { outdoor: "Stein", cave: "Stein", color: "#5b6270" },
  [GROUND.sand]: { outdoor: "Sand", cave: "Sand", color: "#cbb46a" },
  [GROUND.snow]: { outdoor: "Schnee", cave: "Schnee", color: TEXTURES.schnee.avg },
  [GROUND.ice]: { outdoor: "Eis", cave: "Eis", color: TEXTURES.eis.avg },
  [GROUND.planks]: { outdoor: "Holzdielen", cave: "Holzdielen", color: TEXTURES.dielen.avg },
  [GROUND.marble]: { outdoor: "Steinplatten", cave: "Steinplatten", color: TEXTURES.marmor.avg },
  [GROUND.forest]: { outdoor: "Herbstlaub", cave: "Herbstlaub", color: TEXTURES.waldboden.avg },
  [GROUND.lava]: { outdoor: "⚠ Lava", cave: "⚠ Lava", color: TEXTURES.lava.avg },
  [GROUND.water]: { outdoor: "⚠ Wasser", cave: "⚠ Wasser", color: TEXTURES.wasser.avg },
};

// Außen-Palette: ohne Türen/Fenster/Schilder-Kacheln und ohne Innenraum-Möbel (die gibt es im Innenraum-Editor)
const STAMP_IDS = (Object.keys(STAMPS) as StampId[]).filter((id) => (STAMPS[id] as StampDef).sheet !== "inside" && !["window", "door", "shopSword", "shopInn", "shopMug", "sign"].includes(id));

interface ToolButton { key: string; label: string; icon: string; hot: string; tool: Tool; caveOnly?: boolean; hint: string }
const TOOL_GROUPS: { label: string; tools: ToolButton[] }[] = [
  { label: "Bearbeiten", tools: [
    { key: "select", label: "Auswählen", icon: "↖", hot: "V", tool: { kind: "select" }, hint: "Klick wählt Figuren, Truhen, Objekte und Gebäude aus — alles lässt sich ziehen. Entf löscht, Strg+D verdoppelt, Pfeiltasten schieben." },
    { key: "erase", label: "Radierer", icon: "⌫", hot: "E", tool: { kind: "erase" }, hint: "Klick oder Ziehen entfernt das oberste Ding auf der Kachel." },
  ] },
  { label: "Gelände", tools: [
    { key: "ground", label: "Boden", icon: "🖌️", hot: "B", tool: { kind: "ground" }, hint: "Ziehen malt den gewählten Boden." },
    { key: "fill", label: "Eimer", icon: "🪣", hot: "F", tool: { kind: "fill" }, hint: "Klick füllt die ganze zusammenhängende Fläche mit dem gewählten Boden." },
    { key: "rect", label: "Rechteck", icon: "▭", hot: "R", tool: { kind: "rect" }, hint: "Ziehen füllt ein Rechteck mit dem gewählten Boden." },
    { key: "wall", label: "Höhlenwand", icon: "🧱", hot: "W", tool: { kind: "wall" }, caveOnly: true, hint: "Malen setzt Wandkacheln, der Radierer entfernt sie." },
  ] },
  { label: "Bauen", tools: [
    { key: "stamp", label: "Objekte", icon: "🌳", hot: "O", tool: { kind: "stamp", id: "tree" }, hint: "Klick setzt das gewählte Objekt. Danach mit „Auswählen“ einen Text hinterlegen, damit man es ansprechen kann." },
    { key: "building", label: "Gebäude", icon: "🏠", hot: "G", tool: { kind: "building" }, hint: "Klick setzt das Haus mit der linken oberen Ecke auf die Kachel (grün = frei, rot = kein Platz)." },
  ] },
  { label: "Figuren & Orte", tools: [
    { key: "npc", label: "NPC", icon: "🧑", hot: "N", tool: { kind: "actor", actor: "npc" }, hint: "Klick setzt einen NPC. Danach Dialoge unter „Quest“ bearbeiten." },
    { key: "merchant", label: "Händler", icon: "🛒", hot: "H", tool: { kind: "actor", actor: "merchant" }, hint: "Klick setzt einen Händler. Sein Angebot stellst du im Auswahl-Fenster ein." },
    { key: "chest", label: "Truhe", icon: "📦", hot: "T", tool: { kind: "actor", actor: "chest" }, hint: "Klick setzt eine Truhe." },
    { key: "monster", label: "Monster", icon: "👾", hot: "M", tool: { kind: "actor", actor: "monster" }, hint: "Klick setzt ein Monster (Art im Auswahl-Fenster ändern)." },
    { key: "sign", label: "Schild", icon: "🪧", hot: "S", tool: { kind: "actor", actor: "sign" }, hint: "Klick setzt ein Schild mit Text." },
    { key: "spawn", label: "Start", icon: "🚩", hot: "P", tool: { kind: "spawn" }, hint: "Hier steht die Figur beim Betreten." },
  ] },
];
const ALL_TOOLS = TOOL_GROUPS.flatMap((g) => g.tools);

function toolKey(t: Tool): string {
  return t.kind === "actor" ? t.actor === "chest" ? "chest" : t.actor : t.kind;
}

const DEFAULT_LOOK: BuildingLook = { w: 6, roofRows: 3, roof: { k: 0, r: 0 }, wall: { k: 0, r: 1 }, doorDx: 2, windowDx: [0, 4], name: "Haus" };
const ZOOMS = [1, 2, 3, 4];
const INPUT = "mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white";
const HEAD = "text-[10px] font-semibold text-violet-400 uppercase tracking-widest";

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable);

interface Props {
  doc: CustomWorldDoc;
  readOnly: boolean;
  onChange: (doc: CustomWorldDoc) => void;
  /** Vor jeder Änderungsfolge (Klick/Strich) aufgerufen, damit der Editor den Stand für "Rückgängig" merken kann. */
  onBeginEdit: () => void;
  onQuestFocus: (actorId: string) => void;
  focus?: MapFocus;
}

type Stroke = {
  painting: boolean;
  began: boolean;
  drag?: { kind: "actor"; id: string } | { kind: "stamp"; index: number; dx: number; dy: number } | { kind: "building"; index: number; dx: number; dy: number };
  rect?: { x0: number; y0: number };
  pan?: { sx: number; sy: number; sl: number; st: number };
};

export default function MapEditor({ doc, readOnly, onChange, onBeginEdit, onQuestFocus, focus }: Props) {
  const [sheets, setSheets] = useState<Sheets | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>({ kind: "select" });
  const [gType, setGType] = useState<GroundType>(GROUND.dirt);
  const [brush, setBrush] = useState(1);
  const [zoom, setZoom] = useState(2);
  const [grid, setGrid] = useState(true);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<Selection>(null);
  const [interiorOf, setInteriorOf] = useState<number | null>(null);
  const [bld, setBld] = useState<BuildingLook>(DEFAULT_LOOK);
  const [panning, setPanning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const docRef = useRef(doc);
  useEffect(() => { docRef.current = doc; }, [doc]);
  const stroke = useRef<Stroke | null>(null);
  const spaceDown = useRef(false);
  const lastNameEdit = useRef(0);
  const zoomRef = useRef(zoom);
  const anchor = useRef<{ tx: number; ty: number; px: number; py: number } | null>(null);
  const [npcSets, setNpcSets] = useState<Map<string, TeLayerSets>>(new Map());
  const npcKeys = useRef(new Map<string, string>());

  useEffect(() => {
    let cancelled = false;
    loadSheets().then((s) => { if (!cancelled) setSheets(s); }).catch((e) => { if (!cancelled) setLoadError(e instanceof Error ? e.message : "Kacheln konnten nicht geladen werden."); });
    return () => { cancelled = true; };
  }, []);

  const world = useMemo(() => docToWorld(doc), [doc]);
  const baked = useMemo(() => (sheets ? bakeStatic(sheets, world) : null), [sheets, world]);

  // NPC-Figuren laden (nur was sich geändert hat)
  const npcSignature = doc.actors.filter((a) => a.kind === "npc").map((a) => `${a.id}:${JSON.stringify(a.config)}`).join("|");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const a of docRef.current.actors) {
        if (a.kind !== "npc" || !a.config) continue;
        const key = JSON.stringify(a.config);
        if (npcKeys.current.get(a.id) === key) continue;
        npcKeys.current.set(a.id, key);
        const sets = await loadTeLayerSets(a.config);
        if (cancelled) return;
        setNpcSets((m) => new Map(m).set(a.id, sets));
      }
    })();
    return () => { cancelled = true; };
  }, [npcSignature]);

  const isCave = doc.theme === "cave";
  const activeKey = toolKey(tool);
  const activeButton = ALL_TOOLS.find((b) => b.key === activeKey);
  const selActor = selected?.type === "actor" ? doc.actors.find((a) => a.id === selected.id) : undefined;
  const selBuilding = selected?.type === "building" ? doc.buildings[selected.index] : undefined;
  const selStamp = selected?.type === "stamp" ? doc.stamps[selected.index] : undefined;

  const commit = useCallback((next: CustomWorldDoc) => { docRef.current = next; onChange(next); }, [onChange]);

  // ── Ansicht: Zoom (um einen Punkt), Einpassen, Springen ──
  const setZoomAt = useCallback((z: number, clientX?: number, clientY?: number) => {
    const next = Math.min(4, Math.max(1, Math.round(z)));
    const sc = scrollRef.current;
    if (next === zoomRef.current) return;
    if (sc) {
      const r = sc.getBoundingClientRect();
      const px = clientX !== undefined ? clientX - r.left : sc.clientWidth / 2;
      const py = clientY !== undefined ? clientY - r.top : sc.clientHeight / 2;
      const s = T * zoomRef.current;
      anchor.current = { tx: (sc.scrollLeft + px) / s, ty: (sc.scrollTop + py) / s, px, py };
    }
    zoomRef.current = next;
    setZoom(next);
  }, []);
  useLayoutEffect(() => {
    const a = anchor.current;
    const sc = scrollRef.current;
    if (a && sc) { sc.scrollLeft = a.tx * T * zoom - a.px; sc.scrollTop = a.ty * T * zoom - a.py; }
    anchor.current = null;
  }, [zoom]);
  const fit = () => {
    const sc = scrollRef.current;
    if (!sc) return;
    setZoomAt(Math.floor(Math.min(sc.clientWidth / (doc.cols * T), (window.innerHeight * 0.72) / (doc.rows * T))));
  };
  const scrollToTile = useCallback((x: number, y: number) => {
    const sc = scrollRef.current;
    if (!sc) return;
    const s = T * zoomRef.current;
    sc.scrollTo({ left: x * s + s / 2 - sc.clientWidth / 2, top: y * s + s / 2 - sc.clientHeight / 2, behavior: "smooth" });
  }, []);

  // Strg + Mausrad zoomt um den Mauszeiger (ohne Strg scrollt die Seite wie gewohnt)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let last = 0;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const now = performance.now();
      if (now - last < 120) return;
      last = now;
      setZoomAt(zoomRef.current + (e.deltaY < 0 ? 1 : -1), e.clientX, e.clientY);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [setZoomAt]);

  // Auswahl von außen (Prüfung → „Anzeigen“)
  const lastFocus = useRef(0);
  useEffect(() => {
    if (!focus || focus.nonce === lastFocus.current || !focus.target) return;
    lastFocus.current = focus.nonce;
    const t = focus.target;
    const d = docRef.current;
    setTool({ kind: "select" });
    if (t.type === "actor") { const a = d.actors.find((o) => o.id === t.id); if (a) { setSelected({ type: "actor", id: a.id }); scrollToTile(a.x, a.y); } else { const bi = d.buildings.findIndex((b) => b.interior?.actors.some((o) => o.id === t.id)); if (bi >= 0) { setSelected({ type: "building", index: bi }); scrollToTile(d.buildings[bi].x, d.buildings[bi].y); } } }
    else if (t.type === "building") { const b = d.buildings[t.index]; if (b) { setSelected({ type: "building", index: t.index }); scrollToTile(b.x, b.y); } }
    else { setSelected(null); scrollToTile(d.spawn.x, d.spawn.y); }
  }, [focus, scrollToTile]);

  // ── Zeichnen ──
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !sheets || !baked) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baked, 0, 0);

    type Sprite = { base: number; draw: () => void };
    const sprites: Sprite[] = [];
    for (const s of world.map.stamps) {
      const d = STAMPS[s.id] as StampDef;
      sprites.push({ base: (s.y + d.h) * T, draw: () => drawStamp(ctx, sheets, s.id, s.x * T, s.y * T) });
    }
    for (const a of doc.actors) {
      if (a.kind === "chest") sprites.push({ base: (a.y + 1) * T, draw: () => ctx.drawImage(sheets.chests, 16, 16, 16, 16, a.x * T, a.y * T, 16, 16) });
      else if (a.kind === "monster") {
        sprites.push({ base: (a.y + 1) * T, draw: () => { ctx.font = "14px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(getMonster(a.monster ?? "")?.emoji ?? "👾", a.x * T + T / 2, a.y * T + T / 2); } });
      } else if (a.kind === "npc") {
        const sets = npcSets.get(a.id);
        if (sets) sprites.push({ base: (a.y + 1) * T, draw: () => drawTeFrame(ctx, a.dir === "up" ? sets.back : sets.front, 1, a.dir, a.x * T + T / 2 - 24, a.y * T - 16, 1) });
      }
    }
    sprites.sort((a, b) => a.base - b.base);
    for (const s of sprites) s.draw();

    // Merker: Objekte mit Interaktionstext
    for (const s of doc.stamps) {
      if (!s.say) continue;
      const d = STAMPS[s.id] as StampDef;
      const bx = s.x * T + d.w * T - 4;
      const by = s.y * T + 4;
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath(); ctx.arc(bx, by, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#3b2a00";
      ctx.font = "bold 7px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("!", bx, by + 0.5);
    }

    if (grid) {
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= doc.cols; x++) { ctx.moveTo(x * T + 0.5, 0); ctx.lineTo(x * T + 0.5, doc.rows * T); }
      for (let y = 0; y <= doc.rows; y++) { ctx.moveTo(0, y * T + 0.5); ctx.lineTo(doc.cols * T, y * T + 0.5); }
      ctx.stroke();
    }

    // Startpunkt
    ctx.fillStyle = "rgba(52, 211, 153, 0.55)";
    ctx.fillRect(doc.spawn.x * T, doc.spawn.y * T, T, T);
    ctx.fillStyle = "#052e1a";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
    ctx.fillText("S", doc.spawn.x * T + 5, doc.spawn.y * T + 12);

    // Auswahl
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 1.5;
    if (selected?.type === "actor") {
      const a = doc.actors.find((o) => o.id === selected.id);
      if (a) ctx.strokeRect(a.x * T + 0.5, a.y * T + 0.5, T - 1, T - 1);
    } else if (selected?.type === "stamp") {
      const st = doc.stamps[selected.index];
      if (st) { const d = STAMPS[st.id] as StampDef; ctx.strokeRect(st.x * T + 0.5, st.y * T + 0.5, d.w * T - 1, d.h * T - 1); }
    } else if (selected?.type === "building") {
      const b = doc.buildings[selected.index];
      if (b) ctx.strokeRect(b.x * T + 0.5, b.y * T + 0.5, b.w * T - 1, (b.roofRows + 2) * T - 1);
    }

    // Vorschau unter dem Mauszeiger
    if (hover && !readOnly && !panning) {
      const r = stroke.current?.rect;
      const gc = GROUND_LABEL[gType].color;
      if (tool.kind === "rect" && r) {
        const x0 = Math.min(r.x0, hover.x), y0 = Math.min(r.y0, hover.y), x1 = Math.max(r.x0, hover.x), y1 = Math.max(r.y0, hover.y);
        ctx.fillStyle = gc; ctx.globalAlpha = 0.55;
        ctx.fillRect(x0 * T, y0 * T, (x1 - x0 + 1) * T, (y1 - y0 + 1) * T);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1;
        ctx.strokeRect(x0 * T + 0.5, y0 * T + 0.5, (x1 - x0 + 1) * T - 1, (y1 - y0 + 1) * T - 1);
      } else if (tool.kind === "building") {
        const ok = canPlaceBuilding(doc, { x: hover.x, y: hover.y, w: bld.w, roofRows: bld.roofRows });
        ctx.globalAlpha = 0.7;
        drawBuilding(ctx, sheets, bld, hover.x * T, hover.y * T);
        ctx.globalAlpha = 1;
        ctx.fillStyle = ok ? "rgba(52,211,153,0.28)" : "rgba(239,68,68,0.4)";
        ctx.fillRect(hover.x * T, hover.y * T, bld.w * T, (bld.roofRows + 2) * T);
        ctx.strokeStyle = ok ? "#34d399" : "#ef4444"; ctx.lineWidth = 1;
        ctx.strokeRect(hover.x * T + 0.5, hover.y * T + 0.5, bld.w * T - 1, (bld.roofRows + 2) * T - 1);
      } else if (tool.kind === "stamp") {
        const d = STAMPS[tool.id] as StampDef;
        ctx.globalAlpha = 0.7;
        drawStamp(ctx, sheets, tool.id, hover.x * T, hover.y * T);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1;
        ctx.strokeRect(hover.x * T + 0.5, hover.y * T + 0.5, d.w * T - 1, d.h * T - 1);
      } else {
        let w = 1, h = 1, hx = hover.x, hy = hover.y;
        if (tool.kind === "ground") { w = h = brush; hx -= Math.floor((brush - 1) / 2); hy -= Math.floor((brush - 1) / 2); }
        if (tool.kind === "ground" || tool.kind === "fill" || tool.kind === "rect") { ctx.fillStyle = gc; ctx.globalAlpha = 0.4; ctx.fillRect(hx * T, hy * T, w * T, h * T); ctx.globalAlpha = 1; }
        ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1;
        ctx.strokeRect(hx * T + 0.5, hy * T + 0.5, w * T - 1, h * T - 1);
      }
    }
  }, [sheets, baked, world, doc, npcSets, grid, hover, selected, tool, brush, gType, bld, readOnly, panning]);

  const tileAt = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: Math.floor(((e.clientX - r.left) / r.width) * doc.cols), y: Math.floor(((e.clientY - r.top) / r.height) * doc.rows) };
  };

  const applyAt = (x: number, y: number, first: boolean) => {
    if (readOnly || x < 0 || y < 0 || x >= doc.cols || y >= doc.rows) return;
    const cur = docRef.current;
    switch (tool.kind) {
      case "ground": { const n = paintGround(cur, x, y, gType, brush); if (n !== cur) commit(n); break; }
      case "fill": if (first) { const n = fillGround(cur, x, y, gType); if (n !== cur) commit(n); } break;
      case "wall": { const n = setWall(cur, x, y, true); if (n !== cur) commit(n); break; }
      case "erase": { const n = removeAt(cur, x, y); if (n !== cur) commit(n); break; }
      case "stamp": if (first) { const n = placeStamp(cur, tool.id, x, y); if (n !== cur) commit(n); } break;
      case "building": if (first) {
        const b: Building = { ...bld, x, y, windowDx: bld.windowDx.filter((d) => d < bld.w && d !== bld.doorDx) };
        if (!canPlaceBuilding(cur, b)) { toast.error("Hier ist kein Platz für das Gebäude."); break; }
        const n = placeBuilding(cur, b);
        if (n === cur) toast.error(`Es sind höchstens ${LIMITS.maxBuildings} Gebäude möglich.`);
        else commit(n);
      } break;
      case "actor": if (first) {
        const r = placeActor(cur, tool.actor, x, y);
        if (r.doc !== cur) { commit(r.doc); if (r.id) { setSelected({ type: "actor", id: r.id }); setTool({ kind: "select" }); } }
      } break;
      case "spawn": if (first) commit(setSpawn(cur, x, y)); break;
      case "select": case "rect": break;
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // Ansicht verschieben: mittlere Maustaste, Leertaste + Ziehen, im Nur-Lesen-Modus die linke Taste
    if (e.button === 1 || spaceDown.current || (readOnly && e.button === 0)) {
      const sc = scrollRef.current;
      if (!sc) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      stroke.current = { painting: false, began: false, pan: { sx: e.clientX, sy: e.clientY, sl: sc.scrollLeft, st: sc.scrollTop } };
      setPanning(true);
      return;
    }
    if (readOnly || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = tileAt(e);
    const cur = docRef.current;
    if (tool.kind === "select") {
      const hit = hitTest(cur, x, y);
      if (hit?.type === "actor") { setSelected({ type: "actor", id: hit.id }); stroke.current = { painting: false, began: false, drag: { kind: "actor", id: hit.id } }; }
      else if (hit?.type === "building") {
        const b = cur.buildings[hit.index];
        setSelected({ type: "building", index: hit.index });
        stroke.current = { painting: false, began: false, drag: { kind: "building", index: hit.index, dx: x - b.x, dy: y - b.y } };
      } else if (hit?.type === "stamp") {
        // Objekt aufheben: ziehen verschiebt es (Griff bleibt an der angefassten Kachel)
        const st = cur.stamps[hit.index];
        setSelected({ type: "stamp", index: hit.index });
        stroke.current = { painting: false, began: false, drag: { kind: "stamp", index: hit.index, dx: x - st.x, dy: y - st.y } };
      } else setSelected(null);
      return;
    }
    onBeginEdit();
    stroke.current = { painting: true, began: true, ...(tool.kind === "rect" ? { rect: { x0: x, y0: y } } : {}) };
    applyAt(x, y, true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = stroke.current;
    if (s?.pan) {
      const sc = scrollRef.current;
      if (sc) { sc.scrollLeft = s.pan.sl - (e.clientX - s.pan.sx); sc.scrollTop = s.pan.st - (e.clientY - s.pan.sy); }
      return;
    }
    const t = tileAt(e);
    if (!hover || hover.x !== t.x || hover.y !== t.y) setHover(t);
    if (!s) return;
    const cur = docRef.current;
    const began = () => { if (!s.began) { onBeginEdit(); s.began = true; } };
    if (s.drag) {
      const d = s.drag;
      const n = d.kind === "stamp" ? moveStamp(cur, d.index, t.x - d.dx, t.y - d.dy)
        : d.kind === "building" ? moveBuilding(cur, d.index, t.x - d.dx, t.y - d.dy)
        : moveActor(cur, d.id, t.x, t.y);
      if (n !== cur) { began(); commit(n); }
      return;
    }
    if (s.painting && (tool.kind === "ground" || tool.kind === "wall" || tool.kind === "erase")) applyAt(t.x, t.y, false);
  };
  const endStroke = () => {
    const s = stroke.current;
    stroke.current = null;
    if (s?.pan) setPanning(false);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = stroke.current;
    if (s?.rect && tool.kind === "rect") {
      const t = tileAt(e);
      const cur = docRef.current;
      const n = rectGround(cur, s.rect.x0, s.rect.y0, t.x, t.y, gType);
      if (n !== cur) commit(n);
    }
    endStroke();
  };

  const setBuildingField = (patch: Partial<BuildingLook>) => {
    if (selected?.type !== "building") return;
    const cur = docRef.current;
    const b = cur.buildings[selected.index];
    if (!b) return;
    const next = { ...b, ...patch };
    if ((patch.w !== undefined || patch.roofRows !== undefined) && !canPlaceBuilding(cur, next, selected.index)) { toast.error("Dafür ist neben dem Gebäude kein Platz."); return; }
    // Beim Tippen des Namens nicht jeden Buchstaben einzeln rückgängig machen
    const onlyName = Object.keys(patch).length === 1 && patch.name !== undefined;
    const now = Date.now();
    if (!(onlyName && now - lastNameEdit.current < 1500)) onBeginEdit();
    lastNameEdit.current = onlyName ? now : 0;
    commit({ ...cur, buildings: cur.buildings.map((o, i) => (i === selected.index ? next : o)) });
  };

  const deleteSelection = useCallback(() => {
    const cur = docRef.current;
    if (!selected) return;
    onBeginEdit();
    if (selected.type === "actor") { const a = cur.actors.find((o) => o.id === selected.id); if (a) commit(removeAt(cur, a.x, a.y)); }
    else if (selected.type === "stamp") commit({ ...cur, stamps: cur.stamps.filter((_, i) => i !== selected.index) });
    else commit(removeBuilding(cur, selected.index));
    setSelected(null);
  }, [selected, commit, onBeginEdit]);

  const duplicate = useCallback(() => {
    if (!selected || selected.type === "actor") return;
    const r = duplicateSelection(docRef.current, selected);
    if (!r) { toast.error("Kopieren nicht möglich (kein Platz oder Höchstzahl erreicht)."); return; }
    onBeginEdit();
    commit(r.doc);
    setSelected({ type: selected.type, index: r.index });
  }, [selected, commit, onBeginEdit]);

  // Tastenkürzel: Werkzeuge, Entf, Strg+D, Pfeile schieben die Auswahl, Leertaste = Ansicht verschieben
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target) || interiorOf !== null) return;
      if (e.key === " " && !e.repeat) { spaceDown.current = true; if (e.target === document.body || canvasRef.current?.contains(e.target as Node)) e.preventDefault(); return; }
      if (readOnly) return;
      const cur = docRef.current;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") { e.preventDefault(); duplicate(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") { setTool({ kind: "select" }); setSelected(null); return; }
      if (e.key === "Delete" || e.key === "Backspace") { if (selected) { e.preventDefault(); deleteSelection(); } return; }
      const arrow = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, [number, number]>)[e.key];
      if (arrow && selected) {
        e.preventDefault();
        const [dx, dy] = arrow;
        let n = cur;
        if (selected.type === "actor") { const a = cur.actors.find((o) => o.id === selected.id); if (a) n = moveActor(cur, a.id, a.x + dx, a.y + dy); }
        else if (selected.type === "stamp") { const s = cur.stamps[selected.index]; if (s) n = moveStamp(cur, selected.index, s.x + dx, s.y + dy); }
        else { const b = cur.buildings[selected.index]; if (b) n = moveBuilding(cur, selected.index, b.x + dx, b.y + dy); }
        if (n !== cur) { onBeginEdit(); commit(n); }
        return;
      }
      const btn = ALL_TOOLS.find((b) => b.hot.toLowerCase() === e.key.toLowerCase() && (!b.caveOnly || isCave));
      if (btn) setTool(btn.tool.kind === "stamp" && tool.kind === "stamp" ? tool : btn.tool);
    };
    const up = (e: KeyboardEvent) => { if (e.key === " ") spaceDown.current = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [readOnly, selected, tool, isCave, interiorOf, duplicate, deleteSelection, commit, onBeginEdit]);

  if (interiorOf !== null && doc.buildings[interiorOf]?.interior) {
    return <InteriorEditor doc={doc} bi={interiorOf} readOnly={readOnly} onChange={onChange} onBeginEdit={onBeginEdit} onQuestFocus={onQuestFocus} onClose={() => setInteriorOf(null)} />;
  }

  const showsGround = tool.kind === "ground" || tool.kind === "fill" || tool.kind === "rect";
  const cursor = panning ? "grabbing" : readOnly ? "grab" : tool.kind === "select" ? "default" : "crosshair";

  return (
    <div className="grid gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="space-y-3 lg:sticky lg:top-2 lg:self-start lg:max-h-[calc(100vh-1rem)] lg:overflow-y-auto lg:pr-1">
        {/* Auswahl (oben, damit man sie nicht suchen muss) */}
        {selStamp && selected?.type === "stamp" && (
          <div className="moba-panel rounded-2xl p-3 space-y-2 text-[11px] text-gray-400">
            <p className={HEAD}>Objekt</p>
            <p className="text-xs text-white">{STAMP_LABELS[selStamp.id] ?? selStamp.id}</p>
            <label className="block">Text beim Ansprechen
              <textarea
                value={selStamp.say ?? ""}
                rows={3}
                maxLength={LIMITS.lineLen}
                disabled={readOnly}
                placeholder="z. B. „Ein altes Fass. Es riecht nach Met.“"
                onFocus={onBeginEdit}
                onChange={(e) => commit(setStampSay(docRef.current, selected.index, e.target.value))}
                className={`${INPUT} resize-y text-xs`}
              />
              <span className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                <span>{selStamp.say ? "Spieler können das Objekt ansprechen; es leuchtet, wenn sie nah genug sind." : "Leer = nur Deko, nicht ansprechbar."}</span>
                <span>{(selStamp.say ?? "").length}/{LIMITS.lineLen}</span>
              </span>
            </label>
            {!readOnly && (
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" onClick={duplicate} title="Strg+D" className="rounded-lg border border-white/15 text-gray-200 font-semibold py-1.5 hover:border-white/30">Duplizieren</button>
                <button type="button" onClick={deleteSelection} title="Entf" className="rounded-lg border border-red-400/30 text-red-300 font-semibold py-1.5 hover:bg-red-500/10">Entfernen</button>
              </div>
            )}
          </div>
        )}
        {selActor && (
          <div className="moba-panel rounded-2xl p-3 space-y-2">
            <p className={HEAD}>
              {selActor.kind === "npc" ? "NPC" : selActor.kind === "merchant" ? "Händler" : selActor.kind === "chest" ? "Truhe" : selActor.kind === "monster" ? "Monster" : "Schild"}
            </p>
            <label className="block text-[11px] text-gray-400">Name
              <input value={selActor.name} maxLength={LIMITS.nameLen} disabled={readOnly} onChange={(e) => commit(updateActor(doc, selActor.id, { name: e.target.value }))} onFocus={onBeginEdit} className={INPUT} />
            </label>
            {selActor.kind === "monster" && (
              <label className="block text-[11px] text-gray-400">Art des Monsters
                <select value={selActor.monster ?? "ratte"} disabled={readOnly} onFocus={onBeginEdit} onChange={(e) => { const m = getMonster(e.target.value); if (m) commit(updateActor(doc, selActor.id, { monster: m.id, name: m.name, talk: [{ step: "*", lines: [m.blurb] }] })); }} className={INPUT}>
                  {MONSTERS.filter((m) => !m.raid).map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.name} (Stufe {m.level})</option>)}
                </select>
                <span className="block text-[10px] text-gray-500 mt-1">Spieler kämpfen beim Ansprechen. Nach einem Sieg verschwindet die Figur für 15 Minuten. Achte auf die Stufe — zu starke Monster frustrieren.</span>
              </label>
            )}
            {selActor.kind === "merchant" && (
              <div className="text-[11px] text-gray-400 space-y-1">
                <p>Angebot (bis zu {LIMITS.maxShop} Gegenstände)</p>
                <div className="max-h-40 overflow-y-auto grid grid-cols-1 gap-0.5">
                  {ITEMS.map((it) => {
                    const on = (selActor.shop ?? []).includes(it.key);
                    return (
                      <label key={it.key} className="flex items-center gap-1.5">
                        <input type="checkbox" checked={on} disabled={readOnly || (!on && (selActor.shop ?? []).length >= LIMITS.maxShop)} onChange={() => { onBeginEdit(); commit(updateActor(doc, selActor.id, { shop: on ? (selActor.shop ?? []).filter((k) => k !== it.key) : [...(selActor.shop ?? []), it.key] })); }} />
                        {it.emoji} {it.name} <span className="text-gray-500">({it.price} Gold)</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            {(selActor.kind === "npc" || selActor.kind === "merchant") && (
              <>
                <label className="block text-[11px] text-gray-400">Blickrichtung
                  <select value={selActor.dir} disabled={readOnly} onChange={(e) => { onBeginEdit(); commit(updateActor(doc, selActor.id, { dir: e.target.value as typeof selActor.dir })); }} className={INPUT}>
                    <option value="down">Nach unten</option><option value="up">Nach oben</option><option value="left">Nach links</option><option value="right">Nach rechts</option>
                  </select>
                </label>
                {selActor.config && !readOnly && (
                  <TeCharacterEditor compact value={selActor.config} onChange={(cfg) => commit(updateActor(doc, selActor.id, { config: cfg }))} />
                )}
              </>
            )}
            {selActor.kind !== "monster" && <button type="button" onClick={() => onQuestFocus(selActor.id)} className="w-full rounded-lg border border-violet-400/40 text-violet-300 text-[11px] font-semibold py-1.5 hover:bg-violet-500/10">
              {selActor.kind === "sign" || selActor.kind === "chest" ? "Text & Inhalt bearbeiten" : "Dialoge bearbeiten"}
            </button>}
            {!readOnly && (
              <button type="button" onClick={deleteSelection} title="Entf" className="w-full rounded-lg border border-red-400/30 text-red-300 text-[11px] font-semibold py-1.5 hover:bg-red-500/10">
                Entfernen
              </button>
            )}
          </div>
        )}
        {selBuilding && selected?.type === "building" && (
          <div className="moba-panel rounded-2xl p-3 space-y-3 text-[11px] text-gray-400">
            <p className={HEAD}>Gebäude</p>
            <BuildingDesigner sheets={sheets} look={selBuilding} onChange={setBuildingField} readOnly={readOnly} />
            <div className="border-t border-white/10 pt-2 space-y-1.5">
              <p className={HEAD}>Innenraum</p>
              {selBuilding.interior ? (
                <>
                  <p>Der Raum hinter der Tür ({selBuilding.interior.cols}×{selBuilding.interior.rows}, {selBuilding.interior.actors.length} Person(en)).</p>
                  <button type="button" onClick={() => setInteriorOf(selected.index)} className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold py-1.5">{readOnly ? "Innenraum ansehen" : "Innenraum bearbeiten"}</button>
                  {!readOnly && <button type="button" onClick={() => { if (window.confirm("Den Innenraum samt Möbeln und Personen entfernen?")) { onBeginEdit(); commit(removeInterior(docRef.current, selected.index)); } }} className="w-full rounded-lg border border-red-400/30 text-red-300 font-semibold py-1.5 hover:bg-red-500/10">Innenraum entfernen</button>}
                </>
              ) : !readOnly ? (
                <>
                  <p>Mit Vorlage anlegen — Spieler betreten das Gebäude dann durch die Tür:</p>
                  <div className="grid grid-cols-2 gap-1">
                    {INTERIOR_TEMPLATES.map((t) => (
                      <button key={t.id} type="button" title={t.description} onClick={() => { onBeginEdit(); commit(setInteriorFromTemplate(docRef.current, selected.index, t.id)); setInteriorOf(selected.index); }} className="rounded-lg border border-white/15 text-gray-200 font-semibold px-2 py-1.5 hover:border-white/30">＋ {t.label}</button>
                    ))}
                  </div>
                </>
              ) : <p>Kein Innenraum.</p>}
            </div>
            {!readOnly && (
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" onClick={duplicate} title="Strg+D" className="rounded-lg border border-white/15 text-gray-200 font-semibold py-1.5 hover:border-white/30">Duplizieren</button>
                <button type="button" onClick={deleteSelection} title="Entf" className="rounded-lg border border-red-400/30 text-red-300 font-semibold py-1.5 hover:bg-red-500/10">Entfernen</button>
              </div>
            )}
          </div>
        )}

        {/* Werkzeuge */}
        {!readOnly && (
          <div className="moba-panel rounded-2xl p-3 space-y-3">
            {TOOL_GROUPS.map((g) => {
              const tools = g.tools.filter((b) => !b.caveOnly || isCave);
              return (
                <div key={g.label} className="space-y-1">
                  <p className={HEAD}>{g.label}</p>
                  <div className="grid grid-cols-4 gap-1">
                    {tools.map((b) => (
                      <button
                        key={b.key}
                        type="button"
                        onClick={() => setTool(b.tool)}
                        title={`${b.label} (${b.hot})`}
                        aria-pressed={activeKey === b.key}
                        className={`relative flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 ${activeKey === b.key ? "border-amber-400 bg-amber-400/10 text-amber-200" : "border-white/10 text-gray-300 hover:border-white/30"}`}
                      >
                        <span className="text-base leading-none" aria-hidden>{b.icon}</span>
                        <span className="text-[9px] leading-tight font-semibold">{b.label}</span>
                        <span className="absolute top-0.5 right-1 text-[8px] text-gray-500">{b.hot}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="border-t border-white/10 pt-2 space-y-2 text-[11px] text-gray-400">
              {activeButton && <p className="text-gray-500">{activeButton.hint}</p>}

              {showsGround && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-1">
                    {([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as GroundType[]).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGType(g)}
                        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] text-left ${gType === g ? "border-amber-400 text-amber-200 bg-amber-400/10" : "border-white/10 text-gray-300 hover:border-white/30"}`}
                      >
                        <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: GROUND_LABEL[g].color }} />
                        {GROUND_LABEL[g][doc.theme]}
                      </button>
                    ))}
                  </div>
                  {tool.kind === "ground" && (
                    <label className="flex items-center gap-2">
                      Pinsel
                      <select value={brush} onChange={(e) => setBrush(Number(e.target.value))} className="rounded bg-zinc-900 border border-white/10 px-1.5 py-0.5 text-white">
                        {[1, 2, 3, 5].map((n) => <option key={n} value={n}>{n}×{n}</option>)}
                      </select>
                    </label>
                  )}
                </div>
              )}

              {tool.kind === "stamp" && <StampPicker ids={STAMP_IDS} sheets={sheets} value={tool.id} onPick={(id) => setTool({ kind: "stamp", id })} />}

              {tool.kind === "building" && <BuildingDesigner sheets={sheets} look={bld} onChange={(patch) => setBld((b) => ({ ...b, ...patch }))} />}
            </div>
          </div>
        )}

        {/* Karte */}
        {!readOnly && (
          <details className="moba-panel rounded-2xl p-3 text-[11px] text-gray-400 group">
            <summary className={`${HEAD} cursor-pointer select-none`}>Karte · {doc.cols}×{doc.rows} · {isCave ? "Höhle" : "Draußen"}</summary>
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <label>Breite
                  <input type="number" min={LIMITS.minSide} max={LIMITS.maxSide} defaultValue={doc.cols} key={`c${doc.cols}`} onBlur={(e) => { const v = Number(e.target.value); if (v !== doc.cols) { onBeginEdit(); commit(resizeDoc(doc, v, doc.rows)); } }} className={INPUT} />
                </label>
                <label>Höhe
                  <input type="number" min={LIMITS.minSide} max={LIMITS.maxSide} defaultValue={doc.rows} key={`r${doc.rows}`} onBlur={(e) => { const v = Number(e.target.value); if (v !== doc.rows) { onBeginEdit(); commit(resizeDoc(doc, doc.cols, v)); } }} className={INPUT} />
                </label>
              </div>
              <label className="block">Thema
                <select value={doc.theme} onChange={(e) => { onBeginEdit(); commit(setTheme(doc, e.target.value as "outdoor" | "cave")); }} className={INPUT}>
                  <option value="outdoor">Draußen</option><option value="cave">Höhle</option>
                </select>
              </label>
              <label className="block">Rand
                <select value={doc.border} onChange={(e) => { onBeginEdit(); commit({ ...doc, border: e.target.value as BorderStyle }); }} className={INPUT}>
                  <option value="none">Kein Rand</option>
                  {!isCave && <option value="trees">Bäume</option>}
                  {isCave && <option value="cave">Höhlenwand</option>}
                  <option value="rocks">Felsen</option>
                </select>
              </label>
              {doc.border !== "none" && (
                <label className="block">Randdicke
                  <select value={doc.borderSize} onChange={(e) => { onBeginEdit(); commit({ ...doc, borderSize: Number(e.target.value) }); }} className={INPUT}>
                    <option value={2}>2 Kacheln</option><option value={3}>3 Kacheln</option><option value={4}>4 Kacheln</option>
                  </select>
                </label>
              )}
            </div>
          </details>
        )}
      </div>

      {/* Zeichenfläche */}
      <div className="space-y-2 min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
          <div className="flex items-center rounded border border-white/10 overflow-hidden" role="group" aria-label="Zoom">
            <button type="button" onClick={() => setZoomAt(zoom - 1)} disabled={zoom <= ZOOMS[0]} className="px-2 py-0.5 text-white disabled:opacity-30 hover:bg-white/10" aria-label="Verkleinern">−</button>
            <span className="px-2 tabular-nums text-white">{zoom}×</span>
            <button type="button" onClick={() => setZoomAt(zoom + 1)} disabled={zoom >= ZOOMS[ZOOMS.length - 1]} className="px-2 py-0.5 text-white disabled:opacity-30 hover:bg-white/10" aria-label="Vergrößern">+</button>
          </div>
          <button type="button" onClick={fit} className="rounded border border-white/10 px-2 py-0.5 hover:border-white/30">Einpassen</button>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} /> Raster</label>
          <span className="text-gray-500 hidden sm:inline">Strg + Mausrad: Zoom · Leertaste + Ziehen: verschieben</span>
          {hover && <span className="ml-auto tabular-nums">Kachel {hover.x}, {hover.y}</span>}
        </div>
        <div ref={scrollRef} className="rounded-2xl border border-white/10 bg-[#0b1524] overflow-auto max-h-[72vh]">
          {loadError ? <p className="p-6 text-xs text-red-400">{loadError}</p> : (
            <canvas
              ref={canvasRef}
              width={doc.cols * T}
              height={doc.rows * T}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={endStroke}
              onPointerLeave={() => { setHover(null); if (!stroke.current?.pan && !stroke.current?.rect) endStroke(); }}
              onContextMenu={(e) => e.preventDefault()}
              style={{ imageRendering: "pixelated", width: doc.cols * T * zoom, height: doc.rows * T * zoom, touchAction: "none", cursor, display: "block" }}
              role="img"
              aria-label="Karteneditor"
            />
          )}
        </div>
        <div className="flex items-start gap-3">
          <Minimap doc={doc} baked={baked} scrollRef={scrollRef} zoom={zoom} />
          <div className="text-[11px] text-gray-500 space-y-1 pt-0.5">
            <p><span className="inline-block w-3 h-3 rounded-full bg-amber-400 text-[8px] leading-3 text-center font-bold text-[#3b2a00] align-middle mr-1">!</span>Objekt mit Text — im Spiel leuchtet es, sobald man nah genug ist.</p>
            <p>Übersichtskarte: Klick springt zum Ausschnitt.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
