"use client";
// Terminplanung einer Eventreihe bearbeiten (lib/series-schedule.ts) — gemeinsam für den Assistenten
// (neue Reihe/Saison) und die Reihen-Verwaltung (Umstellung, Regel ändern). Kontrolliert: der Wert ist
// eine vollständige SeriesSchedule, jede Änderung geht über onChange.

import { CalendarDays, Repeat } from "@/components/icons";
import {
  MAX_AHEAD, MAX_INTERVAL_DAYS, MIN_INTERVAL_DAYS, MODE_LABEL, TERM_LABEL, addWallMinutes, defaultSchedule,
  describeMonthlyModes, previewTerms, scheduleProblem, startOfBerlinMonth, startOfBerlinWeek, wallMinutesBetween,
  type ScheduleMode, type ScheduleRhythm, type SeriesSchedule,
} from "@/lib/series-schedule";
import { formatBerlinDateTime, fromDatetimeLocalBerlin, getBerlinDateParts, toDatetimeLocalBerlin } from "@/lib/time";

const inputCls = "w-full rounded-control px-3 py-2 text-sm text-fg outline-none bg-surface-2 border border-line focus:border-primary/50 transition-colors";
const labelCls = "text-xs text-subtle mb-1 block";
const pad = (n: number) => String(n).padStart(2, "0");

type RoundPreset = "week" | "month" | "custom";

/** Welche Runden-Vorlage passt zum Wert? (Kalenderwoche = wöchentlich ab Mo 00:00, Kalendermonat = ab dem 1., 00:00) */
function roundPreset(s: SeriesSchedule): RoundPreset {
  const p = getBerlinDateParts(new Date(s.anchorAt));
  const midnight = p.hour === 0 && p.minute === 0;
  if (s.rhythm === "weekly" && midnight && startOfBerlinWeek(new Date(s.anchorAt)).getTime() === new Date(s.anchorAt).getTime()) return "week";
  if (s.rhythm === "monthly" && midnight && p.day === 1) return "month";
  return "custom";
}

