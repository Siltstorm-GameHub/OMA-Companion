import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PointsInfoModal from "./PointsInfoModal";
import { QUEST_TYPE_META, type QuestType } from "@/lib/quests";
import { RARITY_CONFIG, type Rarity, MAX_SHOWCASE } from "@/lib/collectibles";
import { Trophy, Star, CalendarDays, Swords, Clock, MessageSquare, CheckCircle2, Coins, Crown, Gamepad2 } from "lucide-react";
import { RelativeTime } from "@/components/RelativeTime";
import Image from "next/image";
import CollectiblesShowcase from "./CollectiblesShowcase";
import ProfileEditor from "./ProfileEditor";

// ── Rang-System ───────────────────────────────────────────────────────────────
const RANK_THRESHOLDS = [
  { min:    0, label: "Neuling",                emoji: "🔰", color: "text-gray-400",    bg: "bg-gray-500/10",    border: "border-gray-500/20"    },
  { min:  100, label: "Zivi-Anwärter",          emoji: "📋", color: "text-zinc-300",    bg: "bg-zinc-500/10",    border: "border-zinc-500/20"    },
  { min:  200, label: "Rollator-Führerschein",  emoji: "🛺", color: "text-green-400",   bg: "bg-green-500/10",   border: "border-green-500/20"   },
  { min:  300, label: "Kamillenteetrinker",     emoji: "🍵", color: "text-teal-400",    bg: "bg-teal-500/10",    border: "border-teal-500/20"    },
  { min:  400, label: "Heimbeirat",             emoji: "🏛️", color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20"    },
  { min:  500, label: "Pflegestufe 5",          emoji: "🩺", color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/20"  },
  { min: 1000, label: "Old Master",             emoji: "👴", color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20"   },
] as const;

function getRank(points: number) {
  return [...RANK_THRESHOLDS].reverse().find(r => points >= r.min) ?? RANK_THRESHOLDS[0];
}

function getNextRank(points: number) {
  return RANK_THRESHOLDS.find(r => r.min > points) ?? null;
}

// ── Aktivitäts-Abzeichen ──────────────────────────────────────────────────────
interface Badge { id: string; icon: string; name: string; desc: string; earned: boolean; category: string }
function computeBadges(d: { points: number; voiceHours: number; messageCount: number; eventCount: number; tournamentCount: number; tournamentWins: number }): Badge[] {
  return [
    { id: "welcome",   icon: "🎉", name: "Willkommen",      desc: "Erstmals angemeldet",            earned: true,                     category: "Community"  },
    { id: "voice_1h",  icon: "🎙️", name: "Voice-Fan",       desc: "1 Stunde im Sprachkanal",        earned: d.voiceHours >= 1,        category: "Aktivität"  },
    { id: "voice_10h", icon: "🎙️", name: "Voice-Veteran",   desc: "10 Stunden im Sprachkanal",      earned: d.voiceHours >= 10,       category: "Aktivität"  },
    { id: "voice_50h", icon: "🎙️", name: "Voice-Legende",   desc: "50 Stunden im Sprachkanal",      earned: d.voiceHours >= 50,       category: "Aktivität"  },
    { id: "msg_50",    icon: "💬", name: "Gesprächig",      desc: "50 Nachrichten gesendet",        earned: d.messageCount >= 50,     category: "Aktivität"  },
    { id: "msg_500",   icon: "💬", name: "Chatterbox",      desc: "500 Nachrichten gesendet",       earned: d.messageCount >= 500,    category: "Aktivität"  },
    { id: "event_1",   icon: "📅", name: "Teilnehmer",      desc: "1 Event besucht",                earned: d.eventCount >= 1,        category: "Events"     },
    { id: "event_5",   icon: "📅", name: "Eventgänger",     desc: "5 Events besucht",               earned: d.eventCount >= 5,        category: "Events"     },
    { id: "event_10",  icon: "📅", name: "Stammgast",       desc: "10 Events besucht",              earned: d.eventCount >= 10,       category: "Events"     },
    { id: "t_1",       icon: "⚔️", name: "Turnierkämpfer",  desc: "1 Turnier gespielt",             earned: d.tournamentCount >= 1,   category: "Turniere"   },
    { id: "t_win",     icon: "🏆", name: "Champion",        desc: "Erstes Turnier gewonnen",        earned: d.tournamentWins >= 1,    category: "Turniere"   },
    { id: "t_win_5",   icon: "👑", name: "Dynastiegründer", desc: "5 Turniersiege",                 earned: d.tournamentWins >= 5,    category: "Turniere"   },
    { id: "pts_500",   icon: "⭐", name: "Aufsteiger",      desc: "500 Punkte erreicht",            earned: d.points >= 500,          category: "Punkte"     },
    { id: "pts_2k",    icon: "🌟", name: "Erfahren",        desc: "2.000 Punkte erreicht",          earned: d.points >= 2000,         category: "Punkte"     },
    { id: "pts_5k",    icon: "💫", name: "Elite",           desc: "5.000 Punkte erreicht",          earned: d.points >= 5000,         category: "Punkte"     },
    { id: "pts_10k",   icon: "✨", name: "Grandmaster",     desc: "10.000 Punkte erreicht",         earned: d.points >= 10000,        category: "Punkte"     },
  ];
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const [user, eventRegs, tournamentParticipations, tournamentWins, questsWithProgress, ownedCollectibles, leaderboardRank] =
    await Promise.all([
      prisma.user.findUnique({
        where:  { id: userId },
        select: { id: true, name: true, username: true, image: true, points: true, rankPoints: true, createdAt: true, showcaseJson: true, birthday: true, bio: true },
      }),
      prisma.eventRegistration.findMany({
        where:   { userId },
        include: { event: { select: { title: true, startAt: true, game: true } } },
        orderBy: { joinedAt: "desc" }, take: 5,
      }),
      prisma.tournamentParticipant.findMany({
        where:   { userId },
        include: {
          tournament: {
            include: {
              event:   { select: { title: true } },
              matches: { where: { OR: [{ player1Id: userId }, { player2Id: userId }] } },
            },
          },
        },
        orderBy: { id: "desc" }, take: 10,
      }),
      prisma.match.count({ where: { winnerId: userId } }),
      prisma.quest.findMany({
        where:   { month, year },
        include: { progress: { where: { userId } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.userCollectible.findMany({
        where:   { userId },
        include: {
          collectibleItem: {
            include: { collection: { select: { id: true, name: true, coverImageUrl: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      // Rang in der Gesamtrangliste (basiert auf rankPoints)
      prisma.user.findUnique({ where: { id: userId }, select: { rankPoints: true } }).then(async (u) => {
        const higher = await prisma.user.count({ where: { rankPoints: { gt: u?.rankPoints ?? 0 } } });
        return higher + 1;
      }),
    ]);

  if (!user) redirect("/login");

  const totalPoints  = user.points;      // Münzen (Shop-Währung)
  const rankPoints   = user.rankPoints;  // Ranglisten-Punkte (LuL, Turniere, Events)
  const currentRank  = getRank(rankPoints);
  const nextRank     = getNextRank(rankPoints);
  const rankPct      = nextRank ? Math.min(100, Math.round(((rankPoints - currentRank.min) / (nextRank.min - currentRank.min)) * 100)) : 100;

  const voiceHours   = 0;
  const messageCount = 0;
  const badges       = computeBadges({ points: totalPoints, voiceHours, messageCount, eventCount: eventRegs.length, tournamentCount: tournamentParticipations.length, tournamentWins });
  const earnedBadges = badges.filter(b => b.earned);
  const memberSince  = new Date(user.createdAt).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  const displayName  = user.username ?? user.name ?? "Unbekannt";

  // Showcase-Items
  const showcaseIds: string[] = (() => {
    try { return JSON.parse(user.showcaseJson ?? "[]"); } catch { return []; }
  })();
  const showcaseItems = showcaseIds
    .map(id => ownedCollectibles.find(o => o.collectibleItemId === id)?.collectibleItem ?? null)
    .filter(Boolean) as typeof ownedCollectibles[0]["collectibleItem"][];

  // Eigene Collectibles nach Sammlung gruppiert
  const collectiblesByCollection = ownedCollectibles.reduce<Record<string, {
    collection: { id: string; name: string; coverImageUrl: string | null };
    items: typeof ownedCollectibles[0]["collectibleItem"][];
  }>>((acc, uc) => {
    const col = uc.collectibleItem.collection;
    if (!acc[col.id]) acc[col.id] = { collection: col, items: [] };
    acc[col.id].items.push(uc.collectibleItem);
    return acc;
  }, {});

  return (
    <div className="p-5 sm:p-6 max-w-5xl mx-auto space-y-5 animate-fade-in">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div className="glass card-shine relative overflow-hidden rounded-2xl p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-transparent to-violet-500/8 pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500/25 to-transparent pointer-events-none" />

        <div className="relative flex items-center gap-5 flex-wrap">
          <div className="relative shrink-0">
            {user.image
              ? <Image src={user.image} alt="avatar" width={80} height={80} className="w-20 h-20 rounded-2xl ring-2 ring-rose-500/40 object-cover shadow-[0_0_40px_rgba(244,63,94,0.3)]" />
              : <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500 to-violet-700 flex items-center justify-center text-2xl font-black text-white">
                  {displayName[0].toUpperCase()}
                </div>}
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#080c18] shadow-[0_0_8px_#34d399]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">{displayName}</h1>
              {/* Rang-Badge */}
              <span className={`flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-lg font-semibold border ${currentRank.color} ${currentRank.bg} ${currentRank.border}`}>
                <span>{currentRank.emoji}</span>
                {currentRank.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">Mitglied seit {memberSince} · {earnedBadges.length} Abzeichen · Platz #{leaderboardRank}</p>

            {/* Münzen */}
            <div className="flex items-center gap-1.5 mb-3">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-sm font-bold text-amber-400 tabular-nums">{totalPoints.toLocaleString("de-DE")} Münzen</span>
              <PointsInfoModal />
            </div>

            {/* Rang-Fortschritt */}
            {nextRank && (
              <div className="max-w-xs">
                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                  <span>{currentRank.emoji} {currentRank.label}</span>
                  <span>{nextRank.emoji} {nextRank.label} · {(nextRank.min - rankPoints).toLocaleString("de-DE")} Pts</span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${rankPct}%`,
                      background: "linear-gradient(90deg, #14b8a6, #2dd4bf)",
                      boxShadow: "0 0 8px rgba(20,184,166,0.5)",
                    }}
                  />
                </div>
                <p className="text-[10px] text-gray-600 mt-1">{rankPct}% bis {nextRank.label}</p>
              </div>
            )}
            {!nextRank && (
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                <Crown className="w-3.5 h-3.5" /> Maximalen Rang erreicht
              </div>
            )}

            {/* Bio & Geburtstag */}
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <ProfileEditor
                birthday={user.birthday
                  ? `${String(user.birthday.getDate()).padStart(2, "0")}-${String(user.birthday.getMonth() + 1).padStart(2, "0")}`
                  : null}
                bio={user.bio ?? null}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <Coins className="w-4 h-4" />,        label: "Münzen",        value: totalPoints.toLocaleString("de-DE"), iconCls: "text-amber-400   bg-amber-500/10   border-amber-500/15",   accent: "from-amber-500/8"   },
          { icon: <Trophy className="w-4 h-4" />,        label: "Rang-Position", value: `#${leaderboardRank}`,               iconCls: "text-rose-400    bg-rose-500/10    border-rose-500/15",    accent: "from-rose-500/8"    },
          { icon: <CalendarDays className="w-4 h-4" />,  label: "Events",        value: String(eventRegs.length),            iconCls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/15", accent: "from-emerald-500/8" },
          { icon: <Swords className="w-4 h-4" />,        label: "Turnier-Siege", value: String(tournamentWins),              iconCls: "text-indigo-400  bg-indigo-500/10  border-indigo-500/15",  accent: "from-indigo-500/8"  },
        ].map((s, i) => (
          <div key={s.label} className={`card-hover card-shine glass relative overflow-hidden rounded-2xl p-4 animate-slide-up stagger-${i + 1}`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${s.accent} to-transparent pointer-events-none`} />
            <div className={`relative w-8 h-8 rounded-xl flex items-center justify-center mb-3 border ${s.iconCls}`}>{s.icon}</div>
            <p className="relative text-2xl font-black text-white tabular-nums">{s.value}</p>
            <p className="relative text-xs text-gray-400 mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Collectibles Showcase ────────────────────────────────────────── */}
      <CollectiblesShowcase
        showcaseItems={showcaseItems.map(i => ({
          id:       i.id,
          name:     i.name,
          imageUrl: i.imageUrl,
          rarity:   i.rarity,
        }))}
        allOwned={ownedCollectibles.map(uc => ({
          id:             uc.collectibleItem.id,
          name:           uc.collectibleItem.name,
          imageUrl:       uc.collectibleItem.imageUrl,
          rarity:         uc.collectibleItem.rarity,
          collectionName: uc.collectibleItem.collection.name,
        }))}
        maxSlots={MAX_SHOWCASE}
      />

      {/* ── Haupt-Inhalt ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Linke Spalte ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Meine Sammlungen */}
          {Object.keys(collectiblesByCollection).length > 0 && (
            <section>
              <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Gamepad2 className="w-3.5 h-3.5" /> Meine Sammlungen</h2>
              <div className="space-y-3">
                {Object.values(collectiblesByCollection).map(({ collection, items }) => (
                  <div key={collection.id} className="glass card-shine rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      {collection.coverImageUrl
                        ? <img src={collection.coverImageUrl} alt={collection.name} className="w-7 h-7 object-contain rounded" loading="lazy" />
                        : <Gamepad2 className="w-7 h-7 text-gray-600" />
                      }
                      <span className="text-sm font-semibold text-white">{collection.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-gray-500">{items.length} Figuren</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {items.map(item => {
                        const rarity = RARITY_CONFIG[item.rarity as Rarity] ?? RARITY_CONFIG.common;
                        return (
                          <div key={item.id} title={item.name}
                            className={`flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-xl border ${rarity.border} ${rarity.glow} bg-white/[0.02]`}>
                            {item.imageUrl
                              ? <img src={item.imageUrl} alt={item.name} className="w-9 h-9 object-contain" loading="lazy" />
                              : <Gamepad2 className="w-9 h-9 text-gray-600" />
                            }
                            <span className={`text-[9px] font-medium ${rarity.color}`}>{item.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Abzeichen */}
          <section>
            <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">
              🏅 Abzeichen <span className="text-gray-600 normal-case">({earnedBadges.length})</span>
            </h2>
            {earnedBadges.length === 0 && (
              <div className="glass rounded-2xl p-6 text-center">
                <p className="text-gray-500 text-sm">Noch keine Abzeichen verdient</p>
                <p className="text-xs text-gray-600 mt-1">Sei aktiv, nimm an Events teil und gewinne Turniere!</p>
              </div>
            )}
            {earnedBadges.length > 0 && (
              ["Community","Aktivität","Events","Turniere","Punkte"].map(cat => {
                const catBadges = earnedBadges.filter(b => b.category === cat);
                if (!catBadges.length) return null;
                return (
                  <div key={cat} className="mb-4">
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">{cat}</p>
                    <div className="flex flex-wrap gap-2">
                      {catBadges.map(badge => (
                        <div key={badge.id} title={badge.desc}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium glass text-white border-white/10 hover:border-white/20 transition-all">
                          <span>{badge.icon}</span>
                          {badge.name}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </section>

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
                          <span className="text-xs text-amber-400 font-semibold">+{quest.reward} 🪙</span>
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
                  const myMatches = p.tournament.matches;
                  const wins      = myMatches.filter(m => m.winnerId === userId).length;
                  const losses    = myMatches.filter(m => m.winnerId && m.winnerId !== userId).length;
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center shrink-0">
                        <Trophy className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{p.tournament.event.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {wins > 0 ? `${wins} Siege` : ""}
                          {wins > 0 && losses > 0 ? " · " : ""}
                          {losses > 0 ? `${losses} Niederlagen` : ""}
                          {wins === 0 && losses === 0 ? "Keine Matches gespielt" : ""}
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

        {/* ── Rechte Spalte ─────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Aktivitäts-Stats */}
          <section>
            <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">📊 Aktivität</h2>
            <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
              {[
                { icon: <Clock className="w-3.5 h-3.5" />,         label: "Voice-Stunden",  value: `${voiceHours}h`,          color: "text-violet-400" },
                { icon: <MessageSquare className="w-3.5 h-3.5" />, label: "Nachrichten",    value: `~${messageCount}`,        color: "text-blue-400"   },
                { icon: <CalendarDays className="w-3.5 h-3.5" />,  label: "Events besucht", value: String(eventRegs.length),  color: "text-emerald-400"},
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

        </div>
      </div>
    </div>
  );
}
