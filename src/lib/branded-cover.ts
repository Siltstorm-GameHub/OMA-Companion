import sharp from "sharp";
import fs from "fs";
import path from "path";

const W = 680;
const H = 400;

/** Reiner Hintergrund (Verlauf + Punkt-Grid) für Cover ohne jede Bildquelle
 *  (kein eigenes/Reihen-/Steam-Cover) — die eigentliche Marken-Optik
 *  (Diagonalstreifen, Eckakzente, Wasserzeichen) kommt von frameOverlaySvg()
 *  und wird auf JEDES Cover gelegt, nicht nur diesen Fallback. */
function backgroundGradientSvg(): Buffer {
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0%" stop-color="#06080f"/>
      <stop offset="100%" stop-color="#0c0a16"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <g fill="#ffffff" fill-opacity="0.04">
    <circle cx="40" cy="40" r="1.2"/><circle cx="80" cy="40" r="1.2"/><circle cx="120" cy="40" r="1.2"/>
    <circle cx="40" cy="80" r="1.2"/><circle cx="80" cy="80" r="1.2"/><circle cx="120" cy="80" r="1.2"/>
    <circle cx="40" cy="120" r="1.2"/><circle cx="80" cy="120" r="1.2"/><circle cx="120" cy="120" r="1.2"/>
    <circle cx="40" cy="280" r="1.2"/><circle cx="80" cy="280" r="1.2"/><circle cx="120" cy="280" r="1.2"/>
    <circle cx="40" cy="320" r="1.2"/><circle cx="80" cy="320" r="1.2"/><circle cx="120" cy="320" r="1.2"/>
    <circle cx="40" cy="360" r="1.2"/><circle cx="80" cy="360" r="1.2"/><circle cx="120" cy="360" r="1.2"/>
    <circle cx="560" cy="40" r="1.2"/><circle cx="600" cy="40" r="1.2"/><circle cx="640" cy="40" r="1.2"/>
    <circle cx="560" cy="80" r="1.2"/><circle cx="600" cy="80" r="1.2"/><circle cx="640" cy="80" r="1.2"/>
    <circle cx="560" cy="120" r="1.2"/><circle cx="600" cy="120" r="1.2"/><circle cx="640" cy="120" r="1.2"/>
    <circle cx="560" cy="280" r="1.2"/><circle cx="600" cy="280" r="1.2"/><circle cx="640" cy="280" r="1.2"/>
    <circle cx="560" cy="320" r="1.2"/><circle cx="600" cy="320" r="1.2"/><circle cx="640" cy="320" r="1.2"/>
    <circle cx="560" cy="360" r="1.2"/><circle cx="600" cy="360" r="1.2"/><circle cx="640" cy="360" r="1.2"/>
  </g>
</svg>`;
  return Buffer.from(svg);
}

/**
 * Marken-Rahmen: Diagonalstreifen in den oberen Ecken, farbige Eckakzente,
 * obere Trennlinie und ein "OMA COMPANION"-Wasserzeichen — auf JEDES Cover
 * komponiert (Steam-Cover, eigener Upload, Reihen-Cover oder Gradient-
 * Fallback), damit jedes Cover dieselbe erkennbare Optik trägt statt nur
 * eines kleinen Logos in der Ecke. Kräftiger als die reine Hintergrund-
 * Variante, damit es auch über hellem/buntem Artwork noch trägt.
 */
function frameOverlaySvg(): Buffer {
  return Buffer.from(
    `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fo-teal" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#14b8a6" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#14b8a6" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="fo-red" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#8b2020" stop-opacity="0"/>
      <stop offset="100%" stop-color="#8b2020" stop-opacity="0.45"/>
    </linearGradient>
    <linearGradient id="fo-top" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#14b8a6" stop-opacity="0"/>
      <stop offset="50%"  stop-color="#14b8a6" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#14b8a6" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="fo-div" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#14b8a6" stop-opacity="0"/>
      <stop offset="30%"  stop-color="#14b8a6" stop-opacity="0.7"/>
      <stop offset="70%"  stop-color="#8b2020" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#8b2020" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <polygon points="0,0 300,0 0,210" fill="url(#fo-teal)"/>
  <polygon points="${W},0 ${W - 300},0 ${W},210" fill="url(#fo-red)"/>

  <line x1="0"   y1="34" x2="34"  y2="0"   stroke="#14b8a6" stroke-opacity="0.85" stroke-width="2"/>
  <line x1="0"   y1="26" x2="26"  y2="0"   stroke="#14b8a6" stroke-opacity="0.5"  stroke-width="1.2"/>
  <line x1="${W}" y1="34" x2="${W - 34}" y2="0" stroke="#8b2020" stroke-opacity="0.85" stroke-width="2"/>
  <line x1="${W}" y1="26" x2="${W - 26}" y2="0" stroke="#8b2020" stroke-opacity="0.5"  stroke-width="1.2"/>

  <line x1="0" y1="1" x2="${W}" y2="1" stroke="url(#fo-top)" stroke-width="2.5"/>
  <line x1="140" y1="330" x2="540" y2="330" stroke="url(#fo-div)" stroke-width="1.2"/>

  <rect x="0"       y="180" width="4" height="36" rx="2" fill="#14b8a6" fill-opacity="0.9"/>
  <rect x="${W - 4}" y="180" width="4" height="36" rx="2" fill="#8b2020" fill-opacity="0.9"/>

  <text x="${W / 2}" y="358" text-anchor="middle"
    font-family="system-ui,ui-sans-serif,sans-serif"
    font-size="12" font-weight="800" letter-spacing="6"
    fill="#ffffff" fill-opacity="0.55">OMA COMPANION</text>
  <circle cx="${W / 2 - 176}" cy="354" r="2.5" fill="#14b8a6" fill-opacity="0.8"/>
  <circle cx="${W / 2 + 176}" cy="354" r="2.5" fill="#8b2020" fill-opacity="0.8"/>
</svg>`
  );
}

/** Dunkler Verlauf über dem unteren Bilddrittel, damit das Logo-Badge auf
 *  jeder Bildquelle lesbar bleibt — unabhängig davon, wie hell/bunt das
 *  darunterliegende Artwork ist. */
function vignetteSvg(): Buffer {
  const bandHeight = Math.round(H * 0.42);
  return Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.6"/>
        </linearGradient>
      </defs>
      <rect x="0" y="${H - bandHeight}" width="${W}" height="${bandHeight}" fill="url(#v)"/>
    </svg>`
  );
}

