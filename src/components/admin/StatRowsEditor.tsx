"use client";
import { Plus, Trash2 } from "lucide-react";

export type StatRow = { field: string; pointsPer: number; isWinnerStat?: boolean; isMatchWinStat?: boolean };

/**
 * Punkt 3: Gemeinsamer Editor für "Punkte pro Stat-Feld" (inkl. 🏆 Sieger-Stat / ⚔️ Match-Win-Stat
 * Flags) — vorher unabhängig in EventSetupWizard.tsx und SeriesAdminRow.tsx nachgebaut, mit
 * abweichenden Feature-Sets (SeriesAdminRow hatte z.B. keine 🏆/⚔️-Toggles, obwohl das Datenmodell
 * sie unterstützt). Eine Implementierung für beide Stellen verhindert künftiges Auseinanderlaufen.
 */
export default function StatRowsEditor({
  rows,
  onChange,
  showWinnerToggle = true,
  showMatchWinToggle = true,
  accentClassName = "text-teal-400 hover:text-teal-300",
  inputClassName = "rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors",
  inputStyle,
}: {
  rows: StatRow[];
  onChange: (rows: StatRow[]) => void;
  showWinnerToggle?: boolean;
  showMatchWinToggle?: boolean;
  accentClassName?: string;
  inputClassName?: string;
  /** Für Hosts mit eigenem inline-Style statt reiner Tailwind-Klassen (z.B. der Erstellungs-Wizard). */
  inputStyle?: React.CSSProperties;
}) {
  function update(i: number, patch: Partial<StatRow>) {
    onChange(rows.map((r, ri) => (ri === i ? { ...r, ...patch } : r)));
  }
  function remove(i: number) {
    onChange(rows.filter((_, ri) => ri !== i));
  }
  function add() {
    onChange([...rows, { field: "", pointsPer: 1 }]);
  }

  return (
    <div className="space-y-1.5">
      {(showWinnerToggle || showMatchWinToggle) && (
        <p className="text-[11px] text-gray-500">
          Feldname → Punkte pro Einheit
          {showWinnerToggle && " — 🏆 = +1 bei Event-Sieg"}
          {showMatchWinToggle && " — ⚔️ = +1 pro Match Win aus einzelnen Runden"}
        </p>
      )}
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={row.field}
            onChange={e => update(i, { field: e.target.value })}
            placeholder="z.B. Kills"
            className={`min-w-0 flex-1 ${inputClassName}`}
            style={inputStyle}
          />
          <input
            type="number" min={0}
            value={row.pointsPer}
            onChange={e => update(i, { pointsPer: Number(e.target.value) })}
            placeholder="Pkt./Einheit"
            className={`w-20 shrink-0 text-center ${inputClassName}`}
            style={inputStyle}
          />
          {showWinnerToggle && (
            <button type="button"
              title="Dieser Stat bekommt +1, wenn ein Spieler ein Event in dieser Reihe gewinnt"
              onClick={() => update(i, { isWinnerStat: !row.isWinnerStat })}
              className={`shrink-0 text-base transition-opacity ${row.isWinnerStat ? "opacity-100" : "opacity-30 hover:opacity-60"}`}>
              🏆
            </button>
          )}
          {showMatchWinToggle && (
            <button type="button"
              title="Dieser Stat bekommt +1 pro Match Win, das pro Runde eines Events markiert wird"
              onClick={() => update(i, { isMatchWinStat: !row.isMatchWinStat })}
              className={`shrink-0 text-base transition-opacity ${row.isMatchWinStat ? "opacity-100" : "opacity-30 hover:opacity-60"}`}>
              ⚔️
            </button>
          )}
          <button type="button" onClick={() => remove(i)}
            className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button type="button" onClick={add}
        className={`flex items-center gap-1 text-xs transition-colors ${accentClassName}`}>
        <Plus className="w-3.5 h-3.5" /> Statistik hinzufügen
      </button>
    </div>
  );
}
