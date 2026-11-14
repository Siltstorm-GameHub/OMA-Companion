"use client";
// Schalter "OMA Original" für Event- und Reihen-Formulare (nur Mods, siehe lib/oma-original.ts).
// Originals tragen das Logo-Siegel auf dem Cover, normale Events nicht.

export default function OmaOriginalToggle({
  checked,
  onChange,
  kind,
  inheritedFromSeries = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  /** Formulierung des Hinweises: Einzel-Event oder ganze Reihe */
  kind: "event" | "series";
  /** Event gehört zu einer Original-Reihe: Schalter ist dann fest an */
  inheritedFromSeries?: boolean;
}) {
  const on = checked || inheritedFromSeries;
  return (
    <div
      className="rounded-xl p-4 border transition-colors"
      style={{
        background: on ? "rgba(20,184,166,0.07)" : "rgba(255,255,255,0.02)",
        borderColor: on ? "rgba(20,184,166,0.35)" : "rgba(255,255,255,0.08)",
      }}
    >
      <label className={`flex items-start gap-3 select-none ${inheritedFromSeries ? "cursor-default" : "cursor-pointer"}`}>
        <input
          type="checkbox"
          checked={on}
          disabled={inheritedFromSeries}
          onChange={e => onChange(e.target.checked)}
          className="w-4 h-4 mt-1 rounded accent-teal-500 shrink-0 disabled:opacity-60"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- statisches Asset, next/image lohnt sich für ein kleines Icon nicht */}
        <img
          src="/brand/logo-128.webp"
          alt=""
          className="w-9 h-9 shrink-0 rounded-full bg-black/85 p-0.5"
          style={{ boxShadow: "0 0 0 1.5px rgba(45,212,191,0.75)", opacity: on ? 1 : 0.55 }}
        />
        <div className="min-w-0">
          <p className="text-sm text-gray-200">
            <span className="font-semibold tracking-[0.12em] text-teal-300">OMA</span>{" "}
            <span className="font-semibold uppercase tracking-[0.12em]">Original</span>
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {inheritedFromSeries
              ? "Die Reihe ist ein OMA Original, deshalb gilt das auch für diesen Termin."
              : kind === "series"
              ? "Eigene Reihe der Old Masters Allies. Alle Termine tragen das OMA-Logo auf dem Cover, auch in Discord."
              : "Eigenes Event der Old Masters Allies. Trägt das OMA-Logo auf dem Cover, auch in Discord."}
          </p>
        </div>
      </label>
    </div>
  );
}
