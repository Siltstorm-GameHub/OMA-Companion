import sharp from "sharp";
import fs from "fs";
import path from "path";

const W = 680;
const H = 400;

/** Dekorativer Marken-Hintergrund (Diagonalstreifen, Punkt-Grids, Eckschnitte) —
 *  Hintergrund für Cover ohne jede Bildquelle (kein eigenes/Reihen-/Steam-Cover). */
function backgroundGradientSvg(): Buffer {
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0%" stop-color="#06080f"/>
      <stop offset="100%" stop-color="#0c0a16"/>
    </linearGradient>
    <linearGradient id="ecd-teal" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#14b8a6" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#14b8a6" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="ecd-red" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#8b2020" stop-opacity="0"/>
      <stop offset="100%" stop-color="#8b2020" stop-opacity="0.2"/>
    </linearGradient>
    <linearGradient id="ecd-div" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#14b8a6" stop-opacity="0"/>
      <stop offset="30%"  stop-color="#14b8a6" stop-opacity="0.6"/>
      <stop offset="70%"  stop-color="#8b2020" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#8b2020" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="ecd-top" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#14b8a6" stop-opacity="0"/>
      <stop offset="50%"  stop-color="#14b8a6" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#14b8a6" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <polygon points="0,0 320,0 0,400" fill="url(#ecd-teal)"/>
  <polygon points="680,0 360,0 680,400" fill="url(#ecd-red)"/>

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

  <line x1="-60" y1="0" x2="160" y2="400" stroke="#14b8a6" stroke-opacity="0.07" stroke-width="0.6"/>
  <line x1="-20" y1="0" x2="200" y2="400" stroke="#14b8a6" stroke-opacity="0.05" stroke-width="0.6"/>
  <line x1="20"  y1="0" x2="240" y2="400" stroke="#14b8a6" stroke-opacity="0.03" stroke-width="0.6"/>
  <line x1="740" y1="0" x2="520" y2="400" stroke="#8b2020" stroke-opacity="0.08" stroke-width="0.6"/>
  <line x1="700" y1="0" x2="480" y2="400" stroke="#8b2020" stroke-opacity="0.05" stroke-width="0.6"/>
  <line x1="660" y1="0" x2="440" y2="400" stroke="#8b2020" stroke-opacity="0.03" stroke-width="0.6"/>

  <line x1="0"   y1="28" x2="28"  y2="0"   stroke="#14b8a6" stroke-opacity="0.4" stroke-width="0.8"/>
  <line x1="0"   y1="22" x2="22"  y2="0"   stroke="#14b8a6" stroke-opacity="0.2" stroke-width="0.5"/>
  <line x1="680" y1="28" x2="652" y2="0"   stroke="#8b2020" stroke-opacity="0.4" stroke-width="0.8"/>
  <line x1="680" y1="22" x2="658" y2="0"   stroke="#8b2020" stroke-opacity="0.2" stroke-width="0.5"/>
  <line x1="0"   y1="372" x2="28" y2="400" stroke="#14b8a6" stroke-opacity="0.4" stroke-width="0.8"/>
  <line x1="680" y1="372" x2="652" y2="400" stroke="#8b2020" stroke-opacity="0.4" stroke-width="0.8"/>

  <line x1="0" y1="1" x2="680" y2="1" stroke="url(#ecd-top)" stroke-width="1"/>
  <line x1="140" y1="330" x2="540" y2="330" stroke="url(#ecd-div)" stroke-width="0.8"/>

  <rect x="0"   y="185" width="3" height="30" rx="1.5" fill="#14b8a6" fill-opacity="0.7"/>
  <rect x="677" y="185" width="3" height="30" rx="1.5" fill="#8b2020" fill-opacity="0.7"/>

  <text x="340" y="358" text-anchor="middle"
    font-family="system-ui,ui-sans-serif,sans-serif"
    font-size="10" font-weight="700" letter-spacing="5"
    fill="#ffffff" fill-opacity="0.22">OMA COMPANION</text>
  <circle cx="164" cy="354" r="2" fill="#14b8a6" fill-opacity="0.5"/>
  <circle cx="516" cy="354" r="2" fill="#8b2020" fill-opacity="0.5"/>
</svg>`;
  return Buffer.from(svg);
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
 * Hintergrund — ohne Quelle der Marken-Gradient. In jedem Fall mit
 * Vignette + Logo-Badge unten rechts, damit jedes Cover gleich "OMA
 * Companion" wirkt, unabhängig davon, was hochgeladen oder gefunden wurde.
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
