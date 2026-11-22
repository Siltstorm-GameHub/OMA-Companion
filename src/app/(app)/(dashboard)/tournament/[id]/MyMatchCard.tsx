"use client";
// "Dein Match": das eigene offene Match als Arbeitskarte — Gegner-Meldung direkt bestätigen oder
// selbst melden, ohne zum eingeklappten Formular unten scrollen und das Match neu wählen zu müssen.

import { useRef } from "react";
import { Clock, Swords } from "@/components/icons";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { confirmEventTiming } from "@/lib/event-timing-warning";
import { formatBerlinDateTime } from "@/lib/time";
import { MatchForm, ReportHint, type MySubmission, type ReportMatch } from "./MatchResultSubmit";
import type { UpcomingMatch } from "./NextMatches";

const uname = (u: { name: string | null; username: string | null }) => u.username ?? u.name ?? "?";

export default function MyMatchCard({
  match, report, submission, eventId, userId, statFields, locked, startAt, nextHint,
}: {
  match: UpcomingMatch;
  /** Meldbares Match (null = Melden hier nicht möglich, z. B. Zuschauer) */
  report: ReportMatch | null;
  submission: MySubmission | null;
  eventId: string;
  userId: string;
  statFields: string[];
  locked: boolean;
  startAt?: string;
  /** z. B. "Der Sieger trifft im Finale auf Fritzi oder Hanna" */
  nextHint?: string | null;
}) {
  const { confirm, ConfirmDialogElement } = useConfirm();
  const earlyOk = useRef(false);
  async function guardEarly(): Promise<boolean> {
    if (earlyOk.current || !startAt) return true;
    const ok = await confirmEventTiming(confirm, "results", { startAt });
    if (ok) earlyOk.current = true;
    return ok;
  }

  const isDuel = match.players.length <= 2 && (report?.isDuel ?? true);
  const me = report?.players.find(p => p.id === userId) ?? null;
  const when = match.scheduledAt
    ? formatBerlinDateTime(match.scheduledAt, { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <section aria-label="Dein Match"
      className={`rounded-2xl p-4 border space-y-3 ${match.live ? "border-red-500/50 bg-red-950/20" : "border-rose-700/40 bg-rose-950/20"}`}>
      {ConfirmDialogElement}
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-300 flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5" /> Dein Match · {match.label}
          </p>
          {match.live && <span className="text-[10px] font-bold text-red-400 animate-pulse">● LÄUFT GERADE</span>}
        </div>
        <p className="mt-1.5 text-base text-white font-semibold">
          {isDuel
            ? match.players.map(p => p.id === userId ? `${uname(p)} (du)` : uname(p)).join(" gegen ")
            : `${match.players.length} Spieler`}
        </p>
        {(when || nextHint) && (
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
            {when && <><Clock className="w-3 h-3" /><span>{when}</span></>}
            {when && nextHint && <span>·</span>}
            {nextHint && <span>{nextHint}</span>}
          </p>
        )}
      </div>

      {report && (
        <div className="space-y-2 border-t border-line pt-3">
          <MatchForm
            key={`${report.id}:${me?.id ?? ""}`}
            eventId={eventId}
            m={report}
            subject={report.isDuel ? null : me}
            s={submission}
            statFields={statFields}
            locked={locked}
            beforeSubmit={guardEarly}
            bare
          />
          {!locked && <ReportHint />}
        </div>
      )}
    </section>
  );
}
