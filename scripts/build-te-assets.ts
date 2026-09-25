// ============================================
// Time Elements (finalbossblues): Asset-Pipeline für Figuren + Kacheln
// ============================================
// Figuren: die Teile-Sheets (23 Bilder à 48×48, 4 Blickrichtungen) aus "Character Core Set" und
// "Character NPC Extension" werden palettiert nach public/te/char/<kategorie>/ kopiert; dazu
// Hautton-Varianten (Dateiendung .t1–.t5) für alle Teile, die Hautfarbe enthalten. Der Katalog
// landet in src/lib/te-character/catalog.json.
// Kacheln: die 1X-Tilesets (16 px) nach public/te/tiles/.
//
// Aufruf:  npx tsx scripts/build-te-assets.ts [Battle-Cards-Ordner]

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.argv[2] ?? "C:/Users/sebas/OneDrive/Gaming/Gaming Community/Old Masters Ally/Battle Cards";
const CHAR_PACKS = [
  path.join(ROOT, "Pixel Character", "Character Core Set", "assets"),
  path.join(ROOT, "Pixel Character", "Character NPC Extension", "assets"),
];
const TILE_SRC = path.join(ROOT, "Assets", "TimeElements", "RPGMAKER", "1X");
const OUT = path.join(process.cwd(), "public", "te");
const CATALOG_PATH = path.join(process.cwd(), "src", "lib", "te-character", "catalog.json");

/** z: Zeichenreihenfolge von hinten nach vorn. base = immer gezeichneter Körper (Datei *0.png). */
const CATEGORIES = [
  { id: "backextra", label: "Rücken", z: 1, optional: true },
  { id: "backhair", label: "Haar hinten", z: 2, optional: true },
  { id: "bottom", label: "Hose", z: 4, optional: true, base: "bottom0" },
  { id: "top", label: "Oberteil", z: 6, optional: true, base: "top0" },
  { id: "head", label: "Gesicht", z: 7, optional: false },
  { id: "hair", label: "Haar", z: 8, optional: true },
  { id: "hat", label: "Hut", z: 9, optional: true },
  { id: "frontextra", label: "Extras", z: 10, optional: true },
  { id: "weapon", label: "Waffe", z: 11, optional: true },
] as const;
const BASE_Z = { bottom: 3, top: 5 } as const;

// Hautfarben des Pakets (hell, mittel, dunkel) → Ziel-Töne. Ton 0 = Original.
const SKIN_SRC = ["f4d29c", "dba463", "bb7547"];
const SKIN_TONES: string[][] = [
  SKIN_SRC,
  ["fce4c8", "f0c39a", "d29a72"],
  ["e2a877", "c98552", "a2603a"],
  ["b57a4f", "96603a", "6e4126"],
  ["8a5a3c", "6e4229", "4d2c1a"],
  ["5c3a26", "46291a", "31190f"],
];

const hex = (s: string) => [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];

async function writePng(raw: Buffer, w: number, h: number, file: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png({ palette: true, effort: 8 }).toFile(file);
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  let files = 0;
  const catalog: {
    frameSize: number; frames: number; skinTones: string[];
    base: { shadow: string; bottom: string; top: string };
    categories: { id: string; label: string; z: number; optional: boolean; items: { id: string; label: string; variants: string[]; skin: boolean }[] }[];
  } = { frameSize: 48, frames: 23, skinTones: SKIN_TONES.map((t) => "#" + t[0]), base: { shadow: "shadow", bottom: "bottom0", top: "top0" }, categories: [] };

  const seen = new Set<string>();
  for (const cat of CATEGORIES) {
    const styles = new Map<string, string[]>();
    for (const pack of CHAR_PACKS) {
      const dir = path.join(pack, cat.id);
      if (!fs.existsSync(dir)) continue;
      for (const f of fs.readdirSync(dir).sort()) {
        if (!f.endsWith(".png")) continue;
        const id = f.slice(0, -4);
        const key = `${cat.id}/${id}`;
        if (seen.has(key)) continue; // gleicher Name in beiden Paketen: das Kernpaket gewinnt
        seen.add(key);
        const style = id.replace(/_c\d+$/, "");
        if (!styles.has(style)) styles.set(style, []);
        styles.get(style)!.push(id);
        const { data, info } = await sharp(path.join(dir, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        await writePng(data, info.width, info.height, path.join(OUT, "char", cat.id, `${id}.png`));
        files++;
        // Hautton-Varianten: nur wenn das Teil überhaupt Hautfarbe enthält (Gesicht, Körper, kurze Ärmel …)
        const usesSkin = (() => {
          const src = SKIN_SRC.map(hex);
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;
            if (src.some((c) => c[0] === data[i] && c[1] === data[i + 1] && c[2] === data[i + 2])) return true;
          }
          return false;
        })();
        if (usesSkin && ["head", "top", "bottom"].includes(cat.id)) {
          for (let t = 1; t < SKIN_TONES.length; t++) {
            const out = Buffer.from(data);
            for (let i = 0; i < out.length; i += 4) {
              if (out[i + 3] === 0) continue;
              const k = SKIN_SRC.findIndex((s) => { const c = hex(s); return c[0] === out[i] && c[1] === out[i + 1] && c[2] === out[i + 2]; });
              if (k >= 0) { const c = hex(SKIN_TONES[t][k]); out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; }
            }
            await writePng(out, info.width, info.height, path.join(OUT, "char", cat.id, `${id}.t${t}.png`));
            files++;
          }
        }
      }
    }
    // Basis-Körperteile (Datei *0) und Schatten sind keine Auswahl
    const base = "base" in cat ? cat.base : null;
    const items = [...styles.entries()]
      .filter(([style]) => style !== base)
      .sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))
      .map(([style, variants]) => ({
        id: style,
        label: `${cat.label} ${style.replace(/\D+/g, "")}`.trim(),
        variants: variants.sort((a, b) => a.localeCompare(b, "en", { numeric: true })),
        skin: ["head", "top", "bottom"].includes(cat.id),
      }));
    catalog.categories.push({ id: cat.id, label: cat.label, z: cat.z, optional: cat.optional, items });
    console.log(cat.label.padEnd(12), items.length, "Stile");
  }

  // Schatten (immer unter der Figur)
  for (const pack of CHAR_PACKS) {
    const f = path.join(pack, "shadow", "shadow.png");
    if (fs.existsSync(f)) {
      const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      await writePng(data, info.width, info.height, path.join(OUT, "char", "shadow", "shadow.png"));
      break;
    }
  }

  // Kacheln
  const tileFiles = [
    "tilesets/tileA2.png", "tilesets/tileA3.png", "tilesets/tileA4.png", "tilesets/tileA5_outside.png", "tilesets/tileA5_town.png",
    "tilesets/tileB_outside.png", "tilesets/tileB_town.png", "characters/!chests.png",
  ];
  for (const f of tileFiles) {
    const src = path.join(TILE_SRC, f);
    const dst = path.join(OUT, "tiles", path.basename(f).replace("!", ""));
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    files++;
  }

  fs.mkdirSync(path.dirname(CATALOG_PATH), { recursive: true });
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog));
  const size = (function s(d: string): number {
    return fs.readdirSync(d, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? s(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
  })(OUT);
  console.log(`\n${files} Dateien, ${(size / 1024 / 1024).toFixed(1)} MB → ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
