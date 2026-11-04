/**
 * Erzeugt die Vorlagen-Cover für Events/Eventreihen ohne eigenes Bild
 * (public/event-covers/*.svg). Auswahl im Admin über ImageUploadField →
 * Liste in src/lib/event-cover-presets.ts.
 *
 *   node scripts/generate-event-covers.mjs
 *
 * Bewusst ohne Text in den SVGs: Schrift würde je nach Renderer (Browser vs.
 * sharp/librsvg für Discord) unterschiedlich aussehen. Zufallswerte sind
 * geseedet — erneutes Ausführen liefert identische Dateien.
 */
import fs from "node:fs";
import path from "node:path";

const W = 1200;
const H = 630;
const OUT = path.join(process.cwd(), "public", "event-covers");

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const n = (v) => Math.round(v * 10) / 10;
const pts = (arr) => arr.map(([x, y]) => `${n(x)},${n(y)}`).join(" ");

function star(cx, cy, R, r, spikes = 5, rot = -Math.PI / 2) {
  const out = [];
  for (let i = 0; i < spikes * 2; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = rot + (i * Math.PI) / spikes;
    out.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
  }
  return pts(out);
}

function frame({ bg1, bg2, glow, glowX = 600, glowY = 315, glowR = 560, glowOpacity = 0.35, defs = "", body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/>
  </linearGradient>
  <radialGradient id="glow" cx="${glowX}" cy="${glowY}" r="${glowR}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${glow}" stop-opacity="${glowOpacity}"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="vig" cx="600" cy="315" r="720" gradientUnits="userSpaceOnUse">
    <stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.65"/>
  </radialGradient>
  ${defs}
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#glow)"/>
${body}
<rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>
`;
}

// ── 1. Turnier ──────────────────────────────────────────────────────────────
function turnier() {
  const r = rng(11);
  const gold = "#f5b942";
  let body = "";

  // Strahlen hinter dem Pokal
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const w = 0.035;
    body += `<polygon points="${pts([[600, 270], [600 + Math.cos(a - w) * 900, 270 + Math.sin(a - w) * 900], [600 + Math.cos(a + w) * 900, 270 + Math.sin(a + w) * 900]])}" fill="${gold}" fill-opacity="${i % 2 ? 0.035 : 0.06}"/>`;
  }

  // Turnierbaum links + gespiegelt rechts
  const slots = Array.from({ length: 8 }, (_, i) => 120 + i * (390 / 7));
  for (const dir of [1, -1]) {
    const mx = (x) => (dir === 1 ? x : W - x);
    let ys = slots;
    const xs = [70, 190, 290, 390, 480];
    const op = [0.3, 0.42, 0.6, 0.85];
    ys.forEach((y) => {
      const x0 = Math.min(mx(70), mx(175));
      body += `<rect x="${n(x0)}" y="${n(y - 11)}" width="105" height="22" rx="5" fill="${gold}" fill-opacity="0.07" stroke="${gold}" stroke-opacity="0.3"/>`;
      body += `<line x1="${n(mx(175))}" y1="${n(y)}" x2="${n(mx(190))}" y2="${n(y)}" stroke="${gold}" stroke-opacity="0.3" stroke-width="2"/>`;
    });
    for (let round = 1; round < 4 + 1 && ys.length > 1; round++) {
      const next = [];
      for (let i = 0; i < ys.length; i += 2) {
        const a = ys[i], b = ys[i + 1], m = (a + b) / 2;
        const x = xs[round], x2 = xs[round + 1];
        body += `<path d="M${n(mx(x))} ${n(a)} V${n(b)} M${n(mx(x))} ${n(m)} H${n(mx(x2))}" stroke="${gold}" stroke-opacity="${op[round]}" stroke-width="${1.5 + round}" fill="none" stroke-linecap="round"/>`;
        next.push(m);
      }
      ys = next;
    }
  }

  // Pokal
  const defs = `
  <linearGradient id="cup" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff1c2"/><stop offset="0.45" stop-color="${gold}"/><stop offset="1" stop-color="#9a5e12"/>
  </linearGradient>`;
  body += `<g transform="translate(600 305) scale(1.25)">
    <path d="M-75 -110 H-105 C-125 -110 -128 -80 -118 -60 C-108 -40 -88 -30 -68 -32" fill="none" stroke="url(#cup)" stroke-width="12" stroke-linecap="round"/>
    <path d="M75 -110 H105 C125 -110 128 -80 118 -60 C108 -40 88 -30 68 -32" fill="none" stroke="url(#cup)" stroke-width="12" stroke-linecap="round"/>
    <path d="M-75 -130 H75 V-85 C75 -20 40 15 0 20 C-40 15 -75 -20 -75 -85 Z" fill="url(#cup)"/>
    <path d="M-52 -118 V-85 C-52 -48 -36 -22 -18 -10" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="7" stroke-linecap="round"/>
    <polygon points="${star(0, -62, 24, 10)}" fill="#fff8e1" fill-opacity="0.9"/>
    <path d="M-14 20 H14 L22 72 H-22 Z" fill="url(#cup)"/>
    <rect x="-56" y="72" width="112" height="18" rx="4" fill="url(#cup)"/>
    <rect x="-74" y="90" width="148" height="26" rx="5" fill="#6b4310"/>
    <rect x="-74" y="90" width="148" height="4" rx="2" fill="#fff" fill-opacity="0.25"/>
  </g>`;

  // Funkeln
  for (let i = 0; i < 26; i++) {
    const x = 380 + r() * 440, y = 60 + r() * 420, s = 3 + r() * 9;
    body += `<polygon points="${star(x, y, s, s * 0.25, 4, 0)}" fill="#fff3cf" fill-opacity="${n(0.25 + r() * 0.6)}"/>`;
  }

  return frame({ bg1: "#0d0904", bg2: "#060508", glow: gold, glowY: 270, glowOpacity: 0.32, defs, body });
}

// ── 2. Community-Abend ──────────────────────────────────────────────────────
function community() {
  const r = rng(22);
  const cols = ["#a78bfa", "#14b8a6", "#f472b6"];
  let body = "";
  for (let i = 0; i < 46; i++) {
    const c = cols[i % 3];
    body += `<circle cx="${n(r() * W)}" cy="${n(r() * H)}" r="${n(6 + r() * 60)}" fill="${c}" fill-opacity="${n(0.03 + r() * 0.1)}"/>`;
  }

  const figs = [-2, -1, 0, 1, 2].map((k) => ({
    x: 600 + k * 160,
    y: 360 + Math.abs(k) * 22,
    s: 1 - Math.abs(k) * 0.12,
    c: cols[(k + 3) % 3],
  }));

  // Verbindungsbögen über den Köpfen
  for (let i = 0; i < figs.length; i++) {
    for (let j = i + 1; j < figs.length; j++) {
      const a = figs[i], b = figs[j];
      const ay = a.y - 70 * a.s, by = b.y - 70 * b.s;
      const lift = 50 + (j - i) * 40;
      body += `<path d="M${a.x} ${n(ay - 40 * a.s)} Q${(a.x + b.x) / 2} ${n(Math.min(ay, by) - lift - 40)} ${b.x} ${n(by - 40 * b.s)}" fill="none" stroke="#fff" stroke-opacity="${n(0.05 + 0.04 * (5 - (j - i)))}" stroke-width="1.5"/>`;
    }
  }

  let defs = "";
  // Hinten zuerst zeichnen (äußere Figuren), Mitte zuletzt
  [...figs].sort((a, b) => b.s - a.s).reverse().forEach((f, i) => {
    defs += `<linearGradient id="f${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${f.c}"/><stop offset="1" stop-color="${f.c}" stop-opacity="0.15"/></linearGradient>`;
    body += `<g transform="translate(${f.x} ${f.y}) scale(${n(f.s * 1.3)})" opacity="${n(0.55 + f.s * 0.45)}">
      <path d="M-62 120 V48 C-62 -2 62 -2 62 48 V120 Z" fill="url(#f${i})"/>
      <circle cx="0" cy="-48" r="36" fill="${f.c}"/>
      <circle cx="0" cy="-48" r="36" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="2"/>
    </g>`;
  });

  // Chat-Blasen
  const bubble = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M-46 -26 H46 A14 14 0 0 1 60 -12 V12 A14 14 0 0 1 46 26 H-10 L-26 42 L-24 26 H-46 A14 14 0 0 1 -60 12 V-12 A14 14 0 0 1 -46 -26 Z" fill="${c}" fill-opacity="0.9"/>
      <circle cx="-22" cy="0" r="6" fill="#0b0716"/><circle cx="0" cy="0" r="6" fill="#0b0716"/><circle cx="22" cy="0" r="6" fill="#0b0716"/>
    </g>`;
  body += bubble(455, 150, 0.9, "#a78bfa");
  body += bubble(770, 120, 1.1, "#14b8a6");
  body += bubble(950, 215, 0.7, "#f472b6");

  return frame({ bg1: "#0c0716", bg2: "#04090c", glow: "#a78bfa", glowY: 330, defs, body });
}

// ── 3. Racing ───────────────────────────────────────────────────────────────
function racing() {
  const r = rng(33);
  const VX = 820, VY = 250;
  const BL = 330, BR = 1290; // Straßenränder am unteren Bildrand
  const P = (u, t) => [VX + t * (BL + u * (BR - BL) - VX), VY + t * (H - VY)];
  let body = "";

  // Speed-Streifen im Himmel
  for (let i = 0; i < 34; i++) {
    const y = 30 + r() * 200, len = 160 + r() * 520, x = -50 + r() * 700;
    body += `<rect x="${n(x)}" y="${n(y)}" width="${n(len)}" height="${n(1 + r() * 3)}" rx="1.5" fill="url(#streak)" opacity="${n(0.25 + r() * 0.6)}"/>`;
  }

  // Skyline am Horizont
  let sky = [[0, VY]];
  for (let x = 0; x <= W; x += 22) sky.push([x, VY - 6 - r() * (x > 650 && x < 1000 ? 14 : 46)]);
  sky.push([W, VY]);
  body += `<polygon points="${pts(sky)}" fill="#120604"/>`;

  // Boden
  body += `<rect x="0" y="${VY}" width="${W}" height="${H - VY}" fill="#0a0504"/>`;
  body += `<polygon points="${pts([P(0, 0), P(1, 0), P(1, 1), P(0, 1)])}" fill="url(#road)"/>`;

  // Kerbs + Mittelstreifen (perspektivisch gestaucht)
  const ts = [];
  for (let t = 0.02; t < 1.1; t *= 1.22) ts.push(Math.min(t, 1));
  for (let i = 0; i < ts.length - 1; i++) {
    const t0 = ts[i], t1 = ts[i + 1];
    const col = i % 2 ? "#f8fafc" : "#dc2626";
    body += `<polygon points="${pts([P(-0.07, t0), P(0, t0), P(0, t1), P(-0.07, t1)])}" fill="${col}" fill-opacity="0.9"/>`;
    body += `<polygon points="${pts([P(1, t0), P(1.07, t0), P(1.07, t1), P(1, t1)])}" fill="${col}" fill-opacity="0.9"/>`;
    if (i % 2 === 0) {
      const tm = t0 + (t1 - t0) * 0.6;
      body += `<polygon points="${pts([P(0.49, t0), P(0.51, t0), P(0.51, tm), P(0.49, tm)])}" fill="#fde68a" fill-opacity="0.85"/>`;
    }
  }

  // Leuchtende Randlinien
  body += `<line x1="${VX}" y1="${VY}" x2="${BL}" y2="${H}" stroke="#ff7a18" stroke-width="2" stroke-opacity="0.8"/>`;
  body += `<line x1="${VX}" y1="${VY}" x2="${BR}" y2="${H}" stroke="#ff7a18" stroke-width="2" stroke-opacity="0.8"/>`;
  body += `<line x1="0" y1="${VY}" x2="${W}" y2="${VY}" stroke="#ffb15c" stroke-opacity="0.5" stroke-width="1.5"/>`;

  // Speed-Linien am Boden links
  for (let i = 0; i < 14; i++) {
    const t = 0.25 + r() * 0.75;
    const [x, y] = P(-0.2 - r() * 0.6, t);
    body += `<line x1="${n(x)}" y1="${n(y)}" x2="${n(x - 120 - r() * 260)}" y2="${n(y)}" stroke="#ff7a18" stroke-opacity="${n(0.15 + r() * 0.3)}" stroke-width="${n(1 + r() * 2)}"/>`;
  }

  const defs = `
  <linearGradient id="streak" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#ff7a18" stop-opacity="0"/><stop offset="1" stop-color="#ffd29a"/>
  </linearGradient>
  <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2a1a14"/><stop offset="1" stop-color="#14100f"/>
  </linearGradient>`;

  return frame({ bg1: "#1a0904", bg2: "#060304", glow: "#ff7a18", glowX: VX, glowY: VY, glowR: 600, glowOpacity: 0.5, defs, body });
}

// ── 4. Action & Shooter ─────────────────────────────────────────────────────
function shooter() {
  const r = rng(44);
  const red = "#ef4444";
  const CX = 720, CY = 300;
  let body = "";

  // Hex-Raster, zum Fadenkreuz hin heller
  const s = 30, hw = Math.sqrt(3) * s;
  for (let row = -1; row < H / (s * 1.5) + 1; row++) {
    for (let col = -1; col < W / hw + 1; col++) {
      const x = col * hw + (row % 2 ? hw / 2 : 0), y = row * s * 1.5;
      const d = Math.hypot(x - CX, y - CY);
      const op = Math.max(0.03, 0.22 - d / 3000);
      const corners = Array.from({ length: 6 }, (_, k) => {
        const a = Math.PI / 6 + (k * Math.PI) / 3;
        return [x + Math.cos(a) * (s - 2), y + Math.sin(a) * (s - 2)];
      });
      const fill = r() < 0.05 && d < 420 ? ` fill="${red}" fill-opacity="0.12"` : ` fill="none"`;
      body += `<polygon points="${pts(corners)}"${fill} stroke="${red}" stroke-opacity="${n(op)}" stroke-width="1"/>`;
    }
  }

  // Radar-Sweep
  const a0 = -Math.PI / 2, a1 = a0 + 0.9, R = 260;
  body += `<path d="M${CX} ${CY} L${n(CX + Math.cos(a0) * R)} ${n(CY + Math.sin(a0) * R)} A${R} ${R} 0 0 1 ${n(CX + Math.cos(a1) * R)} ${n(CY + Math.sin(a1) * R)} Z" fill="url(#sweep)"/>`;

  // Fadenkreuz
  body += `<circle cx="${CX}" cy="${CY}" r="160" fill="none" stroke="${red}" stroke-width="3" stroke-opacity="0.9"/>`;
  body += `<circle cx="${CX}" cy="${CY}" r="100" fill="none" stroke="${red}" stroke-width="1.5" stroke-opacity="0.6" stroke-dasharray="6 8"/>`;
  body += `<circle cx="${CX}" cy="${CY}" r="7" fill="#fecaca"/>`;
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    body += `<line x1="${n(CX + Math.cos(a) * 30)}" y1="${n(CY + Math.sin(a) * 30)}" x2="${n(CX + Math.cos(a) * 210)}" y2="${n(CY + Math.sin(a) * 210)}" stroke="#fecaca" stroke-width="3" stroke-linecap="round"/>`;
  }
  for (let k = 0; k < 36; k++) {
    const a = (k * Math.PI) / 18, l = k % 3 === 0 ? 14 : 7;
    body += `<line x1="${n(CX + Math.cos(a) * 160)}" y1="${n(CY + Math.sin(a) * 160)}" x2="${n(CX + Math.cos(a) * (160 + l))}" y2="${n(CY + Math.sin(a) * (160 + l))}" stroke="${red}" stroke-width="2" stroke-opacity="0.8"/>`;
  }

  // HUD-Ecken
  const bx = 250, by = 190, L = 40;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const x = CX + sx * bx, y = CY + sy * by;
    body += `<path d="M${x} ${y - sy * L} V${y} H${x - sx * L}" fill="none" stroke="#fecaca" stroke-opacity="0.7" stroke-width="3"/>`;
  }

  // Ziel-Blips
  for (const [x, y, rr] of [[810, 210, 9], [600, 380, 7], [870, 360, 6], [380, 160, 8], [1010, 470, 7]]) {
    body += `<circle cx="${x}" cy="${y}" r="${rr}" fill="${red}"/><circle cx="${x}" cy="${y}" r="${rr * 2.4}" fill="none" stroke="${red}" stroke-opacity="0.4"/>`;
  }

  // Scanlines links
  for (let y = 0; y < H; y += 6) body += `<rect x="0" y="${y}" width="420" height="1" fill="#fff" fill-opacity="0.025"/>`;

  const defs = `
  <radialGradient id="sweep" cx="${CX}" cy="${CY}" r="260" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${red}" stop-opacity="0.05"/><stop offset="1" stop-color="${red}" stop-opacity="0.35"/>
  </radialGradient>`;

  return frame({ bg1: "#120406", bg2: "#050307", glow: red, glowX: CX, glowY: CY, glowOpacity: 0.28, defs, body });
}

