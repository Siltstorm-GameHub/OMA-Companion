import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { generateMonthlyQuests, QUEST_TYPE_META, type QuestType } from "@/lib/quests";
import { Trophy, Lock, CheckCircle2, Clock } from "lucide-react";
import QuestRegenerateButton from "./QuestRegenerateButton";

const MONTH_NAMES = [
  "Januar","Februar","März","April","Mai","Juni",
  "Juli","August","September","Oktober","November","Dezember",
];

export default async function QuestsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const role = (session.user as { role?: string }).role ?? "user";
  const isStaff = role === "admin" || role === "moderator";

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Tage bis Monatsende
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysLeft = daysInMonth - now.getDate();

  // Aktuelle Quests generieren falls nötig
  await generateMonthlyQuests(month, year);

  // Aktuelle Quests + Verlauf (letzte 3 abgeschlossene Monate)
  const [currentQuests, historyQuests] = await Promise.all([
    prisma.quest.findMany({
      where: { month, year },
      include: { progress: { where: { userId } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.quest.findMany({
      where: {
        OR: [
          { year: year, month: { lt: month } },
          { year: year - 1 },
        ],
        progress: { some: { userId } },
      },
      include: { progress: { where: { userId } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 9, // max 3 vergangene Monate × 3 Quests
    }),
  ]);

  const completedCount = currentQuests.filter(q => q.progress[0]?.completed).length;
  const allDone = completedCount === currentQuests.length && currentQuests.length > 0;

  // Vergangene Monate gruppieren
  const historyByMonth = new Map<string, typeof historyQuests>();
  for (const q of historyQuests) {
    const key = `${q.year}-${q.month}`;
    if (!historyByMonth.has(key)) historyByMonth.set(key, []);
    historyByMonth.get(key)!.push(q);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
            {MONTH_NAMES[month - 1]} {year}
          </p>
          <h1 className="text-2xl font-bold text-white tracking-tight">Monatliche Quests</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className={`text-sm ${allDone ? "text-emerald-400 font-medium" : "text-gray-500"}`}>
              {completedCount} von {currentQuests.length} abgeschlossen
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-600">
              <Clock className="w-3 h-3" />
              Zurückgesetzt in {daysLeft} {daysLeft === 1 ? "Tag" : "Tagen"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Progress ring */}
          <div className="relative w-14 h-14">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1f2937" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke={allDone ? "#10b981" : "#be123c"}
                strokeWidth="3"
                strokeDasharray={`${currentQuests.length ? (completedCount / currentQuests.length) * 100 : 0} 100`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
              {completedCount}/{currentQuests.length}
            </span>
          </div>
          {isStaff && <QuestRegenerateButton />}
        </div>
      </div>

      {/* "Alle abgeschlossen"-Banner */}
      {allDone && (
        <div className="flex items-center gap-3 bg-emerald-900/20 border border-emerald-700/30 rounded-2xl p-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">Alle Quests diesen Monat abgeschlossen! 🎉</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Neue Quests erscheinen am 1. {MONTH_NAMES[month % 12]}
            </p>
          </div>
        </div>
      )}

      {/* ── Aktuelle Quest-Karten ───────────────────────────────────── */}
      <div className="space-y-3">
        {currentQuests.map(quest => {
          const type = quest.type as QuestType;
          const meta = QUEST_TYPE_META[type];
          const progress = quest.progress[0];
          const current = Math.min(progress?.current ?? 0, quest.target);
          const completed = progress?.completed ?? false;
          const pct = quest.target > 0 ? Math.round((current / quest.target) * 100) : 0;

          return (
            <div key={quest.id}
              className={`relative overflow-hidden rounded-2xl border transition-all ${
                completed
                  ? "bg-gray-900 border-emerald-800/40"
                  : "bg-gray-900 border-white/5 hover:border-white/10"
              }`}>
              {/* Farbiger Gradient-Streifen links */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${meta.bar} rounded-l-2xl`} />
              <div className={`absolute inset-0 bg-gradient-to-br ${meta.bg} to-transparent opacity-50 pointer-events-none`} />

              <div className="relative pl-5 pr-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-2xl mt-0.5 shrink-0">{meta.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-semibold ${completed ? "text-emerald-300" : "text-white"}`}>
                          {quest.title}
                        </h3>
                        {completed ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-emerald-900/30 text-emerald-400 border border-emerald-700/30 px-2 py-0.5 rounded-full font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Abgeschlossen
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5">{quest.description}</p>
                    </div>
                  </div>

                  {/* Belohnung */}
                  <div className={`shrink-0 flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-xl border ${
                    completed
                      ? "bg-emerald-900/20 text-emerald-400 border-emerald-700/30"
                      : `${meta.bg} ${meta.color} border-white/10`
                  }`}>
                    {completed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Trophy className="w-3.5 h-3.5" />}
                    +{quest.reward} Pts
                  </div>
                </div>

                {/* Fortschrittsbalken */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="text-gray-500">
                      {current} / {quest.target} {meta.unit}
                    </span>
                    <span className={`font-semibold ${completed ? "text-emerald-400" : meta.color}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${meta.bar} transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Abgeschlossen: Gesperrter Hinweis */}
                {completed && (
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-700">
                    <Lock className="w-3 h-3" />
                    Für diesen Monat abgeschlossen · Punkte wurden gutgeschrieben
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Info-Box ────────────────────────────────────────────────── */}
      <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-4">
        <p className="text-xs font-semibold text-gray-400 mb-2">So funktionieren Quests</p>
        <ul className="space-y-1.5 text-xs text-gray-500">
          <li className="flex items-start gap-2">
            <span className="shrink-0">🎙️</span>
            <span><span className="text-gray-400">Sprachkanal:</span> Minuten werden beim Verlassen des Voice automatisch gezählt</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0">💬</span>
            <span><span className="text-gray-400">Nachrichten:</span> Jede Nachricht im Discord-Server zählt</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0">📅</span>
            <span><span className="text-gray-400">Events:</span> Zählt bei der Anmeldung</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0">⚔️</span>
            <span><span className="text-gray-400">Turniere:</span> Zählt bei der Teilnahme</span>
          </li>
        </ul>
        <p className="mt-3 text-xs text-gray-600 flex items-center gap-1.5">
          <Lock className="w-3 h-3" />
          Jede Quest ist nur einmal pro Monat abschließbar. Am 1. des Monats gibt es neue Quests.
        </p>
      </div>

      {/* ── Verlauf vergangener Monate ──────────────────────────────── */}
      {historyByMonth.size > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
            Vergangene Monate
          </h2>
          <div className="space-y-4">
            {Array.from(historyByMonth.entries()).map(([key, quests]) => {
              const [y, m] = key.split("-").map(Number);
              const monthCompleted = quests.filter(q => q.progress[0]?.completed).length;
              const totalPts = quests.reduce(
                (sum, q) => sum + (q.progress[0]?.completed ? q.reward : 0),
                0
              );

              return (
                <div key={key} className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden">
                  {/* Monats-Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {MONTH_NAMES[m - 1]} {y}
                      </span>
                      <span className="text-xs text-gray-500">
                        {monthCompleted}/{quests.length} abgeschlossen
                      </span>
                    </div>
                    {totalPts > 0 && (
                      <span className="text-xs font-semibold text-amber-400">+{totalPts} Pts verdient</span>
                    )}
                  </div>

                  {/* Quest-Zeilen */}
                  <div className="divide-y divide-white/5">
                    {quests.map(quest => {
                      const meta = QUEST_TYPE_META[quest.type as QuestType];
                      const p = quest.progress[0];
                      const done = p?.completed ?? false;
                      const current = Math.min(p?.current ?? 0, quest.target);
                      const pct = quest.target > 0 ? Math.round((current / quest.target) * 100) : 0;

                      return (
                        <div key={quest.id} className={`flex items-center gap-3 px-4 py-3 ${!done ? "opacity-50" : ""}`}>
                          <span className="text-lg shrink-0">{meta.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white truncate">{quest.title}</span>
                            </div>
                            {/* Mini-Fortschrittsbalken */}
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden max-w-24">
                                <div
                                  className={`h-full rounded-full bg-gradient-to-r ${meta.bar}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-gray-600">{current}/{quest.target}</span>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {done ? (
                              <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> +{quest.reward} Pts
                              </span>
                            ) : (
                              <span className="text-xs text-gray-600">Nicht abgeschlossen</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
