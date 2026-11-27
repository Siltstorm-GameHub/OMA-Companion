/**
 * Wallpaper-Studio (OMA Hub): zeichnet ein persönliches Hintergrundbild auf ein <canvas>.
 * Läuft komplett im Browser — das Bild des Users wird nie hochgeladen.
 *
 * Alle Maße hängen an `u` (= kürzere Seite / 1000), damit jedes Format (16:9, 21:9,
 * Handy hochkant …) dieselbe Komposition bekommt. Hochkant-Formate stapeln Bild und
 * Text untereinander statt nebeneinander.
 */

export type WallpaperTemplate = "emblem" | "backdrop" | "split" | "mosaic";

export const WALLPAPER_TEMPLATES: { key: WallpaperTemplate; label: string; hint: string }[] = [
  { key: "emblem", label: "Emblem", hint: "Dein Bild im leuchtenden Ring" },
  { key: "backdrop", label: "Kulisse", hint: "Dein Bild als weiche Kulisse" },
  { key: "split", label: "Split", hint: "Bild und Schriftzug geteilt" },
  { key: "mosaic", label: "Mosaik", hint: "Dein Bild als Muster" },
];

export const WALLPAPER_FORMATS = [
  { key: "fhd", label: "Full HD", w: 1920, h: 1080, group: "Desktop" },
  { key: "qhd", label: "WQHD", w: 2560, h: 1440, group: "Desktop" },
  { key: "uhd", label: "4K", w: 3840, h: 2160, group: "Desktop" },
  { key: "uw", label: "Ultrawide", w: 3440, h: 1440, group: "Desktop" },
  { key: "phone", label: "Smartphone", w: 1179, h: 2556, group: "Handy" },
  { key: "tablet", label: "Tablet", w: 2048, h: 2732, group: "Handy" },
] as const;

export type WallpaperFormatKey = (typeof WALLPAPER_FORMATS)[number]["key"];

export const WALLPAPER_ACCENTS = [
  { key: "teal", label: "OMA Teal", hex: "#14B8A6" },
  { key: "amber", label: "Gold", hex: "#F59E0B" },
  { key: "violet", label: "Violett", hex: "#8B5CF6" },
  { key: "rose", label: "Rose", hex: "#F43F5E" },
  { key: "blue", label: "Blau", hex: "#3B82F6" },
  { key: "green", label: "Grün", hex: "#10B981" },
] as const;

export type WallpaperOptions = {
  template: WallpaperTemplate;
  width: number;
  height: number;
  accent: string;
  title: string;
  subtitle: string;
  showLogo: boolean;
  /** 1 = Bild füllt den Ausschnitt gerade so, >1 = hineinzoomen */
  zoom: number;
  /** -1 … 1: Ausschnitt verschieben */
  offsetX: number;
  offsetY: number;
  fontFamily: string;
};

export type WallpaperImages = { photo: HTMLImageElement | ImageBitmap | null; logo: HTMLImageElement | null };

const INK = "#0B1120";
const PAPER = "#F7F7F5";

type Img = HTMLImageElement | ImageBitmap;
const imgW = (i: Img) => ("naturalWidth" in i ? i.naturalWidth : i.width);
const imgH = (i: Img) => ("naturalHeight" in i ? i.naturalHeight : i.height);

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Bild "cover" in ein Rechteck zeichnen, mit Zoom und Verschiebung des Ausschnitts. */
function drawCover(ctx: CanvasRenderingContext2D, img: Img, x: number, y: number, w: number, h: number, zoom = 1, ox = 0, oy = 0) {
  const iw = imgW(img), ih = imgH(img);
  const scale = Math.max(w / iw, h / ih) * zoom;
  const sw = w / scale, sh = h / scale;
  const sx = (iw - sw) / 2 + ((iw - sw) / 2) * ox;
  const sy = (ih - sh) / 2 + ((ih - sh) / 2) * oy;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/** Weichgezeichnete Version per Verkleinern + Hochskalieren (funktioniert auch ohne ctx.filter, z. B. Safari). */
function drawBlurredCover(ctx: CanvasRenderingContext2D, img: Img, w: number, h: number, strength = 24) {
  const small = document.createElement("canvas");
  small.width = Math.max(8, Math.round(w / strength));
  small.height = Math.max(8, Math.round(h / strength));
  const sctx = small.getContext("2d")!;
  sctx.imageSmoothingQuality = "high";
  drawCover(sctx, img, 0, 0, small.width, small.height, 1.15);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small, 0, 0, w, h);
  ctx.restore();
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function baseBackground(ctx: CanvasRenderingContext2D, w: number, h: number, accent: string, u: number) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#0E1628");
  g.addColorStop(1, "#05080F");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Zwei Akzent-Lichter
  const glow = (x: number, y: number, r: number, a: number) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, rgba(accent, a));
    rg.addColorStop(1, rgba(accent, 0));
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);
  };
  glow(w * 0.18, h * 0.2, 700 * u, 0.28);
  glow(w * 0.85, h * 0.9, 800 * u, 0.2);

  // Feines Raster
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = Math.max(1, u);
  const step = 60 * u;
  for (let x = (w % step) / 2; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = (h % step) / 2; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.restore();
}

