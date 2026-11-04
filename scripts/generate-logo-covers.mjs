/**
 * Erzeugt die Logo-Vorlagen-Cover (public/event-covers/logo-*.jpg): Motive der
 * OBS-Pausen-Hintergründe (public/overlay/pause/) als Bühne, darauf zentriert
 * das OMA-Logo mit Schatten, Glow und Lichtring in den Markenfarben.
 *
 *   node scripts/generate-logo-covers.mjs
 *
 * Liste/Labels der Auswahl: src/lib/event-cover-presets.ts.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const W = 1200;
const H = 630;
const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "event-covers");
const LOGO = path.join(ROOT, "public", "OMALogoNew.png");

const TEAL = "20,184,166";
const RED = "185,28,28";

/**
 * focusY: vertikaler Bildausschnitt (0 = oben, 1 = unten) — das Motiv ist 16:9, das Cover ~1.9:1.
 * accent: Lichtfarbe hinter dem Logo (passend zum Motiv). dim: zusätzliche Abdunklung 0–1.
 */
const SCENES = [
  { id: "hexagon",    src: "hexagon.jpg",    focusY: 0.7,  accent: TEAL,          dim: 0,    reflect: true },
  { id: "lounge",     src: "lounge.jpg",     focusY: 0.55, accent: "255,60,120",  dim: 0,    reflect: true },
  { id: "esports",    src: "esports.jpg",    focusY: 0.35, accent: "120,230,220", dim: 0,    reflect: true },
  { id: "neonstreet", src: "neonstreet.jpg", focusY: 0.6,  accent: "190,90,255",  dim: 0.05, reflect: true },
  { id: "synthwave",  src: "synthwave.jpg",  focusY: 1,    accent: "255,80,170",  dim: 0,    reflect: true },
  { id: "space",      src: "space.jpg",      focusY: 0.5,  accent: "255,190,120", dim: 0.05 },
  { id: "castle",     src: "castle.jpg",     focusY: 0.4,  accent: "255,200,120", dim: 0.3 },
  { id: "station",    src: "station.jpg",    focusY: 0.3,  accent: "120,170,255", dim: 0.1 },
  { id: "cozy",       src: "cozy.jpg",       focusY: 0.45, accent: "255,190,110", dim: 0.1 },
  { id: "racing",     src: "racing.jpg",     focusY: 0.6,  accent: "255,70,60",   dim: 0.05, reflect: true },
];

const LOGO_SIZE = 360;
const LX = Math.round(W / 2 - LOGO_SIZE / 2);
const LY = 92;
const CX = W / 2, CY = LY + LOGO_SIZE / 2;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const svg = (inner, defs = "") => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${inner}</svg>`,
);

/** Abdunklung: optionaler Grundton + Vignette zu den Rändern, Boden etwas dunkler. */
function gradeLayer(dim) {
  return svg(
    `<rect width="${W}" height="${H}" fill="#05060c" fill-opacity="${dim}"/>
     <rect width="${W}" height="${H}" fill="url(#v)"/>
     <rect width="${W}" height="${H}" fill="url(#b)"/>`,
    `<radialGradient id="v" cx="${CX}" cy="${CY}" r="780" gradientUnits="userSpaceOnUse">
       <stop offset="0.35" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.7"/>
     </radialGradient>
     <linearGradient id="b" x1="0" y1="0" x2="0" y2="1">
       <stop offset="0.7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/>
     </linearGradient>`,
  );
}

/** Lichtschein hinter dem Logo, Lichtkante am Boden in Teal/Rot und feine Partikel (screen). */
function glowLayer(accent, seed) {
  const r = rng(seed);
  let dots = "";
  for (let i = 0; i < 80; i++) {
    const a = r() * Math.PI * 2, d = 190 + r() * 330;
    const x = CX + Math.cos(a) * d * 1.5, y = CY + Math.sin(a) * d * 0.8;
    const s = 0.8 + r() * 2.2;
    dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.toFixed(1)}" fill="rgb(${accent})" fill-opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`;
  }
  const FY = LY + LOGO_SIZE + 14; // Bodenlinie unter dem Logo
  return svg(
    `<ellipse cx="${CX}" cy="${CY}" rx="460" ry="300" fill="url(#g)"/>
     <ellipse cx="${CX}" cy="${FY}" rx="420" ry="40" fill="url(#f)"/>
     <rect x="${CX - 520}" y="${FY - 1}" width="1040" height="2" fill="url(#line)"/>
     ${dots}`,
    `<radialGradient id="g" cx="0.5" cy="0.5" r="0.5">
       <stop offset="0" stop-color="rgb(${accent})" stop-opacity="0.75"/>
       <stop offset="0.4" stop-color="rgb(${accent})" stop-opacity="0.25"/>
       <stop offset="1" stop-color="rgb(${accent})" stop-opacity="0"/>
     </radialGradient>
     <radialGradient id="f" cx="0.5" cy="0.5" r="0.5">
       <stop offset="0" stop-color="rgb(${accent})" stop-opacity="0.5"/><stop offset="1" stop-color="rgb(${accent})" stop-opacity="0"/>
     </radialGradient>
     <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
       <stop offset="0" stop-color="rgb(${TEAL})" stop-opacity="0"/>
       <stop offset="0.35" stop-color="rgb(${TEAL})"/>
       <stop offset="0.5" stop-color="#ffffff"/>
       <stop offset="0.65" stop-color="rgb(${RED})"/>
       <stop offset="1" stop-color="rgb(${RED})" stop-opacity="0"/>
     </linearGradient>`,
  );
}

