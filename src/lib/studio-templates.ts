/**
 * Community-Jobs-Studio: einfacher Canva-artiger Vorlagen-Editor für Fotograf
 * und Marketing Manager. Läuft komplett im Browser auf einem HTML5-Canvas —
 * keine Server-Bildbearbeitung nötig. Vorlagen sind feste Layouts mit
 * ausfüllbaren Textfeldern und optionalem OMA-Logo-Overlay.
 */

export type LogoPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface TemplateField {
  key: string;
  label: string;
  placeholder: string;
  maxLength: number;
}

export interface StudioTemplate {
  id: string;
  label: string;
  fields: TemplateField[];
}

export const STUDIO_TEMPLATES: StudioTemplate[] = [
  { id: "plain", label: "Nur Bild (mit Logo)", fields: [] },
  {
    id: "banner_bottom", label: "Event-Banner (Titel unten)",
    fields: [
      { key: "title", label: "Titel", placeholder: "Rocket-League-Cup", maxLength: 40 },
      { key: "subtitle", label: "Untertitel", placeholder: "Samstag, 20 Uhr", maxLength: 50 },
    ],
  },
  {
    id: "announce_top", label: "Ankündigung (Balken oben)",
    fields: [{ key: "title", label: "Überschrift", placeholder: "Neues Event!", maxLength: 40 }],
  },
  {
    id: "spotlight", label: "Zitat/Highlight (abgedunkelt)",
    fields: [{ key: "title", label: "Text", placeholder: "Was für ein Finale!", maxLength: 60 }],
  },
];

/** Ausgabeformate (Größen-Vorlagen) — Standard ist 16:9. */
export interface StudioFormat { id: string; label: string; width: number; height: number }
export const STUDIO_FORMATS: StudioFormat[] = [
  { id: "wide", label: "16:9 Standard (Event-Banner, Screenshot)", width: 960, height: 540 },
  { id: "discord_banner", label: "Discord/Social-Banner 3:1", width: 1200, height: 400 },
  { id: "square", label: "Quadrat 1:1 (Instagram-Post)", width: 1080, height: 1080 },
  { id: "story", label: "Hochkant 9:16 (Story/Reel)", width: 720, height: 1280 },
];

export const LOGO_URL = "/brand/logo-512.png";
const LOGO_MARGIN = 20;
const LOGO_SIZE = 72;

function drawLogo(ctx: CanvasRenderingContext2D, logo: HTMLImageElement, w: number, h: number, position: LogoPosition) {
  const aspect = logo.width / logo.height;
  const lh = LOGO_SIZE * (Math.min(w, h) / 540);
  const lw = lh * aspect;
  const margin = LOGO_MARGIN * (Math.min(w, h) / 540);
  const x = position.includes("left") ? margin : w - lw - margin;
  const y = position.includes("top") ? margin : h - lh - margin;
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.drawImage(logo, x, y, lw, lh);
  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Zeichnet Bild + Vorlage + Logo auf den Canvas. Bild wird proportional in den Canvas eingepasst (cover). */
export function renderStudioCanvas(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  templateId: string,
  values: Record<string, string>,
  logo: HTMLImageElement | null,
  logoPosition: LogoPosition,
  watermark?: string,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Bild als "cover" einpassen (zuschneiden statt verzerren)
  const imgAspect = image.width / image.height;
  const canvasAspect = w / h;
  let sx = 0, sy = 0, sw = image.width, sh = image.height;
  if (imgAspect > canvasAspect) {
    sw = image.height * canvasAspect;
    sx = (image.width - sw) / 2;
  } else {
    sh = image.width / canvasAspect;
    sy = (image.height - sh) / 2;
  }
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, w, h);

  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";

  if (templateId === "banner_bottom") {
    const barH = h * 0.22;
    const grad = ctx.createLinearGradient(0, h - barH, 0, h);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.75)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, h - barH, w, barH);

    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.round(h * 0.05)}px sans-serif`;
    ctx.fillText(values.title ?? "", w * 0.04, h - barH * 0.55, w * 0.92);
    if (values.subtitle) {
      ctx.font = `${Math.round(h * 0.032)}px sans-serif`;
      ctx.fillText(values.subtitle, w * 0.04, h - barH * 0.2, w * 0.92);
    }
  } else if (templateId === "announce_top") {
    const barH = h * 0.16;
    ctx.fillStyle = "rgba(13, 148, 136, 0.88)"; // teal, passend zur App-Marke
    ctx.fillRect(0, 0, w, barH);
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.round(h * 0.055)}px sans-serif`;
    ctx.fillText(values.title ?? "", w * 0.04, barH / 2, w * 0.92);
  } else if (templateId === "spotlight") {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = `bold ${Math.round(h * 0.07)}px sans-serif`;
    const lines = wrapText(ctx, values.title ?? "", w * 0.85);
    const lineHeight = h * 0.09;
    const startY = h / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => ctx.fillText(line, w / 2, startY + i * lineHeight));
    ctx.textAlign = "left";
  }

  if (logo) drawLogo(ctx, logo, w, h, logoPosition);
  if (watermark) drawWatermark(ctx, watermark, w, h, logoPosition);
}

