"use client";
import { Plus, Trash2 } from "@/components/icons";

/** pointsPer = Punkte in der Reihentabelle; eventPointsPer = abweichende Punkte im Event (Skill-Index), leer = gleich */
export type StatRow = { field: string; pointsPer: number; eventPointsPer?: number; isWinnerStat?: boolean; isMatchWinStat?: boolean };

/**
 * Gemeinsamer Editor für die Statistiken einer Eventreihe (Wizard + Reihen-Bearbeitung): Feldname,
 * Punkte pro Einheit, 🏆 Sieger-Stat / ⚔️ Match-Win-Stat und — optional — abweichende Punkte für die
 * Reihentabelle.
 *
 * Datenmodell (siehe StatConfig in lib/series-event-points.ts): pointsPer zählt für die Reihentabelle,
 * eventPointsPer (falls gesetzt) für den Skill-Index im Event. Die UI zeigt "Punkte" als den Wert, der
 * im Event gilt; erst mit "Reihentabelle abweichend" erscheint ein zweites Feld für die Reihentabelle.
 */
export default function StatRowsEditor({
  rows,
  onChange,
  showWinnerToggle = true,
  showMatchWinToggle = true,
  showLeagueOverride = false,
  accentClassName = "text-teal-400 hover:text-teal-300",
  inputClassName = "rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors",
  inputStyle,
}: {
  rows: StatRow[];
  onChange: (rows: StatRow[]) => void;
  showWinnerToggle?: boolean;
  showMatchWinToggle?: boolean;
  /** Pro Zeile "Reihentabelle abweichend" anbieten (nur sinnvoll bei Eventreihen) */
  showLeagueOverride?: boolean;
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

  const isDivergent = (r: StatRow) => typeof r.eventPointsPer === "number";
  /** Punkte, die im Event gelten (Hauptfeld) */
  const eventPoints = (r: StatRow) => (isDivergent(r) ? r.eventPointsPer! : r.pointsPer);
  function setEventPoints(i: number, v: number) {
    const r = rows[i];
    update(i, isDivergent(r) ? { eventPointsPer: v } : { pointsPer: v });
  }
  function toggleDivergent(i: number) {
    const r = rows[i];
    if (isDivergent(r)) {
      // Zurück auf "gleich": der Event-Wert gilt wieder für beides
      const { eventPointsPer, ...rest } = r;
      onChange(rows.map((row, ri) => (ri === i ? { ...rest, pointsPer: eventPointsPer! } : row)));
    } else {
      update(i, { eventPointsPer: r.pointsPer });
    }
  }

  const toggleCls = (on: boolean) => `shrink-0 text-base transition-opacity ${on ? "opacity-100" : "opacity-30 hover:opacity-60"}`;

  return (
    <div className="space-y-1.5">
      {rows.length > 0 && (
        <p className="text-[11px] text-gray-500">
          Feldname → Punkte pro Einheit
          {showWinnerToggle && " — 🏆 = +1 bei Event-Sieg"}
          {showMatchWinToggle && " — ⚔️ = +1 pro Match Win aus einzelnen Runden"}
          {showLeagueOverride && " — ⇄ = eigene Punkte für die Reihentabelle"}
        </p>
      )}
      {rows.map((row, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center gap-2">
            {/* Breiten über Wrapper statt am Input: Hosts reichen oft ein inputClassName mit "w-full"
                durch, das sonst w-20 überschreibt und das Feldname-Feld auf 0 Breite quetscht. */}
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={row.field}
                onChange={e => update(i, { field: e.target.value })}
                placeholder="z.B. Kills"
                aria-label="Feldname"
                className={`${inputClassName} w-full`}
                style={inputStyle}
              />
            </div>
            <div className="w-20 shrink-0">
              <input
                type="number"
                value={eventPoints(row)}
                onChange={e => setEventPoints(i, Number(e.target.value))}
                placeholder="Pkt./Einheit"
                aria-label="Punkte pro Einheit"
                title={isDivergent(row) ? "Punkte im Event (Eventpunkte)" : "Punkte im Event und in der Reihentabelle"}
                className={`${inputClassName} w-full text-center`}
                style={inputStyle}
              />
            </div>
            {showWinnerToggle && (
              <button type="button"
                title="Dieser Stat bekommt +1, wenn ein Spieler ein Event in dieser Reihe gewinnt"
                onClick={() => update(i, { isWinnerStat: !row.isWinnerStat })}
                className={toggleCls(!!row.isWinnerStat)}>
                🏆
              </button>
            )}
            {showMatchWinToggle && (
              <button type="button"
                title="Dieser Stat bekommt +1 pro Match Win, das pro Runde eines Events markiert wird"
                onClick={() => update(i, { isMatchWinStat: !row.isMatchWinStat })}
                className={toggleCls(!!row.isMatchWinStat)}>
                ⚔️
              </button>
            )}
            {showLeagueOverride && (
              <button type="button"
                title={isDivergent(row) ? "Reihentabelle wieder mit denselben Punkten wie im Event" : "Eigene Punkte für die Reihentabelle festlegen"}
                aria-pressed={isDivergent(row)}
                onClick={() => toggleDivergent(i)}
                className={`shrink-0 text-sm font-semibold transition-colors ${isDivergent(row) ? "text-indigo-300" : "text-gray-600 hover:text-gray-400"}`}>
                ⇄
              </button>
            )}
            <button type="button" onClick={() => remove(i)} aria-label="Statistik entfernen"
              className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {showLeagueOverride && isDivergent(row) && (
            <div className="flex items-center gap-2 pl-3">
              <span className="flex-1 text-[11px] text-indigo-300/80 text-right">
                Punkte in der Reihentabelle
              </span>
              <div className="w-20 shrink-0">
                <input
                  type="number"
                  value={row.pointsPer}
                  onChange={e => update(i, { pointsPer: Number(e.target.value) })}
                  aria-label="Punkte in der Reihentabelle"
                  className={`${inputClassName} w-full text-center`}
                  style={inputStyle}
                />
              </div>
              {/* Platzhalter, damit das Feld unter dem Punkte-Feld steht */}
              <span className="shrink-0" style={{ width: (showWinnerToggle ? 24 : 0) + (showMatchWinToggle ? 24 : 0) + 22 + 14 }} />
            </div>
          )}
        </div>
      ))}
      <button type="button" onClick={add}
        className={`flex items-center gap-1 text-xs transition-colors ${accentClassName}`}>
        <Plus className="w-3.5 h-3.5" /> Statistik hinzufügen
      </button>
    </div>
  );
}
