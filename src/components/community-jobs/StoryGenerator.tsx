"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Download, Smartphone } from "@/components/icons";
import { LOGO_URL, loadImage } from "@/lib/studio-templates";
import { formatBerlinDateTime, startOfBerlinDay } from "@/lib/time";
import { isVideoUrl } from "@/lib/upload-limits";
import type { MarketingEventFacts } from "@/lib/marketing-templates";

/**
 * Story-Grafik 9:16 (1080×1920) für Instagram/Discord: Event-Daten, Countdown („Noch 3 Tage“), Anmeldestand und
 * ein QR-Code zur Anmeldung. Hintergrund: Event-Bild oder ein Bild aus dem Beitrag, sonst Marken-Verlauf.
 */

const W = 1080, H = 1920;
const TEAL = "#2dd4bf";

function countdownLabel(startAt: string, now = new Date()): string {
  const start = new Date(startAt);
  if (start.getTime() <= now.getTime()) return "LÄUFT JETZT";
  const days = Math.round((startOfBerlinDay(start).getTime() - startOfBerlinDay(now).getTime()) / 86_400_000);
  if (days <= 0) return "HEUTE";
  if (days === 1) return "MORGEN";
  return `NOCH ${days} TAGE`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/\s*\S*$/, "")}…`;
    return kept;
  }
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function renderStory(canvas: HTMLCanvasElement, facts: MarketingEventFacts, bgUrl: string | null, headline: string) {
  const ctx = canvas.getContext("2d")!;
  canvas.width = W; canvas.height = H;

  // Hintergrund
  const base = ctx.createLinearGradient(0, 0, W, H);
  base.addColorStop(0, "#0b1220"); base.addColorStop(0.55, "#0f2a2e"); base.addColorStop(1, "#1a1033");
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  if (bgUrl) {
    try {
      const img = await loadImage(bgUrl);
      const scale = Math.max(W / img.width, H / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } catch { /* Bild nicht ladbar → nur Verlauf */ }
  }
  const shade = ctx.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, "rgba(5,8,15,0.55)"); shade.addColorStop(0.35, "rgba(5,8,15,0.25)");
  shade.addColorStop(0.6, "rgba(5,8,15,0.75)"); shade.addColorStop(1, "rgba(5,8,15,0.95)");
  ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);

  // Logo
  try {
    const logo = await loadImage(LOGO_URL);
    const lh = 150, lw = lh * (logo.width / logo.height);
    ctx.drawImage(logo, (W - lw) / 2, 110, lw, lh);
  } catch { /* ohne Logo */ }

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Countdown-Badge
  const cd = countdownLabel(facts.startAt);
  ctx.font = "900 64px sans-serif";
  const cdW = ctx.measureText(cd).width + 100;
  roundRect(ctx, (W - cdW) / 2, 360, cdW, 110, 55);
  ctx.fillStyle = TEAL; ctx.fill();
  ctx.fillStyle = "#04201d"; ctx.fillText(cd, W / 2, 438);

  // Überschrift + Titel
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "600 44px sans-serif";
  ctx.fillText(headline.toUpperCase(), W / 2, 600);
  ctx.fillStyle = "#fff";
  ctx.font = "900 96px sans-serif";
  const titleLines = wrap(ctx, facts.title, W - 140, 3);
  titleLines.forEach((l, i) => ctx.fillText(l, W / 2, 720 + i * 108));
  let y = 720 + titleLines.length * 108 + 10;
  if (facts.game) {
    ctx.fillStyle = TEAL; ctx.font = "700 52px sans-serif";
    ctx.fillText(facts.game, W / 2, y + 20); y += 90;
  }

  // Datum
  ctx.fillStyle = "#fff"; ctx.font = "700 56px sans-serif";
  const when = formatBerlinDateTime(facts.startAt, { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" });
  ctx.fillText(`${when} Uhr`, W / 2, y + 40); y += 110;

  // Anmeldestand
  if (facts.registered > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.font = "500 44px sans-serif";
    const free = facts.maxPlayers ? Math.max(0, facts.maxPlayers - facts.registered) : null;
    ctx.fillText(`${facts.registered} angemeldet${free != null ? ` · ${free > 0 ? `noch ${free} Plätze` : "ausgebucht"}` : ""}`, W / 2, y + 10);
  }

  // QR-Code zur Anmeldung
  const qrSize = 400;
  const qrY = H - qrSize - 330;
  roundRect(ctx, (W - qrSize) / 2 - 30, qrY - 30, qrSize + 60, qrSize + 60, 36);
  ctx.fillStyle = "#fff"; ctx.fill();
  const qrData = await QRCode.toDataURL(facts.url, { width: qrSize, margin: 0, color: { dark: "#0b1220", light: "#ffffff" } });
  const qr = await loadImage(qrData);
  ctx.drawImage(qr, (W - qrSize) / 2, qrY, qrSize, qrSize);

  ctx.fillStyle = "#fff"; ctx.font = "800 60px sans-serif";
  ctx.fillText(facts.training ? "Scannen & dabei sein" : "Scannen & anmelden", W / 2, H - 200);
  ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = "500 38px sans-serif";
  ctx.fillText(facts.url.replace(/^https?:\/\//, ""), W / 2, H - 135);
}

export default function StoryGenerator({ facts, mediaUrls, onExported, upload }: {
  facts: MarketingEventFacts;
  /** Bilder aus dem Beitrag als mögliche Hintergründe. */
  mediaUrls: string[];
  /** Fertige Story als Bild in den Beitrag übernehmen. */
  onExported: (url: string) => void;
  upload: (blob: Blob) => Promise<string>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const images = [...new Set([...(facts.imageUrl ? [facts.imageUrl] : []), ...mediaUrls.filter(u => !isVideoUrl(u))])];
  const [bg, setBg] = useState<string>(images[0] ?? "");
  const [headline, setHeadline] = useState(facts.training ? "Training" : "Event");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    renderStory(canvasRef.current, facts, bg || null, headline).catch(() => {});
  }, [facts, bg, headline]);

  async function toBlob(): Promise<Blob> {
    const c = canvasRef.current!;
    const blob = await new Promise<Blob | null>(res => c.toBlob(res, "image/jpeg", 0.9));
    if (!blob) throw new Error("Grafik konnte nicht erzeugt werden");
    return blob;
  }

  async function download() {
    try {
      const url = URL.createObjectURL(await toBlob());
      const a = document.createElement("a");
      a.href = url; a.download = `story-${facts.title.replace(/[^\w-]+/g, "-").toLowerCase()}.jpg`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      toast.error(err instanceof Error && err.name === "SecurityError" ? "Dieses Hintergrundbild lässt sich nicht exportieren — wähle ein anderes" : "Download fehlgeschlagen");
    }
  }

  async function addToPost() {
    setBusy(true);
    try {
      onExported(await upload(await toBlob()));
      toast.success("Story zum Beitrag hinzugefügt");
    } catch (err) {
      toast.error(err instanceof Error && err.name === "SecurityError" ? "Dieses Hintergrundbild lässt sich nicht exportieren — wähle ein anderes" : err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2 space-y-2">
      <p className="text-[11px] text-gray-400 inline-flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Story 9:16 für Instagram/Discord — mit Countdown und QR-Code zur Anmeldung</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <canvas ref={canvasRef} width={W} height={H} className="w-40 sm:w-48 h-auto rounded-lg border border-white/10 self-center sm:self-start" />
        <div className="space-y-2 flex-1 min-w-0">
          <label className="block space-y-1 text-[11px] text-gray-500">
            Überschrift
            <input value={headline} maxLength={30} onChange={e => setHeadline(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-teal-500/40" />
          </label>
          <label className="block space-y-1 text-[11px] text-gray-500">
            Hintergrund
            <Select size="sm" value={bg} className="w-full" onChange={e => setBg(e.target.value)}>
              <option value="">Marken-Verlauf</option>
              {images.map((u, i) => <option key={u} value={u}>{u === facts.imageUrl ? "Event-Bild" : `Bild ${i + (facts.imageUrl ? 0 : 1)} aus dem Beitrag`}</option>)}
            </Select>
          </label>
          <p className="text-[10px] text-gray-600">Der Countdown gilt für heute — erstelle die Story am Tag, an dem du sie postest.</p>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={download}>Herunterladen</Button>
            <Button size="sm" loading={busy} onClick={addToPost}>Zum Beitrag hinzufügen</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
