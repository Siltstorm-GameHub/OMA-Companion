"use client";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Vote, Plus, Trash2, Coins } from "@/components/icons";
import { fromDatetimeLocalBerlin, toDatetimeLocalBerlin } from "@/lib/time";
import {
  POLL_KIND_LABELS, POLL_OPTIONS_MAX, POLL_OPTIONS_MIN, POLL_OPTION_MAX, POLL_QUESTION_MAX,
  POLL_PARTICIPATION_MAX, POLL_CORRECT_MAX, type PollInput, type PollKind,
} from "@/lib/post-poll";
import { NumberInput } from "@/components/ui/NumberInput";

/** Umfrage im Editor — `locked` = es gibt schon Stimmen, dann nicht mehr änderbar. */
export type PollDraft = PollInput & { locked?: boolean };

const INPUT = "w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40";
const SMALL = "bg-white/[0.04] border border-white/10 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-teal-500/40";

export function emptyPoll(): PollDraft {
  return { question: "", kind: "opinion", options: ["", ""], correctIndex: null, participationReward: 0, correctReward: 0, closesAt: null };
}

const clampInt = (v: string, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));

/**
 * Umfrage-Baustein: Meinung, Quiz (richtige Antwort vorab, geheim bis zur Auflösung) oder „Wer gewinnt?“
 * (Antworten = Spieler des Events, Auflösung automatisch). Münzen zahlt das System — gedeckelt pro Tag.
 */
export default function PostPollEditor({
  value, onChange, eventId, open, onToggle,
}: {
  value: PollDraft | null;
  onChange: (v: PollDraft | null) => void;
  /** Gewähltes Event des Beitrags (Voraussetzung für „Wer gewinnt?“). */
  eventId: string;
  open: boolean;
  onToggle: () => void;
}) {
  const p = value;
  const set = (patch: Partial<PollDraft>) => p && onChange({ ...p, ...patch });

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02]">
      <button type="button" onClick={onToggle} aria-expanded={open}
        className="w-full px-3 py-2 flex items-center justify-between text-left text-[11px] text-gray-400 hover:text-white">
        <span className="inline-flex items-center gap-1.5"><Vote className="w-3.5 h-3.5" /> Umfrage{p ? `: ${p.question || "ohne Frage"}` : ""}</span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {!p && (
            <Button size="sm" variant="outline" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => onChange(emptyPoll())}>Umfrage hinzufügen</Button>
          )}
          {p?.locked && (
            <p className="text-[11px] text-amber-400/90">Es wurde schon abgestimmt — die Umfrage lässt sich nicht mehr ändern.</p>
          )}
          {p && !p.locked && (
            <>
              <input value={p.question} onChange={e => set({ question: e.target.value })} maxLength={POLL_QUESTION_MAX}
                placeholder="Frage, z.B. „Wer holt sich den Turniersieg?“" className={INPUT} />
              <label className="flex items-center gap-2 text-[11px] text-gray-500">
                Art
                <Select size="sm" value={p.kind} onChange={e => {
                  const kind = e.target.value as PollKind;
                  set({ kind, correctReward: kind === "opinion" ? 0 : p.correctReward, correctIndex: kind === "quiz" ? p.correctIndex : null });
                }}>
                  {(Object.keys(POLL_KIND_LABELS) as PollKind[]).map(k => (
                    <option key={k} value={k} disabled={k === "event_winner" && !eventId}>{POLL_KIND_LABELS[k]}</option>
                  ))}
                </Select>
              </label>

              {p.kind === "event_winner" ? (
                <p className="text-[11px] text-gray-500">
                  {eventId
                    ? "Die Antworten sind die angemeldeten Spieler des Events. Abstimmen geht bis zum Event-Start, aufgelöst wird automatisch nach dem Event."
                    : "Wähle oben ein Event, um nach dem Gewinner zu fragen."}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {p.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      {p.kind === "quiz" && (
                        <input type="radio" name="poll-correct" checked={p.correctIndex === i} onChange={() => set({ correctIndex: i })}
                          aria-label={`Antwort ${i + 1} ist richtig`} title="Richtige Antwort (bleibt bis zur Auflösung geheim)" />
                      )}
                      <input value={opt} maxLength={POLL_OPTION_MAX} placeholder={`Antwort ${i + 1}`} className={INPUT}
                        onChange={e => set({ options: p.options.map((o, j) => (j === i ? e.target.value : o)) })} />
                      {p.options.length > POLL_OPTIONS_MIN && (
                        <button type="button" aria-label="Antwort entfernen" className="text-gray-500 hover:text-red-400"
                          onClick={() => set({
                            options: p.options.filter((_, j) => j !== i),
                            correctIndex: p.correctIndex == null || p.correctIndex === i ? null : p.correctIndex > i ? p.correctIndex - 1 : p.correctIndex,
                          })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {p.options.length < POLL_OPTIONS_MAX && (
                    <Button size="sm" variant="ghost" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => set({ options: [...p.options, ""] })}>Antwort</Button>
                  )}
                  {p.kind === "quiz" && <p className="text-[10px] text-gray-600">Markiere die richtige Antwort — sie wird erst beim Ende der Umfrage verraten.</p>}
                  <label className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                    Ende {p.kind === "quiz" ? "(Standard: in 7 Tagen)" : "(optional)"}
                    <input type="datetime-local" className={SMALL}
                      value={p.closesAt ? toDatetimeLocalBerlin(p.closesAt) : ""}
                      onChange={e => set({ closesAt: e.target.value ? fromDatetimeLocalBerlin(e.target.value).toISOString() : null })} />
                  </label>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                <span className="inline-flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-amber-300" /> Belohnung</span>
                <label className="flex items-center gap-1">
                  Mitmachen
                  <NumberInput min={0} max={POLL_PARTICIPATION_MAX} value={p.participationReward} className={`${SMALL} w-16`}
                    onChange={e => set({ participationReward: clampInt(e.target.value, POLL_PARTICIPATION_MAX) })} />
                  <span className="text-gray-600">/ {POLL_PARTICIPATION_MAX}</span>
                </label>
                {p.kind !== "opinion" && (
                  <label className="flex items-center gap-1">
                    Richtig getippt
                    <NumberInput min={0} max={POLL_CORRECT_MAX} value={p.correctReward} className={`${SMALL} w-16`}
                      onChange={e => set({ correctReward: clampInt(e.target.value, POLL_CORRECT_MAX) })} />
                    <span className="text-gray-600">/ {POLL_CORRECT_MAX}</span>
                  </label>
                )}
              </div>
              <p className="text-[10px] text-gray-600">Münzen zahlt das System. Pro Tag gibt es höchstens 30 Münzen fürs Mitmachen und 300 fürs Richtigliegen je Person; du selbst kannst nicht teilnehmen.</p>
              <Button size="sm" variant="ghost" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => onChange(null)}>Umfrage entfernen</Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
