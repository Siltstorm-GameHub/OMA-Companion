"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NumberInput } from "@/components/ui/NumberInput";

type Sub = {
  id: string;
  user: { id: string; name: string };
  forUser: { id: string; name: string } | null;
  status: string;
  applied: boolean;
  score1: number | null; score2: number | null; placement: number | null; score: number | null;
  /** Gleichstand im K.O.-Spiel: wer (nach Elfmeterschießen) weiterkommt */
  advancerId: string | null;
  stats: Record<string, number>;
  note: string | null;
  reviewNote: string | null;
  screenshotUrls: string[];
  original: { score1: number | null; score2: number | null; placement: number | null; score: number | null; statsJson: Record<string, number> | null } | null;
  createdAt: string;
};
export type ReviewMatch = {
  id: string;
  label: string;
  isDuel: boolean;
  player1: { id: string; name: string } | null;
  player2: { id: string; name: string } | null;
  current: { score1: number | null; score2: number | null } | null;
  submissions: Sub[];
};

const STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Offen",      cls: "bg-amber-900/40 text-amber-300" },
  processing:{ label: "In Arbeit",  cls: "bg-amber-900/40 text-amber-300" },
  approved:  { label: "Übernommen", cls: "bg-emerald-900/40 text-emerald-300" },
  corrected: { label: "Korrigiert", cls: "bg-blue-900/40 text-blue-300" },
  rejected:  { label: "Abgelehnt",  cls: "bg-red-900/40 text-red-300" },
};

const inputCls =
  "w-full px-2.5 py-1.5 rounded-lg bg-surface-2 border border-line-strong text-sm text-white focus:border-teal-500/40 focus:outline-none";