// ── 5. Retro & Arcade ───────────────────────────────────────────────────────
function retro() {
  const r = rng(55);
  const HY = 400; // Horizont
  let body = "";

  for (let i = 0; i < 90; i++) {
    body += `<circle cx="${n(r() * W)}" cy="${n(r() * (HY - 40))}" r="${n(0.6 + r() * 1.6)}" fill="#fff" fill-opacity="${n(0.2 + r() * 0.7)}"/>`;
  }

  // Sonne mit Schlitzen (clipPath aus Streifen)
  let clip = `<rect x="0" y="0" width="${W}" height="275"/>`;
  let y = 275, gap = 4, h = 20;
  while (y < HY) {
    y += gap;
    clip += `<rect x="0" y="${y}" width="${W}" height="${Math.max(h, 4)}"/>`;
    y += h;
    gap += 2.5;
    h -= 2.5;
  }
  body += `<circle cx="600" cy="300" r="190" fill="url(#sun)" clip-path="url(#slits)"/>`;

  // Berge
  const mount = (seed, base, amp, col, stroke) => {
    const rr = rng(seed);
    const p = [[0, HY]];
    for (let x = 0; x <= W; x += 60) {
      const centre = Math.abs(x - 600) < 230 ? 0.35 : 1;
      p.push([x, HY - (20 + rr() * amp) * centre]);
    }
    p.push([W, HY]);
    return `<polygon points="${pts(p)}" fill="${col}" stroke="${stroke}" stroke-opacity="0.6" stroke-width="1.5"/>`;
  };
  body += mount(5, HY, 150, "#1d0636", "#ff3cac");
  body += mount(6, HY, 80, "#12021f", "#22d3ee");

  // Boden + Raster
  body += `<rect x="0" y="${HY}" width="${W}" height="${H - HY}" fill="url(#floor)"/>`;
  for (let k = 1; k <= 12; k++) {
    const yy = HY + (H - HY) * Math.pow(k / 12, 2.2);
    body += `<line x1="0" y1="${n(yy)}" x2="${W}" y2="${n(yy)}" stroke="#ff3cac" stroke-opacity="${n(0.25 + k * 0.05)}" stroke-width="${n(1 + k * 0.12)}"/>`;
  }
  for (let k = -16; k <= 16; k++) {
    body += `<line x1="600" y1="${HY}" x2="${600 + k * 160}" y2="${H}" stroke="#ff3cac" stroke-opacity="0.55" stroke-width="1.5"/>`;
  }
  body += `<rect x="0" y="${HY - 1}" width="${W}" height="3" fill="#22d3ee"/>`;
  body += `<rect x="0" y="${HY}" width="${W}" height="70" fill="url(#haze)"/>`;

  const defs = `
  <clipPath id="slits">${clip}</clipPath>
  <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffe66d"/><stop offset="0.55" stop-color="#ff7a59"/><stop offset="1" stop-color="#ff2fa6"/>
  </linearGradient>
  <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1a0430"/><stop offset="1" stop-color="#07010f"/>
  </linearGradient>
  <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#22d3ee" stop-opacity="0.25"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>
  </linearGradient>`;

  return frame({ bg1: "#0a0218", bg2: "#2a0636", glow: "#ff3cac", glowY: 320, glowOpacity: 0.4, defs, body });
}

