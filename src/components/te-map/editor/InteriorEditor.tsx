"use client";

// ============================================
// Welten-Editor: Innenraum eines Gebäudes einrichten (Möbel, Boden, Wände, NPCs, Händler, Truhen)
// ============================================

import { useEffect, useMemo, useRef, useState } from "react";
import TeCharacterEditor from "@/components/te-character/TeCharacterEditor";
import { drawTeFrame, loadTeLayerSets, type TeLayerSets } from "@/components/te-character/TeCharacter";
import { bakeInterior, drawStamp, loadSheets, T, type Sheets } from "@/components/te-map/TeWorld";
import { ITEMS } from "@/lib/dnd/items";
import { getMonster, MONSTERS } from "@/lib/dnd/combat";
import { spriteInfo, spriteKeyOf, spriteScale } from "@/lib/dnd/oq-monster";
import { TIER_META, tierOf } from "@/lib/dnd/monster-tier";
import { drawTierAura, drawTierIcon } from "@/components/te-map/tier-draw";
import { tierCounts } from "@/lib/te-map/custom-world-edit";
import { LIMITS, type CustomWorldDoc } from "@/lib/te-map/custom-world";
import {
  interiorMoveActor, interiorMoveStamp, interiorSetStampSay, interiorStampAt, interiorPlaceActor, interiorPlaceStamp, interiorRemoveAt, resizeInterior, setInteriorFromTemplate, updateAnyActor, updateInterior,
} from "@/lib/te-map/custom-world-edit";
import { INTERIOR_FLOORS, INTERIOR_LIMITS, INTERIOR_TEMPLATES, INTERIOR_WALLS } from "@/lib/te-map/interior";
import { INSIDE_STAMP_IDS, STAMPS, type StampDef, type StampId } from "@/lib/te-map/stamps";
import type { Interior } from "@/lib/te-map/types";
import { Swatch } from "./Swatch";

const LABELS: Partial<Record<StampId, string>> = {
  shelfCrates: "Kistenregal", shelfCrates2: "Kistenregal 2", sackOpen: "Sack", drum: "Trommelfass", barrelOpen: "Offenes Fass", barrelClosed: "Fass", urn: "Krug",
  chestSmall: "Kleine Truhe", chestWide: "Große Truhe", bucketEmpty: "Eimer", bucketWater: "Wassereimer", plantPot: "Pflanze", flowerPot: "Blumen", plantGreen: "Topfpflanze",
  plantPink: "Topf mit Blüten", bushPlant: "Große Pflanze", lampFloor: "Stehlampe", lampBlue: "Blaue Lampe", coatRack: "Garderobe", clock: "Standuhr", lantern: "Laterne",
  vase: "Vase", frameSmall: "Bild klein", frameMed: "Bild", frameWide: "Bild breit", herbs: "Kräuter", hangSausage: "Würste", hangCloth: "Stoff", hangTools: "Werkzeug",
  wallShelf: "Wandbrett", wallShelfWide: "Wandbrett breit", candle: "Kerze", candleGold: "Goldkerze", lampTable: "Tischlampe", papers: "Papiere", flowerVase: "Blumenvase",
  flowerPink: "Rosa Blumen", bowl: "Schale", bookRow: "Bücher", tableSquare: "Tisch", tableSmall: "Beistelltisch", kegBox: "Fässchen", mug: "Krug (Tisch)", goblet: "Kelch",
  bottles: "Flaschen", foodPile: "Essen", openBook: "Buch", chairBack: "Stuhl (hinten)", chairRight: "Stuhl →", chairLeft: "Stuhl ←", stoolBlue: "Hocker blau", stoolRed: "Hocker rot",
  stoolGreen: "Hocker grün", bookcase1: "Bücherregal 1", bookcase2: "Bücherregal 2", bookcase3: "Bücherregal 3", bookcase4: "Bücherregal 4", shelfEmpty: "Regal leer",
  glassCase: "Vitrine", wardrobe: "Schrank", vanity: "Frisierkommode", cabinetCloth: "Stoffregal", cabinetPotions: "Trankregal", cabinetJars: "Gläserregal", cabinetMixed: "Regal gemischt",
  counterL: "Tresen links", counterM: "Tresen Mitte", counterR: "Tresen rechts", armorStand: "Rüstungsständer", weaponStand: "Waffenständer", bedBeige: "Bett", bedBlue: "Bett blau",
  bedRed: "Bett rot", bedGreen: "Bett grün", bedDoubleBeige: "Doppelbett", bedDoubleBlue: "Doppelbett blau", bedDoubleRed: "Doppelbett rot", fireplace: "Kamin/Esse", oven: "Ofen",
  anvil: "Amboss", forgeCounter: "Schmiedetisch", smithAnvil: "Kleiner Amboss",
};

