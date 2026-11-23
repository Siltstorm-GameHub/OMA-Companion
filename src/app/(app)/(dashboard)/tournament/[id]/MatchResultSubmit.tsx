"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { confirmEventTiming } from "@/lib/event-timing-warning";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProofUploader from "@/components/match-results/ProofUploader";
import { Check, ChevronDown, X } from "@/components/icons";
import { NumberInput } from "@/components/ui/NumberInput";

type U = { id: string; name: string | null; username: string | null };
export type ReportMatch = {
  id: string;
  label: string;
  isDuel: boolean;
  player1: U | null;
  player2: U | null;
  /** FFA/Coop: Spieler mit Eintrag in diesem Match */
  players: U[];
  played: boolean;
  /** Der aktuelle User spielt in diesem Match mit */
  mine: boolean;
  /** 1v1: offene Meldung des Gegners — der User kann sie mit einem Klick bestätigen */
  opponentReport?: { score1: number | null; score2: number | null; reporterName: string; advancerId?: string | null } | null;
  /** Spiel im K.O.-Baum: bei Gleichstand muss angegeben werden, wer (nach Elfmeterschießen) weiterkommt */
  knockout?: boolean;
  /** Hin-/Rückspiel: 1 = Hinspiel, 2 = Rückspiel (entscheidet nach Gesamtergebnis) */
  leg?: number | null;
};
export type MySubmission = {
  matchId: string;
  /** Spieler, dessen Werte gemeldet wurden (FFA/Coop); bei 1v1 null */
  subjectId: string | null;
  status: string;
  score1: number | null;
  score2: number | null;
  advancerId?: string | null;
  statsJson: string | null;
  note: string | null;
  screenshotUrls: string[];
  reviewNote: string | null;
};

const uname = (u: U | null) => u?.username ?? u?.name ?? "?";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Wird geprüft",    cls: "bg-warning-soft text-warning" },
  processing:{ label: "Wird geprüft",    cls: "bg-warning-soft text-warning" },
  approved:  { label: "Übernommen",      cls: "bg-success-soft text-success" },
  corrected: { label: "Korrigiert",      cls: "bg-primary-soft text-primary-fg" },
  rejected:  { label: "Abgelehnt",       cls: "bg-danger-soft text-danger" },
};

const inputCls =
  "w-full min-h-10 px-3 rounded-control bg-surface-2 border border-line text-sm text-fg focus:border-primary focus:outline-none";

/** Öffnet das Meldeformular eines Matches von außen (z. B. "Stimmt nicht" in der "Für dich"-Karte) */
export const OPEN_REPORT_EVENT = "oma:open-report";

/** Tor-Zähler mit großen −/+ Knöpfen statt kleinem Zahlenfeld (Daumen-freundlich) */
function ScoreStepper({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const n = value === "" ? null : Number(value);
  const set = (v: number) => onChange(String(Math.max(0, v)));
  const BTN = "grid size-11 shrink-0 place-items-center rounded-control border border-line-strong bg-surface-2 text-xl font-bold text-fg hover:bg-surface-3 active:scale-95 transition disabled:opacity-40";
  return (
    <div className="min-w-0 space-y-1.5 text-center">
      <p className="truncate text-sm font-bold text-fg">{label}</p>
      <div className="flex items-center justify-center gap-2">
        <button type="button" aria-label={`${label}: eins weniger`} className={BTN} disabled={!n} onClick={() => set((n ?? 0) - 1)}>−</button>
        <input inputMode="numeric" pattern="[0-9]*" aria-label={`Tore ${label}`} value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0"
          className="h-11 w-14 rounded-control border border-line bg-surface-2 text-center text-2xl font-extrabold tabular-nums text-fg focus:border-primary focus:outline-none" />
        <button type="button" aria-label={`${label}: eins mehr`} className={BTN} onClick={() => set((n ?? 0) + 1)}>+</button>
      </div>
    </div>
  );
}

/** Nummerierter Schritt im Meldeformular; ✓, sobald erledigt */
function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-subtle">
        <span className={`grid size-5 place-items-center rounded-full text-[11px] font-extrabold ${done ? "bg-primary text-primary-ink" : "bg-surface-3 text-muted"}`}>
          {done ? <Check className="size-3" /> : n}
        </span>
        {title}
      </p>
      {children}
    </div>
  );
}