// ── 6. Strategie ────────────────────────────────────────────────────────────
function strategie() {
  const r = rng(66);
  const size = 44, tilt = 0.6, CX = 600, CY = 320, depth = 12;
  const teal = "#14b8a6", red = "#b91c1c", blue = "#60a5fa";
  const hexes = [];
  const RAD = 6;
  for (let q = -RAD; q <= RAD; q++) {
    for (let rr = -RAD; rr <= RAD; rr++) {
      if (Math.abs(q + rr) > RAD) continue;
      const x = size * Math.sqrt(3) * (q + rr / 2);
      const y = size * 1.5 * rr;
      if (Math.abs(x) > 640) continue;
      hexes.push({ q, r: rr, sx: CX + x, sy: CY + y * tilt });
    }
  }
  hexes.sort((a, b) => a.sy - b.sy);
  const corner = (h, k, dy = 0) => {
    const a = Math.PI / 6 + (k * Math.PI) / 3;
    return [h.sx + Math.cos(a) * (size - 2), h.sy + Math.sin(a) * (size - 2) * tilt + dy];
  };

  let body = "";
  for (const h of hexes) {
    const dist = (Math.abs(h.q) + Math.abs(h.r) + Math.abs(h.q + h.r)) / 2;
    const v = r();
    let fill = "#0f1d3a", op = 0.9;
    if (v < 0.18) fill = "#0a1430";            // Wasser
    else if (v > 0.85) fill = "#1e3a66";       // Gebirge
    if (h.q <= -2 && h.r >= -2 && h.r <= 3) fill = teal, op = 0.35 + r() * 0.2;
    if (h.q >= 2 && h.r <= 2 && h.r >= -3) fill = red, op = 0.35 + r() * 0.2;
    const fade = Math.max(0.15, 1 - dist / (RAD + 1));
    const top = Array.from({ length: 6 }, (_, k) => corner(h, k));
    const side = [corner(h, 0), corner(h, 1), corner(h, 2), corner(h, 3), corner(h, 3, depth), corner(h, 2, depth), corner(h, 1, depth), corner(h, 0, depth)];
    body += `<g opacity="${n(fade)}">`;
    body += `<polygon points="${pts(side)}" fill="#030712"/>`;
    body += `<polygon points="${pts(top)}" fill="${fill}" fill-opacity="${n(op)}" stroke="${blue}" stroke-opacity="0.35" stroke-width="1.2"/>`;
    body += `</g>`;
  }

  const at = (q, rr) => hexes.find((h) => h.q === q && h.r === rr);
  // Hauptstädte
  const castle = (h, col) => `<g transform="translate(${n(h.sx)} ${n(h.sy - 8)})">
      <path d="M-22 0 V-34 H-14 V-26 H-6 V-34 H6 V-26 H14 V-34 H22 V0 Z" fill="${col}" stroke="#fff" stroke-opacity="0.5" stroke-width="1.5"/>
      <rect x="-5" y="-14" width="10" height="14" rx="5" fill="#030712"/>
      <line x1="0" y1="-34" x2="0" y2="-58" stroke="#fff" stroke-width="2"/>
      <path d="M0 -58 L18 -52 L0 -46 Z" fill="${col}"/>
    </g>`;
  const flag = (h, col) => `<g transform="translate(${n(h.sx)} ${n(h.sy)})">
      <ellipse cx="0" cy="0" rx="9" ry="4" fill="#000" fill-opacity="0.5"/>
      <line x1="0" y1="0" x2="0" y2="-34" stroke="#e5e7eb" stroke-width="2"/>
      <path d="M0 -34 L16 -29 L0 -24 Z" fill="${col}"/>
    </g>`;

  // Marschroute
  const A = at(-3, 1), B = at(-1, 0), C = at(1, -1), D = at(3, -1);
  body += `<path d="M${n(A.sx)} ${n(A.sy)} Q${n(B.sx)} ${n(B.sy - 70)} ${n(C.sx)} ${n(C.sy)} T${n(D.sx)} ${n(D.sy)}" fill="none" stroke="#e0f2fe" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round" stroke-opacity="0.85"/>`;
  body += castle(at(-4, 1), teal);
  body += castle(at(4, -1), red);
  for (const [q, rr, c] of [[-2, -1, teal], [-3, 3, teal], [-1, 2, teal], [3, 1, red], [2, -3, red], [4, -3, red]]) {
    const h = at(q, rr);
    if (h) body += flag(h, c);
  }

  return frame({ bg1: "#050b1a", bg2: "#02040a", glow: blue, glowY: 300, glowOpacity: 0.28, body });
}

