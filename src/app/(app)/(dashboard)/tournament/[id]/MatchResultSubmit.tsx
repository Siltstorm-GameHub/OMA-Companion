"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProofUploader from "@/components/match-results/ProofUploader";
import { ChevronDown } from "@/components/icons";

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
  opponentReport?: { score1: number | null; score2: number | null; reporterName: string } | null;
};
export type MySubmission = {
  matchId: string;
  /** Spieler, dessen Werte gemeldet wurden (FFA/Coop); bei 1v1 null */
  subjectId: string | null;
  status: string;
  score1: number | null;
  score2: number | null;
  statsJson: string | null;
  note: string | null;
  screenshotUrls: string[];
  reviewNote: string | null;
};

const uname = (u: U | null) => u?.username ?? u?.name ?? "?";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Wird geprüft",    cls: "bg-amber-900/40 text-amber-300" },
  processing:{ label: "Wird geprüft",    cls: "bg-amber-900/40 text-amber-300" },
  approved:  { label: "Übernommen",      cls: "bg-emerald-900/40 text-emerald-300" },
  corrected: { label: "Korrigiert",      cls: "bg-blue-900/40 text-blue-300" },
  rejected:  { label: "Abgelehnt",       cls: "bg-red-900/40 text-red-300" },
};

const inputCls =
  "w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.1] text-sm text-white focus:border-teal-500/40 focus:outline-none";

