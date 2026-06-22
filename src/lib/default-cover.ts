import sharp from "sharp";
import fs from "fs";
import path from "path";

let cached: string | null = null;

const SVG_W = 680;
const SVG_H = 400;

function buildSvg(): Buffer {
  const svg = `<svg width="${SVG_W}" height="${SVG_H}" viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg">
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

  <rect width="${SVG_W}" height="${SVG_H}" fill="url(#bg)"/>

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

export async function generateDefaultCoverDataUri(): Promise<string> {
  if (cached) return cached;

  const bgBuffer = await sharp(buildSvg(), { density: 150 })
    .resize(SVG_W, SVG_H)
    .png()
    .toBuffer();

  const logoPath = path.join(process.cwd(), "public", "OMALogoNew.png");
  const logoWidth = Math.round(SVG_W * 0.30);

  const logoResized = await sharp(fs.readFileSync(logoPath))
    .resize(logoWidth)
    .png()
    .toBuffer();

  const logoMeta = await sharp(logoResized).metadata();
  const logoHeight = logoMeta.height ?? 0;

  // Matches CSS: top 50% + translateY(-54%) → center - 54% of logo height
  const left = Math.round((SVG_W - logoWidth) / 2);
  const top  = Math.round(SVG_H / 2 - logoHeight * 0.54);

  const finalBuffer = await sharp(bgBuffer)
    .composite([{ input: logoResized, left, top }])
    .jpeg({ quality: 90 })
    .toBuffer();

  cached = `data:image/jpeg;base64,${finalBuffer.toString("base64")}`;
  return cached;
}
