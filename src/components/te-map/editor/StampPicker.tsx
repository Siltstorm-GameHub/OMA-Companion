"use client";

import { useMemo, useState } from "react";
import { drawStamp, T, type Sheets } from "@/components/te-map/TeWorld";
import { STAMPS, type StampDef, type StampId } from "@/lib/te-map/stamps";
import { STAMP_LABELS } from "@/lib/te-map/stamp-labels";
import { PACK_CATEGORIES } from "@/lib/te-map/stamps-packs";
import { Swatch } from "./Swatch";

export { STAMP_LABELS };


const CATEGORIES: { key: string; label: string; ids: StampId[] }[] = [
  { key: "pflanzen", label: "Pflanzen", ids: ["tree", "darkTree", "hedge4", "hedgeFlowers", "fruitBush", "flowerBed", "flowerTub", "flowerTubYellow", "planter", "reeds", "reedsTuft", "lily", "lilyPink", "stump", "mushrooms"] },
  { key: "dorf", label: "Dorf", ids: ["fountain", "benchWide", "lamp", "armPostL", "armPostR", "noticeBoard", "planks", "fenceH", "crate", "crateBlue", "barrel", "waterBarrel", "jar", "jarGrey", "hay", "scarecrow", "log"] },
  { key: "ruinen", label: "Ruinen", ids: ["ruinWall", "ruinWall2", "ruinPillar", "pillar", "brokenPillar", "stoneBlocks", "obelisk", "grave", "graveCross", "bonesPile", "skull", "bones", "skullPile"] },
  { key: "fels", label: "Fels", ids: ["rocks", "rockBig", "rockGrey", "rockSmall", "stalagmite"] },
  ...PACK_CATEGORIES,
  { key: "licht", label: "Licht", ids: ["campfire", "campfireSmall", "torchStand", "wallTorch", "hearthFire", "stoveFire"] },
];

/** Objekt-Auswahl mit Kategorien und Suche. */
export default function StampPicker({ ids, sheets, value, onPick }: { ids: StampId[]; sheets: Sheets | null; value: StampId | null; onPick: (id: StampId) => void }) {
  const [cat, setCat] = useState("alle");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const allowed = new Set(ids);
    const categorized = new Set(CATEGORIES.flatMap((c) => c.ids));
    const extra = ids.filter((id) => !categorized.has(id));
    let base: StampId[];
    if (cat === "alle") base = [...CATEGORIES.flatMap((c) => c.ids).filter((id) => allowed.has(id)), ...extra];
    else if (cat === "sonst") base = extra;
    else base = (CATEGORIES.find((c) => c.key === cat)?.ids ?? []).filter((id) => allowed.has(id));
    const needle = q.trim().toLowerCase();
    return needle ? base.filter((id) => (STAMP_LABELS[id] ?? id).toLowerCase().includes(needle) || id.toLowerCase().includes(needle)) : base;
  }, [ids, cat, q]);
  const hasExtra = ids.some((id) => !CATEGORIES.some((c) => c.ids.includes(id)));

  return (
    <div className="space-y-1.5">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Objekt suchen …" className="w-full rounded bg-zinc-900 border border-white/10 px-2 py-1 text-[11px] text-white" />
      <div className="flex flex-wrap gap-1">
        {[{ key: "alle", label: "Alle" }, ...CATEGORIES, ...(hasExtra ? [{ key: "sonst", label: "Sonstiges" }] : [])].map((c) => (
          <button key={c.key} type="button" onClick={() => setCat(c.key)} className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cat === c.key ? "border-amber-400 text-amber-200 bg-amber-400/10" : "border-white/10 text-gray-400 hover:border-white/30"}`}>{c.label}</button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1 max-h-64 overflow-y-auto pr-0.5">
        {list.map((id) => {
          const d = STAMPS[id] as StampDef;
          return (
            <Swatch key={id} sheets={sheets} w={d.w * T} h={d.h * T} box={52} selected={value === id} title={STAMP_LABELS[id] ?? id}
              draw={(ctx, s) => drawStamp(ctx, s, id, 0, 0)} onClick={() => onPick(id)} />
          );
        })}
        {list.length === 0 && <p className="col-span-4 text-[11px] text-gray-500 py-2">Nichts gefunden.</p>}
      </div>
      {value && <p className="text-[11px] text-gray-400">Gewählt: <span className="text-amber-200">{STAMP_LABELS[value] ?? value}</span></p>}
    </div>
  );
}