/** Verlauf einer Meldung: gemeldet → bestätigt (Gegner oder Verwalter) → endgültig */
function SubmissionTimeline({ s }: { s: MySubmission }) {
  const done = s.status === "approved" || s.status === "corrected";
  const rejected = s.status === "rejected";
  const byBoth = !!s.reviewNote?.startsWith("Von beiden Spielern");
  const steps = [
    { label: "Gemeldet", state: "done" as const },
    { label: rejected ? "Abgelehnt" : done ? (byBoth ? "Vom Gegner bestätigt" : "Vom Verwalter geprüft") : "Wartet auf Gegner oder Verwalter", state: rejected ? "bad" as const : done ? "done" as const : "current" as const },
    { label: "Zählt", state: done ? "done" as const : "todo" as const },
  ];
  return (
    <ol className="flex items-center gap-1.5 text-xs font-semibold" aria-label="Stand deiner Meldung">
      {steps.map((st, i) => (
        <li key={i} className="flex min-w-0 items-center gap-1.5">
          {i > 0 && <span className={`h-px w-3 shrink-0 ${st.state === "todo" ? "bg-line-strong" : "bg-primary/60"}`} aria-hidden />}
          <span className={`grid size-4 shrink-0 place-items-center rounded-full ${
            st.state === "done" ? "bg-primary text-primary-ink" : st.state === "bad" ? "bg-danger text-canvas" : st.state === "current" ? "bg-warning text-canvas" : "bg-surface-3 text-subtle"
          }`}>
            {st.state === "done" ? <Check className="size-2.5" /> : st.state === "bad" ? <X className="size-2.5" /> : null}
          </span>
          <span className={`truncate ${st.state === "todo" ? "text-subtle" : st.state === "bad" ? "text-danger" : "text-fg"}`}>{st.label}</span>
        </li>
      ))}
    </ol>
  );
}

