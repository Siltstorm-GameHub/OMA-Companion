"use client";

import { useMemo, useState } from "react";
import { Copy, ExternalLink, Tv2, Check, LayoutGrid, Table2, Users, Repeat } from "lucide-react";
import { toast } from "sonner";

type PanelKey = "bracket" | "table" | "participants";
type PanelOption = { key: PanelKey; label: string; icon: typeof LayoutGrid; forFormats: string[] | null };
type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const PANEL_OPTIONS: PanelOption[] = [
  { key: "bracket",      label: "Turnierbaum",  icon: LayoutGrid, forFormats: ["single_elimination", "double_elimination"] },
  { key: "table",        label: "Tabelle",       icon: Table2,     forFormats: ["liga", "round_robin", "ffa", "coop_stats", "avg_stats"] },
  { key: "participants", label: "Teilnehmer",    icon: Users,      forFormats: null },
];

const CORNERS: { key: Corner; label: string }[] = [
  { key: "top-left",     label: "Oben links" },
  { key: "top-right",    label: "Oben rechts" },
  { key: "bottom-left",  label: "Unten links" },
  { key: "bottom-right", label: "Unten rechts" },
];

export default function SettingsClient({
  eventId, eventTitle, format, token,
}: { eventId: string; eventTitle: string; format: string | null; token: string }) {
  const relevantPanels = PANEL_OPTIONS.filter(p => !p.forFormats || (format && p.forFormats.includes(format)));
  const [enabled, setEnabled] = useState<Set<PanelKey>>(new Set(relevantPanels.map(p => p.key)));
  const [rotateSeconds, setRotateSeconds] = useState(14);
  const [corner, setCorner] = useState<Corner>("top-right");
  const [copied, setCopied] = useState(false);

  const overlayUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const params = new URLSearchParams({ token });
    if (enabled.size > 0 && enabled.size < relevantPanels.length) {
      params.set("panels", [...enabled].join(","));
    }
    if (rotateSeconds !== 14) params.set("rotate", String(rotateSeconds));
    if (corner !== "top-right") params.set("pos", corner);
    return `${origin}/overlay/${eventId}?${params.toString()}`;
  }, [eventId, token, enabled, relevantPanels.length, rotateSeconds, corner]);

  function toggle(key: PanelKey) {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev; // mindestens ein Panel muss aktiv bleiben
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      toast.success("Link kopiert");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.message("Overlay-Link", { description: overlayUrl });
    }
  }

  return (
    <div className="min-h-dvh flex items-start justify-center p-4 sm:p-8">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-2.5 mb-1">
          <Tv2 className="w-5 h-5 text-teal-400" />
          <h1 className="text-lg font-semibold text-white">Overlay-Einstellungen</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">{eventTitle}</p>

        <div className="glass rounded-2xl p-5 mb-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Angezeigte Bereiche
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Das laufende Match wird immer unten eingeblendet. Wähl zusätzlich, welche Bereiche im Overlay
            erscheinen sollen — bei mehreren rotieren sie automatisch durch, damit dein Gameplay sichtbar bleibt.
          </p>
          <div className="flex flex-wrap gap-2">
            {relevantPanels.map(({ key, label, icon: Icon }) => {
              const active = enabled.has(key);
              return (
                <button
                  key={key}
                  onClick={() => toggle(key)}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border font-medium transition-all ${
                    active
                      ? "bg-teal-500/15 border-teal-500/40 text-teal-300"
                      : "border-white/[0.08] text-gray-500 hover:text-gray-300 hover:border-white/20"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="glass rounded-2xl p-5 mb-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Bildschirmecke
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Der Browser bekommt euer Gameplay-Bild nicht zu sehen und kann das HUD deines Spiels nicht
            automatisch umgehen. Wähl die Ecke, die bei deinem Spiel frei ist — Turnierbaum/Tabelle
            erscheinen dort.
          </p>
          <div className="grid grid-cols-2 gap-2 max-w-xs">
            {CORNERS.map(({ key, label }) => {
              const active = corner === key;
              return (
                <button
                  key={key}
                  onClick={() => setCorner(key)}
                  className={`text-sm px-3 py-2.5 rounded-xl border font-medium transition-all ${
                    active
                      ? "bg-teal-500/15 border-teal-500/40 text-teal-300"
                      : "border-white/[0.08] text-gray-500 hover:text-gray-300 hover:border-white/20"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {enabled.size > 1 && (
          <div className="glass rounded-2xl p-5 mb-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5" /> Rotation
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">Jeder Bereich sichtbar für</span>
              <input
                type="number"
                min={4}
                max={60}
                value={rotateSeconds}
                onChange={e => setRotateSeconds(Math.min(60, Math.max(4, Number(e.target.value) || 14)))}
                className="input-glass w-16 text-center"
              />
              <span className="text-sm text-gray-400">Sekunden</span>
            </div>
          </div>
        )}

        <div className="glass rounded-2xl p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            OBS Browser-Source
          </h2>
          <div className="flex items-center gap-2 mb-3">
            <code className="flex-1 text-xs text-gray-300 bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2.5 overflow-x-auto whitespace-nowrap">
              {overlayUrl}
            </code>
            <button
              onClick={copyLink}
              className="shrink-0 flex items-center gap-1.5 text-sm px-3 py-2.5 rounded-lg bg-teal-500/15 border border-teal-500/40 text-teal-300 hover:bg-teal-500/25 transition-all font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Kopiert" : "Kopieren"}
            </button>
          </div>
          <a
            href={overlayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-teal-300 transition-colors mb-4"
          >
            <ExternalLink className="w-3 h-3" /> Vorschau in neuem Tab öffnen
          </a>
          <div className="text-xs text-gray-500 leading-relaxed border-t border-white/[0.06] pt-3">
            In OBS: <span className="text-gray-300">Quellen → Hinzufügen → Browser-Quelle</span>, obigen Link
            einfügen, Breite <span className="text-gray-300">1920</span>, Höhe <span className="text-gray-300">1080</span>.
          </div>
        </div>
      </div>
    </div>
  );
}