const fmt = (d: Date) => formatBerlinDateTime(d, { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

function safeDate(value: string): Date | null {
  try { const d = fromDatetimeLocalBerlin(value); return isNaN(d.getTime()) ? null : d; } catch { return null; }
}

export default function ScheduleEditor({ value, onChange, lockMode = false, disabled = false, previewCount = 5 }: {
  value: SeriesSchedule;
  onChange: (next: SeriesSchedule) => void;
  /** Ablaufart steht fest (nach dem ersten Festlegen nur mit neuer Saison änderbar) */
  lockMode?: boolean;
  disabled?: boolean;
  previewCount?: number;
}) {
  const s = value;
  const set = (patch: Partial<SeriesSchedule>) => onChange({ ...s, ...patch });
  const anchor = new Date(s.anchorAt);
  const term = TERM_LABEL[s.mode];
  const problem = scheduleProblem(s);
  const preview = problem ? [] : previewTerms(s, previewCount);

  function setMode(mode: ScheduleMode) {
    if (mode === s.mode) return;
    // Wechsel: sinnvolle Standards der anderen Art, Startzeitpunkt bleibt ungefähr
    const base = defaultSchedule(mode, mode === "runden" ? startOfBerlinWeek(anchor) : anchor);
    onChange({ ...base, end: s.end });
  }

  // Feste Termine: Dauer über "Ende des ersten Termins"
  const firstEnd = s.mode === "termine" && s.durationMinutes > 0 ? addWallMinutes(anchor, s.durationMinutes) : null;
  function setAnchorKeepDuration(next: Date | null) {
    if (next) set({ anchorAt: next.toISOString() });
  }
  function setFirstEnd(value: string) {
    if (!value) { set({ durationMinutes: 0 }); return; }
    const end = safeDate(value);
    if (end) set({ durationMinutes: Math.max(0, wallMinutesBetween(anchor, end)) });
  }

  // Runden: Vorlagen
  const preset = s.mode === "runden" ? roundPreset(s) : "custom";
  function setPreset(p: RoundPreset) {
    if (p === "week") set({ rhythm: "weekly", anchorAt: startOfBerlinWeek(anchor).toISOString() });
    else if (p === "month") set({ rhythm: "monthly", anchorAt: startOfBerlinMonth(anchor).toISOString() });
    else set({ rhythm: s.rhythm === "monthly" ? "monthly" : s.rhythm === "days" ? "days" : "weekly" });
  }
  const anchorParts = getBerlinDateParts(anchor);
  const anchorDay = `${anchorParts.year}-${pad(anchorParts.month)}-${pad(anchorParts.day)}`;
  const anchorMonth = `${anchorParts.year}-${pad(anchorParts.month)}`;

  const monthly = s.mode === "termine" && s.rhythm === "monthly" ? describeMonthlyModes(anchor) : null;
  const endDay = s.end.type === "date" ? (() => { const p = getBerlinDateParts(new Date(s.end.at)); return `${p.year}-${pad(p.month)}-${pad(p.day)}`; })() : "";

  return (
    <fieldset disabled={disabled} className="space-y-5 disabled:opacity-60">
      {/* Ablaufart */}
      <div>
        <p className={labelCls}>Wie läuft die Reihe ab?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(["termine", "runden"] as const).map(mode => {
            const active = s.mode === mode;
            return (
              <button key={mode} type="button" onClick={() => setMode(mode)} disabled={lockMode && !active}
                className={`flex flex-col items-start gap-1 rounded-control p-3 border-2 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  active ? "border-primary/60 bg-primary/10" : "border-line bg-surface-2 hover:border-line-strong"}`}>
                <span className={`flex items-center gap-1.5 text-sm font-semibold ${active ? "text-primary-fg" : "text-fg/90"}`}>
                  {mode === "termine" ? <CalendarDays className="w-4 h-4" /> : <Repeat className="w-4 h-4" />} {MODE_LABEL[mode]}
                </span>
                <span className="text-xs text-subtle">
                  {mode === "termine"
                    ? "Treffen zu einer festen Zeit, z. B. jeden Donnerstag 20 Uhr oder am 1. Sonntag im Monat. Einzelne Termine lassen sich verschieben oder absagen."
                    : "Zeiträume, die nahtlos aneinander anschließen, z. B. jede Woche oder jeden Monat eine neue Runde. Teilnehmer erledigen die Aufgabe in ihrer eigenen Zeit und laden den Nachweis hoch."}
                </span>
              </button>
            );
          })}
        </div>
        {lockMode && <p className="text-xs text-subtle mt-1">Die Ablaufart lässt sich nur mit einer neuen Saison wechseln.</p>}
      </div>

      {s.mode === "termine" ? (
        <>
          <div>
            <label className={labelCls}>Rhythmus</label>
            <select value={s.rhythm ?? ""} className={inputCls}
              onChange={e => set({ rhythm: (e.target.value || null) as ScheduleRhythm | null })}>
              <option value="weekly">Jede Woche</option>
              <option value="biweekly">Alle 2 Wochen</option>
              <option value="monthly">Jeden Monat</option>
              <option value="">Keine feste Regel — Termine einzeln anlegen</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Erster Termin</label>
              <input type="datetime-local" className={inputCls} value={toDatetimeLocalBerlin(anchor)}
                onChange={e => setAnchorKeepDuration(safeDate(e.target.value))} />
            </div>
            <div>
              <label className={labelCls}>Ende des ersten Termins (optional)</label>
              <input type="datetime-local" className={inputCls} value={firstEnd ? toDatetimeLocalBerlin(firstEnd) : ""}
                onChange={e => setFirstEnd(e.target.value)} />
              <p className="text-xs text-subtle mt-1">Die Dauer gilt für alle Termine{s.durationMinutes > 24 * 60 ? " — länger als 24 Std., Anmeldung bleibt bis zum Ende offen" : ""}.</p>
            </div>
          </div>
          {monthly && (
            <div className="space-y-1.5">
              <p className={labelCls}>Welcher Tag im Monat?</p>
              {(["dayOfMonth", "weekdayOfMonth"] as const).map(mode => (
                <label key={mode} className="flex items-center gap-2 text-sm text-fg cursor-pointer">
                  <input type="radio" name="schedule-monthly" checked={s.monthlyMode === mode} onChange={() => set({ monthlyMode: mode })} className="accent-primary" />
                  {monthly[mode]}
                </label>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div>
            <p className={labelCls}>Wie lange dauert eine Runde?</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {([["week", "Kalenderwoche", "Mo 00:00 – So 23:59"], ["month", "Kalendermonat", "1. – Monatsende"], ["custom", "Eigener Zeitraum", "Freier Starttag und Länge"]] as const).map(([key, label, desc]) => (
                <button key={key} type="button" onClick={() => setPreset(key)}
                  className={`flex flex-col items-start rounded-control px-3 py-2 border text-left transition-all ${
                    preset === key ? "border-primary/60 bg-primary/10" : "border-line bg-surface-2 hover:border-line-strong"}`}>
                  <span className={`text-sm font-semibold ${preset === key ? "text-primary-fg" : "text-fg/90"}`}>{label}</span>
                  <span className="text-xs text-subtle">{desc}</span>
                </button>
              ))}
            </div>
          </div>
          {preset === "week" && (
            <div>
              <label className={labelCls}>Erste Runde in der Woche vom</label>
              <input type="date" className={inputCls} value={anchorDay}
                onChange={e => { const d = safeDate(`${e.target.value}T12:00`); if (d) set({ anchorAt: startOfBerlinWeek(d).toISOString() }); }} />
            </div>
          )}
          {preset === "month" && (
            <div>
              <label className={labelCls}>Erste Runde im Monat</label>
              <input type="month" className={inputCls} value={anchorMonth}
                onChange={e => { const d = safeDate(`${e.target.value}-01T12:00`); if (d) set({ anchorAt: startOfBerlinMonth(d).toISOString() }); }} />
            </div>
          )}
          {preset === "custom" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Start der ersten Runde</label>
                <input type="datetime-local" className={inputCls} value={toDatetimeLocalBerlin(anchor)}
                  onChange={e => setAnchorKeepDuration(safeDate(e.target.value))} />
              </div>
              <div>
                <label className={labelCls}>Länge einer Runde</label>
                <div className="flex gap-2">
                  <select value={s.rhythm ?? "weekly"} className={inputCls}
                    onChange={e => set({ rhythm: e.target.value as ScheduleRhythm })}>
                    <option value="weekly">1 Woche</option>
                    <option value="biweekly">2 Wochen</option>
                    <option value="monthly">1 Monat</option>
                    <option value="days">Eigene Anzahl Tage</option>
                  </select>
                  {s.rhythm === "days" && (
                    <input type="number" min={MIN_INTERVAL_DAYS} max={MAX_INTERVAL_DAYS} value={s.intervalDays} aria-label="Tage je Runde"
                      onChange={e => set({ intervalDays: Math.min(MAX_INTERVAL_DAYS, Math.max(MIN_INTERVAL_DAYS, Number(e.target.value) || MIN_INTERVAL_DAYS)) })}
                      className="w-24 rounded-control px-3 py-2 text-sm text-fg outline-none bg-surface-2 border border-line" />
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Vorlauf, Übernahme, Ende — nur mit Regel */}
      {s.rhythm && (
        <div className="space-y-4 rounded-control border border-line bg-surface-2/50 p-3">
          <div>
            <label className={labelCls}>So viele kommende {term.many} sind immer schon angelegt</label>
            <select value={s.aheadCount} className={inputCls} onChange={e => set({ aheadCount: Number(e.target.value) })}>
              {Array.from({ length: MAX_AHEAD }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n === 1 ? `Immer ${s.mode === "runden" ? "die nächste Runde" : "der nächste Termin"}` : `Immer die nächsten ${n} ${term.many}`}</option>
              ))}
            </select>
            <p className="text-xs text-subtle mt-1">
              So früh können sich User anmelden, und du kannst Spiel, Aufgabe oder Ziel schon vorab am {term.one} anpassen.
              In der Events-Übersicht erscheint trotzdem nur {s.mode === "runden" ? "die nächste Runde" : "der nächste Termin"}.
            </p>
          </div>
          <label className="flex items-start gap-2 text-sm text-fg/90 cursor-pointer select-none">
            <input type="checkbox" checked={s.carryParticipants} className="rounded mt-0.5" onChange={e => set({ carryParticipants: e.target.checked })} />
            <span>
              Teilnehmer automatisch übernehmen
              <span className="block text-xs text-subtle">Wer zuletzt dabei war, ist {s.mode === "runden" ? "in der neuen Runde" : "beim neuen Termin"} direkt angemeldet und kann sich wieder abmelden.</span>
            </span>
          </label>
          <div>
            <p className={labelCls}>Ende der Reihe</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="schedule-end" checked={s.end.type === "none"} onChange={() => set({ end: { type: "none" } })} className="accent-primary" /> Unbegrenzt
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="schedule-end" checked={s.end.type === "date"} className="accent-primary"
                  onChange={() => set({ end: { type: "date", at: new Date(anchor.getTime() + 90 * 24 * 3600_000).toISOString() } })} /> Bis
              </label>
              {s.end.type === "date" && (
                <input type="date" value={endDay} className="rounded-control px-2 py-1 text-sm text-fg bg-surface-2 border border-line"
                  onChange={e => { const d = safeDate(`${e.target.value}T23:59`); if (d) set({ end: { type: "date", at: d.toISOString() } }); }} />
              )}
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="schedule-end" checked={s.end.type === "count"} className="accent-primary"
                  onChange={() => set({ end: { type: "count", count: 8 } })} /> Nach
              </label>
              {s.end.type === "count" && (
                <span className="flex items-center gap-1.5">
                  <input type="number" min={1} max={500} value={s.end.count} aria-label={`Anzahl ${term.many}`}
                    onChange={e => set({ end: { type: "count", count: Math.max(1, Number(e.target.value) || 1) } })}
                    className="w-20 rounded-control px-2 py-1 text-sm text-fg bg-surface-2 border border-line" />
                  {term.many}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {problem && <p className="text-xs text-danger">{problem}</p>}

      {preview.length > 0 && (
        <div className="rounded-control p-3 border border-line bg-surface-2">
          <p className="text-sm font-medium text-fg mb-2 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-primary" /> {s.rhythm ? `Die ersten ${preview.length} ${term.many}` : `Erster ${term.one}`}
          </p>
          <ol className="space-y-1">
            {preview.map((p, i) => (
              <li key={i} className="flex items-baseline gap-2 text-sm text-muted">
                <span className="text-primary text-xs w-14 shrink-0">{s.mode === "runden" ? `Runde ${i + 1}` : `#${i + 1}`}</span>
                <span>{fmt(p.startAt)}{p.endAt ? ` – ${fmt(p.endAt)}` : ""}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </fieldset>
  );
}
