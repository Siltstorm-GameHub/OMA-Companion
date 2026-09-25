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

// Zuschnitt: alle Figuren (inkl. Waffen) liegen in x 32..95, y 30..83 der 128er-Frames.
const CROP = { x: 32, y: 24, size: 64 };
const SRC_FRAME = 128;
const ANIMS = { idle: "Idl", move: "Mov" } as const;

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
    frames: { idle: number; move: number };
    frameSize: number;
    base: { id: string; sheets: string[] };
    categories: {
      id: string; label: string; optional: boolean;
      z: CategoryDef["z"]; items: { id: string; label: string; parts: string[] }[];
    }[];
  } = { frames: { idle: 4, move: 6 }, frameSize: CROP.size, base: { id: "base", sheets: [] }, categories: [] };

  // Base (Männlich): Unterlage unter allen Ebenen
  for (const [anim, code] of Object.entries(ANIMS)) {
    const sheet = await readSheet(path.join(SRC, "Base", `M_${code}_Base.png`));
    if (sheet && (await cropSheet(sheet, path.join(OUT_DIR, "base", `m-${anim}.png`)))) {
      catalog.base.sheets.push(anim);
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

    const outItems: { id: string; label: string; parts: string[] }[] = [];
    for (const [id, parts] of [...items].sort(([a], [b]) => a.localeCompare(b))) {
      const okParts: string[] = [];
      for (const [partKey, anims] of parts) {
        if (!anims.has("idle") || !anims.has("move")) continue;
        let ok = true;
        const written: string[] = [];
        for (const anim of ["idle", "move"]) {
          const sheet = await readSheet(anims.get(anim)!);
          const outFile = path.join(OUT_DIR, cat.id, id, `${partKey}-${anim}.png`);
          if (!sheet || !(await cropSheet(sheet, outFile))) { ok = false; break; }
          written.push(outFile);
        }
        if (ok) { okParts.push(partKey); files += 2; }
        else for (const f of written) fs.rmSync(f, { force: true });
      }
      if (okParts.length) outItems.push({ id, label: pretty(id, cat.folder), parts: okParts.sort() });
    }
    catalog.categories.push({ id: cat.id, label: cat.label, optional: cat.optional, z: cat.z, items: outItems });
    console.log(`${cat.label.padEnd(14)} ${outItems.length} Teile`);
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
