import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getRank, getLevel, getNextLevelPoints } from "@/lib/points";
import PointsInfoModal from "./PointsInfoModal";
import { QUEST_TYPE_META, type QuestType } from "@/lib/quests";
import { Trophy, Star, CalendarDays, Swords, Zap, Clock, MessageSquare } from "lucide-react";

// ─── Badge-Definitionen ────────────────────────────────────────────────────
interface Badge {
  id: string;
  icon: string;
  name: string;
  desc: string;
  earned: boolean;
  category: "community" | "aktivitaet" | "events" | "turniere" | "punkte";
}

function computeBadges(data: {
  points: number;
  maxStreak: number;
  voiceHours: number;
  messageCount: number;
  eventCount: number;
  tournamentCount: number;
  tournamentWins: number;
}): Badge[] {
  const { points, maxStreak, voiceHours, messageCount, eventCount, tournamentCount, tournamentWins } = data;
  return [
    // Community
    { id: "welcome",      icon: "🎉", name: "Willkommen",      desc: "Erstmals angemeldet",           earned: true,                    category: "community" },
    { id: "streak_3",     icon: "🔥", name: "3-Tage-Streak",   desc: "3 Tage am Stück aktiv",         earned: maxStreak >= 3,          category: "community" },
    { id: "streak_7",     icon: "🔥", name: "Wochenstreaker",  desc: "7 Tage am Stück aktiv",         earned: maxStreak >= 7,          category: "community" },
    { id: "streak_30",    icon: "🔥", name: "Monatsstreaker",  desc: "30 Tage am Stück aktiv",        earned: maxStreak >= 30,         category: "community" },
    // Aktivität
    { id: "voice_1h",     icon: "🎙️", name: "Voice-Fan",       desc: "1 Stunde im Sprachkanal",      earned: voiceHours >= 1,         category: "aktivitaet" },
    { id: "voice_10h",    icon: "🎙️", name: "Voice-Veteran",   desc: "10 Stunden im Sprachkanal",    earned: voiceHours >= 10,        category: "aktivitaet" },
    { id: "voice_50h",    icon: "🎙️", name: "Voice-Legende",   desc: "50 Stunden im Sprachkanal",    earned: voiceHours >= 50,        category: "aktivitaet" },
    { id: "msg_50",       icon: "💬", name: "Gesprächig",      desc: "50 Nachrichten gesendet",       earned: messageCount >= 50,      category: "aktivitaet" },
    { id: "msg_500",      icon: "💬", name: "Chatterbox",      desc: "500 Nachrichten gesendet",      earned: messageCount >= 500,     category: "aktivitaet" },
    // Events
    { id: "event_1",      icon: "📅", name: "Teilnehmer",      desc: "1 Event besucht",               earned: eventCount >= 1,         category: "events" },
    { id: "event_5",      icon: "📅", name: "Eventgänger",     desc: "5 Events besucht",              earned: eventCount >= 5,         category: "events" },
    { id: "event_10",     icon: "📅", name: "Stammgast",       desc: "10 Events besucht",             earned: eventCount >= 10,        category: "events" },
    // Turniere
    { id: "t_1",          icon: "⚔️", name: "Turnierkämpfer",  desc: "1 Turnier gespielt",            earned: tournamentCount >= 1,    category: "turniere" },
    { id: "t_win",        icon: "🏆", name: "Champion",        desc: "Erstes Turnier gewonnen",       earned: tournamentWins >= 1,     category: "turniere" },
    { id: "t_win_5",      icon: "👑", name: "Dynastiegründer", desc: "5 Turniersiege",                earned: tournamentWins >= 5,     category: "turniere" },
    // Punkte
    { id: "pts_500",      icon: "⭐", name: "Aufsteiger",      desc: "500 Punkte erreicht",           earned: points >= 500,           category: "punkte" },
    { id: "pts_2k",       icon: "🌟", name: "Erfahren",        desc: "2.000 Punkte erreicht",         earned: points >= 2000,          category: "punkte" },
    { id: "pts_5k",       icon: "💫", name: "Elite",           desc: "5.000 Punkte erreicht",         earned: points >= 5000,          category: "punkte" },
    { id: "pts_10k",      icon: "✨", name: "Grandmaster",     desc: "10.000 Punkte erreicht",        earned: points >= 10000,         category: "punkte" },
  ];
}

const BADGE_CATEGORY_LABELS = {
  community:   "Community",
  aktivitaet:  "Aktivität",
  events:      "Events",
  turniere:    "Turniere",
  punkte:      "Punkte",
};