async function main() {
  const logo = await sharp(LOGO).resize(LOGO_SIZE, LOGO_SIZE).png().toBuffer();
  const alpha = await sharp(logo).extractChannel("alpha").toBuffer();
  const pad = 80;
  const padded = (buf) => sharp(buf).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } });

  // Schlagschatten: Logo-Silhouette schwarz, weich
  const shadow = await sharp({ create: { width: LOGO_SIZE, height: LOGO_SIZE, channels: 3, background: "#000" } })
    .joinChannel(alpha).png().toBuffer();
  const shadowSoft = await padded(shadow).blur(20).png().toBuffer();

  // Spiegelung auf dem Boden: gespiegeltes Logo, nach unten ausgeblendet
  const RH = Math.round(LOGO_SIZE * 0.45);
  const fade = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${LOGO_SIZE}" height="${RH}"><defs><linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.32"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#m)"/></svg>`,
  );
  const reflection = await sharp(await sharp(logo).flip().png().toBuffer())
    .extract({ left: 0, top: 0, width: LOGO_SIZE, height: RH })
    .composite([{ input: fade, blend: "dest-in" }])
    .blur(1.5)
    .png().toBuffer();

  fs.mkdirSync(OUT, { recursive: true });
  let seed = 1;
  for (const s of SCENES) {
    const srcPath = path.join(ROOT, "public", "overlay", "pause", s.src);
    const resized = await sharp(srcPath).resize(W, null).modulate({ brightness: 1.15, saturation: 1.1 })
      .toBuffer({ resolveWithObject: true });
    const top = Math.round((resized.info.height - H) * s.focusY);
    const bg = await sharp(resized.data).extract({ left: 0, top, width: W, height: H }).toBuffer();

    // Logo-Glow in Akzentfarbe
    const tint = await sharp({ create: { width: LOGO_SIZE, height: LOGO_SIZE, channels: 3, background: `rgb(${s.accent})` } })
      .joinChannel(alpha).png().toBuffer();
    const tintGlow = await padded(tint).blur(30).png().toBuffer();

    const layers = [
      { input: gradeLayer(s.dim), top: 0, left: 0 },
      { input: glowLayer(s.accent, seed++), top: 0, left: 0, blend: "screen" },
      { input: tintGlow, top: LY - pad, left: LX - pad, blend: "screen" },
      { input: shadowSoft, top: LY - pad + 12, left: LX - pad },
    ];
    if (s.reflect) layers.push({ input: reflection, top: LY + LOGO_SIZE + 16, left: LX });
    layers.push({ input: logo, top: LY, left: LX });

    const out = await sharp(bg).composite(layers).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
    const file = path.join(OUT, `logo-${s.id}.jpg`);
    fs.writeFileSync(file, out);
    console.log(`logo-${s.id}.jpg  ${(out.length / 1024).toFixed(0)} KB`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