let cachedBadge: { buffer: Buffer; width: number; height: number } | null = null;

/** Kleines, halbtransparentes Logo-Badge (abgerundeter Chip-Hintergrund +
 *  Logo) — wird unten rechts auf jedes Cover komponiert, damit jedes Bild
 *  gleich "OMA Companion" wirkt, egal welche Quelle dahintersteckt.
 *  Immer identisch, deshalb einmal gerendert und gecacht. */
async function getLogoBadge(): Promise<{ buffer: Buffer; width: number; height: number }> {
  if (cachedBadge) return cachedBadge;

  const logoPath  = path.join(process.cwd(), "public", "brand", "logo-256.png");
  const logoWidth = Math.round(W * 0.19);
  const logo = await sharp(fs.readFileSync(logoPath)).resize(logoWidth).png().toBuffer();
  const logoHeight = (await sharp(logo).metadata()).height ?? logoWidth;

  const pad   = 12;
  const chipW = logoWidth + pad * 2;
  const chipH = logoHeight + pad * 2;
  const chipSvg = Buffer.from(
    `<svg width="${chipW}" height="${chipH}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${chipW}" height="${chipH}" rx="12" fill="#06080f" fill-opacity="0.8" stroke="#14b8a6" stroke-opacity="0.55" stroke-width="1.5"/>
    </svg>`
  );

  const buffer = await sharp(chipSvg)
    .composite([{ input: logo, left: pad, top: pad }])
    .png()
    .toBuffer();

  cachedBadge = { buffer, width: chipW, height: chipH };
  return cachedBadge;
}

let cachedGradientBg: Buffer | null = null;
async function getGradientBackground(): Promise<Buffer> {
  if (cachedGradientBg) return cachedGradientBg;
  cachedGradientBg = await sharp(backgroundGradientSvg(), { density: 150 }).resize(W, H).png().toBuffer();
  return cachedGradientBg;
}

/** Lädt eine Bildquelle und schneidet sie formatfüllend auf die Cover-Größe zu.
 *  `null` bei jedem Fehler — der Aufrufer fällt dann auf den Marken-Gradient zurück. */
async function fetchCoverFitBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; OMACompanion/1.0)" } });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return await sharp(buf).resize(W, H, { fit: "cover" }).toBuffer();
  } catch {
    return null;
  }
}

const coverCache = new Map<string, Buffer>();

/**
 * Rendert ein Cover mit einheitlichem Marken-Auftritt: die gegebene
 * Bildquelle (eigenes Cover, Reihen-Cover oder Steam-Cover-URL) als
 * Hintergrund — ohne Quelle der Marken-Gradient. In jedem Fall mit Vignette,
 * Marken-Rahmen (frameOverlaySvg) und Logo-Badge unten rechts, damit jedes
 * Cover gleich "OMA Companion" wirkt, unabhängig davon, was hochgeladen oder
 * gefunden wurde.
 */
export async function generateBrandedCoverBuffer(sourceUrl: string | null): Promise<Buffer> {
  const cacheKey = sourceUrl ?? "__gradient__";
  const cached = coverCache.get(cacheKey);
  if (cached) return cached;

  const bg = sourceUrl
    ? (await fetchCoverFitBuffer(sourceUrl)) ?? (await getGradientBackground())
    : await getGradientBackground();

  const badge  = await getLogoBadge();
  const margin = 16;

  const result = await sharp(bg)
    .composite([
      { input: vignetteSvg(), top: 0, left: 0 },
      { input: frameOverlaySvg(), top: 0, left: 0 },
      { input: badge.buffer, top: H - badge.height - margin, left: W - badge.width - margin },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  coverCache.set(cacheKey, result);
  return result;
}

export async function generateBrandedCoverDataUri(sourceUrl: string | null): Promise<string> {
  const buffer = await generateBrandedCoverBuffer(sourceUrl);
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}
