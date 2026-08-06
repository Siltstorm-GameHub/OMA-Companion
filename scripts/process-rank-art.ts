/**
 * Baut die 6 Rang-Medaillen aus den Rohmotiven:
 *   npx tsx scripts/process-rank-art.ts
 *
 * Anders als bei den Abzeichen (process-badge-art.ts) ist die Zuordnung hier
 * 1:1 — jeder Rang (Tier 1–6) hat sein eigenes Motiv, keine geteilten Familien.
 * Die Ringfarbe kommt nicht aus einer neuen Stufen-Palette, sondern direkt aus
 * RANK_RING in lib/ranks.ts (c3-Ton) — derselben Farbe, die auch der Rahmen um
 * die Profilbilder (RankRing-Komponente) für diesen Rang verwendet. Damit
 * bleiben Avatar-Ring und Rang-Medaille immer synchron, ohne dass hier eine
 * zweite Farbquelle gepflegt werden müsste.
 *
 * Ablauf: Rohmotive liegen unter public/ranks/_raw/<motiv>.png (nur Symbol auf
 * dunklem Grund, ohne Ring). Ausgabe: public/ranks/rank-<tier>.png. Idempotent.
 */
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const RAW_DIR = path.join(process.cwd(), "public", "ranks", "_raw");
const OUT_DIR = path.join(process.cwd(), "public", "ranks");

/** Größte Darstellung im UI ist die Rangliste/Profil-Progress mit ~26–36 px —
 *  128 deckt das inklusive Retina ab, siehe process-badge-art.ts für dieselbe
 *  Überlegung bei den Abzeichen. */
const SIZE = 128;
const SYMBOL_RATIO = 0.5;
const RING_WIDTH = SIZE * 0.06;
const RING_RADIUS = SIZE / 2 - RING_WIDTH / 2 - 1;
const BG = { r: 0x0d, g: 0x0d, b: 0x0f, alpha: 1 };

/** Tier → [Rohmotiv, Ringfarbe]. Die Farben sind RANK_RING[tier].c3 aus
 *  lib/ranks.ts, von Hand übertragen (kein Cross-Import aus einer .ts-Datei
 *  mit React-Typen in dieses Node-Skript). Ändert sich dort die Palette, muss
 *  sie hier nachgezogen werden — beide Stellen sind mit demselben Kommentar
 *  aufeinander verwiesen. */
const RANKS: Record<number, [motif: string, ringColor: string]> = {
  1: ["clipboard", "#52525b"], // Zivi-Anwärter — Grau
  2: ["cane",      "#22c55e"], // Rollator-Raser — Grün
  3: ["fist",      "#ea580c"], // Krawall-Rentner — Orange
  4: ["column",    "#3b82f6"], // Denkmalschutz — Blau
  5: ["house",     "#c026d3"], // Heimleitung — Magenta
  6: ["crown",     "#f59e0b"], // Old Master — Gold
};

function ringSvg(color: string): Buffer {
  return Buffer.from(
    `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
       <circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${RING_RADIUS}"
               fill="none" stroke="${color}" stroke-width="${RING_WIDTH}"/>
     </svg>`
  );
}

function maskSvg(): Buffer {
  return Buffer.from(
    `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
       <circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2 - 1}" fill="#fff"/>
     </svg>`
  );
}

async function isolateSymbol(file: string): Promise<Buffer> {
  const input = await fs.readFile(file);
  try {
    return await sharp(input).trim({ threshold: 18 }).png().toBuffer();
  } catch {
    return input;
  }
}

async function main() {
  let rawFiles: string[];
  try {
    rawFiles = await fs.readdir(RAW_DIR);
  } catch {
    console.error(`Kein Rohordner: ${path.relative(process.cwd(), RAW_DIR)}`);
    process.exit(1);
  }
  const available = new Set(
    rawFiles.filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).map((f) => path.parse(f).name)
  );

  await fs.mkdir(OUT_DIR, { recursive: true });
  const mask = maskSvg();
  let written = 0;
  const missing: string[] = [];

  for (const [tierStr, [motif, ringColor]] of Object.entries(RANKS)) {
    if (!available.has(motif)) {
      missing.push(motif);
      continue;
    }

    const rawName = rawFiles.find((f) => path.parse(f).name === motif)!;
    const trimmed = await isolateSymbol(path.join(RAW_DIR, rawName));
    const target = Math.round(SIZE * SYMBOL_RATIO);
    const symbol = await sharp(trimmed)
      .resize(target, target, { fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const meta = await sharp(symbol).metadata();
    const left = Math.round((SIZE - (meta.width ?? 0)) / 2);
    const top = Math.round((SIZE - (meta.height ?? 0)) / 2);

    const composed = await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: BG } })
      .composite([
        { input: symbol, left, top },
        { input: ringSvg(ringColor), left: 0, top: 0 },
      ])
      .png()
      .toBuffer();

    await sharp(composed)
      .composite([{ input: mask, blend: "dest-in" }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT_DIR, `rank-${tierStr}.png`));

    written++;
  }

  console.log(`${written} von ${Object.keys(RANKS).length} Rang-Medaillen geschrieben.`);
  if (missing.length > 0) {
    console.log(`\nFehlende Rohmotive in public/ranks/_raw/:`);
    for (const m of missing.sort()) console.log(`  ${m}.png`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
