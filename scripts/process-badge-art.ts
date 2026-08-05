/**
 * Schneidet Abzeichen-Rohgrafiken kreisrund frei:
 *   npx tsx scripts/process-badge-art.ts
 *
 * Hintergrund: Die Motive entstehen in Canva als "logo"-Designs. Canva malt den
 * Hintergrund dort als Rechteck ins Design — `transparent_background: true`
 * beim Export hat deshalb keine Wirkung, die PNGs kommen ohne Alphakanal an.
 * Auf den Glass-Karten der App klebt so ein dunkles Quadrat wie ein Aufkleber.
 *
 * Dieses Skript legt eine kreisrunde Alphamaske darüber. Ergebnis: ein rundes
 * Abzeichen mit dunkler Füllung, das sich sauber in jede Oberfläche einfügt.
 *
 * Ablauf: Rohdateien nach public/badges/_raw/ legen (Dateiname = Badge-ID aus
 * lib/badges.ts, z.B. t_win.png). Das Skript schreibt die fertigen Dateien nach
 * public/badges/. Es ist idempotent und überschreibt bestehende Ergebnisse.
 */
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const RAW_DIR = path.join(process.cwd(), "public", "badges", "_raw");
const OUT_DIR = path.join(process.cwd(), "public", "badges");

/** Zielkantenlänge. Grösste Darstellung im UI ist der Admin mit 36 px —
 *  128 deckt das inklusive 3x-Retina ab und hält die Dateien klein. */
const SIZE = 128;

/** Radius der Maske als Anteil der halben Kantenlänge. 1.0 = einbeschriebener
 *  Kreis (berührt die Kanten). Minimal darunter, damit der Rand nicht hart
 *  abgeschnitten wirkt. */
const RADIUS_RATIO = 0.98;

function circleMask(size: number): Buffer {
  const r = (size / 2) * RADIUS_RATIO;
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
       <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="#fff"/>
     </svg>`
  );
}

async function main() {
  let files: string[];
  try {
    files = (await fs.readdir(RAW_DIR)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  } catch {
    console.error(
      `Kein Rohordner gefunden: ${path.relative(process.cwd(), RAW_DIR)}\n` +
      `Lege die Canva-Exporte dort ab (Dateiname = Badge-ID, z.B. t_win.png).`
    );
    process.exit(1);
  }

  if (files.length === 0) {
    console.log("Keine Rohdateien gefunden — nichts zu tun.");
    return;
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  const mask = circleMask(SIZE);

  for (const file of files) {
    const id = path.parse(file).name;
    const out = path.join(OUT_DIR, `${id}.png`);

    const base = await sharp(path.join(RAW_DIR, file))
      .resize(SIZE, SIZE, { fit: "cover" })
      .ensureAlpha()
      .toBuffer();

    // 'dest-in' behält die Farben des Bildes und übernimmt das Alpha der Maske:
    // alles ausserhalb des Kreises wird durchsichtig.
    await sharp(base)
      .composite([{ input: mask, blend: "dest-in" }])
      .png({ compressionLevel: 9 })
      .toFile(out);

    const { size } = await fs.stat(out);
    console.log(`  ${id.padEnd(14)} → ${(size / 1024).toFixed(1).padStart(6)} KB`);
  }

  console.log(
    `\n${files.length} Abzeichen verarbeitet → ${path.relative(process.cwd(), OUT_DIR)}/\n` +
    `Nicht vergessen: passenden Eintrag in src/lib/badge-art.ts ergänzen.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