function vignette(ctx: CanvasRenderingContext2D, w: number, h: number, a = 0.7) {
  const r = Math.hypot(w, h) / 2;
  const g = ctx.createRadialGradient(w / 2, h / 2, r * 0.35, w / 2, h / 2, r);
  g.addColorStop(0, "rgba(5,8,15,0)");
  g.addColorStop(1, `rgba(5,8,15,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function placeholderPhoto(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, accent: string) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, rgba(accent, 0.55));
  g.addColorStop(1, "#1E293B");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function circlePhoto(ctx: CanvasRenderingContext2D, o: WallpaperOptions, img: Img | null, cx: number, cy: number, r: number, u: number) {
  // Leuchtender Ring
  ctx.save();
  ctx.shadowColor = rgba(o.accent, 0.8);
  ctx.shadowBlur = 90 * u;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 14 * u, 0, Math.PI * 2);
  ctx.fillStyle = o.accent;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, r + 5 * u, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  if (img) drawCover(ctx, img, cx - r, cy - r, r * 2, r * 2, o.zoom, o.offsetX, o.offsetY);
  else placeholderPhoto(ctx, cx - r, cy - r, r * 2, r * 2, o.accent);
  ctx.restore();

  // Äußerer, dünner Orbit
  ctx.save();
  ctx.strokeStyle = rgba(o.accent, 0.35);
  ctx.lineWidth = 3 * u;
  ctx.setLineDash([2 * u, 18 * u]);
  ctx.beginPath();
  ctx.arc(cx, cy, r + 60 * u, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Schriftgröße so wählen, dass der Text in maxW passt. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, family: string, maxSize: number, maxW: number) {
  let size = maxSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxW) {
    size *= 0.94;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function drawSpaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: CanvasTextAlign) {
  // letterSpacing wird nicht überall unterstützt — Zeichen einzeln setzen
  const chars = [...text];
  const total = chars.reduce((s, c) => s + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
  let cx = align === "center" ? x - total / 2 : align === "right" || align === "end" ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  for (const c of chars) { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + spacing; }
  ctx.textAlign = prev;
  return total;
}

function textBlock(
  ctx: CanvasRenderingContext2D, o: WallpaperOptions, x: number, y: number, maxW: number, u: number,
  align: CanvasTextAlign, sizeFactor = 1,
) {
  const fam = o.fontFamily;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";

  let cursor = y;
  if (o.title.trim()) {
    const size = fitFont(ctx, o.title, 700, fam, 150 * u * sizeFactor, maxW);
    ctx.fillStyle = PAPER;
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 30 * u;
    ctx.fillText(o.title, x, cursor + size * 0.8);
    ctx.shadowBlur = 0;
    cursor += size * 0.8 + 40 * u * sizeFactor;
  }
  if (o.subtitle.trim()) {
    const sub = o.subtitle.toUpperCase();
    let size = 34 * u * sizeFactor;
    ctx.font = `700 ${size}px ${fam}`;
    let spacing = size * 0.35;
    // Breite inkl. Sperrung begrenzen
    while (size > 8) {
      const total = [...sub].reduce((s, c) => s + ctx.measureText(c).width, 0) + spacing * (sub.length - 1);
      if (total <= maxW) break;
      size *= 0.94; spacing = size * 0.35;
      ctx.font = `700 ${size}px ${fam}`;
    }
    ctx.fillStyle = o.accent;
    drawSpaced(ctx, sub, x, cursor + size, spacing, align);
  }
}

function drawLogo(ctx: CanvasRenderingContext2D, o: WallpaperOptions, logo: HTMLImageElement | null, x: number, y: number, size: number) {
  if (!o.showLogo || !logo) return;
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.drawImage(logo, x, y, size, size);
  ctx.restore();
}

function cornerLogo(ctx: CanvasRenderingContext2D, o: WallpaperOptions, logo: HTMLImageElement | null, w: number, h: number, u: number) {
  const size = 110 * u;
  drawLogo(ctx, o, logo, w - size - 60 * u, h - size - 60 * u, size);
}

// ── Vorlagen ────────────────────────────────────────────────────────────────

function renderEmblem(ctx: CanvasRenderingContext2D, o: WallpaperOptions, im: WallpaperImages, u: number) {
  const { width: w, height: h } = o;
  baseBackground(ctx, w, h, o.accent, u);
  const portrait = h > w;
  const r = 230 * u;
  if (portrait) {
    const cy = h * 0.4;
    circlePhoto(ctx, o, im.photo, w / 2, cy, r, u);
    textBlock(ctx, o, w / 2, cy + r + 130 * u, w * 0.84, u, "center");
  } else {
    const cy = h * 0.42;
    circlePhoto(ctx, o, im.photo, w / 2, cy, r, u);
    textBlock(ctx, o, w / 2, cy + r + 90 * u, w * 0.7, u, "center", 0.8);
  }
  vignette(ctx, w, h, 0.5);
  cornerLogo(ctx, o, im.logo, w, h, u);
}

function renderBackdrop(ctx: CanvasRenderingContext2D, o: WallpaperOptions, im: WallpaperImages, u: number) {
  const { width: w, height: h } = o;
  if (im.photo) drawBlurredCover(ctx, im.photo, w, h);
  else baseBackground(ctx, w, h, o.accent, u);

  // Abdunkeln + Akzentschleier
  ctx.fillStyle = "rgba(5,8,15,0.55)";
  ctx.fillRect(0, 0, w, h);
  const tint = ctx.createLinearGradient(0, h, w, 0);
  tint.addColorStop(0, rgba(o.accent, 0.35));
  tint.addColorStop(0.6, rgba(o.accent, 0));
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, w, h);
  vignette(ctx, w, h, 0.75);

  const portrait = h > w;
  const side = (portrait ? 560 : 520) * u;
  const rad = 60 * u;
  const px = portrait ? (w - side) / 2 : w * 0.16;
  const py = portrait ? h * 0.24 : (h - side) / 2;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 80 * u;
  roundRectPath(ctx, px, py, side, side, rad);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRectPath(ctx, px, py, side, side, rad);
  ctx.clip();
  if (im.photo) drawCover(ctx, im.photo, px, py, side, side, o.zoom, o.offsetX, o.offsetY);
  else placeholderPhoto(ctx, px, py, side, side, o.accent);
  ctx.restore();
  ctx.save();
  roundRectPath(ctx, px, py, side, side, rad);
  ctx.strokeStyle = rgba(o.accent, 0.9);
  ctx.lineWidth = 8 * u;
  ctx.stroke();
  ctx.restore();

  if (portrait) {
    textBlock(ctx, o, w / 2, py + side + 120 * u, w * 0.84, u, "center");
  } else {
    const tx = px + side + 110 * u;
    const maxW = w - tx - w * 0.08;
    textBlock(ctx, o, tx, h / 2 - 110 * u, maxW, u, "left");
  }
  cornerLogo(ctx, o, im.logo, w, h, u);
}

function renderSplit(ctx: CanvasRenderingContext2D, o: WallpaperOptions, im: WallpaperImages, u: number) {
  const { width: w, height: h } = o;
  baseBackground(ctx, w, h, o.accent, u);
  const portrait = h > w;
  const slant = 160 * u;

  // Bildfläche mit schräger Kante
  ctx.save();
  ctx.beginPath();
  if (portrait) {
    const edge = h * 0.55;
    ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, edge - slant); ctx.lineTo(0, edge + slant); ctx.closePath();
    ctx.clip();
    if (im.photo) drawCover(ctx, im.photo, 0, 0, w, edge + slant, o.zoom, o.offsetX, o.offsetY);
    else placeholderPhoto(ctx, 0, 0, w, edge + slant, o.accent);
  } else {
    const edge = w * 0.52;
    ctx.moveTo(0, 0); ctx.lineTo(edge + slant, 0); ctx.lineTo(edge - slant, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.clip();
    if (im.photo) drawCover(ctx, im.photo, 0, 0, edge + slant, h, o.zoom, o.offsetX, o.offsetY);
    else placeholderPhoto(ctx, 0, 0, edge + slant, h, o.accent);
  }
  // leichte Abdunklung zur Kante hin
  const shade = portrait ? ctx.createLinearGradient(0, 0, 0, h * 0.7) : ctx.createLinearGradient(0, 0, w * 0.6, 0);
  shade.addColorStop(0, "rgba(5,8,15,0)");
  shade.addColorStop(1, "rgba(5,8,15,0.45)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Akzent-Streifen entlang der Kante
  ctx.save();
  ctx.strokeStyle = o.accent;
  ctx.shadowColor = rgba(o.accent, 0.9);
  ctx.shadowBlur = 40 * u;
  ctx.lineWidth = 14 * u;
  ctx.beginPath();
  if (portrait) { const e = h * 0.55; ctx.moveTo(0, e + slant + 30 * u); ctx.lineTo(w, e - slant + 30 * u); }
  else { const e = w * 0.52; ctx.moveTo(e + slant + 30 * u, 0); ctx.lineTo(e - slant + 30 * u, h); }
  ctx.stroke();
  ctx.restore();

  if (portrait) {
    textBlock(ctx, o, w / 2, h * 0.55 + slant + 140 * u, w * 0.84, u, "center");
    const size = 130 * u;
    drawLogo(ctx, o, im.logo, (w - size) / 2, h - size - 120 * u, size);
  } else {
    const left = w * 0.52 + slant + 120 * u;
    const maxW = w - left - w * 0.06;
    const cx = left + maxW / 2;
    const size = 150 * u;
    drawLogo(ctx, o, im.logo, cx - size / 2, h / 2 - size - 90 * u, size);
    textBlock(ctx, o, cx, h / 2 - 40 * u, maxW, u, "center", 0.85);
  }
}

function renderMosaic(ctx: CanvasRenderingContext2D, o: WallpaperOptions, im: WallpaperImages, u: number) {
  const { width: w, height: h } = o;
  ctx.fillStyle = "#070B14";
  ctx.fillRect(0, 0, w, h);

  // Gedrehtes Raster aus runden Kacheln
  const tile = 150 * u;
  const gap = 36 * u;
  const step = tile + gap;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 12);
  const span = Math.hypot(w, h) / 2 + step;
  let row = 0;
  for (let y = -span; y < span; y += step, row++) {
    const shift = row % 2 ? step / 2 : 0;
    for (let x = -span + shift; x < span; x += step) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, tile / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalAlpha = 0.55;
      if (im.photo) drawCover(ctx, im.photo, x - tile / 2, y - tile / 2, tile, tile, o.zoom, o.offsetX, o.offsetY);
      else placeholderPhoto(ctx, x - tile / 2, y - tile / 2, tile, tile, o.accent);
      ctx.restore();
    }
  }
  ctx.restore();

  // Akzent-Tönung + starker Mittel-Schleier, damit der Schriftzug lesbar bleibt
  ctx.fillStyle = rgba(o.accent, 0.18);
  ctx.fillRect(0, 0, w, h);
  const r = Math.min(w, h) * 0.75;
  const center = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, r);
  center.addColorStop(0, "rgba(5,8,15,0.92)");
  center.addColorStop(0.55, "rgba(5,8,15,0.7)");
  center.addColorStop(1, "rgba(5,8,15,0.15)");
  ctx.fillStyle = center;
  ctx.fillRect(0, 0, w, h);
  vignette(ctx, w, h, 0.6);

  const portrait = h > w;
  const logoSize = (portrait ? 260 : 220) * u;
  const top = h / 2 - logoSize - (portrait ? 40 : 30) * u;
  drawLogo(ctx, o, im.logo, (w - logoSize) / 2, top, logoSize);
  textBlock(ctx, o, w / 2, h / 2 + (o.showLogo ? 30 : -100) * u, portrait ? w * 0.84 : w * 0.6, u, "center", portrait ? 1 : 0.85);
}

export function renderWallpaper(ctx: CanvasRenderingContext2D, o: WallpaperOptions, im: WallpaperImages) {
  const u = Math.min(o.width, o.height) / 1000;
  ctx.save();
  ctx.clearRect(0, 0, o.width, o.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  switch (o.template) {
    case "emblem": renderEmblem(ctx, o, im, u); break;
    case "backdrop": renderBackdrop(ctx, o, im, u); break;
    case "split": renderSplit(ctx, o, im, u); break;
    case "mosaic": renderMosaic(ctx, o, im, u); break;
  }
  ctx.restore();
}
