// ============================================
// Pixel-Charakter: Asset-Pipeline (Admurin's Character Creator Paperdolls)
// ============================================
// Liest die Original-Spritesheets (128×128 pro Frame, 4 Blickrichtungen) und
// schreibt zugeschnittene Sheets (64×64 pro Frame) nach public/pixel-character/
// sowie den Katalog nach src/lib/pixel-character/catalog.json.
//
// Aufruf:  npx tsx scripts/build-pixel-character-assets.ts [Paperdolls-Ordner]
// Default: der Ordner im Gaming-Community-Laufwerk (siehe DEFAULT_SRC).

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DEFAULT_SRC =
  "C:/Users/sebas/OneDrive/Gaming/Gaming Community/Old Masters Ally/Battle Cards/Pixel Character/Manual Install/Paperdolls";
const SRC = process.argv[2] ?? DEFAULT_SRC;
const OUT_DIR = path.join(process.cwd(), "public", "pixel-character");
const CATALOG_PATH = path.join(process.cwd(), "src", "lib", "pixel-character", "catalog.json");

// Zuschnitt: alle Figuren (inkl. Waffen, Kampfanimationen) liegen in x 32..95, y 30..90 der 128er-Frames.
const CROP = { x: 32, y: 27, size: 64 };
const SRC_FRAME = 128;
const ANIMS = { idle: "Idl", move: "Mov", melee: "Mel", magic: "Mag", ranged: "Ran", block: "Blo" } as const;
type AnimName = keyof typeof ANIMS;
/** Ohne diese beiden Animationen wird ein Teil gar nicht erst angeboten; alle übrigen sind optional
 *  (z.B. hat ein Stab nur Magie, ein Bogen nur Fernkampf). */
const REQUIRED: AnimName[] = ["idle", "move"];

/** Kategorien in der Reihenfolge des Editors. `z` je Teil: m = einteilig, b = hinter dem Körper, f = davor.
 *  Reihenfolge laut "Read Me.txt" des Pakets (Base = 0). */
interface CategoryDef {
  id: string;
  label: string;
  folder: string;
  /** true = Auswahl darf leer bleiben */
  optional: boolean;
  z: { m?: number; b?: number; f?: number };
}
const CATEGORIES: CategoryDef[] = [
  { id: "body",   label: "Körper",      folder: "Body",       optional: false, z: { m: 1 } },
  { id: "hair",   label: "Haare",       folder: "Hair",       optional: true,  z: { m: 3 } },
  { id: "beard",  label: "Bart",        folder: "Beard",      optional: true,  z: { m: 5 } },
  { id: "head",   label: "Kopfbedeckung", folder: "Head",     optional: true,  z: { m: 6 } },
  { id: "top",    label: "Oberteil",    folder: "Top",        optional: true,  z: { m: 2 } },
  { id: "chest",  label: "Brustpanzer", folder: "Chest",      optional: true,  z: { m: 3 } },
  { id: "overall", label: "Robe",       folder: "Overall",    optional: true,  z: { m: 4 } },
  { id: "pants",  label: "Hose",        folder: "Pants",      optional: true,  z: { m: 2 } },
  { id: "skirt",  label: "Rock",        folder: "Skirt",      optional: true,  z: { m: 3 } },
  { id: "feet",   label: "Schuhe",      folder: "Feet",       optional: true,  z: { m: 2 } },
  { id: "hands",  label: "Handschuhe",  folder: "Hands",      optional: true,  z: { m: 2 } },
  { id: "cape",   label: "Umhang",      folder: "Cape",       optional: true,  z: { b: -1, f: 8 } },
  { id: "weapon", label: "Waffe",       folder: "One Handed", optional: true,  z: { b: -4, f: 10 } },
  { id: "offhand", label: "Schild",     folder: "Offhand",    optional: true,  z: { b: -2, f: 9 } },
  { id: "bow",    label: "Bogen",       folder: "Bow",        optional: true,  z: { b: -6, f: 12 } },
  { id: "staff",  label: "Stab",        folder: "Staff",      optional: true,  z: { b: -9, f: 14 } },
  { id: "artifact", label: "Orb",        folder: "Artifact",   optional: true,  z: { b: -8, f: 15 } },
  { id: "quiver", label: "Köcher",      folder: "Quiver",     optional: true,  z: { b: -7, f: 13 } },
];

