"use client";
import { useState } from "react";
import { Save } from "@/components/icons";
import { statRoundNote } from "@/lib/tournaments/stat-rounds";

const NOTE_PLACEHOLDER = "z.B. Server A, Tisch B, Match 2";

/** Eingabe für Runden der Stat-Formate (Skill-Index, Durchschnittswerte): Rundennummer (vorbelegt mit
 *  der nächsten freien, aber änderbar — z.B. um eine vergessene Runde nachzutragen) und ein kurzer
 *  Zusatz, der hinter der Nummer angezeigt wird. Ersetzt Titel + Datum/Uhrzeit. */
export default function StatRoundFields({
  round, onRoundChange, note, onNoteChange, usedRoundNumbers, size = "md", currentRound,
}: {
  round: number;
  onRoundChange: (n: number) => void;
  note: string;
  onNoteChange: (s: string) => void;
  /** Bereits vergebene Nummern — nur für den Hinweis, gleiche Nummern sind erlaubt (z.B. parallele Tische) */
  usedRoundNumbers: Set<number>;
  size?: "md" | "lg";
  /** Beim Bearbeiten: eigene bisherige Nummer, zählt nicht als "schon vergeben" */
  currentRound?: number;
}) {
  const inputCls = `w-full text-sm bg-gray-800 border border-gray-700 text-white ${size === "lg" ? "rounded-xl px-3 py-3" : "rounded-lg px-3 py-2"}`;
  const taken = round !== currentRound && usedRoundNumbers.has(round);
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[6rem_1fr] gap-2">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Runde</label>
          <input type="number" min={1} inputMode="numeric" value={round || ""}
            onChange={e => onRoundChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
            className={`${inputCls} tabular-nums`} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Zusatz (optional)</label>
          <input type="text" value={note} maxLength={100} onChange={e => onNoteChange(e.target.value)}
            placeholder={NOTE_PLACEHOLDER} className={inputCls} />
        </div>
      </div>
      {taken && (
        <p className="text-[11px] text-amber-400/90">
          Runde {round} gibt es schon — passt, wenn parallel gespielt wurde (dann Zusatz z.B. „Tisch B“ eintragen).
        </p>
      )}
    </div>
  );
}

/** Rundennummer/Zusatz einer bestehenden Runde ändern — speichern erst, wenn sich etwas geändert hat. */
export function StatRoundMetaEditor({
  match, usedRoundNumbers, onSave, size = "md",
}: {
  match: { id: string; position: number; title: string | null };
  usedRoundNumbers: Set<number>;
  onSave: (position: number, title: string) => Promise<boolean>;
  size?: "md" | "lg";
}) {
  const initialNote = statRoundNote(match) ?? "";
  // Neu initialisieren, sobald sich die gespeicherten Werte ändern (nach dem Speichern / Refresh)
  const key = `${match.id}:${match.position}:${initialNote}`;
  const [state, setState] = useState({ key, round: match.position, note: initialNote });
  const current = state.key === key ? state : { key, round: match.position, note: initialNote };
  const [saving, setSaving] = useState(false);
  const dirty = current.round !== match.position || current.note.trim() !== initialNote;

  return (
    <div className="mb-3 space-y-2">
      <StatRoundFields
        round={current.round} onRoundChange={n => setState({ ...current, round: n })}
        note={current.note} onNoteChange={s => setState({ ...current, note: s })}
        usedRoundNumbers={usedRoundNumbers} currentRound={match.position} size={size}
      />
      {dirty && (
        <button type="button" disabled={saving || current.round < 1}
          onClick={async () => { setSaving(true); await onSave(current.round, current.note); setSaving(false); }}
          className="flex items-center gap-1.5 text-xs text-white bg-teal-700 hover:bg-teal-600 disabled:opacity-50 rounded-lg px-3 py-1.5">
          <Save className="w-3.5 h-3.5" /> Runde/Zusatz speichern
        </button>
      )}
    </div>
  );
}
