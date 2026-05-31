import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { generateMonthlyQuests, QUEST_TYPE_META, type QuestType } from "@/lib/quests";
import { Trophy, RefreshCw } from "lucide-react";
import QuestRegenerateButton from "./QuestRegenerateButton";

const MONTH_NAMES = [
  "Januar","Februar","März","April","Mai","Juni",
  "Juli","August","September","Oktober","November","Dezember",
];

const TYPE_COLORS: Record<QuestType, { bg: string; bar: string; badge: string; glow: string }> = {
  VOICE_MINUTES: {
    bg:    "from-violet-500/10 to-transparent",
    bar:   "from-violet-600 to-violet-400",
    badge: "bg-violet-500/10 text-violet-300 border-violet-500/20",
    glow:  "shadow-violet-900/20",
  },
  MESSAGES: {
    bg:    "from-blue-500/10 to-transparent",
    bar:   "from-blue-600 to-blue-400",
    badge: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    glow:  "shadow-blue-900/20",
  },
  EVENT_ATTEND: {
    bg:    "from-emerald-500/10 to-transparent",
    bar:   "from-emerald-600 to-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    glow:  "shadow-emerald-900/20",
  },
  TOURNAMENT: {
    bg:    "from-amber-500/10 to-transparent",
    bar:   "from-amber-600 to-amber-400",
    badge: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    glow:  "shadow-amber-900/20",
  },
};

export default async function QuestsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const role = (session.user as { role?: string }).role ?? "user";

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  await generateMonthlyQuests(month, year);

  const quests = await prisma.quest.findMany({
    where: { month, year },
    include: { progress: { where: { userId } } },
    orderBy: { createdAt: "asc" },
  });

  const completedCount = quests.filter((q) => q.progress[0]?.completed).length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-gray-500 mb-1 uppercase tracking-widest">
            {MONTH_NAMES[month - 1]} {year}
          </p>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Monatliche Quests
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {completedCount} von {quests.length} abgeschlossen
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress ring */}
          <div className="relative w-14 h-14">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1f2937" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke="#be123c"
                strokeWidth="3"
                strokeDasharray={`${quests.length ? (completedCount / quests.length) * 100 : 0} 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
              {completedCount}/{quests.length}
            </span>
          </div>
          {(role === "admin" || role === "moderator") && (
            <QuestRegenerateButton />
          )}
        </div>
      </div>

      {/* Quest cards */}
      <div className="space-y-4">
        {quests.map((quest) => {
          const type = quest.type as QuestType;
          const meta = QUEST_TYPE_META[type];
          const colors = TYPE_COLORS[type];
          const progress = quest.progress[0];
          const current = Math.min(progress?.current ?? 0, quest.target);
          const completed = progress?.completed ?? false;
          const pct = Math.round((current / quest.target) * 100);

          return (
            <div key={quest.id}
              className={`relative overflow-hidden bg-gray-900 border rounded-2xl p-5 transition-all ${
                completed
                  ? "border-rose-800/40 shadow-lg shadow-rose-900/10"
                  : "border-white/5 hover:border-white/10"
              }`}>
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} pointer-events-none`} />

              <div className="relative">
                {/* Top row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{meta.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold ${completed ? "text-rose-300" : "text-white"}`}>
                          {quest.title}
                        </h3>
                        {completed && (
                          <span className="text-xs bg-rose-500/15 text-rose-300 border border-rose-500/20 px-2 py-0.5 rounded-full font-medium">
                            ✓ Abgeschlossen
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5">{quest.description}</p>
                    </div>
                  </div>
                  {/* Reward */}
                  <div className={`shrink-0 flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl border ${colors.badge}`}>
                    <Trophy className="w-3.5 h-3.5" />
                    +{quest.reward} Pts
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-500">
                      {current} / {quest.target} {meta.unit}
                    </span>
                    <span className={`text-xs font-semibold ${completed ? "text-rose-400" : "text-gray-400"}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${colors.bar} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info box */}
      <div className="mt-6 bg-gray-900/50 border border-white/5 rounded-xl p-4 text-xs text-gray-500">
        <p className="font-medium text-gray-400 mb-1">So funktionieren Quests</p>
        <ul className="space-y-1">
          <li>🎙️ <span className="text-gray-400">Sprachkanal:</span> Minuten werden beim Verlassen des Voice automatisch gezählt</li>
          <li>💬 <span className="text-gray-400">Nachrichten:</span> Jede Nachricht im Server zählt</li>
          <li>📅 <span className="text-gray-400">Events:</span> Zählt bei der Anmeldung zu einem Event</li>
          <li>⚔️ <span className="text-gray-400">Turniere:</span> Zählt bei der Teilnahme an einem Turnier</li>
        </ul>
        <p className="mt-2">Neue Quests werden automatisch am Anfang jeden Monats generiert.</p>
      </div>
    </div>
  );
}