/** Dezenter Urheber-Vermerk ("© Name · OMA") — auf der Gegenseite des Logos, damit beides nicht kollidiert. */
export function drawWatermark(ctx: CanvasRenderingContext2D, text: string, w: number, h: number, logoPosition: LogoPosition = "bottom-right") {
  const size = Math.max(12, Math.round(Math.min(w, h) * 0.032));
  const margin = Math.round(size * 0.9);
  const right = logoPosition.includes("left");
  const bottom = !logoPosition.includes("top");
  ctx.save();
  ctx.font = `600 ${size}px sans-serif`;
  ctx.textAlign = right ? "right" : "left";
  ctx.textBaseline = bottom ? "bottom" : "top";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = size * 0.4;
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.fillText(text, right ? w - margin : margin, bottom ? h - margin : margin, w * 0.6);
  ctx.restore();
}

/**
 * Collage aus mehreren Bildern (Raster, jedes Bild "cover"-zugeschnitten) mit Titelzeile unten,
 * Logo und optionalem Vermerk. Für die Monats-Collage der Fotografen.
 */
export function renderCollageCanvas(
  canvas: HTMLCanvasElement,
  images: HTMLImageElement[],
  title: string,
  subtitle: string,
  logo: HTMLImageElement | null,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = "#0b0f14";
  ctx.fillRect(0, 0, w, h);

  const barH = Math.round(h * 0.16);
  const gap = 6;
  const gridH = h - barH;
  const cols = images.length <= 2 ? images.length : images.length <= 4 ? 2 : 3;
  const rows = Math.max(1, Math.ceil(images.length / Math.max(1, cols)));
  const cw = (w - gap * (cols + 1)) / Math.max(1, cols);
  const ch = (gridH - gap * (rows + 1)) / rows;

  images.forEach((img, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = gap + col * (cw + gap), y = gap + row * (ch + gap);
    const cellAspect = cw / ch, imgAspect = img.width / img.height;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (imgAspect > cellAspect) { sw = img.height * cellAspect; sx = (img.width - sw) / 2; }
    else { sh = img.width / cellAspect; sy = (img.height - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, cw, ch);
  });

  ctx.fillStyle = "rgba(13, 148, 136, 0.9)";
  ctx.fillRect(0, gridH, w, barH);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = `bold ${Math.round(barH * 0.42)}px sans-serif`;
  ctx.fillText(title, w * 0.03, gridH + barH * 0.38, w * 0.7);
  ctx.font = `${Math.round(barH * 0.24)}px sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(subtitle, w * 0.03, gridH + barH * 0.75, w * 0.7);
  if (logo) {
    const lh = barH * 0.72, lw = lh * (logo.width / logo.height);
    ctx.drawImage(logo, w - lw - w * 0.03, gridH + (barH - lh) / 2, lw, lh);
  }
}

/** Verkleinert ein Foto auf max. `maxSide` Pixel (JPEG) und legt optional ein Wasserzeichen darüber — für den Sammel-Upload. */
export async function prepareUploadImage(file: File, opts: { maxSide?: number; watermark?: string } = {}): Promise<Blob> {
  const maxSide = opts.maxSide ?? 1920;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas nicht verfügbar");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (opts.watermark) drawWatermark(ctx, opts.watermark, canvas.width, canvas.height, "bottom-left");
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob) throw new Error("Bild konnte nicht verarbeitet werden");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
