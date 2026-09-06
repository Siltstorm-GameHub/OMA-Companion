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

export const LOGO_URL = "/brand/logo-512.png";
const LOGO_MARGIN = 20;
const LOGO_SIZE = 72;

function drawLogo(ctx: CanvasRenderingContext2D, logo: HTMLImageElement, w: number, h: number, position: LogoPosition) {
  const aspect = logo.width / logo.height;
  const lh = LOGO_SIZE;
  const lw = lh * aspect;
  const x = position.includes("left") ? LOGO_MARGIN : w - lw - LOGO_MARGIN;
  const y = position.includes("top") ? LOGO_MARGIN : h - lh - LOGO_MARGIN;
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
