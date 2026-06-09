import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { QUEST_TYPE_META, type QuestType } from "@/lib/quests";
import {
  Trophy, Star, CalendarDays, Swords, Clock,
  MessageSquare, CheckCircle2, ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// ── Badge-Logik (identisch mit eigenem Profil) ─────────────────────────────
interface Badge {
  id: string; icon: string; name: string; desc: string;
  earned: boolean;
  category: "community" | "aktivitaet" | "events" | "turniere" | "punkte";
}

function computeBadges(data: {
  points: number; voiceHours: number;
  messageCount: number; eventCount: number;
  tournamentCount: number; tournamentWins: number;
}): Badge[] {
  const { points, voiceHours, messageCount, eventCount, tournamentCount, tournamentWins } = data;
  return [
    { id: "welcome",   icon: "🎉", name: "Willkommen",      desc: "Erstmals angemeldet",        earned: true,                 category: "community"  },
    { id: "voice_1h",  icon: "🎙️", name: "Voice-Fan",       desc: "1 Stunde im Sprachkanal",    earned: voiceHours >= 1,      category: "aktivitaet" },
    { id: "voice_10h", icon: "🎙️", name: "Voice-Veteran",   desc: "10 Stunden im Sprachkanal",  earned: voiceHours >= 10,     category: "aktivitaet" },
    { id: "voice_50h", icon: "🎙️", name: "Voice-Legende",   desc: "50 Stunden im Sprachkanal",  earned: voiceHours >= 50,     category: "aktivitaet" },
    { id: "msg_50",    icon: "💬", name: "Gesprächig",      desc: "50 Nachrichten gesendet",    earned: messageCount >= 50,   category: "aktivitaet" },
    { id: "msg_500",   icon: "💬", name: "Chatterbox",      desc: "500 Nachrichten gesendet",   earned: messageCount >= 500,  category: "aktivitaet" },
    { id: "event_1",   icon: "📅", name: "Teilnehmer",      desc: "1 Event besucht",            earned: eventCount >= 1,      category: "events"     },
    { id: "event_5",   icon: "📅", name: "Eventgänger",     desc: "5 Events besucht",           earned: eventCount >= 5,      category: "events"     },
    { id: "event_10",  icon: "📅", name: "Stammgast",       desc: "10 Events besucht",          earned: eventCount >= 10,     category: "events"     },
    { id: "t_1",       icon: "⚔️", name: "Turnierkämpfer",  desc: "1 Turnier gespielt",         earned: tournamentCount >= 1, category: "turniere"   },
    { id: "t_win",     icon: "🏆", name: "Champion",        desc: "Erstes Turnier gewonnen",    earned: tournamentWins >= 1,  category: "turniere"   },
    { id: "t_win_5",   icon: "👑", name: "Dynastiegründer", desc: "5 Turniersiege",             earned: tournamentWins >= 5,  category: "turniere"   },
    { id: "pts_500",   icon: "⭐", name: "Aufsteiger",      desc: "500 Punkte erreicht",        earned: points >= 500,        category: "punkte"     },
    { id: "pts_2k",    icon: "🌟", name: "Erfahren",        desc: "2.000 Punkte erreicht",      earned: points >= 2000,       category: "punkte"     },
    { id: "pts_5k",    icon: "💫", name: "Elite",           desc: "5.000 Punkte erreicht",      earned: points >= 5000,       category: "punkte"     },
    { id: "pts_10k",   icon: "✨", name: "Grandmaster",     desc: "10.000 Punkte erreicht",     earned: points >= 10000,      category: "punkte"     },
  ];
}

const BADGE_CATEGORY_LABELS = {
  community: "Community", aktivitaet: "Aktivität",
  events: "Events", turniere: "Turniere", punkte: "Punkte",
};

// ── Page ────────────────────────────────────────────────────────────────────
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const viewerId = session?.user?.id;

  // Eigenes Profil → weiterleiten
  if (viewerId === id) {
    const { redirect } = await import("next/navigation");
    redirect("/profile");
  }

  const [user, transactions, eventRegs, eventCount, tournamentParticipations, tournamentCount, matchWins, totalUsers] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true, name: true, username: true, image: true,
          points: true, rankPoints: true, createdAt: true,
        },
      }),
      // Punkte-Transaktionen — nur für Badge-Berechnung, nicht öffentlich anzeigen
      prisma.pointTransaction.findMany({ where: { userId: id }, select: { reason: true } }),
      // Letzte 5 Events für die Anzeige-Liste
      prisma.eventRegistration.findMany({
        where: { userId: id },
        include: { event: { select: { title: true, startAt: true, game: true } } },
        orderBy: { joinedAt: "desc" },
        take: 5,
      }),
      // Gesamtzahl für Stats und Abzeichen
      prisma.eventRegistration.count({ where: { userId: id } }),
      prisma.tournamentParticipant.findMany({
        where: { userId: id },
        include: {
          tournament: {
            include: {
              event: { select: { title: true } },
              matches: { where: { OR: [{ player1Id: id }, { player2Id: id }] } },
            },
          },
        },
        orderBy: { id: "desc" },
        take: 10,
      }),
      // Gesamtzahl für Stats und Abzeichen
      prisma.tournamentParticipant.count({ where: { userId: id } }),
      prisma.match.count({ where: { winnerId: id } }),
      prisma.user.count(),
    ]);

  if (!user) notFound();

  // Rang basiert auf rankPoints — konsistent mit Leaderboard und eigenem Profil
  const leaderboardRank = await prisma.user.count({ where: { rankPoints: { gt: user.rankPoints ?? 0 } } }) + 1;

  // ── Stats ableiten ──────────────────────────────────────────────────────
  const totalPoints  = user.points;

  const voiceHours   = transactions.filter(t => t.reason.includes("Sprachkanal")).length;
  const messageCount = transactions.filter(t => t.reason.includes("Nachrichten")).length * 10;
  const badges       = computeBadges({ points: totalPoints, voiceHours, messageCount, eventCount, tournamentCount, tournamentWins: matchWins });
  const earnedBadges = badges.filter(b => b.earned);
  const memberSince  = new Date(user.createdAt).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  const displayName  = user.username ?? user.name ?? "Unbekannt";

  // Aktuelle Quests des Users (nur öffentlich sichtbarer Fortschritt)
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();
  const questsWithProgress = await prisma.quest.findMany({
    where: { month, year },
    include: { progress: { where: { userId: id } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="p-5 sm:p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link href="/leaderboard"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Rangliste
        </Link>
        <Link href={`/profile/compare/${id}`}
          className="inline-flex items-center gap-2 text-xs glass border border-white/[0.08] hover:border-rose-500/30 text-gray-400 hover:text-white px-3 py-2 rounded-xl transition-all">
          ⚔️ Mit mir vergleichen
        </Link>
      </div>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="glass card-shine relative overflow-hidden rounded-2xl p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-transparent to-purple-500/8 pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500/25 to-transparent pointer-events-none" />

        <div className="relative flex items-center gap-5 flex-wrap">
          {/* Avatar */}
          <div className="relative shrink-0">
            {user.image
              ? <Image src={user.image} alt={displayName} width={80} height={80} className="w-20 h-20 rounded-2xl ring-2 ring-rose-500/25 object-cover shadow-[0_0_24px_rgba(244,63,94,0.2)]" />
              : <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-950 flex items-center justify-center text-2xl font-bold text-white">
                  {displayName[0].toUpperCase()}
                </div>}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h1 className="text-2xl font-bold text-white tracking-tight">{displayName}</h1>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Mitglied seit {memberSince} · {earnedBadges.length} Abzeichen
            </p>
            <p className="text-sm font-bold text-amber-400">{totalPoints.toLocaleString("de-DE")} Punkte</p>
          </div>

          {/* Rang-Block */}
          <div className="glass-heavy rounded-2xl px-5 py-4 text-center shrink-0 self-start hidden sm:block">
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Rang</p>
            <p className="text-3xl font-black text-white tabular-nums leading-none">#{leaderboardRank}</p>
            <p className="text-[9px] text-gray-600 mt-1">von {totalUsers}</p>
          </div>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { icon: <Star className="w-4 h-4" />,        label: "Punkte",        value: totalPoints.toLocaleString("de-DE"), iconCls: "text-amber-400   bg-amber-500/10   border-amber-500/15",   accent: "from-amber-500/8"   },
          { icon: <CalendarDays className="w-4 h-4" />, label: "Events",        value: String(eventCount),                  iconCls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/15", accent: "from-emerald-500/8" },
          { icon: <Trophy className="w-4 h-4" />,       label: "Turnier-Siege", value: String(matchWins),                   iconCls: "text-rose-400    bg-rose-500/10    border-rose-500/15",    accent: "from-rose-500/8"    },
        ].map((s, i) => (
          <div key={s.label} className={`card-hover card-shine glass relative overflow-hidden rounded-2xl p-4 animate-slide-up stagger-${i + 1}`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${s.accent} to-transparent pointer-events-none`} />
            <div className={`relative w-8 h-8 rounded-xl flex items-center justify-center mb-3 border ${s.iconCls}`}>{s.icon}</div>
            <p className="relative text-2xl font-black text-white tabular-nums">{s.value}</p>
            <p className="relative text-xs text-gray-400 mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Linke Spalte ───────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Abzeichen */}
          <section>
            <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">
              🏅 Abzeichen <span className="text-gray-600 normal-case">({earnedBadges.length}/{badges.length})</span>
            </h2>
            {Object.entries(BADGE_CATEGORY_LABELS).map(([cat, label]) => {
              const catBadges = badges.filter(b => b.category === cat);
              if (!catBadges.length) return null;
              return (
                <div key={cat} className="mb-4">
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">{label}</p>
                  <div className="flex flex-wrap gap-2">
                    {catBadges.map(badge => (
                      <div key={badge.id} title={badge.desc}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                          badge.earned
                            ? "glass text-white border-white/10 hover:border-white/20"
                            : "bg-white/[0.02] border-white/[0.04] text-gray-600 opacity-40 grayscale"
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

          {/* Quest-Fortschritt — öffentlich sichtbar */}
          {questsWithProgress.length > 0 && (
            <section>
              <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">📜 Quests diesen Monat</h2>
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
                        <span className="text-xs text-gray-500">{current}/{quest.target}</span>
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
                  const myMatches = p.tournament.matches;
                  const winsCount = myMatches.filter(m => m.winnerId === id).length;
                  const losses    = myMatches.filter(m => m.winnerId && m.winnerId !== id).length;
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center shrink-0">
                        <Trophy className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{p.tournament.event.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {winsCount > 0 ? `${winsCount} Siege` : ""}
                          {winsCount > 0 && losses > 0 ? " · " : ""}
                          {losses > 0 ? `${losses} Niederlagen` : ""}
                          {winsCount === 0 && losses === 0 ? "Keine Matches gespielt" : ""}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        p.finalRank === 1  ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        p.eliminated       ? "bg-white/[0.04] text-gray-500 border-white/[0.06]" :
                                             "bg-white/[0.04] text-gray-400 border-white/[0.06]"
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

        {/* ── Rechte Spalte — Aktivität ──────────────────────────────── */}
        <div className="space-y-5">
          <section>
            <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">📊 Aktivität</h2>
            <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
              {[
                { icon: <Clock className="w-3.5 h-3.5" />,         label: "Voice-Stunden",  value: `${voiceHours}h`,           color: "text-teal-400" },
                { icon: <MessageSquare className="w-3.5 h-3.5" />, label: "Nachrichten",    value: `~${messageCount}`,         color: "text-blue-400"   },
                { icon: <CalendarDays className="w-3.5 h-3.5" />,  label: "Events besucht", value: String(eventRegs.length),   color: "text-emerald-400"},
                { icon: <Swords className="w-3.5 h-3.5" />,        label: "Turniere",       value: String(tournamentParticipations.length), color: "text-amber-400" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between px-4 py-3">
                  <div className={`flex items-center gap-2 text-xs ${s.color}`}>
                    {s.icon}
                    <span className="text-gray-400">{s.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{s.value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Zuletzt besuchte Events */}
          {eventRegs.length > 0 && (
            <section>
              <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">📅 Letzte Events</h2>
              <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
                {eventRegs.map(reg => (
                  <div key={reg.id} className="px-4 py-3">
                    <p className="text-sm font-medium text-white truncate">{reg.event.title}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {new Date(reg.event.startAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
                      {reg.event.game ? ` · ${reg.event.game}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
