/**
 * Erzeugt aus dem Logo-Original alle abgeleiteten Grössen:
 *   npx tsx scripts/generate-brand-assets.ts
 *
 * Hintergrund: public/OMALogoNew.png ist das 2,35-MB-Original und wurde bisher
 * überall direkt eingebunden — auch dort, wo es mit 20 px gerendert wird. Zwei
 * konkrete Probleme:
 *
 *   1. Jeder Seitenaufruf zieht mehrere MB, weil das Logo an Stellen wie
 *      DynamicNotch/TopNewsFeed als rohes <img> ohne next/image läuft.
 *   2. next/og (OG-Karten) hat ein hartes Bundle-Limit von 500 KB inklusive
 *      eingebetteter Bilder. Das Original ist dort schlicht nicht verwendbar.
 *
 * Das Skript ist idempotent und darf jederzeit erneut laufen — es liest nur das
 * Original und überschreibt die Ableitungen unter public/brand/.
 */
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const SOURCE  = path.join(process.cwd(), "public", "OMALogoNew.png");
const OUT_DIR = path.join(process.cwd(), "public", "brand");

/** Grössen, die im UI tatsächlich vorkommen (20–64 px, plus 2x für Retina). */
const PNG_SIZES = [64, 128, 256, 512];

/** Android beschneidet maskable Icons kreisförmig. Der Safe-Zone-Anteil liegt
 *  bei 80 % der Kantenlänge — das Motiv muss also auf 80 % skaliert und in ein
 *  volles Quadrat einbettet werden, sonst wird das Logo angeschnitten. */
const MASKABLE_SAFE_RATIO = 0.8;

async function main() {
  const meta = await sharp(SOURCE).metadata();
  const srcBytes = (await fs.stat(SOURCE)).size;
  console.log(
    `Quelle: ${path.relative(process.cwd(), SOURCE)} — ` +
    `${meta.width}x${meta.height}, ${(srcBytes / 1024 / 1024).toFixed(2)} MB\n`
  );

  await fs.mkdir(OUT_DIR, { recursive: true });

  // ── Normale Grössen ────────────────────────────────────────────────────────
  for (const size of PNG_SIZES) {
    const out = path.join(OUT_DIR, `logo-${size}.png`);
    await sharp(SOURCE)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, palette: true })
      .toFile(out);
    const { size: bytes } = await fs.stat(out);
    console.log(`  logo-${size}.png        ${(bytes / 1024).toFixed(1).padStart(7)} KB`);
  }

  // ── WebP für die UI (deutlich kleiner, von allen Zielbrowsern unterstützt) ──
  for (const size of PNG_SIZES) {
    const out = path.join(OUT_DIR, `logo-${size}.webp`);
    await sharp(SOURCE)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90 })
      .toFile(out);
    const { size: bytes } = await fs.stat(out);
    console.log(`  logo-${size}.webp       ${(bytes / 1024).toFixed(1).padStart(7)} KB`);
  }

  // ── Maskable Icon mit Safe-Zone ────────────────────────────────────────────
  const maskableSize  = 512;
  const inner         = Math.round(maskableSize * MASKABLE_SAFE_RATIO);
  const pad           = Math.round((maskableSize - inner) / 2);
  const maskableOut   = path.join(OUT_DIR, "logo-maskable-512.png");
  const innerBuffer   = await sharp(SOURCE)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: maskableSize,
      height: maskableSize,
      channels: 4,
      // Deckender Hintergrund: maskable Icons dürfen keine Transparenz zeigen,
      // sonst blitzt auf manchen Launchern der Systemhintergrund durch.
      background: { r: 0x0d, g: 0x0d, b: 0x0f, alpha: 1 },
    },
  })
    .composite([{ input: innerBuffer, top: pad, left: pad }])
    .png({ compressionLevel: 9 })
    .toFile(maskableOut);
  const { size: maskBytes } = await fs.stat(maskableOut);
  console.log(`  logo-maskable-512.png  ${(maskBytes / 1024).toFixed(1).padStart(7)} KB`);

  // ── Favicon-Ersatz ─────────────────────────────────────────────────────────
  // Die bestehende public/favicon.ico ist 270 KB. Ein 32er-PNG reicht für alle
  // Zielbrowser und wird in layout.tsx als icon referenziert.
  const favOut = path.join(OUT_DIR, "favicon-32.png");
  await sharp(SOURCE)
    .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true })
    .toFile(favOut);
  const { size: favBytes } = await fs.stat(favOut);
  console.log(`  favicon-32.png         ${(favBytes / 1024).toFixed(1).padStart(7)} KB`);

  console.log(`\nFertig — geschrieben nach ${path.relative(process.cwd(), OUT_DIR)}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