// ─── Page ──────────────────────────────────────────────────────────────────
export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [user, transactions, eventRegs, tournamentParticipations, matchWins, questsWithProgress, matchEntries] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, username: true, image: true, points: true, level: true, streak: true, createdAt: true },
      }),
      prisma.pointTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.eventRegistration.findMany({
        where: { userId },
        include: { event: { select: { title: true, startAt: true, game: true } } },
        orderBy: { joinedAt: "desc" },
        take: 5,
      }),
      prisma.tournamentParticipant.findMany({
        where: { userId },
        include: {
          tournament: {
            include: {
              event: { select: { title: true } },
              matches: { where: { OR: [{ player1Id: userId }, { player2Id: userId }] } },
            },
          },
        },
        orderBy: { id: "desc" },
        take: 10,
      }),
      prisma.match.count({ where: { winnerId: userId } }),
      prisma.quest.findMany({
        where: { month, year },
        include: { progress: { where: { userId } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.matchEntry.findMany({
        where: { userId },
        include: { match: { select: { title: true, playedAt: true } } },
        orderBy: { id: "desc" },
        take: 5,
      }),
    ]);

  if (!user) redirect("/login");

  // ── Stats ableiten ──────────────────────────────────────────────────────
  const totalPoints = user.points;
  const rank = getRank(totalPoints);
  const level = getLevel(totalPoints);
  const nextLevelPts = getNextLevelPoints(totalPoints);
  const prevLevelPts = getNextLevelPoints(totalPoints - 1);
  const xpPct = nextLevelPts > prevLevelPts
    ? Math.min(100, Math.round(((totalPoints - prevLevelPts) / (nextLevelPts - prevLevelPts)) * 100))
    : 100;

  // Voice-Stunden: jede VOICE_HOUR-Transaktion = 1 Stunde
  const voiceHours = transactions.filter(t => t.reason.includes("Sprachkanal")).length;
  // Nachrichten: jede MESSAGE_10-Transaktion = 10 Nachrichten
  const messageCount = transactions.filter(t => t.reason.includes("Nachrichten")).length * 10;
  // Maximaler Streak aus Streakbonus-Transaktionen ableiten
  const hadStreak7  = transactions.some(t => t.reason.includes("7-Tage"));
  const hadStreak30 = transactions.some(t => t.reason.includes("30-Tage"));
  const maxStreak = hadStreak30 ? 30 : hadStreak7 ? 7 : user.streak >= 3 ? user.streak : 0;

  const badges = computeBadges({
    points: totalPoints,
    maxStreak,
    voiceHours,
    messageCount,
    eventCount: eventRegs.length,
    tournamentCount: tournamentParticipations.length,
    tournamentWins: matchWins,
  });
  const earnedBadges = badges.filter(b => b.earned);
  const memberSince = new Date(user.createdAt).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  const displayName = user.username ?? user.name ?? "Unbekannt";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gray-900 border border-white/5 rounded-2xl p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-900/20 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-5 flex-wrap">
          {/* Avatar */}
          <div className="relative shrink-0">
            {user.image ? (
              <img src={user.image} alt="avatar" className="w-20 h-20 rounded-2xl ring-4 ring-rose-800/30 object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-700 to-rose-950 flex items-center justify-center text-2xl font-bold text-white">
                {displayName[0].toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-gray-900 shadow-[0_0_8px_#34d399]" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">{displayName}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${rank.color} bg-white/5 border border-white/10`}>
                {rank.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <p className="text-sm text-gray-500">Mitglied seit {memberSince} · {earnedBadges.length} Abzeichen</p>
              <PointsInfoModal />
            </div>

            {/* XP Bar */}
            <div className="max-w-xs">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-400" />Level {level}</span>
                <span>{totalPoints.toLocaleString("de-DE")} / {nextLevelPts.toLocaleString("de-DE")} Pts</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-rose-700 to-rose-500 rounded-full transition-all" style={{ width: `${xpPct}%` }} />
              </div>
              <p className="text-xs text-gray-600 mt-1">{xpPct}% zum nächsten Level</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <Star className="w-4 h-4" />, label: "Punkte", value: totalPoints.toLocaleString("de-DE"), color: "text-amber-400", bg: "from-amber-500/10" },
          { icon: <CalendarDays className="w-4 h-4" />, label: "Events", value: String(eventRegs.length), color: "text-emerald-400", bg: "from-emerald-500/10" },
          { icon: <Trophy className="w-4 h-4" />, label: "Turnier-Siege", value: String(matchWins), color: "text-rose-400", bg: "from-rose-500/10" },
          { icon: <Zap className="w-4 h-4" />, label: "Streak", value: user.streak > 0 ? `${user.streak}d 🔥` : "–", color: "text-orange-400", bg: "from-orange-500/10" },
        ].map(s => (
          <div key={s.label} className={`relative overflow-hidden bg-gray-900 border border-white/5 rounded-xl p-4`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${s.bg} to-transparent pointer-events-none`} />
            <div className={`w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center mb-2 ${s.color}`}>{s.icon}</div>
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Linke Spalte (Abzeichen + Quests) ─────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Abzeichen */}
          <section>
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              🏅 Abzeichen <span className="text-xs text-gray-500 font-normal">({earnedBadges.length}/{badges.length})</span>
            </h2>
            {Object.entries(BADGE_CATEGORY_LABELS).map(([cat, label]) => {
              const catBadges = badges.filter(b => b.category === cat);
              if (!catBadges.length) return null;
              return (
                <div key={cat} className="mb-4">
                  <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">{label}</p>
                  <div className="flex flex-wrap gap-2">
                    {catBadges.map(badge => (
                      <div key={badge.id}
                        title={badge.desc}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                          badge.earned
                            ? "bg-gray-800 border-gray-600 text-white"
                            : "bg-gray-900 border-gray-800 text-gray-600 opacity-40 grayscale"
                        }`}>
                        <span>{badge.icon}</span>
                        {badge.name}
                        {!badge.earned && <span className="text-gray-700 ml-0.5">🔒</span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>

          {/* Quest-Fortschritt */}
          {questsWithProgress.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                📜 Monatliche Quests
              </h2>
              <div className="space-y-2">
                {questsWithProgress.map(quest => {
                  const meta = QUEST_TYPE_META[quest.type as QuestType];
                  const p = quest.progress[0];
                  const current = Math.min(p?.current ?? 0, quest.target);
                  const pct = Math.round((current / quest.target) * 100);
                  const done = p?.completed ?? false;
                  return (
                    <div key={quest.id} className={`bg-gray-900 border rounded-xl px-4 py-3 ${done ? "border-rose-800/40" : "border-white/5"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{meta.icon}</span>
                          <span className={`text-sm font-medium ${done ? "text-rose-300" : "text-white"}`}>{quest.title}</span>
                          {done && <span className="text-xs text-rose-400">✓</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-500">{current}/{quest.target}</span>
                          <span className="text-xs text-amber-400 font-semibold">+{quest.reward} Pts</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-rose-700 to-rose-500 rounded-full" style={{ width: `${pct}%` }} />
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
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Swords className="w-4 h-4 text-gray-500" /> Turnier-Ergebnisse
              </h2>
              <div className="bg-gray-900 border border-white/5 rounded-2xl divide-y divide-white/5">
                {tournamentParticipations.map(p => {
                  const myMatches = p.tournament.matches;
                  const wins = myMatches.filter(m => m.winnerId === userId).length;
                  const losses = myMatches.filter(m => m.winnerId && m.winnerId !== userId).length;
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Trophy className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{p.tournament.event.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {wins > 0 ? `${wins} Siege` : ""}{wins > 0 && losses > 0 ? " · " : ""}{losses > 0 ? `${losses} Niederlagen` : ""}{wins === 0 && losses === 0 ? "Keine Matches gespielt" : ""}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        p.eliminated ? "bg-gray-800 text-gray-500" :
                        p.finalRank === 1 ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" :
                        "bg-gray-800 text-gray-400"
                      }`}>
                        {p.finalRank === 1 ? "🏆 Sieger" : p.eliminated ? "Ausgeschieden" : "Aktiv"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* ── Rechte Spalte (Punkte-Historie) ───────────────────────── */}
        <div className="space-y-6">
          {/* Aktivitäts-Stats */}
          <section>
            <h2 className="text-sm font-semibold text-white mb-3">📊 Aktivität</h2>
            <div className="bg-gray-900 border border-white/5 rounded-2xl divide-y divide-white/5">
              {[
                { icon: <Clock className="w-3.5 h-3.5" />,         label: "Voice-Stunden",  value: `${voiceHours}h`,           color: "text-violet-400" },
                { icon: <MessageSquare className="w-3.5 h-3.5" />, label: "Nachrichten",    value: `~${messageCount}`,         color: "text-blue-400" },
                { icon: <CalendarDays className="w-3.5 h-3.5" />,  label: "Events besucht", value: String(eventRegs.length),   color: "text-emerald-400" },
                { icon: <Swords className="w-3.5 h-3.5" />,        label: "Turniere",        value: String(tournamentParticipations.length), color: "text-amber-400" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between px-4 py-3">
                  <div className={`flex items-center gap-2 text-xs text-gray-500 ${s.color}`}>
                    {s.icon}
                    <span className="text-gray-400">{s.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{s.value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Punkte-Historie */}
          <section>
            <h2 className="text-sm font-semibold text-white mb-3">⭐ Punkte-Historie</h2>
            <div className="bg-gray-900 border border-white/5 rounded-2xl divide-y divide-white/5 max-h-96 overflow-y-auto">
              {transactions.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-6">Noch keine Punkte verdient.</p>
              )}
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-start justify-between px-4 py-3 gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-300 truncate">{tx.reason}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {new Date(tx.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                      {" · "}
                      {new Date(tx.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${tx.amount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
