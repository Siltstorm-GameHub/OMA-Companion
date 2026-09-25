"use client";

// ============================================
// Welten-Editor: Karte malen (Boden, Objekte, Gebäude, NPCs, Truhen, Schilder, Startpunkt)
// ============================================
// Die Zeichenfläche zeigt die ganze Karte in Originalgröße (16 px je Kachel), per CSS vergrößert. Jede
// Änderung erzeugt ein neues Dokument (siehe lib/te-map/custom-world-edit.ts); die Vorschau nutzt dieselbe
// Umwandlung (docToWorld) und dieselben Zeichenfunktionen wie das Spiel — was man sieht, wird gespielt.

import { useEffect, useMemo, useRef, useState } from "react";
import TeCharacterEditor from "@/components/te-character/TeCharacterEditor";
import { drawTeFrame, loadTeLayerSets, type TeLayerSets } from "@/components/te-character/TeCharacter";
import { bakeStatic, drawStamp, loadSheets, T, type Sheets } from "@/components/te-map/TeWorld";
import { docToWorld, LIMITS, type BorderStyle, type CustomWorldDoc } from "@/lib/te-map/custom-world";
import {
  hitTest, moveActor, paintGround, placeActor, placeBuilding, placeStamp, removeAt, removeInterior, resizeDoc, setInteriorFromTemplate, setSpawn, setTheme, setWall, updateActor,
  type ActorKind,
} from "@/lib/te-map/custom-world-edit";
import { ITEMS } from "@/lib/dnd/items";
import { getMonster, MONSTERS } from "@/lib/dnd/combat";
import { INTERIOR_TEMPLATES } from "@/lib/te-map/interior";
import { STAMPS, type StampDef, type StampId } from "@/lib/te-map/stamps";
import InteriorEditor from "./InteriorEditor";
import { GROUND, type Building, type GroundType } from "@/lib/te-map/types";

type Tool =
  | { kind: "select" }
  | { kind: "ground"; g: GroundType }
  | { kind: "wall" }
  | { kind: "erase" }
  | { kind: "stamp"; id: StampId }
  | { kind: "building" }
  | { kind: "actor"; actor: ActorKind }
  | { kind: "spawn" };

type Selection = { type: "actor"; id: string } | { type: "building"; index: number } | null;

const GROUND_LABEL: Record<GroundType, { outdoor: string; cave: string; color: string }> = {
  [GROUND.base]: { outdoor: "Gras", cave: "Höhlenboden", color: "#4d8a3c" },
  [GROUND.dirt]: { outdoor: "Erde", cave: "Erde", color: "#8a6a3c" },
  [GROUND.cobble]: { outdoor: "Pflaster", cave: "Pflaster", color: "#8c8c96" },
  [GROUND.stone]: { outdoor: "Stein", cave: "Stein", color: "#5b6270" },
  [GROUND.sand]: { outdoor: "Sand", cave: "Sand", color: "#cbb46a" },
};

// Außen-Palette: ohne Türen/Fenster/Schilder-Kacheln und ohne Innenraum-Möbel (die gibt es im Innenraum-Editor)
const STAMP_IDS = (Object.keys(STAMPS) as StampId[]).filter((id) => (STAMPS[id] as StampDef).sheet !== "inside" && !["window", "door", "shopSword", "shopInn", "shopMug", "sign"].includes(id));