// ── 7. Quiz & Party ─────────────────────────────────────────────────────────
function quiz() {
  const r = rng(77);
  const cols = ["#facc15", "#f472b6", "#22d3ee", "#a3e635", "#fb923c"];
  let body = "";

  for (let i = 0; i < 140; i++) {
    const x = r() * W, y = r() * H, w = 6 + r() * 12, h = 3 + r() * 6;
    body += `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="1.5" fill="${cols[i % cols.length]}" fill-opacity="${n(0.35 + r() * 0.55)}" transform="rotate(${Math.round(r() * 360)} ${n(x)} ${n(y)})"/>`;
  }

  const bubble = (x, y, s, c, rot) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
      <path d="M-120 -80 H120 A30 30 0 0 1 150 -50 V40 A30 30 0 0 1 120 70 H-20 L-70 115 L-60 70 H-120 A30 30 0 0 1 -150 40 V-50 A30 30 0 0 1 -120 -80 Z" fill="${c}"/>
    </g>`;
  body += bubble(430, 250, 1.05, "#f472b6", -8);
  body += bubble(890, 400, 0.75, "#22d3ee", 7);

  // Ausrufezeichen im Cyan-Bubble
  body += `<g transform="translate(895 395) rotate(7)"><rect x="-9" y="-48" width="18" height="56" rx="9" fill="#0b0a12"/><circle cx="0" cy="30" r="10" fill="#0b0a12"/></g>`;
  // Punkte im Pink-Bubble
  body += `<g transform="translate(430 252) rotate(-8)"><circle cx="-60" cy="-8" r="16" fill="#0b0a12"/><circle cx="0" cy="-8" r="16" fill="#0b0a12"/><circle cx="60" cy="-8" r="16" fill="#0b0a12"/></g>`;

  // Großes Fragezeichen mit Glow
  const qm = (extra) => `<g transform="translate(680 300) scale(2.1) rotate(10)" ${extra}>
      <path d="M-40 -58 C-40 -112 40 -112 40 -58 C40 -22 0 -18 0 18" fill="none" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="0" cy="62" r="15" stroke="none"/>
    </g>`;
  body += qm(`stroke="#facc15" fill="#facc15" opacity="0.6" filter="url(#blur)"`);
  body += qm(`stroke="#fde047" fill="#fde047"`);

  const defs = `<filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>`;
  return frame({ bg1: "#141004", bg2: "#12061a", glow: "#facc15", glowX: 680, glowY: 300, glowOpacity: 0.3, defs, body });
}

// ── 8. Koop & Raid ──────────────────────────────────────────────────────────
function koop() {
  const r = rng(88);
  const green = "#34d399";
  let body = "";

  // Aufsteigende Chevrons
  for (let i = 0; i < 6; i++) {
    const y = 560 - i * 70;
    body += `<path d="M300 ${y + 60} L600 ${y - 40} L900 ${y + 60}" fill="none" stroke="${green}" stroke-opacity="${n(0.04 + i * 0.012)}" stroke-width="22" stroke-linejoin="round"/>`;
  }
  // Partikel
  for (let i = 0; i < 60; i++) {
    const x = 200 + r() * 800, y = r() * H, l = 6 + r() * 26;
    body += `<line x1="${n(x)}" y1="${n(y)}" x2="${n(x)}" y2="${n(y - l)}" stroke="${green}" stroke-opacity="${n(0.15 + r() * 0.5)}" stroke-width="2" stroke-linecap="round"/>`;
  }

  const shield = "M0 -120 L95 -85 V-10 C95 60 50 105 0 130 C-50 105 -95 60 -95 -10 V-85 Z";
  const sh = (x, y, rot, s, grad, op) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" opacity="${op}">
      <path d="${shield}" fill="url(#${grad})" stroke="#ecfdf5" stroke-opacity="0.5" stroke-width="3"/>
      <path d="${shield}" fill="none" stroke="#000" stroke-opacity="0.3" stroke-width="10" transform="scale(0.82)"/>
    </g>`;
  body += sh(455, 330, -16, 1.05, "sA", 0.85);
  body += sh(745, 330, 16, 1.05, "sB", 0.85);
  body += sh(600, 305, 0, 1.3, "sC", 1);
  // Emblem: verschlungene Ringe
  body += `<g transform="translate(600 300)" fill="none" stroke-width="9">
      <circle cx="-22" cy="0" r="34" stroke="#ecfdf5"/>
      <circle cx="22" cy="0" r="34" stroke="#ecfdf5" stroke-opacity="0.85"/>
    </g>`;

  const defs = `
  <linearGradient id="sA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14b8a6"/><stop offset="1" stop-color="#064e3b"/></linearGradient>
  <linearGradient id="sB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22c55e"/><stop offset="1" stop-color="#14532d"/></linearGradient>
  <linearGradient id="sC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6ee7b7"/><stop offset="0.5" stop-color="#10b981"/><stop offset="1" stop-color="#064e3b"/></linearGradient>`;
  return frame({ bg1: "#03120d", bg2: "#020607", glow: green, glowY: 300, glowOpacity: 0.32, defs, body });
}

