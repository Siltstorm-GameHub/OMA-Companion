"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Sub = {
  id: string;
  user: { id: string; name: string };
  status: string;
  score1: number | null; score2: number | null; placement: number | null; score: number | null;
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
  approved:  { label: "Übernommen", cls: "bg-emerald-900/40 text-emerald-300" },
  corrected: { label: "Korrigiert", cls: "bg-blue-900/40 text-blue-300" },
  rejected:  { label: "Abgelehnt",  cls: "bg-red-900/40 text-red-300" },
};

const inputCls =
  "w-full px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.1] text-sm text-white focus:border-teal-500/40 focus:outline-none";

function SubmissionCard({ eventId, match, sub, statFields }: { eventId: string; match: ReviewMatch; sub: Sub; statFields: string[] }) {
  const router = useRouter();
  const [score1, setScore1] = useState(sub.score1?.toString() ?? "");
  const [score2, setScore2] = useState(sub.score2?.toString() ?? "");
  const [placement, setPlacement] = useState(sub.placement?.toString() ?? "");
  const [score, setScore] = useState(sub.score?.toString() ?? "");
  const [stats, setStats] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(sub.stats).map(([k, v]) => [k, String(v)])),
  );
  const [reviewNote, setReviewNote] = useState(sub.reviewNote ?? "");
  const [zoom, setZoom] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const changed =
    (match.isDuel && (score1 !== (sub.score1?.toString() ?? "") || score2 !== (sub.score2?.toString() ?? ""))) ||
    (!match.isDuel &&
      (placement !== (sub.placement?.toString() ?? "") ||
        score !== (sub.score?.toString() ?? "") ||
        statFields.some((f) => (stats[f] ?? "") !== String(sub.stats[f] ?? ""))));

  async function act(action: "approve" | "correct" | "reject") {
    setBusy(true);
    try {
      const res = await fetch(`/api/tournaments/${eventId}/submissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: sub.id, action, reviewNote,
          ...(action === "correct"
            ? match.isDuel ? { score1, score2 } : { placement, score, statsJson: stats }
            : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error ?? "Aktion fehlgeschlagen");
      toast.success(action === "reject" ? "Meldung abgelehnt" : "Ergebnis übernommen");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const done = sub.status !== "pending";
  const st = STATUS[sub.status];

  return (
    <div className="rounded-xl border border-white/[0.08] p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-white">
          Gemeldet von <span className="font-medium">{sub.user.name}</span>
          <span className="text-xs text-gray-500"> · {new Date(sub.createdAt).toLocaleString("de-DE")}</span>
        </p>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${st?.cls ?? ""}`}>{st?.label ?? sub.status}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {sub.screenshotUrls.map((u) => (
          <button key={u} type="button" onClick={() => setZoom(u)} className="w-28 h-20 rounded-lg overflow-hidden border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="Nachweis" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {sub.note && <p className="text-xs text-gray-400">„{sub.note}“</p>}

      {match.isDuel ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-gray-400 space-y-1">{match.player1?.name ?? "Spieler 1"}
            <input type="number" min={0} value={score1} disabled={done} onChange={(e) => setScore1(e.target.value)} className={inputCls} />
          </label>
          <label className="text-xs text-gray-400 space-y-1">{match.player2?.name ?? "Spieler 2"}
            <input type="number" min={0} value={score2} disabled={done} onChange={(e) => setScore2(e.target.value)} className={inputCls} />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <label className="text-xs text-gray-400 space-y-1">Platzierung
            <input type="number" min={1} value={placement} disabled={done} onChange={(e) => setPlacement(e.target.value)} className={inputCls} />
          </label>
          <label className="text-xs text-gray-400 space-y-1">Punkte
            <input type="number" min={0} value={score} disabled={done} onChange={(e) => setScore(e.target.value)} className={inputCls} />
          </label>
          {statFields.map((f) => (
            <label key={f} className="text-xs text-gray-400 space-y-1">{f}
              <input type="number" min={0} value={stats[f] ?? ""} disabled={done} onChange={(e) => setStats({ ...stats, [f]: e.target.value })} className={inputCls} />
            </label>
          ))}
        </div>
      )}

      {sub.original && (
        <p className="text-xs text-blue-300/80">
          Ursprünglich gemeldet: {match.isDuel
            ? `${sub.original.score1 ?? "–"} : ${sub.original.score2 ?? "–"}`
            : `Platz ${sub.original.placement ?? "–"}, Punkte ${sub.original.score ?? "–"}`}
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

export default function ResultReviewClient({ eventId, matches, statFields }: { eventId: string; matches: ReviewMatch[]; statFields: string[] }) {
  if (matches.length === 0) {
    return <div className="glass rounded-2xl p-8 text-center text-gray-400 text-sm">Noch keine Ergebnis-Meldungen.</div>;
  }
  return (
    <div className="space-y-4">
      {matches.map((m) => {
        const conflict = m.isDuel && new Set(m.submissions.filter((s) => s.status === "pending").map((s) => `${s.score1}:${s.score2}`)).size > 1;
        return (
          <div key={m.id} className="glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">
                {m.label}
                {m.isDuel && m.player1 && m.player2 && <span className="text-gray-500 font-normal"> · {m.player1.name} vs {m.player2.name}</span>}
              </h3>
              {m.current && <span className="text-xs text-gray-500">Aktuell: {m.current.score1 ?? "–"} : {m.current.score2 ?? "–"}</span>}
            </div>
            {conflict && <p className="text-xs text-amber-300">⚠ Die Meldungen widersprechen sich — bitte anhand der Screenshots prüfen.</p>}
            {m.submissions.map((s) => (
              <SubmissionCard key={s.id} eventId={eventId} match={m} sub={s} statFields={statFields} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
