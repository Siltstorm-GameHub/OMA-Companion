import { CheckCircle2, Swords } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import WinIcon from "@/components/WinIcon";
import { QUEST_TYPE_META, type QuestType } from "@/lib/quests";

/**
 * Quest-Fortschritt + Turnier-Ergebnisse — extrahiert aus `page.tsx`, damit
 * beide Blöcke sowohl von der Desktop-Ansicht als auch vom mobilen
 * "Profil"-Reiter (`ProfileMobileView.tsx`, siehe Teil B des Umbau-Plans)
 * genutzt werden können, ohne das Markup zu duplizieren. Reines Refactoring —
 * keine visuelle Änderung gegenüber dem vorherigen Inline-Code.
 */
export interface ProfileQuestEntry {
  id:       string;
  title:    string;
  type:     string;
  target:   number;
  reward:   number;
  progress: { current: number; completed: boolean }[];
}

export interface ProfileTournamentParticipationEntry {
  id:         string;
  finalRank:  number | null;
  eliminated: boolean;
  event: {
    title:   string;
    matches: { winnerId: string | null }[];
  };
}

interface Props {
  questsWithProgress:       ProfileQuestEntry[];
  tournamentParticipations: ProfileTournamentParticipationEntry[];
  userId:                   string;
}

export default function ProfileQuestsAndTournaments({ questsWithProgress, tournamentParticipations, userId }: Props) {
  return (
    <>
      {/* Quest-Fortschritt */}
      {questsWithProgress.length > 0 && (
        <section>
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">📜 Monatliche Quests</h2>
          <div className="space-y-2">
            {questsWithProgress.map(quest => {
              const meta    = QUEST_TYPE_META[quest.type as QuestType];
              const p       = quest.progress[0];
              const current = Math.min(p?.current ?? 0, quest.target);
              const pct     = Math.round((current / quest.target) * 100);
              const done    = p?.completed ?? false;
              return (
                <div key={quest.id} className={`glass card-shine rounded-xl px-4 py-3 relative overflow-hidden ${done ? "border-emerald-500/20" : ""}`}>
                  <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${meta.bar} rounded-l-xl`} />
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{meta.icon}</span>
                      <span className={`text-sm font-medium ${done ? "text-emerald-300" : "text-white"}`}>{quest.title}</span>
                      {done && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-500">{current}/{quest.target}</span>
                      <span className="text-xs text-amber-400 font-semibold flex items-center gap-0.5 tabular-nums">+{quest.reward}<CoinIcon size={10} /></span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${meta.bar} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Turnier-Ergebnisse */}
      {tournamentParticipations.length > 0 && (
        <section>
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Swords className="w-3.5 h-3.5" /> Turnier-Ergebnisse
          </h2>
          <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
            {tournamentParticipations.map(p => {
              const myMatches = p.event.matches;
              const wins      = myMatches.filter(m => m.winnerId === userId).length;
              const losses    = myMatches.filter(m => m.winnerId && m.winnerId !== userId).length;
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center shrink-0">
                    <WinIcon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.event.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {wins > 0 ? `${wins} Siege` : ""}
                      {wins > 0 && losses > 0 ? " · " : ""}
                      {losses > 0 ? `${losses} Niederlagen` : ""}
                      {wins === 0 && losses === 0 ? "Keine Matches gespielt" : ""}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                    p.finalRank === 1  ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                    p.eliminated       ? "bg-white/[0.04] text-gray-500 border-white/[0.06]" :
                                         "bg-white/[0.04] text-gray-400 border-white/[0.06]"
                  }`}>
                    {p.finalRank === 1 ? <><WinIcon size={11} /> Sieger</> : p.eliminated ? "Ausgeschieden" : "Aktiv"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