// ── 9. Sport ────────────────────────────────────────────────────────────────
function sport() {
  const r = rng(99);
  const TY = 270; // Oberkante Spielfeld
  const TL = 330, TR = 870, BL = -260, BR = 1460;
  const P = (u, t) => {
    // t perspektivisch: 0 = hinten, 1 = vorne
    const yy = TY + (H - TY) * t;
    const xl = TL + (BL - TL) * t, xr = TR + (BR - TR) * t;
    return [xl + (xr - xl) * u, yy];
  };
  const depth = (k) => Math.pow(k, 1.6);
  let body = "";

  // Tribüne mit Lichtpunkten
  body += `<rect x="0" y="${TY - 120}" width="${W}" height="120" fill="#04110b"/>`;
  for (let i = 0; i < 260; i++) {
    body += `<circle cx="${n(r() * W)}" cy="${n(TY - 112 + r() * 104)}" r="${n(0.8 + r() * 1.3)}" fill="#fff" fill-opacity="${n(0.08 + r() * 0.35)}"/>`;
  }

  // Rasenstreifen
  for (let i = 0; i < 10; i++) {
    const t0 = depth(i / 10), t1 = depth((i + 1) / 10);
    body += `<polygon points="${pts([P(0, t0), P(1, t0), P(1, t1), P(0, t1)])}" fill="${i % 2 ? "#0f5132" : "#136b3f"}"/>`;
  }
  // Linien
  const line = (a, b) => `<line x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}" stroke="#ecfdf5" stroke-opacity="0.75" stroke-width="3"/>`;
  body += `<polygon points="${pts([P(0.04, 0.02), P(0.96, 0.02), P(0.96, 1.2), P(0.04, 1.2)])}" fill="none" stroke="#ecfdf5" stroke-opacity="0.75" stroke-width="3"/>`;
  const tm = depth(0.62);
  body += line(P(0.04, tm), P(0.96, tm));
  const [mx, my] = P(0.5, tm);
  const rx = (P(0.62, tm)[0] - mx);
  body += `<ellipse cx="${n(mx)}" cy="${n(my)}" rx="${n(rx)}" ry="${n(rx * 0.32)}" fill="none" stroke="#ecfdf5" stroke-opacity="0.75" stroke-width="3"/>`;
  body += `<ellipse cx="${n(mx)}" cy="${n(my)}" rx="6" ry="3" fill="#ecfdf5"/>`;
  // Strafraum hinten
  const t16 = depth(0.12);
  body += `<polyline points="${pts([P(0.3, 0.02), P(0.3, t16), P(0.7, t16), P(0.7, 0.02)])}" fill="none" stroke="#ecfdf5" stroke-opacity="0.6" stroke-width="2.5"/>`;

  // Flutlicht-Kegel
  body += `<polygon points="60,0 220,0 760,${H} 120,${H}" fill="url(#beam)"/>`;
  body += `<polygon points="980,0 1140,0 1080,${H} 440,${H}" fill="url(#beam)"/>`;
  for (const x of [140, 1060]) {
    body += `<rect x="${x - 60}" y="12" width="120" height="34" rx="4" fill="#0b1f15" stroke="#fff" stroke-opacity="0.3"/>`;
    for (let i = 0; i < 6; i++) body += `<circle cx="${x - 45 + i * 18}" cy="29" r="6" fill="#fff" fill-opacity="0.95"/>`;
  }

  const defs = `
  <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
  </linearGradient>`;
  return frame({ bg1: "#03140c", bg2: "#020806", glow: "#22c55e", glowY: 360, glowOpacity: 0.25, defs, body });
}