type Tool = "select" | "stamp" | "npc" | "merchant" | "chest" | "monster" | "sign" | "erase";
const TOOLS: { key: Tool; label: string; hot: string }[] = [
  { key: "select", label: "Auswählen / Verschieben", hot: "V" }, { key: "stamp", label: "Möbel & Deko", hot: "O" }, { key: "npc", label: "NPC", hot: "N" },
  { key: "merchant", label: "Händler", hot: "H" }, { key: "chest", label: "Truhe", hot: "T" }, { key: "monster", label: "Monster", hot: "M" }, { key: "sign", label: "Schild", hot: "S" }, { key: "erase", label: "Radierer", hot: "E" },
];
const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable);
const ZOOM_MIN = 1;
const ZOOM_MAX = 6;

interface Props {
  doc: CustomWorldDoc;
  bi: number;
  readOnly: boolean;
  onChange: (doc: CustomWorldDoc) => void;
  onBeginEdit: () => void;
  onQuestFocus: (actorId: string) => void;
  onClose: () => void;
}

const field = "mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white text-xs";

export default function InteriorEditor({ doc, bi, readOnly, onChange, onBeginEdit, onQuestFocus, onClose }: Props) {
  const building = doc.buildings[bi];
  const it = building?.interior;
  const [sheets, setSheets] = useState<Sheets | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [stampId, setStampId] = useState<StampId>("tableSquare");
  const [zoom, setZoom] = useState(3);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [npcSets, setNpcSets] = useState<Map<string, TeLayerSets>>(new Map());
  const npcKeys = useRef(new Map<string, string>());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const erasing = useRef(false);
  const monsterImgs = useRef(new Map<string, HTMLImageElement>());
  const [monsterLoads, setMonsterLoads] = useState(0);
  const docRef = useRef(doc);
  useEffect(() => { docRef.current = doc; }, [doc]);
  const drag = useRef<string | null>(null);
  const dragStamp = useRef<{ index: number; dx: number; dy: number } | null>(null);
  const [selectedStamp, setSelectedStamp] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSheets().then((s) => { if (!cancelled) setSheets(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const baked = useMemo(() => (sheets && it ? bakeInterior(sheets, it) : null), [sheets, it]);

  const npcSignature = (it?.actors ?? []).filter((a) => a.config).map((a) => `${a.id}:${JSON.stringify(a.config)}`).join("|");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const a of docRef.current.buildings[bi]?.interior?.actors ?? []) {
        if (!a.config) continue;
        const key = JSON.stringify(a.config);
        if (npcKeys.current.get(a.id) === key) continue;
        npcKeys.current.set(a.id, key);
        const sets = await loadTeLayerSets(a.config);
        if (cancelled) return;
        setNpcSets((m) => new Map(m).set(a.id, sets));
      }
    })();
    return () => { cancelled = true; };
  }, [npcSignature, bi]);

  // Zeichnen
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !sheets || !baked || !it) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baked, 0, 0);
    type Sprite = { base: number; draw: () => void };
    const sprites: Sprite[] = [];
    for (const s of it.stamps) {
      const d = STAMPS[s.id] as StampDef;
      sprites.push({ base: (s.y + d.h) * T, draw: () => drawStamp(ctx, sheets, s.id, s.x * T, s.y * T) });
    }
    for (const a of it.actors) {
      if (a.kind === "chest") sprites.push({ base: (a.y + 1) * T, draw: () => ctx.drawImage(sheets.chests, 16, 16, 16, 16, a.x * T, a.y * T, 16, 16) });
      else if (a.kind === "sign") continue; // das Bild ist ein gewöhnliches Möbelstück
      else if (a.kind === "monster") {
        const sk = spriteKeyOf(a.monster ?? "");
        if (sk) {
          let img = monsterImgs.current.get(sk);
          if (!img) { img = new Image(); img.src = `/oq/mon/${sk}.png`; img.onload = () => setMonsterLoads((t) => t + 1); monsterImgs.current.set(sk, img); }
          const info = spriteInfo(sk);
          const tier = tierOf(getMonster(a.monster ?? ""), a.tier);
          const kk = TIER_META[tier].mapScale;
          const sc = spriteScale(sk, 34 * kk, 0.5, 1.5 * kk);
          const dw = info.w * sc, dh = info.h * sc;
          sprites.push({ base: (a.y + 1) * T, draw: () => {
            drawTierAura(ctx, tier, a.x * T + T / 2, (a.y + 1) * T, 0);
            if (img!.complete && img!.naturalWidth) ctx.drawImage(img!, 0, 0, info.w, info.h, a.x * T + T / 2 - dw / 2, (a.y + 1) * T - dh + 1, dw, dh);
            drawTierIcon(ctx, tier, a.x * T + T / 2, (a.y + 1) * T - dh, 0);
          } });
        } else sprites.push({ base: (a.y + 1) * T, draw: () => { ctx.font = "14px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(getMonster(a.monster ?? "")?.emoji ?? "👾", a.x * T + T / 2, a.y * T + T / 2); } });
      } else {
        const sets = npcSets.get(a.id);
        if (sets) sprites.push({ base: (a.y + 1) * T, draw: () => drawTeFrame(ctx, a.dir === "up" ? sets.back : sets.front, 1, a.dir, a.x * T + T / 2 - 24, a.y * T - 16, 1) });
      }
    }
    sprites.sort((a, b) => a.base - b.base);
    for (const s of sprites) s.draw();

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= it.cols; x++) { ctx.moveTo(x * T + 0.5, 0); ctx.lineTo(x * T + 0.5, it.rows * T); }
    for (let y = 0; y <= it.rows; y++) { ctx.moveTo(0, y * T + 0.5); ctx.lineTo(it.cols * T, y * T + 0.5); }
    ctx.stroke();
    // Eingang (Startpunkt vor der Tür)
    ctx.fillStyle = "rgba(52, 211, 153, 0.35)";
    ctx.fillRect(it.exitX * T, (it.rows - 2) * T, T, T);

    // Merker: Objekte mit Text
    for (const s of it.stamps) {
      if (!s.say) continue;
      const d = STAMPS[s.id] as StampDef;
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath(); ctx.arc(s.x * T + d.w * T - 4, s.y * T + 4, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#3b2a00"; ctx.font = "bold 7px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("…", s.x * T + d.w * T - 4, s.y * T + 3);
    }

    const selSt = selectedStamp !== null ? it.stamps[selectedStamp] : undefined;
    if (selSt) { const d = STAMPS[selSt.id] as StampDef; ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.5; ctx.strokeRect(selSt.x * T + 0.5, selSt.y * T + 0.5, d.w * T - 1, d.h * T - 1); }
    const sel = it.actors.find((a) => a.id === selected);
    if (sel) { ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.5; ctx.strokeRect(sel.x * T + 0.5, sel.y * T + 0.5, T - 1, T - 1); }
    if (hover && !readOnly) {
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1;
      const d = tool === "stamp" ? (STAMPS[stampId] as StampDef) : null;
      ctx.strokeRect(hover.x * T + 0.5, hover.y * T + 0.5, (d?.w ?? 1) * T - 1, (d?.h ?? 1) * T - 1);
    }
  }, [sheets, baked, it, npcSets, monsterLoads, hover, selected, selectedStamp, tool, stampId, readOnly]);

  const hasInterior = !!it;
  // Strg + Mausrad zoomt (wie im Karten-Editor)
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
      setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + (e.deltaY < 0 ? 1 : -1))));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [hasInterior]);

  // Tastenkürzel wie im Karten-Editor: Werkzeuge, Esc, Entf, Pfeile schieben die Auswahl
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (readOnly || isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const cur = docRef.current;
      const curIt = cur.buildings[bi]?.interior;
      if (!curIt) return;
      const act = selected ? curIt.actors.find((a) => a.id === selected) : undefined;
      const st = selectedStamp !== null ? curIt.stamps[selectedStamp] : undefined;
      if (e.key === "Escape") { setTool("select"); setSelected(null); setSelectedStamp(null); return; }
      if (e.key === "Delete" || e.key === "Backspace") {
        const at = act ?? st;
        if (!at) return;
        e.preventDefault();
        onBeginEdit(); docRef.current = interiorRemoveAt(cur, bi, at.x, at.y); onChange(docRef.current); setSelected(null); setSelectedStamp(null);
        return;
      }
      const arrow = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, [number, number]>)[e.key];
      if (arrow && (act || st)) {
        e.preventDefault();
        const n = act ? interiorMoveActor(cur, bi, act.id, act.x + arrow[0], act.y + arrow[1]) : interiorMoveStamp(cur, bi, selectedStamp!, st!.x + arrow[0], st!.y + arrow[1]);
        if (n !== cur) { onBeginEdit(); docRef.current = n; onChange(n); }
        return;
      }
      const t = TOOLS.find((b) => b.hot.toLowerCase() === e.key.toLowerCase());
      if (t) setTool(t.key);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [readOnly, selected, selectedStamp, bi, onBeginEdit, onChange]);

  if (!building || !it) return null;

  const commit = (next: CustomWorldDoc) => { docRef.current = next; onChange(next); };
  const tileAt = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: Math.floor(((e.clientX - r.left) / r.width) * it.cols), y: Math.floor(((e.clientY - r.top) / r.height) * it.rows) };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (readOnly) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = tileAt(e);
    const cur = docRef.current;
    const curIt = cur.buildings[bi]?.interior;
    if (!curIt) return;
    if (tool === "select") {
      const a = curIt.actors.find((o) => o.x === x && o.y === y);
      setSelected(a?.id ?? null);
      if (a) { drag.current = a.id; setSelectedStamp(null); onBeginEdit(); return; }
      // Kein NPC: Möbel aufheben (ziehen verschiebt, Griff bleibt an der angefassten Kachel)
      const si = interiorStampAt(curIt, x, y);
      setSelectedStamp(si >= 0 ? si : null);
      if (si >= 0) { dragStamp.current = { index: si, dx: x - curIt.stamps[si].x, dy: y - curIt.stamps[si].y }; onBeginEdit(); }
      return;
    }
    onBeginEdit();
    if (tool === "stamp") commit(interiorPlaceStamp(cur, bi, stampId, x, y));
    else if (tool === "erase") { erasing.current = true; commit(interiorRemoveAt(cur, bi, x, y)); }
    else {
      const r = interiorPlaceActor(cur, bi, tool, x, y);
      if (r.doc !== cur) { commit(r.doc); if (r.id) { setSelected(r.id); setTool("select"); } }
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const t = tileAt(e);
    if (!hover || hover.x !== t.x || hover.y !== t.y) setHover(t);
    if (dragStamp.current) { const g = dragStamp.current; const n = interiorMoveStamp(docRef.current, bi, g.index, t.x - g.dx, t.y - g.dy); if (n !== docRef.current) commit(n); }
    if (erasing.current) { const n = interiorRemoveAt(docRef.current, bi, t.x, t.y); if (n !== docRef.current) commit(n); }
    if (drag.current) { const n = interiorMoveActor(docRef.current, bi, drag.current, t.x, t.y); if (n !== docRef.current) commit(n); }
  };
  const endDrag = () => { drag.current = null; dragStamp.current = null; erasing.current = false; };

  const sel = it.actors.find((a) => a.id === selected);
  const selStamp = selectedStamp !== null ? it.stamps[selectedStamp] : undefined;
  const setIt = (fn: (i: Interior) => Interior) => { onBeginEdit(); commit(updateInterior(docRef.current, bi, fn)); };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-white/15 text-gray-200 text-xs font-semibold px-3 py-1.5 hover:border-white/30">← Zurück zur Karte</button>
        <p className="text-sm font-bold text-white">Innenraum: {building.name || "Gebäude"}</p>
        <span className="text-[11px] text-gray-500">Eingang = grünes Feld vor der Tür unten</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="space-y-3">
          {!readOnly && (
            <div className="moba-panel rounded-2xl p-3 space-y-2">
              <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Werkzeuge</p>
              <div className="grid grid-cols-2 gap-1.5">
                {TOOLS.map((t) => (
                  <button key={t.key} type="button" onClick={() => setTool(t.key)} className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold text-left ${tool === t.key ? "border-amber-400 bg-amber-400/10 text-amber-200" : "border-white/10 text-gray-300 hover:border-white/30"}`}>{t.label} <kbd className="ml-1 text-[9px] text-gray-500">{t.hot}</kbd></button>
                ))}
              </div>
              {tool === "stamp" && (
                <div className="grid grid-cols-5 gap-1 max-h-72 overflow-y-auto pt-1">
                  {INSIDE_STAMP_IDS.map((id) => {
                    const d = STAMPS[id] as StampDef;
                    return <Swatch key={id} sheets={sheets} w={d.w * T} h={d.h * T} selected={stampId === id} title={LABELS[id] ?? id} draw={(ctx, s) => drawStamp(ctx, s, id, 0, 0)} onClick={() => setStampId(id)} />;
                  })}
                </div>
              )}
              {(tool === "npc" || tool === "merchant" || tool === "chest" || tool === "monster" || tool === "sign") && <p className="text-[11px] text-gray-500">Klick setzt {tool === "npc" ? "einen NPC" : tool === "merchant" ? "einen Händler" : tool === "monster" ? "ein Monster (Art im Auswahl-Fenster ändern)" : tool === "sign" ? "ein Schild mit Text" : "eine Truhe"}. Dialoge unter „Quest & Dialoge“.</p>}
              {tool === "select" && <p className="text-[11px] text-gray-500">Klick wählt NPCs, Händler, Truhen und Möbel aus; sie lassen sich ziehen, Pfeiltasten schieben sie, Entf löscht. Esc hebt die Auswahl auf.</p>}
            </div>
          )}

          {!readOnly && (
            <div className="moba-panel rounded-2xl p-3 space-y-2 text-[11px] text-gray-400">
              <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Raum</p>
              <div className="grid grid-cols-2 gap-2">
                <label>Breite<input type="number" min={INTERIOR_LIMITS.minCols} max={INTERIOR_LIMITS.maxCols} defaultValue={it.cols} key={`c${it.cols}`} onBlur={(e) => { const v = Number(e.target.value); if (v !== it.cols) { onBeginEdit(); commit(resizeInterior(docRef.current, bi, v, it.rows)); } }} className={field} /></label>
                <label>Höhe<input type="number" min={INTERIOR_LIMITS.minRows} max={INTERIOR_LIMITS.maxRows} defaultValue={it.rows} key={`r${it.rows}`} onBlur={(e) => { const v = Number(e.target.value); if (v !== it.rows) { onBeginEdit(); commit(resizeInterior(docRef.current, bi, it.cols, v)); } }} className={field} /></label>
              </div>
              <label className="block">Boden
                <select value={it.floor} onChange={(e) => setIt((i) => ({ ...i, floor: Number(e.target.value) }))} className={field}>{INTERIOR_FLOORS.map((f, i) => <option key={i} value={i}>{f.label}</option>)}</select>
              </label>
              <label className="block">Wand
                <select value={it.wall} onChange={(e) => setIt((i) => ({ ...i, wall: Number(e.target.value) }))} className={field}>{INTERIOR_WALLS.map((w, i) => <option key={i} value={i}>{w.label}</option>)}</select>
              </label>
              <label className="block">Position der Tür ({it.exitX + 1}. Feld von links)
                <input type="range" min={1} max={it.cols - 2} value={it.exitX} onChange={(e) => { const x = Number(e.target.value); setIt((i) => ({ ...i, exitX: x, actors: i.actors.filter((a) => !(a.x === x && a.y === i.rows - 2)) })); }} className="w-full" />
              </label>
              <label className="block">Vorlage neu laden (ersetzt alles)
                <select value="" onChange={(e) => { if (e.target.value && window.confirm("Den Innenraum durch die Vorlage ersetzen? Alle Möbel und Personen darin gehen verloren.")) { onBeginEdit(); commit(setInteriorFromTemplate(docRef.current, bi, e.target.value)); setSelected(null); } }} className={field}>
                  <option value="">Wählen …</option>{INTERIOR_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </label>
            </div>
          )}

          {selStamp && !sel && (
            <div className="moba-panel rounded-2xl p-3 space-y-2 text-[11px] text-gray-400">
              <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Objekt</p>
              <p className="text-xs text-white">{LABELS[selStamp.id] ?? selStamp.id}</p>
              <label className="block">Text beim Ansprechen
                <textarea
                  value={selStamp.say ?? ""} rows={3} maxLength={LIMITS.lineLen} disabled={readOnly} placeholder="z. B. „Ein altes Fass. Es riecht nach Met.“"
                  onFocus={onBeginEdit} onChange={(e) => commit(interiorSetStampSay(docRef.current, bi, selectedStamp!, e.target.value))}
                  className={`${field} resize-y`}
                />
                <span className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                  <span>{selStamp.say ? "Spieler können das Objekt ansprechen." : "Leer = nur Deko, nicht ansprechbar."}</span>
                  <span>{(selStamp.say ?? "").length}/{LIMITS.lineLen}</span>
                </span>
              </label>
            </div>
          )}

          {sel && (
            <div className="moba-panel rounded-2xl p-3 space-y-2">
              <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">{sel.kind === "npc" ? "NPC" : sel.kind === "merchant" ? "Händler" : sel.kind === "monster" ? "Monster" : sel.kind === "sign" ? "Schild" : "Truhe"}</p>
              <label className="block text-[11px] text-gray-400">Name
                <input value={sel.name} maxLength={LIMITS.nameLen} disabled={readOnly} onFocus={onBeginEdit} onChange={(e) => commit(updateAnyActor(docRef.current, sel.id, { name: e.target.value }))} className={field} />
              </label>
              {sel.kind === "monster" && (
                <>
                <label className="block text-[11px] text-gray-400">Art
                  <select value={sel.monster ?? "ratte"} disabled={readOnly} onFocus={onBeginEdit} onChange={(e) => { const m = getMonster(e.target.value); if (m) commit(updateAnyActor(docRef.current, sel.id, { monster: m.id, name: m.name, talk: [{ step: "*", lines: [m.blurb] }] })); }} className={field}>
                    {MONSTERS.filter((m) => !m.raid).map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.name} (Stufe {m.level})</option>)}
                  </select>
                </label>
                <label className="block text-[11px] text-gray-400">Stufe
                <select value={sel.tier ?? "normal"} disabled={readOnly} onFocus={onBeginEdit} onChange={(e) => { const v = e.target.value; commit(updateAnyActor(docRef.current, sel.id, { tier: v === "normal" ? undefined : (v as "elite" | "boss") })); }} className={field}>
                  <option value="normal">Normal</option>
                  <option value="elite" disabled={tierCounts(doc).elite >= LIMITS.maxElites && sel.tier !== "elite"}>👑 Elite ({tierCounts(doc).elite}/{LIMITS.maxElites})</option>
                  <option value="boss" disabled={tierCounts(doc).boss >= LIMITS.maxBosses && sel.tier !== "boss"}>💀 Boss ({tierCounts(doc).boss}/{LIMITS.maxBosses})</option>
                </select>
                <span className="block text-[10px] text-gray-500 mt-0.5">Elite: 1,5× Lebenspunkte, doppelte Belohnung, 1 Std. Wiederkehr. Boss: 2,5× Lebenspunkte, +1 Angriff, vierfache Belohnung, 3 Std. Nur normale Monster lassen sich zähmen. Der erste Sieg über eine Stufe bringt einen Ehrentitel.</span>
              </label>
                </>
              )}
              {(sel.kind === "npc" || sel.kind === "merchant") && (
                <label className="block text-[11px] text-gray-400">Blickrichtung
                  <select value={sel.dir} disabled={readOnly} onChange={(e) => { onBeginEdit(); commit(updateAnyActor(docRef.current, sel.id, { dir: e.target.value as typeof sel.dir })); }} className={field}>
                    <option value="down">Nach unten</option><option value="up">Nach oben</option><option value="left">Nach links</option><option value="right">Nach rechts</option>
                  </select>
                </label>
              )}
              {sel.kind === "merchant" && (
                <div className="text-[11px] text-gray-400 space-y-1">
                  <p>Angebot (bis zu {LIMITS.maxShop})</p>
                  <div className="max-h-36 overflow-y-auto">
                    {ITEMS.map((item) => {
                      const on = (sel.shop ?? []).includes(item.key);
                      return (
                        <label key={item.key} className="flex items-center gap-1.5">
                          <input type="checkbox" checked={on} disabled={readOnly || (!on && (sel.shop ?? []).length >= LIMITS.maxShop)} onChange={() => { onBeginEdit(); commit(updateAnyActor(docRef.current, sel.id, { shop: on ? (sel.shop ?? []).filter((k) => k !== item.key) : [...(sel.shop ?? []), item.key] })); }} />
                          {item.emoji} {item.name} <span className="text-gray-500">({item.price})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              {(sel.kind === "npc" || sel.kind === "merchant") && sel.config && !readOnly && (
                <TeCharacterEditor compact value={sel.config} onChange={(cfg) => commit(updateAnyActor(docRef.current, sel.id, { config: cfg }))} />
              )}
              {sel.kind !== "monster" && <button type="button" onClick={() => onQuestFocus(sel.id)} className="w-full rounded-lg border border-violet-400/40 text-violet-300 text-[11px] font-semibold py-1.5 hover:bg-violet-500/10">{sel.kind === "sign" || sel.kind === "chest" ? "Text & Inhalt bearbeiten" : "Dialoge bearbeiten"}</button>}
              {!readOnly && <button type="button" onClick={() => { onBeginEdit(); commit(interiorRemoveAt(docRef.current, bi, sel.x, sel.y)); setSelected(null); }} className="w-full rounded-lg border border-red-400/30 text-red-300 text-[11px] font-semibold py-1.5 hover:bg-red-500/10">Entfernen (Entf)</button>}
            </div>
          )}
        </div>

        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-3 text-[11px] text-gray-400">
            <label className="flex items-center gap-1.5">Zoom
              <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="rounded bg-zinc-900 border border-white/10 px-1.5 py-0.5 text-white">{[1, 2, 3, 4, 5, 6].map((z) => <option key={z} value={z}>{z}×</option>)}</select>
            </label>
            <span className="text-gray-500">Strg + Mausrad zoomt</span>
            {hover && <span className="ml-auto">Kachel {hover.x}, {hover.y}</span>}
          </div>
          <div ref={scrollRef} className="rounded-2xl border border-white/10 bg-[#120c08] overflow-auto max-h-[72vh]">
            <canvas
              ref={canvasRef} width={it.cols * T} height={it.rows * T}
              onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onPointerLeave={() => { setHover(null); endDrag(); }}
              style={{ imageRendering: "pixelated", width: it.cols * T * zoom, height: it.rows * T * zoom, touchAction: "none", cursor: readOnly ? "default" : "crosshair", display: "block" }}
              role="img" aria-label="Innenraum-Editor"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
