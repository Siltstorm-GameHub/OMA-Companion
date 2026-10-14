"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProofUploader from "@/components/match-results/ProofUploader";

type U = { id: string; name: string | null; username: string | null };
export type MyMatch = {
  id: string;
  label: string;
  isDuel: boolean;
  player1: U | null;
  player2: U | null;
  played: boolean;
  submission: {
    status: string;
    score1: number | null;
    score2: number | null;
    placement: number | null;
    score: number | null;
    statsJson: string | null;
    note: string | null;
    screenshotUrls: string[];
    reviewNote: string | null;
  } | null;
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

function MatchForm({ eventId, m, statFields, locked }: { eventId: string; m: MyMatch; statFields: string[]; locked: boolean }) {
  const router = useRouter();
  const s = m.submission;
  const initialStats: Record<string, number> = s?.statsJson ? JSON.parse(s.statsJson) : {};

  const [score1, setScore1] = useState(s?.score1?.toString() ?? "");
  const [score2, setScore2] = useState(s?.score2?.toString() ?? "");
  const [placement, setPlacement] = useState(s?.placement?.toString() ?? "");
  const [score, setScore] = useState(s?.score?.toString() ?? "");
  const [stats, setStats] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(initialStats).map(([k, v]) => [k, String(v)])),
  );
  const [note, setNote] = useState(s?.note ?? "");
  const [urls, setUrls] = useState<string[]>(s?.screenshotUrls ?? []);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(!s);

  async function submit() {
    if (urls.length === 0) return toast.error("Bitte mindestens einen Screenshot hochladen");
    setBusy(true);
    try {
      const res = await fetch(`/api/tournaments/${eventId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: m.id,
          ...(m.isDuel ? { score1, score2 } : { placement, score, statsJson: stats }),
          note,
          screenshotUrls: urls,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error ?? "Senden fehlgeschlagen");
      toast.success("Ergebnis gemeldet — ein Admin prüft es anhand deiner Screenshots");
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/[0.08] p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-white truncate">{m.label}</p>
        {s && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS[s.status]?.cls ?? ""}`}>
            {STATUS[s.status]?.label ?? s.status}
          </span>
        )}
      </div>

      {s?.reviewNote && <p className="text-xs text-gray-400">Admin: {s.reviewNote}</p>}

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
              <label className="text-xs text-gray-400 space-y-1">
                Platzierung
                <input type="number" min={1} value={placement} onChange={(e) => setPlacement(e.target.value)} className={inputCls} />
              </label>
              <label className="text-xs text-gray-400 space-y-1">
                Punkte
                <input type="number" min={0} value={score} onChange={(e) => setScore(e.target.value)} className={inputCls} />
              </label>
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
  matches,
  statFields,
  locked,
}: {
  eventId: string;
  matches: MyMatch[];
  statFields: string[];
  locked: boolean;
}) {
  if (matches.length === 0) return null;
  return (
    <div className="glass rounded-2xl p-4 mb-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-white">Ergebnis melden</h3>
        <p className="text-xs text-gray-500">
          Trage dein Ergebnis ein und lade Screenshots als Nachweis hoch. Ein Admin prüft die Meldung und übernimmt oder korrigiert sie. Screenshots werden nach einiger Zeit automatisch gelöscht.
        </p>
      </div>
      {matches.map((m) => (
        <MatchForm key={m.id} eventId={eventId} m={m} statFields={statFields} locked={locked} />
      ))}
    </div>
  );
}
