"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Tv2, ArrowRight, ArrowLeft, Check, Smartphone } from "@/components/icons";
import PresetPicker from "@/components/overlay/PresetPicker";
import { matchingPreset, type LayoutPreset } from "@/components/overlay/layoutPresets";
import { OverlayConnectionStatus, useOverlayConnection } from "@/components/overlay/OverlayConnectionStatus";
import { PAUSE_BACKGROUNDS, pauseThumbnail } from "@/components/overlay/pauseBackgrounds";
import type { OverlayLayouts } from "@/components/overlay/OverlayLayoutsEditor";
import SceneLink, { obsDragUrl } from "./SceneLink";
import LiveControlQr, { LIVE_CONTROL_PATH } from "./LiveControlQr";

export const WIZARD_DONE_KEY = "oma-overlay-wizard-done";

const STEPS = ["In OBS einfügen", "Verbindung prüfen", "Aussehen wählen", "Live-Steuerung"];

/**
 * Einrichtungs-Assistent für Einsteiger — erscheint beim ersten Besuch, solange der Link noch nie
 * geöffnet wurde. Führt in vier Schritten zum laufenden Overlay; alles Gewählte wird sofort
 * gespeichert, danach geht es zur normalen Einstellungsseite.
 */
export default function OverlaySetupWizard({
  overlayUrl, layouts, pauseBackground: initialBackground, onClose,
}: { overlayUrl: string; layouts: OverlayLayouts; pauseBackground: string; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [preset, setPreset] = useState<string | null>(() => matchingPreset(layouts.event, layouts.profile));
  const [background, setBackground] = useState(initialBackground);
  const connection = useOverlayConnection(3000);

  async function save(body: Record<string, unknown>) {
    const res = await fetch("/api/profile/overlay", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }).catch(() => null);
    if (!res?.ok) toast.error("Konnte nicht gespeichert werden – versuch es gleich nochmal");
    return !!res?.ok;
  }

  async function pickPreset(p: LayoutPreset) {
    setPreset(p.key);
    await save({ event: p.event, profile: p.profile });
  }

  async function pickBackground(key: string) {
    setBackground(key);
    await save({ pauseBackground: key });
  }

  function finish() {
    try { localStorage.setItem(WIZARD_DONE_KEY, "1"); } catch { /* ohne Speicher erscheint er beim nächsten Mal erneut */ }
    onClose();
  }

  return (
    <div className="glass rounded-2xl p-5 sm:p-6 space-y-5">
      {/* Fortschritt */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div className={`h-1 rounded-full ${i <= step ? "bg-teal-400" : "bg-white/10"}`} />
            <span className={`hidden sm:block mt-1.5 text-[11px] ${i === step ? "text-teal-200" : "text-gray-500"}`}>{i + 1}. {label}</span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-white">Schritt 1: Overlay in OBS einfügen</h2>
            <p className="text-sm text-gray-400 mt-1">Das machst du nur ein einziges Mal – der Link bleibt immer gleich.</p>
          </div>
          <ol className="space-y-2 text-sm text-gray-300 list-decimal pl-5">
            <li>Öffne OBS und wähle unten links die Szene, in der du spielst.</li>
            <li>
              Zieh den Knopf <span className="text-teal-300 font-medium">„In OBS ziehen“</span> mit der Maus in das Feld
              <span className="text-gray-100"> „Quellen“</span> in OBS. Größe und Name werden automatisch gesetzt.
            </li>
            <li>Schieb die neue Quelle in der Liste ganz nach oben, damit sie über deinem Spiel liegt.</li>
          </ol>
          <SceneLink icon={Tv2} label="Dein Overlay-Link" hint="bleibt immer gleich" url={overlayUrl} dragUrl={obsDragUrl(overlayUrl, "OMA Overlay")} />
          <p className="text-xs text-gray-500">
            Ziehen klappt nicht? In OBS bei „Quellen“ auf <span className="text-gray-300">+</span> → <span className="text-gray-300">Browser</span>{" "}
            klicken, den Link einfügen (Kopieren-Knopf) und Breite <span className="text-gray-300">1920</span> und Höhe{" "}
            <span className="text-gray-300">1080</span> eintragen.
          </p>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-white">Schritt 2: Verbindung prüfen</h2>
            <p className="text-sm text-gray-400 mt-1">Sobald OBS dein Overlay geladen hat, wird es hier grün.</p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-black/20 px-4 py-4">
            <OverlayConnectionStatus connection={connection} />
          </div>
          {connection && !connection.obs && (
            <p className="text-xs text-gray-500">
              {connection.online
                ? "Der Link ist offen, aber nicht in OBS – z.B. in einem Browser-Tab. Füge ihn wie in Schritt 1 in OBS ein."
                : "Noch nichts zu sehen? Prüfe, ob die Browser-Quelle in OBS sichtbar ist (Auge-Symbol) und der Link vollständig eingefügt wurde. Es dauert nach dem Einfügen ein paar Sekunden."}
            </p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-white">Schritt 3: Aussehen wählen</h2>
            <p className="text-sm text-gray-400 mt-1">Wird sofort übernommen – in OBS siehst du es nach wenigen Sekunden. Alles lässt sich später ändern.</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-200 mb-2">Anordnung</p>
            <PresetPicker active={preset} onPick={pickPreset} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-200 mb-2">Hintergrund für Pause & Clips</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {PAUSE_BACKGROUNDS.slice(0, 12).map(bg => (
                <button
                  key={bg.key}
                  type="button"
                  onClick={() => pickBackground(bg.key)}
                  aria-pressed={background === bg.key}
                  title={bg.label}
                  className={`relative aspect-video rounded-lg overflow-hidden ${background === bg.key ? "ring-2 ring-teal-400" : "ring-1 ring-white/10 hover:ring-white/30"}`}
                  style={{
                    backgroundImage: bg.image ? `${bg.overlay}, url(${pauseThumbnail(bg)})` : `${bg.overlay}, repeating-conic-gradient(#2a2a32 0% 25%, #1c1c22 0% 50%) 50% / 12px 12px`,
                    backgroundSize: "cover", backgroundPosition: "center",
                  }}
                >
                  <span className="absolute inset-x-0 bottom-0 px-1 py-0.5 text-[10px] text-white bg-black/60 truncate">{bg.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-white">Schritt 4: Live-Steuerung aufs Handy</h2>
            <p className="text-sm text-gray-400 mt-1">
              Damit wechselst du während des Streams zwischen Spiel, Pause, Intro, Clips und Outro – ganz ohne OBS anzufassen.
            </p>
          </div>
          <LiveControlQr />
          <Link href={LIVE_CONTROL_PATH} className="inline-flex items-center gap-2 text-sm text-teal-300 hover:underline">
            <Smartphone className="w-4 h-4" /> Oder hier am PC öffnen
          </Link>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
        <button onClick={finish} className="text-xs text-gray-500 hover:text-gray-300">Assistent schließen</button>
        <div className="flex-1" />
        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-white/[0.08] text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Zurück
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-teal-500/15 border border-teal-500/40 text-teal-200 hover:bg-teal-500/25 font-medium"
          >
            {step === 1 && !connection?.obs ? "Später prüfen, weiter" : "Weiter"} <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={finish}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-teal-500/20 border border-teal-400/50 text-teal-100 hover:bg-teal-500/30 font-medium"
          >
            <Check className="w-4 h-4" /> Fertig
          </button>
        )}
      </div>
    </div>
  );
}
