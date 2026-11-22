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
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="w-5 h-5 rounded-full bg-teal-500/15 text-teal-300 text-xs flex items-center justify-center">{stepNo("Teilnehmer")}</span>
            Teilnehmer
          </h2>
          <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
            <p className="text-xs text-gray-400">
              Ohne Platzierung: Es gibt keinen Sieger. Wer da war, bekommt die Teilnahme-Belohnung
              {seriesId ? " (laut Eventreihe)" : ""}. Nimm den Haken bei allen raus, die nicht gekommen sind.
            </p>
            <p className="text-[10px] text-gray-600">☑ war da · <Ban className="w-3 h-3 inline" /> disqualifizieren (war da, aber keine Belohnung, öffentlich als ungewertet sichtbar)</p>
            {registeredUsers.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-4">Keine Teilnehmer registriert.</p>
            ) : (
              <div className="space-y-1">
                {registeredUsers.map(u => {
                  const isExcluded = excludedUsers.has(u.id);
                  const isAbsent = absentPlayers.has(u.id);
                  return (
                    <div key={u.id} className={`flex items-center gap-2 px-2 py-2 rounded-lg border transition-colors ${
                      isExcluded ? "border-red-900/40 bg-red-950/20" : "border-line bg-surface-2"
                    }`}>
                      <input type="checkbox" checked={!isAbsent} onChange={() => toggleAbsent(u.id)}
                        aria-label={`${userName(u)} war da`} title={isAbsent ? "Nicht da: keine Belohnung" : "War da"}
                        className="rounded accent-teal-500 shrink-0" />
                      <Avatar u={u} size={5} />
                      <span className={`text-xs flex-1 truncate ${isExcluded ? "text-red-300/70 line-through" : isAbsent ? "text-gray-500" : "text-white"}`}>{userName(u)}</span>
                      {isExcluded && <span className="text-xs text-red-400 shrink-0">Disqualifiziert</span>}
                      {isAbsent && !isExcluded && <span className="text-xs text-gray-500 shrink-0">nicht da</span>}
                      <span className="flex flex-col items-end shrink-0 ml-1 gap-0">
                        {!isExcluded && !isAbsent && effectiveParticipationCoins > 0 && (
                          <span className="text-xs text-amber-400 tabular-nums leading-tight">+{effectiveParticipationCoins} <CoinIcon size={11} /></span>
                        )}
                        {!isExcluded && !isAbsent && participationRankPts > 0 && (
                          <span className="text-xs text-teal-400 tabular-nums leading-tight">+{participationRankPts} <RankPointsIcon size={11} /></span>
                        )}
                      </span>
                      <button
                        onClick={() => toggleExcluded(u.id)}
                        title={isExcluded ? "Disqualifikation aufheben" : "Disqualifizieren (keine Münzen/Punkte)"}
                        className={`p-2.5 -m-1 shrink-0 transition-colors ${isExcluded ? "text-red-400" : "text-gray-600 hover:text-red-400"}`}
                      >
                        <Ban className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Begründung / Notiz (optional)</label>
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
