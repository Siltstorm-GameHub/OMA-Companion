import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/roles";
import { generateMonthlyQuests, QUEST_TYPE_META, type QuestType } from "@/lib/quests";
import { Trophy, Lock, CheckCircle2, Clock, Scroll } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import QuestRegenerateButton from "./QuestRegenerateButton";

const MONTH_NAMES = [
  "Januar","Februar","März","April","Mai","Juni",
  "Juli","August","September","Oktober","November","Dezember",
];

export default async function QuestsPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");
  const userId = me.id;
  const isStaff = me.role === "admin" || me.role === "moderator";

  const now = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const daysInMonth = new Date(year, month, 0).getDate();
  const daysLeft    = daysInMonth - now.getDate();

  const [, currentQuests, historyQuests] = await Promise.all([
    generateMonthlyQuests(month, year),
    prisma.quest.findMany({
      where: { month, year },
      include: { progress: { where: { userId } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.quest.findMany({
      where: {
        OR: [
          { year, month: { lt: month } },
          { year: year - 1 },
        ],
        progress: { some: { userId } },
      },
      include: { progress: { where: { userId } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 9,
    }),
  ]);

  const completedCount = currentQuests.filter(q => q.progress[0]?.completed).length;
  const allDone        = completedCount === currentQuests.length && currentQuests.length > 0;

  const historyByMonth = new Map<string, typeof historyQuests>();
  for (const q of historyQuests) {
    const key = `${q.year}-${q.month}`;
    if (!historyByMonth.has(key)) historyByMonth.set(key, []);
    historyByMonth.get(key)!.push(q);
  }

  return (
    <div className="px-5 pb-5 pt-0 sm:p-6 max-w-2xl mx-auto space-y-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Scroll className="w-4 h-4 text-amber-400" />
            </div>
            <h1 className="font-display text-2xl font-black text-white tracking-tight">Quests</h1>
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap ml-10">
            <span className={`text-sm ${allDone ? "text-emerald-400 font-medium" : "text-gray-500"}`}>
              {completedCount} von {currentQuests.length} abgeschlossen
            </span>
            <span className="text-gray-700">·</span>
            <span className="flex items-center gap-1 text-xs text-gray-600">
              <Clock className="w-3 h-3" />
              Reset in {daysLeft} {daysLeft === 1 ? "Tag" : "Tagen"}
            </span>
            <span className="text-xs text-gray-700">{MONTH_NAMES[month - 1]} {year}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Progress ring */}
          <div className="relative w-16 h-16">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke={allDone ? "#10b981" : "#14b8a6"}
                strokeWidth="2.5"
                strokeDasharray={`${currentQuests.length ? (completedCount / currentQuests.length) * 100 : 0} 100`}
                strokeLinecap="round"
                className="transition-all duration-700"
                style={{ filter: allDone ? "drop-shadow(0 0 4px #10b981)" : "drop-shadow(0 0 4px #14b8a6)" }}
              />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
              <span className="text-sm font-black text-white">{completedCount}/{currentQuests.length}</span>
              <span className="text-[8px] text-gray-600 mt-0.5">Quests</span>
            </span>
          </div>
          {isStaff && <QuestRegenerateButton />}
        </div>
      </div>

      {/* "Alle abgeschlossen"-Banner */}
      {allDone && (
        <div className="flex items-center gap-3 card-cut surface p-4" style={{ borderColor: "rgba(16,185,129,0.20)", background: "rgba(16,185,129,0.05)" }}>
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">Alle Quests diesen Monat abgeschlossen! 🎉</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Neue Quests erscheinen am 1. {MONTH_NAMES[month % 12]}
            </p>
          </div>
        </div>
      )}

      {/* ── Aktuelle Quest-Karten ─────────────────────────────────── */}
      <div className="space-y-3">
        {currentQuests.length === 0 && (
          <EmptyState
            type="quests"
            title="Keine Quests verfügbar"
            description="Quests werden am Anfang jeden Monats generiert. Schau später nochmal vorbei!"
          />
        )}
        {currentQuests.map((quest, idx) => {
          const type      = quest.type as QuestType;
          const meta      = QUEST_TYPE_META[type];
          const progress  = quest.progress[0];
          const current   = Math.min(progress?.current ?? 0, quest.target);
          const completed = progress?.completed ?? false;
          const pct       = quest.target > 0 ? Math.round((current / quest.target) * 100) : 0;

          return (
            <div key={quest.id}
              className={`card-cut surface card-hover relative overflow-hidden animate-slide-up`}
              style={{ animationDelay: `${idx * 50}ms` }}>

              {completed && (
                <div className="absolute inset-0 bg-emerald-500/[0.04] pointer-events-none" />
              )}

              <div className="relative pl-5 pr-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${meta.bg} border border-white/[0.06]`}>
                      <span className="text-xl">{meta.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-semibold ${completed ? "text-emerald-300" : "text-white"}`}>
                          {quest.title}
                        </h3>
                        {completed && (
                          <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Abgeschlossen
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5">{quest.description}</p>
                    </div>
                  </div>

                  <div className={`shrink-0 flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-xl border ${
                    completed
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-white/[0.04] text-amber-400 border-white/[0.08]"
                  }`}>
                    {completed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Trophy className="w-3.5 h-3.5" />}
                    +{quest.reward} Münzen
                  </div>
                </div>

                {/* Fortschrittsbalken */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="text-gray-500">{current} / {quest.target} {meta.unit}</span>
                    <span className={`font-semibold ${completed ? "text-emerald-400" : meta.color}`}>{pct}%</span>
                  </div>
                  <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${meta.bar} transition-all duration-700 ${completed ? "" : "shadow-[0_0_8px_rgba(244,63,94,0.3)]"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {completed && (
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-700">
                    <Lock className="w-3 h-3" />
                    Für diesen Monat abgeschlossen · Münzen wurden gutgeschrieben
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Info-Box ──────────────────────────────────────────────── */}
      <div className="surface p-4">
        <p className="text-xs font-semibold text-gray-400 mb-3">So funktionieren Quests</p>
        <ul className="space-y-2 text-xs text-gray-500">
          {[
            { icon: "🎙️", label: "Sprachkanal", desc: "Minuten werden beim Verlassen des Voice automatisch gezählt" },
            { icon: "💬", label: "Nachrichten",  desc: "Jede Nachricht im Discord-Server zählt" },
            { icon: "📅", label: "Events",       desc: "Zählt bei der Anmeldung" },
            { icon: "🗳️", label: "Umfragen",     desc: "Zählt bei der ersten Abstimmung in einer Event-Umfrage" },
            { icon: "🎰", label: "Glücksrad",    desc: "Zählt bei jedem täglichen Dreh im Shop" },
            { icon: "⚔️", label: "Duelle",       desc: "Zählt bei jedem aufgelösten Münzen-Duell" },
            { icon: "🎯", label: "Vorhersagen",  desc: "Zählt bei der ersten Sieger-Vorhersage zu einem Event" },
          ].map(item => (
            <li key={item.label} className="flex items-start gap-2">
              <span className="shrink-0">{item.icon}</span>
              <span><span className="text-gray-400">{item.label}:</span> {item.desc}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-gray-600 flex items-center gap-1.5 border-t border-white/[0.04] pt-3">
          <Lock className="w-3 h-3" />
          Jede Quest ist nur einmal pro Monat abschließbar. Am 1. des Monats gibt es neue Quests.
        </p>
      </div>

      {/* ── Verlauf vergangener Monate ────────────────────────────── */}
      {historyByMonth.size > 0 && (
        <div>
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
            Vergangene Monate
          </h2>
          <div className="space-y-3">
            {Array.from(historyByMonth.entries()).map(([key, quests]) => {
              const [y, m]        = key.split("-").map(Number);
              const monthCompleted = quests.filter(q => q.progress[0]?.completed).length;
              const totalPts       = quests.reduce((sum, q) => sum + (q.progress[0]?.completed ? q.reward : 0), 0);

              return (
                <div key={key} className="surface overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{MONTH_NAMES[m - 1]} {y}</span>
                      <span className="text-xs text-gray-600">{monthCompleted}/{quests.length} abgeschlossen</span>
                    </div>
                    {totalPts > 0 && (
                      <span className="text-xs font-semibold text-amber-400">+{totalPts} Münzen</span>
                    )}
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {quests.map(quest => {
                      const meta    = QUEST_TYPE_META[quest.type as QuestType];
                      const p       = quest.progress[0];
                      const done    = p?.completed ?? false;
                      const current = Math.min(p?.current ?? 0, quest.target);
                      const pct     = quest.target > 0 ? Math.round((current / quest.target) * 100) : 0;

                      return (
                        <div key={quest.id} className={`flex items-center gap-3 px-4 py-3 ${!done ? "opacity-40" : ""}`}>
                          <span className="text-lg shrink-0">{meta.icon}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-white truncate">{quest.title}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1 bg-white/[0.05] rounded-full overflow-hidden max-w-24">
                                <div className={`h-full rounded-full bg-gradient-to-r ${meta.bar}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] text-gray-600">{current}/{quest.target}</span>
                            </div>
                          </div>
                          {done ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5" /> +{quest.reward} Münzen
                            </span>
                          ) : (
                            <span className="text-xs text-gray-600 shrink-0">Nicht abgeschlossen</span>
                          )}
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