const TOOL_BUTTONS: { key: string; label: string; tool: Tool; caveOnly?: boolean }[] = [
  { key: "select", label: "Auswählen / Verschieben", tool: { kind: "select" } },
  { key: "ground", label: "Boden malen", tool: { kind: "ground", g: GROUND.dirt } },
  { key: "wall", label: "Höhlenwand", tool: { kind: "wall" }, caveOnly: true },
  { key: "stamp", label: "Objekte", tool: { kind: "stamp", id: "tree" } },
  { key: "building", label: "Gebäude", tool: { kind: "building" } },
  { key: "npc", label: "NPC", tool: { kind: "actor", actor: "npc" } },
  { key: "merchant", label: "Händler", tool: { kind: "actor", actor: "merchant" } },
  { key: "chest", label: "Truhe", tool: { kind: "actor", actor: "chest" } },
  { key: "monster", label: "Monster", tool: { kind: "actor", actor: "monster" } },
  { key: "sign", label: "Schild", tool: { kind: "actor", actor: "sign" } },
  { key: "spawn", label: "Startpunkt", tool: { kind: "spawn" } },
  { key: "erase", label: "Radierer", tool: { kind: "erase" } },
];

function toolKey(t: Tool): string {
  return t.kind === "actor" ? (t.actor === "npc" ? "npc" : t.actor === "merchant" ? "merchant" : t.actor === "chest" ? "chest" : t.actor === "monster" ? "monster" : "sign") : t.kind;
}

/** Kleine Vorschau eines Objekts (Stempel) bzw. Dach-/Wandblocks. */
export function Swatch({ sheets, draw, w, h, selected, title, onClick }: {
  sheets: Sheets | null; draw: (ctx: CanvasRenderingContext2D, sheets: Sheets) => void; w: number; h: number; selected: boolean; title: string; onClick: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx || !sheets) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    draw(ctx, sheets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheets, w, h]);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`grid place-items-center rounded-md border p-0.5 bg-[#1b2a3d] ${selected ? "border-amber-400 ring-1 ring-amber-400" : "border-white/10 hover:border-white/30"}`}
    >
      <canvas ref={ref} width={w} height={h} style={{ imageRendering: "pixelated", width: Math.min(w * 2, 64), height: (Math.min(w * 2, 64) / w) * h }} />
    </button>
  );
}

const STAMP_LABELS: Partial<Record<StampId, string>> = {
  tree: "Baum", darkTree: "Dunkler Baum", hedge4: "Hecke", hedgeFlowers: "Blumenhecke", fruitBush: "Beerenbusch", flowerBed: "Blumenbeet",
  flowerTub: "Blumentrog", flowerTubYellow: "Blumentopf", planter: "Pflanzkasten", reeds: "Schilf", reedsTuft: "Schilfbüschel", lily: "Seerose",
  lilyPink: "Rosa Seerose", stump: "Baumstumpf", fountain: "Brunnen", benchWide: "Bank", lamp: "Laterne", noticeBoard: "Anschlagtafel",
  planks: "Bretter", fenceH: "Zaun", crate: "Kiste", barrel: "Fass", hay: "Heu", log: "Baumstamm", rocks: "Steine", scarecrow: "Vogelscheuche",
  ruinWall: "Ruinenmauer", ruinWall2: "Mauerstück", ruinPillar: "Ruinensäule", obelisk: "Obelisk", grave: "Grab", graveCross: "Grabkreuz",
  bonesPile: "Knochenhaufen", pillar: "Säule", brokenPillar: "Kaputte Säule", stoneBlocks: "Steinblöcke", skull: "Schädel", bones: "Knochen",
  skullPile: "Schädelhaufen", mushrooms: "Pilze", rockBig: "Großer Fels", rockGrey: "Grauer Fels", rockSmall: "Kleiner Fels",
  stalagmite: "Stalagmit", armPostL: "Laternenpfosten links", armPostR: "Laternenpfosten rechts", campfire: "Lagerfeuer", campfireSmall: "Kleines Lagerfeuer", torchStand: "Fackelständer", wallTorch: "Wandfackel", hearthFire: "Herdfeuer", stoveFire: "Ofenfeuer", crateBlue: "Blaue Kiste", waterBarrel: "Wasserfass", jar: "Krug", jarGrey: "Grauer Krug",
};

interface Props {
  doc: CustomWorldDoc;
  readOnly: boolean;
  onChange: (doc: CustomWorldDoc) => void;
  /** Vor jeder Änderungsfolge (Klick/Strich) aufgerufen, damit der Editor den Stand für "Rückgängig" merken kann. */
  onBeginEdit: () => void;
  onQuestFocus: (actorId: string) => void;
}