/** Feste Effekt-Ebenen, die zu einer Animation automatisch mitlaufen (nicht wählbar). */
const EFFECTS = [
  { id: "sword_1", folder: "FX", base: "FX_Sword_1", anim: "melee" as AnimName, z: { b: -3, f: 16 } },
];

interface Sheet { data: Buffer; w: number; h: number }

async function readSheet(file: string): Promise<Sheet | null> {
  if (!fs.existsSync(file)) return null;
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

/** Schneidet jeden 128er-Frame auf 64×64 zu und setzt die Frames wieder zusammen.
 *  Liefert null, wenn das Sheet komplett transparent ist. */
async function cropSheet(sheet: Sheet, outFile: string): Promise<boolean> {
  const cols = Math.floor(sheet.w / SRC_FRAME);
  const rows = 4;
  const outW = cols * CROP.size;
  const outH = rows * CROP.size;
  const out = Buffer.alloc(outW * outH * 4);
  let opaque = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      for (let y = 0; y < CROP.size; y++) {
        const srcOff = ((r * SRC_FRAME + CROP.y + y) * sheet.w + c * SRC_FRAME + CROP.x) * 4;
        const dstOff = ((r * CROP.size + y) * outW + c * CROP.size) * 4;
        sheet.data.copy(out, dstOff, srcOff, srcOff + CROP.size * 4);
        for (let x = 0; x < CROP.size; x++) if (out[dstOff + x * 4 + 3] > 0) opaque++;
      }
    }
  }
  if (opaque === 0) return false;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  await sharp(out, { raw: { width: outW, height: outH, channels: 4 } })
    .png({ palette: true, effort: 8 })
    .toFile(outFile);
  return true;
}

/** "Idl_Hair_Brown_1" → { part, rest } bzw. "B_Idl_Cape_Red" / "M_Idl_Body_Ape" */
function parseName(base: string, animCode: string): { prefix: string | null; rest: string } | null {
  const m = base.match(new RegExp(`^(?:([MFBL])_)?${animCode}_(.+)$`));
  return m ? { prefix: m[1] ?? null, rest: m[2] } : null;
}

function pretty(rest: string, folder: string): string {
  return rest
    .replace(/^(Body|Top|Chest|Overall|Bottom_Pants|Bottom_Skirt|Bottom|Head|Hair|Beard|Feet|Hands|1H|Offhand|Staff|Bow|Cape)_/, "")
    .replace(/_/g, " ")
    .trim() || folder;
}