function MatchForm({
  eventId, m, subject, s, statFields, locked,
}: {
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
  const [urls, setUrls] = useState<string[]>(s?.screenshotUrls ?? []);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(!s);

  /** Ergebnis des Gegners bestätigen — stimmen beide Meldungen überein, gilt es sofort (ohne Admin) */
  async function confirmOpponent() {
    setBusy(true);
    try {
      const res = await fetch(`/api/tournaments/${eventId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: m.id, confirm: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error ?? "Bestätigen fehlgeschlagen");
      toast.success(data.confirmedByBoth ? "Bestätigt — das Ergebnis gilt jetzt endgültig" : "Bestätigung gemeldet — ein Admin prüft das Ergebnis");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (urls.length === 0) return toast.error("Bitte mindestens einen Screenshot hochladen");
    setBusy(true);
    try {
      const res = await fetch(`/api/tournaments/${eventId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: m.id,
          ...(m.isDuel ? { score1, score2 } : { statsJson: stats, forUserId: subject?.id }),
          note,
          screenshotUrls: urls,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error ?? "Senden fehlgeschlagen");
      toast.success(data.visible === false ? "Korrektur gemeldet — ein Admin prüft sie, bis dahin gilt das bestätigte Ergebnis" : "Ergebnis eingetragen — es ist sofort sichtbar, ein Admin prüft es anhand deiner Screenshots");
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/[0.08] p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-white truncate">
          {m.label}
          {!m.isDuel && subject && <span className="text-gray-400 font-normal"> · {uname(subject)}</span>}
        </p>
        {s && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS[s.status]?.cls ?? ""}`}>
            {STATUS[s.status]?.label ?? s.status}
          </span>
        )}
      </div>

      {s?.reviewNote && <p className="text-xs text-gray-400">{s.reviewNote.startsWith("Von beiden Spielern") ? s.reviewNote : `Admin: ${s.reviewNote}`}</p>}

      {/* Gegner hat schon gemeldet: mit einem Klick bestätigen (kein eigener Screenshot nötig) */}
      {!locked && m.isDuel && m.opponentReport && s?.status !== "approved" && s?.status !== "corrected" && (
        <div className="rounded-lg border border-teal-700/40 bg-teal-900/15 px-3 py-2 space-y-1.5">
          <p className="text-xs text-teal-200">
            {m.opponentReport.reporterName} hat gemeldet: {uname(m.player1)} {m.opponentReport.score1 ?? "–"} : {m.opponentReport.score2 ?? "–"} {uname(m.player2)}
          </p>
          <div className="flex items-center gap-3">
            <button onClick={confirmOpponent} disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium disabled:opacity-50">
              Stimmt — bestätigen
            </button>
            <span className="text-[11px] text-gray-500">Stimmt nicht? Dann unten selbst melden — ein Admin entscheidet.</span>
          </div>
        </div>
      )}

      {locked && <p className="text-xs text-gray-500">Die aktive Eventphase ist abgeschlossen — keine Änderungen mehr möglich.</p>}
      {!locked && (s?.status === "approved" || s?.status === "corrected") && !open && (
        <p className="text-xs text-gray-500">Bis zum Abschluss der aktiven Eventphase kannst du die Meldung korrigieren — sie wird dann erneut von einem Admin geprüft.</p>
      )}

      {!locked && !open && (
        <button onClick={() => setOpen(true)} className="text-xs text-teal-300 hover:underline">
          {s?.status === "rejected" ? "Neu melden" : "Meldung korrigieren"}
        </button>
      )}

      {!locked && open && (
        <div className="space-y-3">
          {m.isDuel ? (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-gray-400 space-y-1">
                {uname(m.player1)}
                <input type="number" min={0} value={score1} onChange={(e) => setScore1(e.target.value)} className={inputCls} />
              </label>
              <label className="text-xs text-gray-400 space-y-1">
                {uname(m.player2)}
                <input type="number" min={0} value={score2} onChange={(e) => setScore2(e.target.value)} className={inputCls} />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {statFields.map((f) => (
                <label key={f} className="text-xs text-gray-400 space-y-1">
                  {f}
                  <input
                    type="number"
                    min={0}
                    value={stats[f] ?? ""}
                    onChange={(e) => setStats({ ...stats, [f]: e.target.value })}
                    className={inputCls}
                  />
                </label>
              ))}
            </div>
          )}

          <div>
            <p className="text-xs text-gray-400 mb-1">Nachweis (Screenshots, max. 4)</p>
            <ProofUploader value={urls} onChange={setUrls} />
          </div>

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
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Sende…" : s ? "Meldung aktualisieren" : "Ergebnis melden"}
          </button>
        </div>
      )}
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
}: {
  eventId: string;
  userId: string;
  matches: ReportMatch[];
  submissions: MySubmission[];
  statFields: string[];
  locked: boolean;
}) {
  // Vorauswahl: erstes eigenes, noch nicht gespieltes Match — sonst das erste überhaupt.
  const defaultMatch = matches.find((m) => m.mine && !m.played) ?? matches.find((m) => m.mine) ?? matches[0];
  const [expanded, setExpanded] = useState(false);
  const [matchId, setMatchId] = useState(defaultMatch?.id ?? "");
  const match = matches.find((m) => m.id === matchId) ?? defaultMatch;
  const defaultSubject = (m: ReportMatch | undefined) =>
    m?.players.find((p) => p.id === userId)?.id ?? m?.players[0]?.id ?? "";
  const [subjectId, setSubjectId] = useState(defaultSubject(defaultMatch));

  if (!match) return null;

  const subject = match.isDuel ? null : match.players.find((p) => p.id === subjectId) ?? match.players[0] ?? null;
  const submission =
    submissions.find((x) => x.matchId === match.id && (match.isDuel || x.subjectId === subject?.id)) ?? null;
  const pendingCount = submissions.filter((x) => x.status === "pending" || x.status === "processing").length;

  return (
    <div className="glass rounded-2xl mt-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-2 p-4 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Ergebnis melden</span>
          {pendingCount > 0 && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300">
              {pendingCount} in Prüfung
            </span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-gray-500">
            Trage dein Ergebnis oder das eines anderen Spielers ein und lade Screenshots als Nachweis hoch. Das Ergebnis ist sofort für alle sichtbar. Ein Admin prüft es anhand der Screenshots und bestätigt oder korrigiert es; Punkte gibt es erst nach der Bestätigung. Screenshots werden nach einiger Zeit automatisch gelöscht.
          </p>

          <div className={`grid gap-2 ${match.isDuel ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
            <label className="text-xs text-gray-400 space-y-1">
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
                  <option key={m.id} value={m.id} className="bg-gray-900">
                    {m.label}{m.mine ? " (du)" : ""}{m.played ? " ✓" : ""}
                  </option>
                ))}
              </select>
            </label>
            {!match.isDuel && (
              <label className="text-xs text-gray-400 space-y-1">
                Spieler
                <select value={subject?.id ?? ""} onChange={(e) => setSubjectId(e.target.value)} className={inputCls}>
                  {match.players.map((p) => (
                    <option key={p.id} value={p.id} className="bg-gray-900">
                      {uname(p)}{p.id === userId ? " (du)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <MatchForm
            key={`${match.id}:${subject?.id ?? ""}`}
            eventId={eventId}
            m={match}
            subject={subject}
            s={submission}
            statFields={statFields}
            locked={locked}
          />
        </div>
      )}
    </div>
  );
}