function SubmissionCard({ eventId, match, sub, statFields }: { eventId: string; match: ReviewMatch; sub: Sub; statFields: string[] }) {
  const router = useRouter();
  const [score1, setScore1] = useState(sub.score1?.toString() ?? "");
  const [score2, setScore2] = useState(sub.score2?.toString() ?? "");
  const [stats, setStats] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(sub.stats).map(([k, v]) => [k, String(v)])),
  );
  const [reviewNote, setReviewNote] = useState(sub.reviewNote ?? "");
  const [advancerId, setAdvancerId] = useState(sub.advancerId ?? "");
  const tie = match.isDuel && score1 !== "" && score1 === score2;
  const [zoom, setZoom] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const changed =
    (match.isDuel && (score1 !== (sub.score1?.toString() ?? "") || score2 !== (sub.score2?.toString() ?? "") || advancerId !== (sub.advancerId ?? ""))) ||
    (!match.isDuel && statFields.some((f) => (stats[f] ?? "") !== String(sub.stats[f] ?? "")));

  async function act(action: "approve" | "correct" | "reject") {
    setBusy(true);
    try {
      const res = await fetch(`/api/tournaments/${eventId}/submissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: sub.id, action, reviewNote,
          ...(action === "correct"
            ? match.isDuel ? { score1, score2, advancerId: tie ? advancerId || null : null } : { statsJson: stats }
            : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error ?? "Aktion fehlgeschlagen");
      toast.success(data.supersededByPlayer ? "Übernommen — der Spieler hat zwischenzeitlich neu gemeldet, bitte erneut prüfen" : action === "reject" ? "Meldung abgelehnt" : "Ergebnis übernommen");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const done = sub.status !== "pending";
  const st = STATUS[sub.status];

  return (
    <div className="rounded-xl border border-line p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-white">
          {sub.forUser && <>Werte von <span className="font-medium">{sub.forUser.name}</span> · </>}
          Gemeldet von <span className="font-medium">{sub.user.name}</span>
          <span className="text-xs text-gray-500"> · {new Date(sub.createdAt).toLocaleString("de-DE")}</span>
        </p>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${st?.cls ?? ""}`}>{st?.label ?? sub.status}{sub.applied && !done ? " · vorläufig sichtbar" : ""}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {sub.screenshotUrls.map((u) => (
          <button key={u} type="button" onClick={() => setZoom(u)} className="w-28 h-20 rounded-lg overflow-hidden border border-line-strong">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="Nachweis" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {sub.screenshotUrls.length === 0 && <p className="text-xs text-gray-500">Screenshots wurden automatisch gelöscht.</p>}

      {sub.note && <p className="text-xs text-gray-400">„{sub.note}“</p>}

      {match.isDuel ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-gray-400 space-y-1">{match.player1?.name ?? "Spieler 1"}
            <NumberInput min={0} value={score1} disabled={done} onChange={(e) => setScore1(e.target.value)} className={inputCls} />
          </label>
          <label className="text-xs text-gray-400 space-y-1">{match.player2?.name ?? "Spieler 2"}
            <NumberInput min={0} value={score2} disabled={done} onChange={(e) => setScore2(e.target.value)} className={inputCls} />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {statFields.map((f) => (
            <label key={f} className="text-xs text-gray-400 space-y-1">{f}
              <NumberInput min={0} value={stats[f] ?? ""} disabled={done} onChange={(e) => setStats({ ...stats, [f]: e.target.value })} className={inputCls} />
            </label>
          ))}
        </div>
      )}

      {/* Gleichstand: im K.O.-Spiel entscheidet, wer nach Elfmeterschießen weiterkommt */}
      {tie && match.player1 && match.player2 && (
        <label className="block text-xs text-gray-400 space-y-1">Wer kommt weiter? (nur im K.O.-Spiel, z.B. nach Elfmeterschießen)
          <select value={advancerId} disabled={done} onChange={(e) => setAdvancerId(e.target.value)} className={inputCls}>
            <option value="">— niemand (Unentschieden)</option>
            <option value={match.player1.id}>{match.player1.name}</option>
            <option value={match.player2.id}>{match.player2.name}</option>
          </select>
        </label>
      )}

      {sub.original && (
        <p className="text-xs text-blue-300/80">
          Ursprünglich gemeldet: {match.isDuel
            ? `${sub.original.score1 ?? "–"} : ${sub.original.score2 ?? "–"}`
            : Object.entries(sub.original.statsJson ?? {}).map(([k, v]) => `${k} ${v}`).join(", ") || "–"}
        </p>
      )}

      {done ? (
        sub.reviewNote && <p className="text-xs text-gray-400">Prüf-Notiz: {sub.reviewNote}</p>
      ) : (
        <div className="space-y-2">
          <input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} maxLength={500} placeholder="Notiz an den Spieler (optional)" className={inputCls} />
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} onClick={() => act(changed ? "correct" : "approve")}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium disabled:opacity-50">
              {changed ? "Korrigiert übernehmen" : "Übernehmen"}
            </button>
            <button disabled={busy} onClick={() => act("reject")}
              className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/60 text-red-200 text-sm font-medium disabled:opacity-50">
              Ablehnen
            </button>
          </div>
        </div>
      )}

      {zoom && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="Nachweis" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
}

/** Offene Meldungen eines Matches widersprechen sich (1v1: anderes Ergebnis; FFA/Coop: andere Werte für denselben Spieler). */
function conflictOf(m: ReviewMatch): boolean {
  const pending = m.submissions.filter((s) => s.status === "pending");
  if (m.isDuel) return new Set(pending.map((s) => `${s.score1}:${s.score2}:${s.advancerId ?? ""}`)).size > 1;
  const bySubject = new Map<string, Set<string>>();
  for (const s of pending) {
    const key = s.forUser?.id ?? s.user.id;
    const vals = bySubject.get(key) ?? new Set<string>();
    vals.add(JSON.stringify(Object.keys(s.stats).sort().map((k) => [k, s.stats[k]])));
    bySubject.set(key, vals);
  }
  return [...bySubject.values()].some((v) => v.size > 1);
}

export default function ResultReviewClient({ eventId, matches, statFields }: { eventId: string; matches: ReviewMatch[]; statFields: string[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [bulkBusy, setBulkBusy] = useState(false);
  if (matches.length === 0) {
    return <div className="glass rounded-2xl p-8 text-center text-gray-400 text-sm">Noch keine Ergebnis-Meldungen.</div>;
  }
  const openMatches = matches.filter((m) => m.submissions.some((s) => s.status === "pending"));
  const shown = filter === "open" ? openMatches : matches;
  // Sammelaktion: alle offenen Meldungen ohne Widerspruch so übernehmen
  const bulkSubs = openMatches.filter((m) => !conflictOf(m)).flatMap((m) => m.submissions.filter((s) => s.status === "pending"));

  async function approveAll() {
    setBulkBusy(true);
    let ok = 0;
    const failed: string[] = [];
    for (const s of bulkSubs) {
      const res = await fetch(`/api/tournaments/${eventId}/submissions`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: s.id, action: "approve" }),
      });
      if (res.ok) ok++;
      else failed.push((await res.json().catch(() => ({}))).error ?? "Fehler");
    }
    setBulkBusy(false);
    if (ok) toast.success(`${ok} ${ok === 1 ? "Meldung" : "Meldungen"} übernommen`);
    if (failed.length) toast.error(`${failed.length} nicht übernommen: ${[...new Set(failed)].join(" · ")}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {([["open", `Offen (${openMatches.length})`], ["all", `Alle (${matches.length})`]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter === k ? "bg-teal-500/15 text-teal-200 ring-1 ring-teal-500/25" : "text-gray-400 hover:text-gray-200 hover:bg-line"}`}>
            {label}
          </button>
        ))}
        {bulkSubs.length > 0 && (
          <button type="button" onClick={approveAll} disabled={bulkBusy}
            title="Übernimmt jede offene Meldung so, wie sie gemeldet wurde. Matches mit Widerspruch bleiben offen."
            className="ml-auto rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-white">
            {bulkBusy ? "Übernehme …" : `Alle offenen ohne Widerspruch übernehmen (${bulkSubs.length})`}
          </button>
        )}
      </div>
      {shown.length === 0 && (
        <div className="glass rounded-2xl p-6 text-center text-gray-400 text-sm">Alles geprüft, keine offenen Meldungen.</div>
      )}
      {shown.map((m) => {
        const conflict = conflictOf(m);
        const pendingDuel = m.isDuel ? m.submissions.filter((s) => s.status === "pending") : [];
        return (
          <div key={m.id} className="glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">
                {m.label}
                {m.isDuel && m.player1 && m.player2 && <span className="text-gray-500 font-normal"> · {m.player1.name} vs {m.player2.name}</span>}
              </h3>
              {m.current && <span className="text-xs text-gray-500">Aktuell: {m.current.score1 ?? "–"} : {m.current.score2 ?? "–"}</span>}
            </div>
            {conflict && (
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-200 space-y-0.5">
                <p className="font-semibold">⚠ Die Meldungen widersprechen sich — bitte anhand der Screenshots prüfen:</p>
                {m.isDuel
                  ? pendingDuel.map((s) => (
                      <p key={s.id}>{s.user.name}: {m.player1?.name} <span className="font-mono">{s.score1 ?? "–"}:{s.score2 ?? "–"}</span> {m.player2?.name}
                        {s.advancerId && <> · weiter: {s.advancerId === m.player1?.id ? m.player1?.name : m.player2?.name}</>}</p>
                    ))
                  : <p>Für denselben Spieler wurden unterschiedliche Werte gemeldet.</p>}
              </div>
            )}
            {m.submissions.map((s) => (
              <SubmissionCard key={s.id} eventId={eventId} match={m} sub={s} statFields={statFields} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