async function main() {
  if (!fs.existsSync(SRC)) throw new Error(`Quellordner nicht gefunden: ${SRC}`);
  fs.rmSync(OUT_DIR, { recursive: true, force: true });

  const catalog: {
    frames: Record<string, number>;
    frameSize: number;
    base: { id: string; anims: string[] };
    effects: { id: string; anim: string; z: { b: number; f: number } }[];
    categories: {
      id: string; label: string; optional: boolean;
      z: CategoryDef["z"]; items: { id: string; label: string; parts: string[]; anims: string[] }[];
    }[];
  } = { frames: {}, frameSize: CROP.size, base: { id: "base", anims: [] }, effects: [], categories: [] };

  // Base (Männlich): Unterlage unter allen Ebenen
  for (const [anim, code] of Object.entries(ANIMS)) {
    const sheet = await readSheet(path.join(SRC, "Base", `M_${code}_Base.png`));
    if (sheet && (await cropSheet(sheet, path.join(OUT_DIR, "base", `m-${anim}.png`)))) {
      catalog.base.anims.push(anim);
      catalog.frames[anim] = Math.floor(sheet.w / SRC_FRAME);
    }
  }

  let files = 0;
  for (const cat of CATEGORIES) {
    const dir = path.join(SRC, cat.folder);
    if (!fs.existsSync(dir)) { console.warn(`[skip] ${cat.folder} fehlt`); continue; }
    // itemId → part(m|b|f) → anim → Datei
    const items = new Map<string, Map<string, Map<string, string>>>();
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".png")) continue;
      const base = file.slice(0, -4);
      for (const [anim, code] of Object.entries(ANIMS)) {
        const parsed = parseName(base, code);
        if (!parsed) continue;
        // Kategorien mit b/f-Paar: B_ = Rückseite (hinter dem Körper), F_ = Vorderseite; sonst einteilig.
        const partKey = cat.z.b !== undefined ? (parsed.prefix === "B" ? "b" : "f") : "m";
        const id = parsed.rest.replace(/[^A-Za-z0-9_]/g, "");
        if (!items.has(id)) items.set(id, new Map());
        const parts = items.get(id)!;
        if (!parts.has(partKey)) parts.set(partKey, new Map());
        parts.get(partKey)!.set(anim, path.join(dir, file));
      }
    }

    const outItems: { id: string; label: string; parts: string[]; anims: string[] }[] = [];
    for (const [id, parts] of [...items].sort(([a], [b]) => a.localeCompare(b))) {
      // part → Animationen, für die ein nicht-leeres Sheet geschrieben wurde
      const written = new Map<string, string[]>();
      for (const [partKey, anims] of parts) {
        if (!REQUIRED.every((a) => anims.has(a))) continue;
        const ok: string[] = [];
        for (const [anim, file] of anims) {
          const sheet = await readSheet(file);
          if (sheet && (await cropSheet(sheet, path.join(OUT_DIR, cat.id, id, `${partKey}-${anim}.png`)))) {
            ok.push(anim); files++;
          }
        }
        if (REQUIRED.every((a) => ok.includes(a))) written.set(partKey, ok);
        else for (const anim of ok) fs.rmSync(path.join(OUT_DIR, cat.id, id, `${partKey}-${anim}.png`), { force: true });
      }
      if (!written.size) continue;
      // Animation gilt für das Teil, wenn ALLE seine Teile (z.B. Rück- und Vorderseite) sie haben.
      const anims = (Object.keys(ANIMS) as AnimName[]).filter((a) => [...written.values()].every((list) => list.includes(a)));
      outItems.push({ id, label: pretty(id, cat.folder), parts: [...written.keys()].sort(), anims });
    }
    catalog.categories.push({ id: cat.id, label: cat.label, optional: cat.optional, z: cat.z, items: outItems });
    console.log(`${cat.label.padEnd(14)} ${outItems.length} Teile`);
  }

  for (const fx of EFFECTS) {
    let ok = true;
    for (const [partKey, prefix] of [["b", "B"], ["f", "F"]] as const) {
      const sheet = await readSheet(path.join(SRC, fx.folder, `${prefix}_${ANIMS[fx.anim]}_${fx.base}.png`));
      if (!sheet || !(await cropSheet(sheet, path.join(OUT_DIR, "fx", fx.id, `${partKey}-${fx.anim}.png`)))) ok = false;
      else files++;
    }
    if (ok) catalog.effects.push({ id: fx.id, anim: fx.anim, z: fx.z });
  }

  fs.mkdirSync(path.dirname(CATALOG_PATH), { recursive: true });
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog));
  const bytes = (function size(d: string): number {
    return fs.readdirSync(d, { withFileTypes: true }).reduce(
      (s, e) => s + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
  })(OUT_DIR);
  console.log(`\n${files} Sheets, ${(bytes / 1024 / 1024).toFixed(1)} MB → ${OUT_DIR}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
