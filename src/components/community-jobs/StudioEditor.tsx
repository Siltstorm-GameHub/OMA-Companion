"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImageDown } from "@/components/icons";
import { Upload } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useSession } from "next-auth/react";
import {
  STUDIO_TEMPLATES, STUDIO_FORMATS, LOGO_URL, renderStudioCanvas, loadImage, type LogoPosition,
} from "@/lib/studio-templates";

const LOGO_POSITIONS: { value: LogoPosition; label: string }[] = [
  { value: "bottom-right", label: "Unten rechts" },
  { value: "bottom-left", label: "Unten links" },
  { value: "top-right", label: "Oben rechts" },
  { value: "top-left", label: "Oben links" },
];

/**
 * Community-Jobs-Studio: Bild hochladen, Vorlage wählen, Text ausfüllen,
 * OMA-Logo einblenden — alles clientseitig auf Canvas gerendert. Ergebnis wird
 * als PNG exportiert und über /api/upload hochgeladen; `onExported` liefert
 * die finale URL an den Aufrufer (Fotograf-Upload bzw. Marketing-Post-Formular).
 */
export default function StudioEditor({ onExported, allowWatermark = false }: { onExported: (url: string) => void; /** Fotografen: Urheber-Vermerk ("© Name · OMA") einblendbar. */ allowWatermark?: boolean }) {
  const { data: session } = useSession();
  const [formatId, setFormatId] = useState(STUDIO_FORMATS[0].id);
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const format = STUDIO_FORMATS.find(f => f.id === formatId) ?? STUDIO_FORMATS[0];
  const authorName = session?.user?.name ?? "";
  const watermark = allowWatermark && watermarkEnabled ? `© ${authorName || "OMA"} · OMA` : undefined;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [templateId, setTemplateId] = useState(STUDIO_TEMPLATES[0].id);
  const [values, setValues] = useState<Record<string, string>>({});
  const [logoEnabled, setLogoEnabled] = useState(true);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>("bottom-right");
  const [exporting, setExporting] = useState(false);

  useEffect(() => { loadImage(LOGO_URL).then(setLogo).catch(() => {}); }, []);

  useEffect(() => {
    if (!image || !canvasRef.current) return;
    renderStudioCanvas(canvasRef.current, image, templateId, values, logoEnabled ? logo : null, logoPosition, watermark);
  }, [image, logo, templateId, values, logoEnabled, logoPosition, watermark, format]);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Bitte ein Bild wählen"); return; }
    const url = URL.createObjectURL(file);
    loadImage(url).then(setImage).catch(() => toast.error("Bild konnte nicht geladen werden")).finally(() => URL.revokeObjectURL(url));
  }

  const template = STUDIO_TEMPLATES.find(t => t.id === templateId)!;

  async function exportAndUpload() {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    setExporting(true);
    try {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Export fehlgeschlagen");

      const body = new FormData();
      body.append("file", blob, "studio-export.png");
      body.append("kind", "community-job-asset");
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload fehlgeschlagen");

      onExported(data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-3">
      {!image ? (
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/10 rounded-xl py-10 cursor-pointer hover:border-teal-500/30 transition-colors">
          <Upload className="w-5 h-5 text-gray-500" />
          <span className="text-xs text-gray-500">Screenshot oder Foto auswählen</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </label>
      ) : (
        <>
          <div className="rounded-xl overflow-hidden border border-white/10">
            <canvas ref={canvasRef} width={format.width} height={format.height} className="w-full h-auto block" style={{ maxHeight: "70vh", objectFit: "contain" }} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select size="sm" value={formatId} onChange={e => setFormatId(e.target.value)} aria-label="Format">
              {STUDIO_FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </Select>
            <Select size="sm" value={templateId} onChange={e => setTemplateId(e.target.value)}>
              {STUDIO_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
            <label className="flex items-center gap-1.5 text-xs text-gray-400">
              <input type="checkbox" checked={logoEnabled} onChange={e => setLogoEnabled(e.target.checked)} />
              OMA-Logo
            </label>
            {allowWatermark && (
              <label className="flex items-center gap-1.5 text-xs text-gray-400" title="Blendet „© dein Name · OMA“ dezent ein">
                <input type="checkbox" checked={watermarkEnabled} onChange={e => setWatermarkEnabled(e.target.checked)} />
                Wasserzeichen
              </label>
            )}
            {logoEnabled && (
              <Select size="sm" value={logoPosition} onChange={e => setLogoPosition(e.target.value as LogoPosition)}>
                {LOGO_POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </Select>
            )}
          </div>

          {template.fields.length > 0 && (
            <div className="space-y-2">
              {template.fields.map(f => (
                <input key={f.key} value={values[f.key] ?? ""} placeholder={f.placeholder} maxLength={f.maxLength}
                  onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40" />
              ))}
            </div>
          )}

          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={() => setImage(null)}>Anderes Bild</Button>
            <Button loading={exporting} icon={<ImageDown className="w-3.5 h-3.5" />} onClick={exportAndUpload}>Übernehmen</Button>
          </div>
        </>
      )}
    </div>
  );
}
