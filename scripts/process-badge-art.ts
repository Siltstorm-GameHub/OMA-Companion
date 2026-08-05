/**
 * Baut die Abzeichen der App aus wenigen Rohmotiven:
 *   npx tsx scripts/process-badge-art.ts
 *
 * Warum dieser Umweg statt "pro Abzeichen ein Bild generieren":
 *
 *   1. Die Hälfte der Abzeichen sind Stufen derselben Sache (voice_1h/10h/50h,
 *      pts_500/2k/5k/10k …). Einzeln generiert liefert die KI drei verschiedene
 *      Mikrofone — die Zusammengehörigkeit ginge verloren. Hier teilen sich alle
 *      Stufen einer Familie ein Motiv und unterscheiden sich nur im Ring.
 *   2. Die KI hält Ringstärke und Ringfarbe nicht zuverlässig ein (getestet:
 *      trotz exakter Vorgabe kam ein Motiv ganz ohne Ring zurück). Der Ring wird
 *      deshalb hier gezeichnet, nicht generiert.
 *   3. Die Motive kommen oft außermittig. Das Skript schneidet den Hintergrund
 *      weg und zentriert das Symbol selbst.
 *
 * Ablauf: Rohmotive nach public/badges/_raw/<motiv>.png legen (nur Symbol auf
 * dunklem Grund, ohne Ring). Das Skript schreibt fertige Abzeichen nach
 * public/badges/. Idempotent.
 */
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const RAW_DIR = path.join(process.cwd(), "public", "badges", "_raw");
const OUT_DIR = path.join(process.cwd(), "public", "badges");

/** Grösste Darstellung im UI ist der Admin mit 36 px — 128 deckt das inklusive
 *  3x-Retina ab und hält die Dateien bei ~10 KB. */
const SIZE = 128;

/** Anteil der Kantenlänge, den das Symbol einnimmt. Bewusst konservativ: das
 *  Symbol muss innerhalb des Rings Platz haben. */
const SYMBOL_RATIO = 0.5;

const RING_WIDTH = SIZE * 0.06;
/** Mitte des Rings, damit er innerhalb der Kreismaske vollständig sichtbar ist. */
const RING_RADIUS = SIZE / 2 - RING_WIDTH / 2 - 1;

/** Hintergrund der Medaille — entspricht BRAND.bgBase aus lib/brand.ts. */
const BG = { r: 0x0d, g: 0x0d, b: 0x0f, alpha: 1 };

/** Stufenfarben des Rings. Die Progression trägt die Aussage, nicht das Motiv. */
const TIERS = {
  1: "#a06a3c", // Bronze
  2: "#93a3b5", // Silber
  3: "#d9a326", // Gold
  4: "#8b2020", // Crimson — die Logo-Sekundärfarbe als höchste Stufe
  solo: "#14b8a6", // Teal für Abzeichen ohne Stufen
} as const;

type Tier = keyof typeof TIERS;

/** Abzeichen-ID → [Rohmotiv, Stufe]. Die IDs stammen aus BADGE_DEFS in lib/badges.ts. */
const BADGES: Record<string, [motif: string, tier: Tier]> = {
  welcome:     ["confetti", "solo"],

  voice_1h:    ["mic", 1],
  voice_10h:   ["mic", 2],
  voice_50h:   ["mic", 3],

  msg_50:      ["bubble", 1],
  msg_500:     ["bubble", 2],

  event_1:     ["calendar", 1],
  event_5:     ["calendar", 2],
  event_10:    ["calendar", 3],
  event_25:    ["calendar", 4],

  event_win_1: ["laurel", 2],
  event_win_5: ["laurel", 3],

  mvp_1:       ["star", 2],
  mvp_3:       ["star", 3],

  t_1:         ["swords", 1],
  t_win:       ["trophy", 3],
  t_win_5:     ["trophy", 4],

  pts_500:     ["sparkle", 1],
  pts_2k:      ["sparkle", 2],
  pts_5k:      ["sparkle", 3],
  pts_10k:     ["sparkle", 4],
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

/** Schneidet den einfarbigen Hintergrund weg, sodass nur das Symbol übrig bleibt.
 *  `trim` arbeitet ab der Ecke — der Hintergrund muss also flächig sein, was bei
 *  den generierten Motiven zutrifft. Schlägt es fehl, wird das Bild unverändert
 *  weitergereicht statt die Verarbeitung abzubrechen. */
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

  const symbols = new Map<string, Buffer>();
  const missing = new Set<string>();

  await fs.mkdir(OUT_DIR, { recursive: true });
  const mask = maskSvg();

  let written = 0;

  for (const [id, [motif, tier]] of Object.entries(BADGES)) {
    if (!available.has(motif)) {
      missing.add(motif);
      continue;
    }

    // Symbol einmal pro Motiv aufbereiten, nicht pro Abzeichen.
    if (!symbols.has(motif)) {
      const rawName = rawFiles.find((f) => path.parse(f).name === motif)!;
      const trimmed = await isolateSymbol(path.join(RAW_DIR, rawName));
      const target = Math.round(SIZE * SYMBOL_RATIO);
      symbols.set(
        motif,
        await sharp(trimmed)
          .resize(target, target, { fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer()
      );
    }

    const symbol = symbols.get(motif)!;
    const meta = await sharp(symbol).metadata();
    const left = Math.round((SIZE - (meta.width ?? 0)) / 2);
    const top = Math.round((SIZE - (meta.height ?? 0)) / 2);

    const composed = await sharp({
      create: { width: SIZE, height: SIZE, channels: 4, background: BG },
    })
      .composite([
        { input: symbol, left, top },
        { input: ringSvg(TIERS[tier]), left: 0, top: 0 },
      ])
      .png()
      .toBuffer();

    await sharp(composed)
      .composite([{ input: mask, blend: "dest-in" }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT_DIR, `${id}.png`));

    written++;
  }

  console.log(`${written} von ${Object.keys(BADGES).length} Abzeichen geschrieben.`);
  if (missing.size > 0) {
    console.log(`\nFehlende Rohmotive in public/badges/_raw/:`);
    for (const m of [...missing].sort()) console.log(`  ${m}.png`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