export function MatchForm({
  eventId, m, subject, s, statFields, locked, beforeSubmit, bare = false,
}: {
  beforeSubmit: () => Promise<boolean>;
  /** Ohne eigenen Rahmen und Titel (in der Karte "Dein Match") */
  bare?: boolean;
  eventId: string;
  m: ReportMatch;
  subject: U | null;
  s: MySubmission | null;
  statFields: string[];
  locked: boolean;
}) {
  const router = useRouter();
  const initialStats: Record<string, number> = s?.statsJson ? JSON.parse(s.statsJson) : {};

  const [score1, setScore1] = useState(s?.score1?.toString() ?? "");
  const [score2, setScore2] = useState(s?.score2?.toString() ?? "");
  const [stats, setStats] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(initialStats).map(([k, v]) => [k, String(v)])),
  );
  const [note, setNote] = useState(s?.note ?? "");
  const [advancerId, setAdvancerId] = useState(s?.advancerId ?? "");
  // K.O.-Spiel: Einzelspiel mit Gleichstand bzw. Rückspiel (Gleichstand im Gesamtergebnis möglich) → wer kommt weiter?
  const askAdvancer = m.isDuel && !!m.knockout && m.leg !== 1
    && (m.leg === 2 || (score1 !== "" && score1 === score2));
  // Eigene offene Meldung weicht von der des Gegners ab → beide sehen den Widerspruch
  const opp = m.opponentReport;
  const conflict = !!opp && !!s && s.status === "pending" && (s.score1 !== opp.score1 || s.score2 !== opp.score2);
  const [urls, setUrls] = useState<string[]>(s?.screenshotUrls ?? []);
  const [busy, setBusy] = useState(false);
  // In der Karte "Dein Match" bleibt das Formular zu, bis man auf "Ergebnis melden" tippt
  const [open, setOpen] = useState(!s && !bare);
  useEffect(() => {
    const onOpen = (e: Event) => { if ((e as CustomEvent<string>).detail === m.id) setOpen(true); };
    window.addEventListener(OPEN_REPORT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_REPORT_EVENT, onOpen);
  }, [m.id]);
  // Am Handy öffnet das Formular als Panel von unten — Hintergrund solange nicht scrollen
  useEffect(() => {
    if (!open || !bare || window.matchMedia("(min-width: 1024px)").matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open, bare]);

  /** Ergebnis des Gegners bestätigen — stimmen beide Meldungen überein, gilt es sofort (ohne Admin) */
  async function confirmOpponent() {
    if (!(await beforeSubmit())) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tournaments/${eventId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: m.id, confirm: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error ?? "Bestätigen fehlgeschlagen");
      toast.success(data.confirmedByBoth ? "Bestätigt — das Ergebnis gilt jetzt endgültig" : "Bestätigung gespeichert — ein Verwalter prüft das Ergebnis");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (urls.length === 0) return toast.error("Bitte mindestens einen Screenshot hochladen");
    if (askAdvancer && m.leg !== 2 && !advancerId) return toast.error("Gleichstand im K.O.-Spiel: bitte angeben, wer nach Elfmeterschießen weiterkommt");
    if (!(await beforeSubmit())) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tournaments/${eventId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: m.id,
          ...(m.isDuel ? { score1, score2, advancerId: askAdvancer && advancerId ? advancerId : null } : { statsJson: stats, forUserId: subject?.id }),
          note,
          screenshotUrls: urls,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error ?? "Senden fehlgeschlagen");
      if (data.confirmedByBoth) toast.success("Passt zur Meldung deines Gegners — das Ergebnis gilt jetzt endgültig");
      else if (data.conflict) toast.warning("Gespeichert, aber dein Gegner hat etwas anderes gemeldet", { description: "Sprecht euch ab. Sonst entscheidet ein Verwalter anhand der Screenshots." });
      else if (data.heldBack) toast.success("Meldung gespeichert — ein Verwalter trägt sie ein", { description: data.heldBack });
      else if (data.visible === false) toast.success("Korrektur gemeldet — ein Verwalter prüft sie, bis dahin gilt das bestätigte Ergebnis");
      else toast.success("Ergebnis eingetragen und sofort sichtbar", { description: "Bestätigt dein Gegner, gilt es endgültig. Sonst prüft ein Verwalter anhand deiner Screenshots." });
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={bare ? "space-y-3" : "rounded-xl border border-line p-3 space-y-3"}>
      {bare ? (
        s && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted">
              Deine Meldung{m.isDuel && s.score1 != null && <> <span className="font-bold text-fg tabular-nums">{s.score1} : {s.score2}</span></>}
            </p>
            <SubmissionTimeline s={s} />
          </div>
        )
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-fg truncate">
            {m.label}
            {!m.isDuel && subject && <span className="text-muted font-normal"> · {uname(subject)}</span>}
          </p>
          {s && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS[s.status]?.cls ?? ""}`}>
              {STATUS[s.status]?.label ?? s.status}
            </span>
          )}
        </div>
      )}

      {s?.reviewNote && <p className="text-xs text-muted">{s.reviewNote.startsWith("Von beiden Spielern") ? s.reviewNote : `Verwalter: ${s.reviewNote}`}</p>}

      {/* Widerspruch: eigene Meldung und die des Gegners passen nicht zusammen */}
      {!locked && conflict && opp && s && (
        <div className="rounded-control border border-warning/30 bg-warning-soft px-3 py-2 space-y-1.5">
          <p className="text-xs text-warning font-bold">Eure Meldungen passen nicht zusammen</p>
          <p className="text-xs text-fg/90">
            Du: {uname(m.player1)} {s.score1 ?? "–"} : {s.score2 ?? "–"} {uname(m.player2)}<br />
            {opp.reporterName}: {uname(m.player1)} {opp.score1 ?? "–"} : {opp.score2 ?? "–"} {uname(m.player2)}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={confirmOpponent} disabled={busy}
              className="min-h-9 px-3.5 rounded-control bg-warning text-canvas hover:brightness-110 text-sm font-bold disabled:opacity-50">
              Seins stimmt — übernehmen
            </button>
            <span className="text-xs text-muted">Sprecht euch ab. Sonst entscheidet ein Verwalter anhand der Screenshots.</span>
          </div>
        </div>
      )}

      {/* Gegner hat schon gemeldet: mit einem Klick bestätigen (kein eigener Screenshot nötig) */}
      {!locked && m.isDuel && m.opponentReport && !conflict && s?.status !== "approved" && s?.status !== "corrected" && (
        <div className="rounded-control border border-primary/30 bg-primary-soft px-3 py-2 space-y-1.5">
          <p className="text-sm text-primary-fg">
            <span className="font-bold">{m.opponentReport.reporterName}</span> hat gemeldet: {uname(m.player1)} <span className="font-extrabold tabular-nums">{m.opponentReport.score1 ?? "–"} : {m.opponentReport.score2 ?? "–"}</span> {uname(m.player2)}
            {m.opponentReport.advancerId && <> · weiter: {m.opponentReport.advancerId === m.player1?.id ? uname(m.player1) : uname(m.player2)}</>}
          </p>
          <div className="flex items-center gap-3">
            <button onClick={confirmOpponent} disabled={busy}
              className="min-h-9 px-3.5 rounded-control bg-primary hover:bg-primary-hover text-primary-ink text-sm font-bold disabled:opacity-50">
              Stimmt — bestätigen
            </button>
            <button type="button" onClick={() => setOpen(true)} className="min-h-9 px-3.5 rounded-control border border-line-strong bg-surface-2 text-sm font-semibold text-fg hover:bg-surface-3">
              Stimmt nicht — selbst melden
            </button>
          </div>
        </div>
      )}

      {locked && <p className="text-xs text-subtle">Die aktive Eventphase ist abgeschlossen — keine Änderungen mehr möglich.</p>}
      {!locked && (s?.status === "approved" || s?.status === "corrected") && !open && (
        <p className="text-xs text-subtle">Bis zum Abschluss der aktiven Eventphase kannst du die Meldung korrigieren — sie wird dann erneut von einem Verwalter geprüft.</p>
      )}

      {!locked && !open && (
        <button onClick={() => setOpen(true)}
          className={!s ? "min-h-10 px-4 rounded-control bg-primary hover:bg-primary-hover text-primary-ink text-sm font-bold" : "text-sm font-semibold text-primary-fg hover:text-fg"}>
          {!s ? "Ergebnis melden" : s.status === "rejected" ? "Neu melden" : "Meldung korrigieren"}
        </button>
      )}

      {!locked && open && (
        <>
          {/* Hintergrund des Panels (nur am Handy, nur in "Dein Match") */}
          {bare && <div className="fixed inset-0 z-40 bg-canvas/70 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
          <div className={bare
            ? "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-50 max-lg:max-h-[88vh] max-lg:overflow-y-auto max-lg:rounded-t-card max-lg:border-t max-lg:border-line-strong max-lg:bg-surface max-lg:p-4 max-lg:pb-[max(env(safe-area-inset-bottom),1rem)] max-lg:shadow-card space-y-4"
            : "space-y-4"}
            role={bare ? "dialog" : undefined} aria-label={bare ? "Ergebnis melden" : undefined}>
            {bare && (
              <div className="flex items-center justify-between gap-2 lg:hidden">
                <p className="text-base font-extrabold text-fg">Ergebnis melden</p>
                <button type="button" onClick={() => setOpen(false)} aria-label="Schließen" className="grid size-10 place-items-center rounded-control text-subtle hover:bg-surface-3 hover:text-fg">
                  <X className="size-5" />
                </button>
              </div>
            )}

            <Step n={1} title={m.isDuel ? "Ergebnis" : "Werte"} done={m.isDuel ? score1 !== "" && score2 !== "" : Object.values(stats).some(v => v !== "")}>
              {m.isDuel ? (
                <div className="grid grid-cols-2 gap-3 rounded-control bg-surface-2/60 p-3">
                  <ScoreStepper label={uname(m.player1)} value={score1} onChange={setScore1} />
                  <ScoreStepper label={uname(m.player2)} value={score2} onChange={setScore2} />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {statFields.map((f) => (
                    <label key={f} className="text-xs text-muted space-y-1">
                      {f}
                      <NumberInput
                        min={0}
                        value={stats[f] ?? ""}
                        onChange={(e) => setStats({ ...stats, [f]: e.target.value })}
                        className={inputCls}
                      />
                    </label>
                  ))}
                </div>
              )}

              {askAdvancer && m.player1 && m.player2 && (
                <label className="block text-xs text-muted space-y-1">
                  {m.leg === 2 ? "Nur bei Gleichstand im Gesamtergebnis: wer kam weiter?" : "Gleichstand — wer kam nach Elfmeterschießen weiter?"}
                  <select value={advancerId} onChange={(e) => setAdvancerId(e.target.value)} className={inputCls}>
                    <option value="">{m.leg === 2 ? "— kein Gleichstand" : "Bitte wählen"}</option>
                    <option value={m.player1.id}>{uname(m.player1)}</option>
                    <option value={m.player2.id}>{uname(m.player2)}</option>
                  </select>
                </label>
              )}
            </Step>

            <Step n={2} title="Nachweis (Screenshot, max. 4)" done={urls.length > 0}>
              <ProofUploader value={urls} onChange={setUrls} />
            </Step>

            <Step n={3} title="Senden" done={false}>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                placeholder="Anmerkung (optional)"
                className={inputCls}
              />
              <button
                onClick={submit}
                disabled={busy}
                className="w-full sm:w-auto min-h-11 px-5 rounded-control bg-primary hover:bg-primary-hover text-primary-ink text-sm font-bold disabled:opacity-50"
              >
                {busy ? "Sende…" : s ? "Meldung aktualisieren" : "Ergebnis senden"}
              </button>
            </Step>
          </div>
        </>
      )}
    </div>
  );
}

/** Kurzer Hinweis zum Melden, Details zum Aufklappen */
export function ReportHint() {
  return (
    <details className="text-xs text-subtle group">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        Mit Screenshot melden — sofort sichtbar. Bestätigt dein Gegner, gilt es sofort, sonst prüft ein Verwalter. <span className="text-primary-fg group-open:hidden">Mehr</span>
      </summary>
      <p className="mt-1">
        Du kannst dein Ergebnis oder das eines anderen Spielers eintragen. Bis es endgültig ist, steht es als „vorläufig“ da.
        Endgültig wird es, wenn beide Spieler dasselbe melden (bzw. dein Gegner bestätigt) oder ein Verwalter es geprüft hat. Erst dann gibt es Punkte.
        Danach sehen die anderen Teilnehmer dieses Events die Screenshots — achte darauf, dass keine privaten Daten darauf stehen.
        Screenshots werden nach einiger Zeit automatisch gelöscht.
      </p>
    </details>
  );
}

/** Wert für "Spieler" in der Auswahl: Sammelmeldung für mehrere Spieler mit einem gemeinsamen Screenshot */
const MULTI = "__multi__";

/**
 * Sammelmeldung (FFA/Coop): ein Screenshot zeigt die Werte mehrerer Spieler — einmal hochladen, für
 * jeden Spieler die Werte eintragen. Technisch entsteht je Spieler eine eigene Meldung (mit demselben
 * Nachweis), damit Prüfung, Korrektur und Anzeige pro Spieler unverändert funktionieren. Leere Zeilen
 * werden übersprungen.
 */
function MultiForm({
  eventId, m, userId, submissions, statFields, locked, beforeSubmit,
}: {
  beforeSubmit: () => Promise<boolean>;
  eventId: string;
  m: ReportMatch;
  userId: string;
  submissions: MySubmission[];
  statFields: string[];
  locked: boolean;
}) {
  const router = useRouter();
  // Vorbelegung mit eigenen bisherigen Meldungen für diese Spieler
  const [rows, setRows] = useState<Record<string, Record<string, string>>>(() => Object.fromEntries(
    m.players.map(p => {
      const s = submissions.find(x => x.matchId === m.id && x.subjectId === p.id);
      const st: Record<string, number> = s?.statsJson ? JSON.parse(s.statsJson) : {};
      return [p.id, Object.fromEntries(Object.entries(st).map(([k, v]) => [k, String(v)]))];
    }),
  ));
  const [urls, setUrls] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const filled = m.players.filter(p => statFields.some(f => (rows[p.id]?.[f] ?? "").trim() !== ""));

  async function submit() {
    if (urls.length === 0) return toast.error("Bitte mindestens einen Screenshot hochladen");
    if (filled.length === 0) return toast.error("Bitte für mindestens einen Spieler Werte eintragen");
    if (!(await beforeSubmit())) return;
    setBusy(true);
    let ok = 0;
    const failed: string[] = [];
    try {
      // Nacheinander — jede Meldung wird serverseitig einzeln geprüft und eingetragen
      for (const p of filled) {
        const stats = Object.fromEntries(Object.entries(rows[p.id] ?? {}).filter(([, v]) => v.trim() !== ""));
        const res = await fetch(`/api/tournaments/${eventId}/submissions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId: m.id, statsJson: stats, forUserId: p.id, note, screenshotUrls: urls }),
        });
        if (res.ok) ok++;
        else {
          const data = await res.json().catch(() => ({}));
          failed.push(`${uname(p)}: ${data.error ?? "Fehler"}`);
        }
      }
      if (ok > 0) toast.success(`${ok} ${ok === 1 ? "Ergebnis" : "Ergebnisse"} eingetragen — ein Admin prüft sie anhand des Screenshots`);
      if (failed.length > 0) toast.error(failed.join(" · "));
      if (ok > 0) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (locked) return <p className="text-xs text-subtle">Die aktive Eventphase ist abgeschlossen — keine Änderungen mehr möglich.</p>;

  return (
    <div className="rounded-xl border border-line p-3 space-y-3">
      <p className="text-sm font-medium text-fg">{m.label} · Sammelmeldung</p>
      <p className="text-xs text-subtle">
        Ein Screenshot zeigt die Ergebnisse mehrerer Spieler? Trag hier die Werte aller sichtbaren Spieler ein —
        leere Zeilen werden übersprungen. Jeder Spieler bekommt eine eigene Meldung mit diesem Nachweis.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-xs text-subtle uppercase tracking-wider">
              <th className="text-left py-1 pr-2 font-medium">Spieler</th>
              {statFields.map(f => <th key={f} className="text-left py-1 px-1 font-medium">{f}</th>)}
            </tr>
          </thead>
          <tbody>
            {m.players.map(p => (
              <tr key={p.id}>
                <td className="py-1 pr-2 text-fg/90 whitespace-nowrap">{uname(p)}{p.id === userId ? " (du)" : ""}</td>
                {statFields.map(f => (
                  <td key={f} className="py-1 px-1 min-w-[80px]">
                    <NumberInput min={0} value={rows[p.id]?.[f] ?? ""}
                      onChange={e => setRows(prev => ({ ...prev, [p.id]: { ...prev[p.id], [f]: e.target.value } }))}
                      className={inputCls} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <p className="text-xs text-muted mb-1">Nachweis (Screenshots, max. 4) — gilt für alle eingetragenen Spieler</p>
        <ProofUploader value={urls} onChange={setUrls} />
      </div>

      <input value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="Anmerkung (optional)" className={inputCls} />

      <button onClick={submit} disabled={busy}
        className="min-h-10 px-4 rounded-control bg-primary hover:bg-primary-hover text-primary-ink text-sm font-bold disabled:opacity-50">
        {busy ? "Sende…" : filled.length > 0 ? `Für ${filled.length} Spieler melden` : "Ergebnisse melden"}
      </button>
    </div>
  );
}

export default function MatchResultSubmit({
  eventId,
  userId,
  matches,
  submissions,
  statFields,
  locked,
  startAt,
}: {
  eventId: string;
  userId: string;
  matches: ReportMatch[];
  submissions: MySubmission[];
  statFields: string[];
  locked: boolean;
  /** Event-Start (ISO) — vorher eingetragene Ergebnisse lösen eine Warnung aus */
  startAt?: string;
}) {
  const { confirm, ConfirmDialogElement } = useConfirm();
  const earlyOk = useRef(false);
  async function guardEarly(): Promise<boolean> {
    if (earlyOk.current || !startAt) return true;
    const ok = await confirmEventTiming(confirm, "results", { startAt });
    if (ok) earlyOk.current = true;
    return ok;
  }
  // Vorauswahl: erstes eigenes, noch nicht gespieltes Match — sonst das erste überhaupt.
  const defaultMatch = matches.find((m) => m.mine && !m.played) ?? matches.find((m) => m.mine) ?? matches[0];
  const [expanded, setExpanded] = useState(false);
  const [matchId, setMatchId] = useState(defaultMatch?.id ?? "");
  const match = matches.find((m) => m.id === matchId) ?? defaultMatch;
  const defaultSubject = (m: ReportMatch | undefined) =>
    m?.players.find((p) => p.id === userId)?.id ?? m?.players[0]?.id ?? "";
  const [subjectId, setSubjectId] = useState(defaultSubject(defaultMatch));

  if (!match) return null;

  const isMulti = !match.isDuel && subjectId === MULTI && match.players.length > 1;
  const subject = match.isDuel || isMulti ? null : match.players.find((p) => p.id === subjectId) ?? match.players[0] ?? null;
  const submission =
    submissions.find((x) => x.matchId === match.id && (match.isDuel || x.subjectId === subject?.id)) ?? null;
  const pendingCount = submissions.filter((x) => x.status === "pending" || x.status === "processing").length;

  return (
    <div className="glass rounded-2xl mt-4">
      {ConfirmDialogElement}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-2 p-4 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-base font-extrabold text-fg">Ergebnis melden</span>
          {pendingCount > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-warning-soft text-warning">
              {pendingCount} in Prüfung
            </span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <ReportHint />

          <div className={`grid gap-2 ${match.isDuel ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
            <label className="text-xs text-muted space-y-1">
              Match / Runde
              <select
                value={match.id}
                onChange={(e) => {
                  setMatchId(e.target.value);
                  setSubjectId(defaultSubject(matches.find((m) => m.id === e.target.value)));
                }}
                className={inputCls}
              >
                {matches.map((m) => (
                  <option key={m.id} value={m.id} className="bg-surface-2">
                    {m.label}{m.mine ? " (du)" : ""}{m.played ? " ✓" : ""}
                  </option>
                ))}
              </select>
            </label>
            {!match.isDuel && (
              <label className="text-xs text-muted space-y-1">
                Spieler
                <select value={isMulti ? MULTI : subject?.id ?? ""} onChange={(e) => setSubjectId(e.target.value)} className={inputCls}>
                  {match.players.map((p) => (
                    <option key={p.id} value={p.id} className="bg-surface-2">
                      {uname(p)}{p.id === userId ? " (du)" : ""}
                    </option>
                  ))}
                  {match.players.length > 1 && (
                    <option value={MULTI} className="bg-surface-2">Mehrere Spieler (ein Screenshot)</option>
                  )}
                </select>
              </label>
            )}
          </div>

          {isMulti ? (
            <MultiForm
              key={`${match.id}:${MULTI}`}
              eventId={eventId}
              m={match}
              userId={userId}
              submissions={submissions}
              statFields={statFields}
              locked={locked}
              beforeSubmit={guardEarly}
            />
          ) : (
            <MatchForm
              key={`${match.id}:${subject?.id ?? ""}`}
              eventId={eventId}
              m={match}
              subject={subject}
              s={submission}
              statFields={statFields}
              locked={locked}
              beforeSubmit={guardEarly}
            />
          )}
        </div>
      )}
    </div>
  );
}
