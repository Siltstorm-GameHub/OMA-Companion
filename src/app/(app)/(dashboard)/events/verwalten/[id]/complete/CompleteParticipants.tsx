"use client";
import CoinIcon from "@/components/CoinIcon";
import RankPointsIcon from "@/components/RankPointsIcon";
import { Ban } from "@/components/icons";
import { inputCls, userName, Avatar } from "./complete-shared";
import type { EventComplete } from "./useEventComplete";

/** Abschnitt "Teilnehmer" (Ohne Platzierung): wer war da, Disqualifikation, Notiz. */
export default function CompleteParticipants({ ctx }: { ctx: EventComplete }) {
  const { seriesId, registeredUsers, rankingNote, setRankingNote, setRankingDirty, excludedUsers, toggleExcluded, effectiveParticipationCoins, stepNo, participationRankPts, absentPlayers, toggleAbsent } = ctx;
  return (
    <section id="schritt-teilnehmer" aria-label="Teilnehmer" className="space-y-3 scroll-mt-20">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <span className="w-5 h-5 rounded-full bg-primary/15 text-primary-fg text-xs flex items-center justify-center">{stepNo("Teilnehmer")}</span>
            Teilnehmer
          </h2>
          <div className="rounded-control p-4 space-y-3" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
            <p className="text-xs text-muted">
              Ohne Platzierung: Es gibt keinen Sieger. Wer da war, bekommt die Teilnahme-Belohnung
              {seriesId ? " (laut Eventreihe)" : ""}. Nimm den Haken bei allen raus, die nicht gekommen sind.
            </p>
            <p className="text-[10px] text-subtle">☑ war da · <Ban className="w-3 h-3 inline" /> disqualifizieren (war da, aber keine Belohnung, öffentlich als ungewertet sichtbar)</p>
            {registeredUsers.length === 0 ? (
              <p className="text-sm text-subtle text-center py-4">Keine Teilnehmer registriert.</p>
            ) : (
              <div className="space-y-1">
                {registeredUsers.map(u => {
                  const isExcluded = excludedUsers.has(u.id);
                  const isAbsent = absentPlayers.has(u.id);
                  return (
                    <div key={u.id} className={`flex items-center gap-2 px-2 py-2 rounded-control border transition-colors ${
                      isExcluded ? "border-red-900/40 bg-danger-soft" : "border-line bg-surface-2"
                    }`}>
                      <input type="checkbox" checked={!isAbsent} onChange={() => toggleAbsent(u.id)}
                        aria-label={`${userName(u)} war da`} title={isAbsent ? "Nicht da: keine Belohnung" : "War da"}
                        className="rounded accent-primary shrink-0" />
                      <Avatar u={u} size={5} />
                      <span className={`text-xs flex-1 truncate ${isExcluded ? "text-danger/70 line-through" : isAbsent ? "text-subtle" : "text-fg"}`}>{userName(u)}</span>
                      {isExcluded && <span className="text-xs text-danger shrink-0">Disqualifiziert</span>}
                      {isAbsent && !isExcluded && <span className="text-xs text-subtle shrink-0">nicht da</span>}
                      <span className="flex flex-col items-end shrink-0 ml-1 gap-0">
                        {!isExcluded && !isAbsent && effectiveParticipationCoins > 0 && (
                          <span className="text-xs text-amber-400 tabular-nums leading-tight">+{effectiveParticipationCoins} <CoinIcon size={11} /></span>
                        )}
                        {!isExcluded && !isAbsent && participationRankPts > 0 && (
                          <span className="text-xs text-primary tabular-nums leading-tight">+{participationRankPts} <RankPointsIcon size={11} /></span>
                        )}
                      </span>
                      <button
                        onClick={() => toggleExcluded(u.id)}
                        title={isExcluded ? "Disqualifikation aufheben" : "Disqualifizieren (keine Münzen/Punkte)"}
                        className={`p-2.5 -m-1 shrink-0 transition-colors ${isExcluded ? "text-danger" : "text-subtle hover:text-danger"}`}
                      >
                        <Ban className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div>
              <label className="text-xs text-subtle block mb-1">Begründung / Notiz (optional)</label>
              <textarea
                value={rankingNote}
                onChange={e => { setRankingNote(e.target.value); setRankingDirty(true); }}
                placeholder="z.B. Spieler X disqualifiziert wegen …"
                rows={2}
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>
        </section>
  );
}
