"use client";
import LivePollsPanel from "./LivePollsPanel";
import { Vote } from "@/components/icons";
import { NumberInput } from "@/components/ui/NumberInput";
import { userName, Avatar } from "./complete-shared";
import type { EventComplete } from "./useEventComplete";

/** Abschnitt "Umfrage": Live-Umfragen und alte Einzel-Umfrage. */
export default function CompletePolls({ ctx }: { ctx: EventComplete }) {
  const { eventId, registeredUsers, spectatorUsers, allUsers, pollConfig, pollsConfig, isAdmin, isMod, isPollOnly, isFinishedSummary, openEventPolls, pollExcluded, setPollExcluded, pollVotes, setPollVotes, pollEligible, pollWinners, stepNo } = ctx;
  return (
    <section id="schritt-umfrage" aria-label="Umfrage" className="space-y-3 scroll-mt-20">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="w-5 h-5 rounded-full bg-teal-500/15 text-teal-300 text-[11px] flex items-center justify-center">{stepNo("Umfrage")}</span>
            Umfrage
          </h2>
          {!isPollOnly && !isFinishedSummary && pollsConfig.length > 0 && (
            <p className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-xs text-gray-300">
              Nach dem Abschluss {pollsConfig.length === 1 ? "startet die Umfrage" : "starten die Umfragen"}{" "}
              {pollsConfig.map(pc => `„${pc.label || pc.question}“`).join(", ")}. Die Sieger-Belohnung wird nach Ablauf
              automatisch vergeben, du musst danach nichts mehr tun.
            </p>
          )}
          {openEventPolls.length > 0 && (
            <p className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200">
              <Vote className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Läuft noch: {openEventPolls.map(op => `„${op.label}“ bis ${new Date(op.endAt).toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })}`).join(", ")}.
                {" "}{isPollOnly && isMod
                  ? "Als Mod kannst du sie hier vorzeitig beenden, dann werden die Belohnungen sofort vergeben."
                  : "Die Belohnungen kommen automatisch nach dem Ende."}
              </span>
            </p>
          )}
          {(isPollOnly || isFinishedSummary) && (
            <LivePollsPanel
              eventId={eventId}
              isAdmin={isAdmin}
              isMod={isMod}
              readOnly={isFinishedSummary}
              registeredUsers={registeredUsers}
              spectatorUsers={spectatorUsers}
              allUsers={allUsers}
            />
          )}
          {/* Poll (legacy – nur wenn kein pollsConfig vorhanden) */}
          {pollConfig.enabled && pollsConfig.length === 0 && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.15)" }}>
              <div className="flex items-center gap-2">
                <Vote className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs font-semibold text-violet-300">
                  Umfrage (älteres Format): „{pollConfig.question}“
                </span>
                {isPollOnly && <span className="text-[10px] text-violet-400/60 ml-auto">ausstehend</span>}
              </div>
              <p className="text-[10px] text-gray-600 -mt-1">
                Diese Einzelumfrage stammt aus der alten, seriesweiten Umfrage-Konfiguration (nur noch bei Events/Reihen
                vorhanden, die vor der Einführung der Mehrfach-Umfragen erstellt wurden). Neue Events nutzen ausschließlich
                das Umfragen-Panel oben.
              </p>

              {!isFinishedSummary && (
                <>
                  <div>
                    <p className="text-[11px] text-gray-500 mb-1.5">Aus Abstimmung ausschließen:</p>
                    <div className="flex flex-wrap gap-2">
                      {registeredUsers.map(u => (
                        <label key={u.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs cursor-pointer transition-colors select-none ${
                          pollExcluded.has(u.id)
                            ? "bg-red-900/30 border border-red-700/40 text-red-300"
                            : "bg-white/[0.03] border border-white/[0.08] text-gray-400 hover:border-white/20"
                        }`}>
                          <input
                            type="checkbox"
                            checked={pollExcluded.has(u.id)}
                            onChange={e => {
                              setPollExcluded(prev => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(u.id); else next.delete(u.id);
                                return next;
                              });
                            }}
                            className="accent-red-500 w-3 h-3"
                          />
                          {userName(u)}
                        </label>
                      ))}
                    </div>
                  </div>

                  {pollEligible.length > 0 && (
                    <div>
                      <p className="text-[11px] text-gray-500 mb-1.5">Stimmen eintragen:</p>
                      <div className="space-y-1.5">
                        {pollEligible.map(u => (
                          <div key={u.id} className="flex items-center gap-3">
                            <Avatar u={u} size={5} />
                            <span className="flex-1 text-sm text-white truncate">{userName(u)}</span>
                            <NumberInput
                              min={0}
                              value={pollVotes[u.id] ?? 0}
                              onChange={e => setPollVotes(prev => ({ ...prev, [u.id]: Math.max(0, Number(e.target.value)) }))}
                              className="w-16 rounded-lg px-2 py-1.5 text-sm text-white text-center bg-gray-800 border border-gray-700 focus:border-violet-500/50 outline-none transition-colors"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pollEligible.length === 0 && (
                    <p className="text-xs text-gray-600 italic">Alle Teilnehmer ausgeschlossen.</p>
                  )}
                </>
              )}

              {pollWinners.length > 0 ? (
                <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-3 py-2 space-y-1">
                  <p className="text-[11px] text-violet-400 font-semibold">
                    {pollWinners.length === 1 ? "Gewinner" : `Unentschieden – alle ${pollWinners.length} gewinnen`}
                  </p>
                  {pollWinners.map(id => {
                    const u = registeredUsers.find(u => u.id === id);
                    if (!u) return null;
                    return (
                      <div key={id} className="flex items-center gap-2 text-sm text-white">
                        <Avatar u={u} size={5} />
                        {userName(u)}
                        {!isFinishedSummary && <span className="text-xs text-gray-500">({pollVotes[id] ?? 0} Stimmen)</span>}
                      </div>
                    );
                  })}
                  <p className="text-[11px] text-gray-500 mt-1">
                    Belohnung: {pollConfig.coins > 0 ? `${pollConfig.coins} Münzen` : ""}
                    {pollConfig.coins > 0 && pollConfig.rankPoints > 0 ? " + " : ""}
                    {pollConfig.rankPoints > 0 ? `${pollConfig.rankPoints} Punkte` : ""}
                  </p>
                </div>
              ) : isFinishedSummary ? (
                <p className="text-xs text-gray-600 italic">Kein Sieger.</p>
              ) : null}
            </div>
          )}

        </section>
  );
}
