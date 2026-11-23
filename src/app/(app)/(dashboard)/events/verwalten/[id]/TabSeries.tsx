"use client";
import { inputCls, labelCls } from "./edit-shared";
import type { EventEdit } from "./useEventEdit";

/** Reiter "Reihe": Sieger-Ermittlung eines Termins mit Bracket-Format. */
export default function TabSeries({ ctx }: { ctx: EventEdit }) {
  const { seriesWinnerMode, setSeriesWinnerMode, seriesWinnerStatField, setSeriesWinnerStatField } = ctx;
  return (
    <div className="space-y-4">
          <div className="rounded-control border border-line bg-surface-2/50 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-fg/90 mb-1">Sieger-Ermittlung für die Reihe</h3>
              <p className="text-xs text-subtle">Wie wird der Sieger eines einzelnen Events in dieser Reihe ermittelt?</p>
            </div>
            <div className="space-y-2">
              {([
                { value: "manual",  label: "Manuell",          desc: "Admin wählt Sieger beim Abschluss aus" },
                { value: "bracket", label: "Turnier-Bracket",  desc: "Finalist des Brackets gewinnt" },
                { value: "stat",    label: "Höchste Stat",     desc: "Spieler mit höchstem Wert einer Stat gewinnt" },
              ] as const).map(opt => (
                <button key={opt.value} type="button" onClick={() => setSeriesWinnerMode(opt.value)}
                  className={`w-full flex items-start gap-3 rounded-control px-3 py-2.5 border text-left transition-all ${
                    seriesWinnerMode === opt.value
                      ? "border-primary/60 bg-primary/10"
                      : "border-gray-700 bg-gray-800 hover:border-gray-600"
                  }`}>
                  <div className={`w-3.5 h-3.5 rounded-full border mt-0.5 flex-shrink-0 ${seriesWinnerMode === opt.value ? "border-primary bg-primary" : "border-gray-600"}`} />
                  <div>
                    <p className={`text-sm font-medium ${seriesWinnerMode === opt.value ? "text-primary-fg" : "text-fg/90"}`}>{opt.label}</p>
                    <p className="text-xs text-subtle mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            {seriesWinnerMode === "stat" && (
              <div>
                <label className={labelCls}>Stat-Name (Feldname)</label>
                <input
                  type="text"
                  value={seriesWinnerStatField}
                  onChange={e => setSeriesWinnerStatField(e.target.value)}
                  placeholder="z.B. Kills"
                  className={inputCls}
                />
                <p className="text-xs text-subtle mt-1">Der Spieler mit dem höchsten Wert in diesem Feld gewinnt das Event.</p>
              </div>
            )}
            <p className="text-xs text-subtle">Gespeichert wird über die Leiste unten, zusammen mit den anderen Änderungen.</p>
          </div>
        </div>
  );
}