// ── 10. Allround (Markenfarben) ─────────────────────────────────────────────
function allround() {
  const teal = [20, 184, 166], red = [185, 28, 28];
  const mix = (t) => `rgb(${teal.map((c, i) => Math.round(c + (red[i] - c) * t)).join(",")})`;
  let body = "";
  const lines = 26;
  for (let i = 0; i < lines; i++) {
    const t = i / (lines - 1);
    const p = [];
    for (let x = -20; x <= W + 20; x += 20) {
      const y = 315
        + (i - lines / 2) * 9
        + Math.sin(x / 170 + i * 0.22) * 70 * Math.sin((x / W) * Math.PI)
        + Math.cos(x / 90 + i * 0.4) * 10;
      p.push([x, y]);
    }
    body += `<polyline points="${pts(p)}" fill="none" stroke="${mix(t)}" stroke-opacity="${n(0.25 + 0.5 * Math.sin(t * Math.PI))}" stroke-width="${n(1 + Math.sin(t * Math.PI) * 1.5)}"/>`;
  }
  // Rauten-Emblem
  body += `<g transform="translate(600 315) rotate(45)">
      <rect x="-70" y="-70" width="140" height="140" rx="10" fill="#06080f" fill-opacity="0.85" stroke="url(#dia)" stroke-width="4"/>
      <rect x="-46" y="-46" width="92" height="92" rx="6" fill="none" stroke="#fff" stroke-opacity="0.25" stroke-width="2"/>
      <rect x="-14" y="-14" width="28" height="28" rx="3" fill="url(#dia)"/>
    </g>`;
  const defs = `<linearGradient id="dia" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14b8a6"/><stop offset="1" stop-color="#b91c1c"/></linearGradient>`;
  return frame({ bg1: "#06080f", bg2: "#0c0a16", glow: "#14b8a6", glowY: 315, glowOpacity: 0.2, defs, body });
}

const covers = { turnier, community, racing, shooter, retro, strategie, quiz, koop, sport, allround };

fs.mkdirSync(OUT, { recursive: true });
for (const [id, fn] of Object.entries(covers)) {
  const svg = fn();
  fs.writeFileSync(path.join(OUT, `${id}.svg`), svg);
  console.log(`${id}.svg  ${(svg.length / 1024).toFixed(1)} KB`);
}
