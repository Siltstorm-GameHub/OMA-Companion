"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Clock } from "@/components/icons";
import ScheduleEditor from "@/components/ScheduleEditor";
import {
  MODE_LABEL, TERM_LABEL, assignSlots, chainIssues, describeSchedule, missingSlots, parseSchedule, planUpcoming,
  ruleChanged, scheduleProblem, slotStart, suggestSchedule, type Assignment, type SeriesSchedule,
} from "@/lib/series-schedule";
import { formatBerlinDateTime } from "@/lib/time";
import { Section } from "./series-shared";
import type { SeriesDetail } from "./useSeriesDetail";

type Ev = { id: string; title: string; startAt: string | Date; endAt?: string | Date | null; status: string; slotIndex?: number | null };

const fmt = (d: Date | string) => formatBerlinDateTime(d, { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtRange = (start: Date | string, end?: Date | string | null) => end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);

/**
 * Reiter "Termine": Ablaufart und Regel der Reihe (lib/series-schedule.ts). Alte Reihen ohne Ablaufart
 * werden hier einmalig umgestellt — mit Vorschlag aus der alten Planung und Zuordnung der vorhandenen
 * Termine. Danach: Vorlauf, Übernahme und Ende ändern, Regel ändern (mit neuer Zuordnung), Termine
 * ausfallen lassen. Speichert sofort (eigene Route), nicht über die Speicherleiste.
 */
export default function SeriesTabSchedule({ ctx }: { ctx: SeriesDetail }) {
  const { series, isArchived, router, confirm } = ctx;
  const events = series.events as Ev[];
  const mode: "termine" | "runden" | null = series.scheduleMode ?? null;
  const current = parseSchedule(series.scheduleJson ?? null);
  const [now] = useState(() => new Date());
  const [draft, setDraft] = useState<SeriesSchedule | null>(null);
  const [fixOff, setFixOff] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // (React Compiler memoisiert selbst — keine manuellen useMemo)
  const evs = events.map(e => ({
    id: e.id, status: e.status, startAt: new Date(e.startAt), endAt: e.endAt ? new Date(e.endAt) : null,
  }));

  function openEditor() {
    setFixOff(new Set());
    setDraft(current ?? suggestSchedule(
      { recurrenceType: series.recurrenceType ?? null, recurrenceMonthlyMode: series.recurrenceMonthlyMode ?? null, cycleConfigJson: series.cycleConfigJson ?? null },
      evs, now,
    ));
  }

  // Zuordnung nötig: erste Festlegung oder geänderte Regel
  const needsAssign = !!draft && (!mode || !current || ruleChanged(current, draft));
  const assignments: Assignment[] = draft && needsAssign ? assignSlots(draft, evs) : [];
  const issues = draft && needsAssign ? chainIssues(draft, evs, assignments, now) : [];
  const missing = draft && needsAssign ? missingSlots(draft, assignments).filter(i => slotStart(draft, i)! < now) : [];
  const fixes = issues.filter(i => i.fix && !fixOff.has(i.eventId)).map(i => i.fix!);

  // Vorschau: was beim Speichern neu entsteht (mit Zuordnung und Korrekturen)
  const willCreate = (() => {
    if (!draft || scheduleProblem(draft)) return [];
    const slotOf = new Map(needsAssign ? assignments.map(a => [a.eventId, a.slotIndex]) : events.map(e => [e.id, e.slotIndex ?? null]));
    const fixed = evs.map(e => {
      const f = fixes.find(x => x.eventId === e.id);
      return {
        slotIndex: slotOf.get(e.id) ?? null,
        startAt: f?.startAt ? new Date(f.startAt) : e.startAt,
        endAt: f?.endAt ? new Date(f.endAt) : e.endAt,
      };
    });
    return planUpcoming(draft, fixed, now);
  })();

  async function save() {
    if (!draft) return;
    const problem = scheduleProblem(draft);
    if (problem) { toast.error(problem); return; }
    if (willCreate.length > 0 && !(await confirm({
      title: `${willCreate.length} ${willCreate.length === 1 ? TERM_LABEL[draft.mode].one : TERM_LABEL[draft.mode].many} anlegen`,
      description: `Beim Speichern ${willCreate.length === 1 ? "entsteht" : "entstehen"} ${willCreate.length} neue${willCreate.length === 1 ? "r" : ""} ${willCreate.length === 1 ? TERM_LABEL[draft.mode].one : TERM_LABEL[draft.mode].many} und ${willCreate.length === 1 ? "wird" : "werden"} sofort angekündigt (Discord, Push).`,
      confirmLabel: "Speichern und anlegen",
    }))) return;
    setSaving(true);
    const res = await fetch("/api/admin/event-series/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seriesId: series.id, schedule: draft,
        ...(needsAssign && { assignments: assignments.map(a => ({ eventId: a.eventId, slotIndex: a.slotIndex })) }),
        ...(fixes.length > 0 && { fixes }),
      }),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error ?? "Speichern fehlgeschlagen"); return; }
    toast.success(`Terminplanung gespeichert${data.created > 0 ? ` – ${data.created} neu angelegt` : ""}`);
    setDraft(null);
    router.refresh();
  }

  async function cancelTerm(ev: Ev) {
    if (!(await confirm({
      title: "Termin fällt aus",
      description: `„${ev.title}“ am ${fmt(ev.startAt)} wird gelöscht, Angemeldete werden benachrichtigt. Der Platz bleibt frei — die Terminplanung legt ihn nicht neu an.`,
      confirmLabel: "Termin absagen", variant: "danger",
    }))) return;
    const res = await fetch(`/api/admin/events?eventId=${encodeURIComponent(ev.id)}`, { method: "DELETE" });
    if (res.ok) { toast.success("Termin abgesagt"); router.refresh(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Absagen fehlgeschlagen"); }
  }

  const term = TERM_LABEL[draft?.mode ?? mode ?? "termine"];
  const upcoming = events
    .filter(e => new Date(e.startAt) > now && e.status !== "finished")
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  // ── Ansicht ohne Bearbeitung ──
  if (!draft) {
    return (
      <>
        {!mode && !isArchived && (
          <div className="rounded-control border border-warning/40 bg-warning-soft p-4 space-y-2">
            <p className="text-sm font-semibold text-warning">Ablaufart festlegen</p>
            <p className="text-sm text-fg/90">
              Diese Reihe nutzt noch die alte Terminplanung. Bis du festlegst, ob sie eine Eventreihe (feste Termine) oder eine
              Challenge-Reihe (lückenlose Runden) ist, entstehen keine neuen Termine automatisch. Vorhandene Termine laufen normal weiter.
            </p>
            <button type="button" onClick={openEditor}
              className="text-xs font-semibold px-3 py-1.5 rounded-control bg-primary hover:bg-primary-hover text-primary-ink max-lg:min-h-10">
              Jetzt festlegen
            </button>
          </div>
        )}
        {mode && current && (
          <Section title={`${mode === "runden" ? "🔁" : "📅"} ${MODE_LABEL[mode]}`}>
            <div className="space-y-1 text-sm text-fg/90">
              <p>{describeSchedule(current)}</p>
              {current.rhythm && (
                <p className="text-xs text-subtle">
                  Immer {current.aheadCount === 1 ? (mode === "runden" ? "die nächste Runde" : "der nächste Termin") : `die nächsten ${current.aheadCount} ${term.many}`} im Voraus
                  {current.carryParticipants ? " · Teilnehmer werden übernommen" : ""}
                  {current.end.type === "date" ? ` · endet am ${formatBerlinDateTime(current.end.at, { dateStyle: "medium" })}` : current.end.type === "count" ? ` · endet nach ${current.end.count} ${term.many}` : " · unbegrenzt"}
                </p>
              )}
              {current.skippedSlots.length > 0 && (
                <p className="text-xs text-subtle">{current.skippedSlots.length} {current.skippedSlots.length === 1 ? "Termin fiel" : "Termine fielen"} aus</p>
              )}
            </div>
            {!isArchived && (
              <button type="button" onClick={openEditor}
                className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-control bg-line hover:bg-line border border-line-strong text-fg max-lg:min-h-10">
                Planung bearbeiten
              </button>
            )}
          </Section>
        )}
        {isArchived && !mode && <p className="text-sm text-subtle">Abgeschlossene Saison ohne Terminplanung.</p>}

        {mode === "termine" && !isArchived && upcoming.length > 0 && (
          <Section title="Kommende Termine">
            <ul className="divide-y divide-line">
              {upcoming.map(ev => (
                <li key={ev.id} className="flex items-center gap-2 py-2">
                  <Link href={`/events/verwalten/${ev.id}`} className="flex-1 min-w-0 hover:text-primary-fg">
                    <span className="block text-sm text-fg truncate">{ev.slotIndex != null ? `Termin ${ev.slotIndex + 1}` : "Sondertermin"} · {ev.title}</span>
                    <span className="block text-xs text-subtle">{fmtRange(ev.startAt, ev.endAt)}</span>
                  </Link>
                  <button type="button" onClick={() => cancelTerm(ev)}
                    className="shrink-0 text-xs text-danger border border-red-800/40 hover:bg-danger-soft rounded-control px-2.5 py-1 max-lg:min-h-10">
                    Fällt aus
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-xs text-subtle mt-2">Verschieben: Termin öffnen und Datum ändern — sein Platz in der Regel bleibt, der nächste Termin kommt wieder regulär.</p>
          </Section>
        )}
        {mode === "runden" && !isArchived && (
          <p className="text-xs text-subtle">
            Runden schließen lückenlos aneinander an. Änderst du das Ende einer Runde, beginnt die nächste automatisch direkt danach.
          </p>
        )}
      </>
    );
  }

  // ── Bearbeiten / Umstellen ──
  const kindLabel = (a: Assignment) => {
    if (a.slotIndex == null) return draft.rhythm ? "Sondertermin" : "Termin";
    const base = `${term.one} ${a.slotIndex + 1}`;
    return a.kind === "moved" ? `${base} · verschoben (regulär ${fmt(slotStart(draft, a.slotIndex)!)})` : base;
  };

  return (
    <Section title={mode ? "Planung bearbeiten" : "Ablaufart festlegen"}>
      <div className="space-y-5">
        <ScheduleEditor value={draft} onChange={setDraft} lockMode={!!mode} previewCount={3} />

        {needsAssign && events.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-fg">Vorhandene {term.many} zuordnen</p>
            <p className="text-xs text-subtle">
              Jeder {term.one} bekommt seinen Platz in der Regel. Vergangene und abgeschlossene {term.many} werden nicht verändert.
            </p>
            <ul className="rounded-control border border-line divide-y divide-line">
              {[...assignments]
                .map(a => ({ a, ev: evs.find(e => e.id === a.eventId)! }))
                .sort((x, y) => x.ev.startAt.getTime() - y.ev.startAt.getTime())
                .map(({ a, ev }) => {
                  const issue = issues.find(i => i.eventId === ev.id);
                  const title = events.find(e => e.id === ev.id)?.title ?? "";
                  return (
                    <li key={ev.id} className="px-3 py-2 space-y-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className={`text-xs font-semibold ${a.slotIndex == null ? "text-amber-400" : a.kind === "moved" ? "text-primary-fg" : "text-subtle"}`}>{kindLabel(a)}</span>
                        <span className="text-sm text-fg truncate">{title}</span>
                      </div>
                      <p className="text-xs text-subtle">{fmtRange(ev.startAt, ev.endAt)}</p>
                      {issue && (
                        <div className="text-xs">
                          <span className="text-warning">{issue.note}</span>
                          {issue.fix ? (
                            <label className="ml-2 inline-flex items-center gap-1.5 text-fg/90 cursor-pointer">
                              <input type="checkbox" checked={!fixOff.has(ev.id)} className="rounded"
                                onChange={e => setFixOff(prev => { const n = new Set(prev); if (e.target.checked) n.delete(ev.id); else n.add(ev.id); return n; })} />
                              {issue.fix.note}
                            </label>
                          ) : <span className="ml-2 text-subtle">(schon vorbei — bleibt so)</span>}
                        </div>
                      )}
                    </li>
                  );
                })}
            </ul>
            {missing.length > 0 && (
              <p className="text-xs text-subtle">
                <Clock className="inline w-3 h-3 mr-1" />
                {missing.length === 1 ? "Ein vergangener Platz hat" : `${missing.length} vergangene Plätze haben`} keinen Termin und {missing.length === 1 ? "gilt" : "gelten"} als ausgefallen:
                {" "}{missing.slice(0, 6).map(i => formatBerlinDateTime(slotStart(draft, i)!, { day: "2-digit", month: "2-digit" })).join(", ")}{missing.length > 6 ? " …" : ""}
              </p>
            )}
          </div>
        )}

        {!scheduleProblem(draft) && (
          <div className="rounded-control border border-line bg-surface-2 p-3">
            <p className="text-sm font-medium text-fg mb-1">Beim Speichern</p>
            {willCreate.length === 0 ? (
              <p className="text-xs text-subtle">Es entstehen keine neuen {term.many} — genug sind schon angelegt.</p>
            ) : (
              <ul className="space-y-0.5">
                {willCreate.map(t => (
                  <li key={t.slotIndex} className="text-xs text-fg/90">+ {term.one} {t.slotIndex + 1}: {fmtRange(t.startAt, t.endAt)}</li>
                ))}
              </ul>
            )}
            {fixes.length > 0 && <p className="text-xs text-fg/90 mt-1">{fixes.length} {fixes.length === 1 ? "Korrektur" : "Korrekturen"} an bestehenden {term.many}</p>}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => setDraft(null)} disabled={saving}
            className="text-sm text-muted hover:text-fg px-3 py-1.5 rounded-control border border-line hover:border-line-strong">
            Abbrechen
          </button>
          <button type="button" onClick={save} disabled={saving || !!scheduleProblem(draft)}
            className="text-sm font-semibold text-primary-ink bg-primary hover:bg-primary-hover px-3 py-1.5 rounded-control disabled:opacity-50 max-lg:min-h-10">
            {saving ? "Speichert…" : "Speichern"}
          </button>
        </div>
      </div>
    </Section>
  );
}