export default function MapEditor({ doc, readOnly, onChange, onBeginEdit, onQuestFocus }: Props) {
  const [sheets, setSheets] = useState<Sheets | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>({ kind: "select" });
  const [brush, setBrush] = useState(1);
  const [zoom, setZoom] = useState(2);
  const [grid, setGrid] = useState(true);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<Selection>(null);
  const [interiorOf, setInteriorOf] = useState<number | null>(null);
  const [bld, setBld] = useState<Omit<Building, "x" | "y">>({
    w: 6, roofRows: 3, roof: { k: 0, r: 0 }, wall: { k: 0, r: 1 }, doorDx: 2, windowDx: [0, 4], name: "Haus",
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef(doc);
  useEffect(() => { docRef.current = doc; }, [doc]);
  const stroke = useRef<{ dragActor?: string; painting: boolean } | null>(null);
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

  // Zeichnen
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
    ctx.fillText("S", doc.spawn.x * T + 5, doc.spawn.y * T + 12);

    // Auswahl
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 1.5;
    if (selected?.type === "actor") {
      const a = doc.actors.find((o) => o.id === selected.id);
      if (a) ctx.strokeRect(a.x * T + 0.5, a.y * T + 0.5, T - 1, T - 1);
    } else if (selected?.type === "building") {
      const b = doc.buildings[selected.index];
      if (b) ctx.strokeRect(b.x * T + 0.5, b.y * T + 0.5, b.w * T - 1, (b.roofRows + 2) * T - 1);
    }

    // Vorschau unter dem Mauszeiger
    if (hover && !readOnly) {
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1;
      let w = 1, h = 1, hx = hover.x, hy = hover.y;
      if (tool.kind === "ground") { w = h = brush; hx -= Math.floor((brush - 1) / 2); hy -= Math.floor((brush - 1) / 2); }
      if (tool.kind === "stamp") { const d = STAMPS[tool.id] as StampDef; w = d.w; h = d.h; }
      if (tool.kind === "building") { w = bld.w; h = bld.roofRows + 2; }
      ctx.strokeRect(hx * T + 0.5, hy * T + 0.5, w * T - 1, h * T - 1);
    }
  }, [sheets, baked, world, doc, npcSets, grid, hover, selected, tool, brush, bld.w, bld.roofRows, readOnly]);

  const tileAt = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: Math.floor(((e.clientX - r.left) / r.width) * doc.cols), y: Math.floor(((e.clientY - r.top) / r.height) * doc.rows) };
  };

  const commit = (next: CustomWorldDoc) => { docRef.current = next; onChange(next); };

  const applyAt = (x: number, y: number, first: boolean) => {
    if (readOnly || x < 0 || y < 0 || x >= doc.cols || y >= doc.rows) return;
    const cur = docRef.current;
    switch (tool.kind) {
      case "ground": { const n = paintGround(cur, x, y, tool.g, brush); if (n !== cur) commit(n); break; }
      case "wall": { const n = setWall(cur, x, y, true); if (n !== cur) commit(n); break; }
      case "erase": { const n = removeAt(cur, x, y); if (n !== cur) commit(n); break; }
      case "stamp": if (first) { const n = placeStamp(cur, tool.id, x, y); if (n !== cur) commit(n); } break;
      case "building": if (first) { const n = placeBuilding(cur, { ...bld, x, y, windowDx: bld.windowDx.filter((d) => d < bld.w && d !== bld.doorDx) }); if (n !== cur) commit(n); } break;
      case "actor": if (first) {
        const r = placeActor(cur, tool.actor, x, y);
        if (r.doc !== cur) { commit(r.doc); if (r.id) { setSelected({ type: "actor", id: r.id }); setTool({ kind: "select" }); } }
      } break;
      case "spawn": if (first) commit(setSpawn(cur, x, y)); break;
      case "select": break;
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (readOnly) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = tileAt(e);
    const cur = docRef.current;
    if (tool.kind === "select") {
      const hit = hitTest(cur, x, y);
      if (hit?.type === "actor") { setSelected({ type: "actor", id: hit.id }); stroke.current = { dragActor: hit.id, painting: false }; onBeginEdit(); }
      else if (hit?.type === "building") setSelected({ type: "building", index: hit.index });
      else setSelected(null);
      return;
    }
    onBeginEdit();
    stroke.current = { painting: true };
    applyAt(x, y, true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const t = tileAt(e);
    if (!hover || hover.x !== t.x || hover.y !== t.y) setHover(t);
    const s = stroke.current;
    if (!s) return;
    if (s.dragActor) { const n = moveActor(docRef.current, s.dragActor, t.x, t.y); if (n !== docRef.current) commit(n); return; }
    if (s.painting && (tool.kind === "ground" || tool.kind === "wall" || tool.kind === "erase")) applyAt(t.x, t.y, false);
  };
  const endStroke = () => { stroke.current = null; };

  const selActor = selected?.type === "actor" ? doc.actors.find((a) => a.id === selected.id) : undefined;
  const selBuilding = selected?.type === "building" ? doc.buildings[selected.index] : undefined;
  const isCave = doc.theme === "cave";
  const activeKey = toolKey(tool);

  const setBuildingField = (patch: Partial<Building>) => {
    if (selected?.type !== "building") return;
    onBeginEdit();
    commit({ ...docRef.current, buildings: docRef.current.buildings.map((b, i) => (i === selected.index ? { ...b, ...patch } : b)) });
  };

  if (interiorOf !== null && doc.buildings[interiorOf]?.interior) {
    return <InteriorEditor doc={doc} bi={interiorOf} readOnly={readOnly} onChange={onChange} onBeginEdit={onBeginEdit} onQuestFocus={onQuestFocus} onClose={() => setInteriorOf(null)} />;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Werkzeuge */}
      <div className="space-y-3">
        {!readOnly && (
          <div className="moba-panel rounded-2xl p-3 space-y-2">
            <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Werkzeuge</p>
            <div className="grid grid-cols-2 gap-1.5">
              {TOOL_BUTTONS.filter((b) => !b.caveOnly || isCave).map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setTool(b.tool)}
                  className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold text-left ${activeKey === b.key ? "border-amber-400 bg-amber-400/10 text-amber-200" : "border-white/10 text-gray-300 hover:border-white/30"}`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {tool.kind === "ground" && (
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap gap-1.5">
                  {([0, 1, 2, 3, 4] as GroundType[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setTool({ kind: "ground", g })}
                      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] ${tool.g === g ? "border-amber-400 text-amber-200" : "border-white/10 text-gray-300"}`}
                    >
                      <span className="w-3 h-3 rounded-sm" style={{ background: GROUND_LABEL[g].color }} />
                      {GROUND_LABEL[g][doc.theme]}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-[11px] text-gray-400">
                  Pinsel
                  <select value={brush} onChange={(e) => setBrush(Number(e.target.value))} className="rounded bg-zinc-900 border border-white/10 px-1.5 py-0.5 text-white">
                    {[1, 2, 3, 5].map((n) => <option key={n} value={n}>{n}×{n}</option>)}
                  </select>
                </label>
              </div>
            )}

            {tool.kind === "stamp" && (
              <div className="grid grid-cols-5 gap-1 max-h-56 overflow-y-auto pt-1">
                {STAMP_IDS.map((id) => {
                  const d = STAMPS[id] as StampDef;
                  return (
                    <Swatch
                      key={id} sheets={sheets} w={d.w * T} h={d.h * T} selected={tool.id === id} title={STAMP_LABELS[id] ?? id}
                      draw={(ctx, s) => drawStamp(ctx, s, id, 0, 0)}
                      onClick={() => setTool({ kind: "stamp", id })}
                    />
                  );
                })}
              </div>
            )}

            {tool.kind === "building" && (
              <div className="space-y-2 pt-1 text-[11px] text-gray-400">
                <label className="block">Name
                  <input value={bld.name} maxLength={LIMITS.nameLen} onChange={(e) => setBld({ ...bld, name: e.target.value })} className="mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label>Breite
                    <input type="number" min={3} max={12} value={bld.w} onChange={(e) => { const w = Math.min(12, Math.max(3, Number(e.target.value) || 3)); setBld({ ...bld, w, doorDx: Math.min(bld.doorDx, w - 1) }); }} className="mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white" />
                  </label>
                  <label>Dachhöhe
                    <input type="number" min={2} max={4} value={bld.roofRows} onChange={(e) => setBld({ ...bld, roofRows: Math.min(4, Math.max(2, Number(e.target.value) || 3)) })} className="mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white" />
                  </label>
                </div>
                <BlockPicker label="Dach" sheets={sheets} rows={[0, 2]} value={bld.roof} onPick={(roof) => setBld({ ...bld, roof })} />
                <BlockPicker label="Wand" sheets={sheets} rows={[1, 3]} value={bld.wall} onPick={(wall) => setBld({ ...bld, wall })} />
                <p>Tür-Position und Fenster stellst du nach dem Setzen ein (Gebäude auswählen).</p>
              </div>
            )}

            {tool.kind === "actor" && <p className="text-[11px] text-gray-500 pt-1">Klick auf die Karte setzt {tool.actor === "npc" ? "einen NPC" : tool.actor === "merchant" ? "einen Händler" : tool.actor === "chest" ? "eine Truhe" : tool.actor === "monster" ? "ein Monster (Art im Auswahl-Fenster ändern)" : "ein Schild"}. Danach Dialoge unter „Quest“ bearbeiten.</p>}
            {tool.kind === "wall" && <p className="text-[11px] text-gray-500 pt-1">Malen setzt Wandkacheln, der Radierer entfernt sie.</p>}
            {tool.kind === "spawn" && <p className="text-[11px] text-gray-500 pt-1">Hier steht die Figur beim Betreten.</p>}
            {tool.kind === "select" && <p className="text-[11px] text-gray-500 pt-1">Klick wählt NPCs, Truhen und Gebäude aus; NPCs lassen sich ziehen.</p>}
          </div>
        )}

        {/* Auswahl */}
        {selActor && (
          <div className="moba-panel rounded-2xl p-3 space-y-2">
            <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">
              {selActor.kind === "npc" ? "NPC" : selActor.kind === "merchant" ? "Händler" : selActor.kind === "chest" ? "Truhe" : selActor.kind === "monster" ? "Monster" : "Schild"}
            </p>
            <label className="block text-[11px] text-gray-400">Name
              <input value={selActor.name} maxLength={LIMITS.nameLen} disabled={readOnly} onChange={(e) => commit(updateActor(doc, selActor.id, { name: e.target.value }))} onFocus={onBeginEdit} className="mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white" />
            </label>
            {selActor.kind === "monster" && (
              <label className="block text-[11px] text-gray-400">Art des Monsters
                <select value={selActor.monster ?? "ratte"} disabled={readOnly} onFocus={onBeginEdit} onChange={(e) => { const m = getMonster(e.target.value); if (m) commit(updateActor(doc, selActor.id, { monster: m.id, name: m.name, talk: [{ step: "*", lines: [m.blurb] }] })); }} className="mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white">
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
                  <select value={selActor.dir} disabled={readOnly} onChange={(e) => { onBeginEdit(); commit(updateActor(doc, selActor.id, { dir: e.target.value as typeof selActor.dir })); }} className="mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white">
                    <option value="down">Nach unten</option><option value="up">Nach oben</option><option value="left">Nach links</option><option value="right">Nach rechts</option>
                  </select>
                </label>
                {selActor.config && !readOnly && (
                  <TeCharacterEditor compact value={selActor.config} onChange={(cfg) => commit(updateActor(doc, selActor.id, { config: cfg }))} />
                )}
              </>
            )}
            {selActor.kind !== "monster" && <button type="button" onClick={() => onQuestFocus(selActor.id)} className="w-full rounded-lg border border-violet-400/40 text-violet-300 text-[11px] font-semibold py-1.5 hover:bg-violet-500/10">
              Dialoge bearbeiten
            </button>}
            {!readOnly && (
              <button type="button" onClick={() => { onBeginEdit(); commit(removeAt(doc, selActor.x, selActor.y)); setSelected(null); }} className="w-full rounded-lg border border-red-400/30 text-red-300 text-[11px] font-semibold py-1.5 hover:bg-red-500/10">
                Entfernen
              </button>
            )}
          </div>
        )}
        {selBuilding && selected?.type === "building" && (
          <div className="moba-panel rounded-2xl p-3 space-y-2 text-[11px] text-gray-400">
            <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Gebäude</p>
            <label className="block">Name
              <input value={selBuilding.name} maxLength={LIMITS.nameLen} disabled={readOnly} onChange={(e) => setBuildingField({ name: e.target.value })} className="mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white" />
            </label>
            <label className="block">Tür (von links, Feld {selBuilding.doorDx + 1})
              <input type="range" min={0} max={selBuilding.w - 1} value={selBuilding.doorDx} disabled={readOnly} onChange={(e) => { const d = Number(e.target.value); setBuildingField({ doorDx: d, windowDx: selBuilding.windowDx.filter((w) => w !== d) }); }} className="w-full" />
            </label>
            <div>Fenster
              <div className="flex flex-wrap gap-1 mt-0.5">
                {Array.from({ length: selBuilding.w }, (_, i) => i).filter((i) => i !== selBuilding.doorDx).map((i) => {
                  const on = selBuilding.windowDx.includes(i);
                  return (
                    <button key={i} type="button" disabled={readOnly} onClick={() => setBuildingField({ windowDx: on ? selBuilding.windowDx.filter((w) => w !== i) : [...selBuilding.windowDx, i].slice(0, 4) })}
                      className={`w-6 h-6 rounded border text-[10px] ${on ? "border-amber-400 text-amber-200" : "border-white/10 text-gray-500"}`}>{i + 1}</button>
                  );
                })}
              </div>
            </div>
            <div>Schild an der Tür
              <select value={selBuilding.sign ?? ""} disabled={readOnly} onChange={(e) => setBuildingField({ sign: (e.target.value || undefined) as Building["sign"] })} className="mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white">
                <option value="">Keins</option><option value="shopSword">Waffen</option><option value="shopInn">Gasthaus</option><option value="shopMug">Krug</option>
              </select>
            </div>
            <BlockPicker label="Dach" sheets={sheets} rows={[0, 2]} value={selBuilding.roof} onPick={(roof) => setBuildingField({ roof })} />
            <BlockPicker label="Wand" sheets={sheets} rows={[1, 3]} value={selBuilding.wall} onPick={(wall) => setBuildingField({ wall })} />
            <div className="border-t border-white/10 pt-2 space-y-1.5">
              <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Innenraum</p>
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
              <button type="button" onClick={() => { onBeginEdit(); commit({ ...doc, buildings: doc.buildings.filter((_, i) => i !== selected.index) }); setSelected(null); }} className="w-full rounded-lg border border-red-400/30 text-red-300 font-semibold py-1.5 hover:bg-red-500/10">
                Entfernen
              </button>
            )}
          </div>
        )}

        {/* Karte */}
        {!readOnly && (
          <div className="moba-panel rounded-2xl p-3 space-y-2 text-[11px] text-gray-400">
            <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Karte</p>
            <div className="grid grid-cols-2 gap-2">
              <label>Breite
                <input type="number" min={LIMITS.minSide} max={LIMITS.maxSide} defaultValue={doc.cols} key={`c${doc.cols}`} onBlur={(e) => { const v = Number(e.target.value); if (v !== doc.cols) { onBeginEdit(); commit(resizeDoc(doc, v, doc.rows)); } }} className="mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white" />
              </label>
              <label>Höhe
                <input type="number" min={LIMITS.minSide} max={LIMITS.maxSide} defaultValue={doc.rows} key={`r${doc.rows}`} onBlur={(e) => { const v = Number(e.target.value); if (v !== doc.rows) { onBeginEdit(); commit(resizeDoc(doc, doc.cols, v)); } }} className="mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white" />
              </label>
            </div>
            <label className="block">Thema
              <select value={doc.theme} onChange={(e) => { onBeginEdit(); commit(setTheme(doc, e.target.value as "outdoor" | "cave")); }} className="mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white">
                <option value="outdoor">Draußen</option><option value="cave">Höhle</option>
              </select>
            </label>
            <label className="block">Rand
              <select value={doc.border} onChange={(e) => { onBeginEdit(); commit({ ...doc, border: e.target.value as BorderStyle }); }} className="mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white">
                <option value="none">Kein Rand</option>
                {!isCave && <option value="trees">Bäume</option>}
                {isCave && <option value="cave">Höhlenwand</option>}
                <option value="rocks">Felsen</option>
              </select>
            </label>
            {doc.border !== "none" && (
              <label className="block">Randdicke
                <select value={doc.borderSize} onChange={(e) => { onBeginEdit(); commit({ ...doc, borderSize: Number(e.target.value) }); }} className="mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white">
                  <option value={2}>2 Kacheln</option><option value={3}>3 Kacheln</option><option value={4}>4 Kacheln</option>
                </select>
              </label>
            )}
          </div>
        )}
      </div>

      {/* Zeichenfläche */}
      <div className="space-y-2 min-w-0">
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          <label className="flex items-center gap-1.5">Zoom
            <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="rounded bg-zinc-900 border border-white/10 px-1.5 py-0.5 text-white">
              <option value={1}>1×</option><option value={2}>2×</option><option value={3}>3×</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} /> Raster</label>
          {hover && <span className="ml-auto">Kachel {hover.x}, {hover.y}</span>}
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0b1524] overflow-auto max-h-[72vh]">
          {loadError ? <p className="p-6 text-xs text-red-400">{loadError}</p> : (
            <canvas
              ref={canvasRef}
              width={doc.cols * T}
              height={doc.rows * T}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endStroke}
              onPointerCancel={endStroke}
              onPointerLeave={() => { setHover(null); endStroke(); }}
              style={{ imageRendering: "pixelated", width: doc.cols * T * zoom, height: doc.rows * T * zoom, touchAction: "none", cursor: readOnly ? "default" : "crosshair", display: "block" }}
              role="img"
              aria-label="Karteneditor"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** Auswahl eines Dach-/Wandblocks aus dem A3-Sheet (8 Farben × 2 Varianten). */
function BlockPicker({ label, sheets, rows, value, onPick }: { label: string; sheets: Sheets | null; rows: [number, number]; value: { k: number; r: number }; onPick: (v: { k: number; r: number }) => void }) {
  return (
    <div>
      {label}
      <div className="grid grid-cols-8 gap-1 mt-0.5">
        {rows.flatMap((r) => Array.from({ length: 8 }, (_, k) => ({ k, r }))).map((b) => (
          <Swatch key={`${b.k}-${b.r}`} sheets={sheets} w={32} h={32} selected={value.k === b.k && value.r === b.r} title={`${label} ${b.k + 1}${b.r >= 2 ? "b" : "a"}`}
            draw={(ctx, s) => ctx.drawImage(s.a3, b.k * 32, b.r * 32, 32, 32, 0, 0, 32, 32)}
            onClick={() => onPick(b)} />
        ))}
      </div>
    </div>
  );
}
