import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/roles";
import { getRank, getNextRank } from "@/lib/ranks";
import { computeBadges, BADGE_CATEGORY_LABELS } from "@/lib/badges";
import PointsInfoModal from "./PointsInfoModal";
import { QUEST_TYPE_META, type QuestType } from "@/lib/quests";
import { RARITY_CONFIG, type Rarity, MAX_SHOWCASE } from "@/lib/collectibles";
import {
  Trophy, Star, CalendarDays, Swords, Clock, MessageSquare,
  CheckCircle2, Crown, Gamepad2, Medal,
} from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import WinIcon from "@/components/WinIcon";
import Image from "next/image";
import CollectiblesShowcase from "./CollectiblesShowcase";
import ProfileEditor from "./ProfileEditor";
import { PushSubscribeButton } from "@/components/PushSubscribeButton";

export default async function ProfilePage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");
  const userId = me.id;

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const [user, eventRegs, eventCount, finishedEvents, tournamentParticipations, tournamentCount, tournamentWins, questsWithProgress, ownedCollectibles, leaderboardRank] =
    await Promise.all([
      prisma.user.findUnique({
        where:  { id: userId },
        select: { id: true, name: true, username: true, image: true, points: true, rankPoints: true, createdAt: true, showcaseJson: true, birthday: true, bio: true, voiceMinutesTotal: true, messagesTotal: true },
      }),
      prisma.eventRegistration.findMany({
        where:   { userId },
        include: { event: { select: { title: true, startAt: true, game: true } } },
        orderBy: { joinedAt: "desc" }, take: 5,
      }),
      prisma.eventRegistration.count({ where: { userId } }),
      prisma.event.findMany({
        where: { status: "finished", registrations: { some: { userId } } },
        select: { game: true, finalRankingJson: true, completionData: true },
      }),
      prisma.tournamentParticipant.findMany({
        where:   { userId },
        include: {
          event: {
            include: {
              matches: { where: { OR: [{ player1Id: userId }, { player2Id: userId }] } },
            },
          },
        },
        orderBy: { id: "desc" }, take: 10,
      }),
      prisma.tournamentParticipant.count({ where: { userId } }),
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
      prisma.user.findUnique({ where: { id: userId }, select: { rankPoints: true } }).then(async (u) => {
        const higher = await prisma.user.count({ where: { rankPoints: { gt: u?.rankPoints ?? 0 } } });
        return higher + 1;
      }),
    ]);

  if (!user) redirect("/login");

  // Derived event stats from finished events
  const eventWins = finishedEvents.filter(e => {
    try { const r = JSON.parse(e.finalRankingJson ?? "[]"); return Array.isArray(r) && r[0] === userId; }
    catch { return false; }
  }).length;
  const mvpCount = finishedEvents.filter(e => {
    try { return (e.completionData ? JSON.parse(e.completionData) : {}).mvpUserId === userId; }
    catch { return false; }
  }).length;
  const gameCounts = finishedEvents.reduce<Record<string, number>>((acc, e) => {
    if (e.game) acc[e.game] = (acc[e.game] ?? 0) + 1;
    return acc;
  }, {});
  const favoriteGame = Object.entries(gameCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const totalPoints = user.points;
  const rankPoints  = user.rankPoints;
  const currentRank = getRank(rankPoints);
  const nextRank    = getNextRank(rankPoints);
  const rankPct     = nextRank
    ? Math.min(100, Math.round(((rankPoints - currentRank.min) / (nextRank.min - currentRank.min)) * 100))
    : 100;

  const voiceHours   = Math.floor((user?.voiceMinutesTotal ?? 0) / 60);
  const messageCount = user?.messagesTotal ?? 0;
  const badges       = computeBadges({ points: totalPoints, voiceHours, messageCount, eventCount, tournamentCount, tournamentWins, eventWins, mvpCount });
  const earnedBadges = badges.filter(b => b.earned);
  const memberSince  = new Date(user.createdAt).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  const displayName  = user.username ?? user.name ?? "Unbekannt";

  const totalUsers = await prisma.user.count();

  const showcaseIds: string[] = (() => {
    try { return JSON.parse(user.showcaseJson ?? "[]"); } catch { return []; }
  })();
  const showcaseItems = showcaseIds
    .map(id => ownedCollectibles.find(o => o.collectibleItemId === id)?.collectibleItem ?? null)
    .filter(Boolean) as typeof ownedCollectibles[0]["collectibleItem"][];

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
    <div className="p-5 sm:p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="glass card-shine relative overflow-hidden rounded-2xl p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-teal-900/10 pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent pointer-events-none" />

        <div className="relative flex items-center gap-5 flex-wrap">
          {/* Avatar */}
          <div className="relative shrink-0">
            {user.image
              ? <Image src={user.image} alt={displayName} width={80} height={80}
                  className="w-20 h-20 rounded-2xl ring-2 ring-teal-500/40 object-cover shadow-[0_0_24px_rgba(20,184,166,0.25)]" />
              : <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-950 flex items-center justify-center text-2xl font-bold text-white">
                  {displayName[0].toUpperCase()}
                </div>}
            <span className="absolute bottom-1 right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0d0d0f]"
              style={{ boxShadow: "0 0 6px rgba(52,211,153,0.8)" }} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h1 className="text-2xl font-bold text-white tracking-tight">{displayName}</h1>
              <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-semibold border ${currentRank.color} ${currentRank.bg} ${currentRank.border}`}>
                {currentRank.emoji} {currentRank.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-1">
              Mitglied seit {memberSince} · {earnedBadges.length} Abzeichen
            </p>
            <div className="flex items-center gap-1 mb-2">
              <CoinIcon size={12} />
              <span className="text-xs text-amber-400 font-medium tabular-nums">{totalPoints.toLocaleString("de-DE")} Münzen</span>
            </div>
            <p className="text-sm font-bold text-teal-400">{rankPoints.toLocaleString("de-DE")} Punkte</p>

            {/* Rang-Fortschrittsbalken */}
            <div className="mt-3 max-w-xs">
              {nextRank ? (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-gray-600 whitespace-nowrap">{currentRank.emoji} {currentRank.label}</span>
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${rankPct}%`, background: "linear-gradient(90deg, #14b8a6, #2dd4bf)", boxShadow: "0 0 6px rgba(20,184,166,0.6)" }} />
                  </div>
                  <span className="text-[9px] text-gray-600 whitespace-nowrap">{nextRank.emoji} {nextRank.label}</span>
                  <span className="text-[9px] text-teal-400 tabular-nums">{rankPct}%</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
                  <Crown className="w-3 h-3" /> Maximalen Rang erreicht
                </div>
              )}
            </div>
          </div>

          {/* Rang-Block */}
          <div className="glass-heavy rounded-2xl px-5 py-4 text-center shrink-0 self-start hidden sm:block">
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Rang</p>
            <p className="text-3xl font-black text-white tabular-nums leading-none">#{leaderboardRank}</p>
            <p className="text-[9px] text-gray-600 mt-1">von {totalUsers}</p>
            <PointsInfoModal />
          </div>
        </div>
      </div>

      {/* ── Stat-Karten ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { icon: <Star className="w-4 h-4" />,        label: "Punkte",         value: rankPoints.toLocaleString("de-DE"), iconCls: "text-teal-400    bg-teal-500/10    border-teal-500/15",    accent: "from-teal-500/8"    },
          { icon: <CalendarDays className="w-4 h-4" />, label: "Events",         value: String(eventCount),                 iconCls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/15", accent: "from-emerald-500/8" },
          { icon: <WinIcon size={16} />,                label: "Turnier-Siege",  value: String(tournamentWins),             iconCls: "text-rose-400    bg-rose-500/10    border-rose-500/15",    accent: "from-rose-500/8"    },
          { icon: <Medal className="w-4 h-4" />,        label: "Event-Siege",    value: String(eventWins),                  iconCls: "text-amber-400   bg-amber-500/10   border-amber-500/15",   accent: "from-amber-500/8"   },
          { icon: <Trophy className="w-4 h-4" />,       label: "MVP-Awards",     value: String(mvpCount),                   iconCls: "text-purple-400  bg-purple-500/10  border-purple-500/15",  accent: "from-purple-500/8"  },
          { icon: <Gamepad2 className="w-4 h-4" />,     label: "Lieblingsspiel", value: favoriteGame ?? "–",                iconCls: "text-blue-400    bg-blue-500/10    border-blue-500/15",    accent: "from-blue-500/8",  small: true },
        ].map((s, i) => (
          <div key={s.label} className={`card-hover card-shine glass relative overflow-hidden rounded-2xl p-4 animate-slide-up stagger-${i + 1}`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${s.accent} to-transparent pointer-events-none`} />
            <div className={`relative w-8 h-8 rounded-xl flex items-center justify-center mb-3 border ${s.iconCls}`}>{s.icon}</div>
            <p className={`relative font-black text-white tabular-nums ${(s as { small?: boolean }).small ? "text-lg leading-tight" : "text-2xl"}`}>{s.value}</p>
            <p className="relative text-xs text-gray-400 mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Profil-Editor (Geburtstag, Bio) ─────────────────────────── */}
      <ProfileEditor
        birthday={user.birthday
          ? `${String(user.birthday.getDate()).padStart(2, "0")}-${String(user.birthday.getMonth() + 1).padStart(2, "0")}`
          : null}
        bio={user.bio ?? null}
      />

      {/* ── Collectibles Showcase ────────────────────────────────────── */}
      <CollectiblesShowcase
        showcaseItems={showcaseItems.map(i => ({ id: i.id, name: i.name, imageUrl: i.imageUrl, rarity: i.rarity }))}
        allOwned={ownedCollectibles.map(uc => ({
          id:             uc.collectibleItem.id,
          name:           uc.collectibleItem.name,
          imageUrl:       uc.collectibleItem.imageUrl,
          rarity:         uc.collectibleItem.rarity,
          collectionName: uc.collectibleItem.collection.name,
        }))}
        maxSlots={MAX_SHOWCASE}
      />

      {/* ── Haupt-Inhalt ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Linke Spalte ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Meine Sammlungen */}
          {Object.keys(collectiblesByCollection).length > 0 && (
            <section>
              <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5" /> Meine Sammlungen
              </h2>
              <div className="space-y-3">
                {Object.values(collectiblesByCollection).map(({ collection, items }) => (
                  <div key={collection.id} className="glass card-shine rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      {collection.coverImageUrl
                        ? <img src={collection.coverImageUrl} alt={collection.name} className="w-7 h-7 object-contain rounded" loading="lazy" />
                        : <Gamepad2 className="w-7 h-7 text-gray-600" />}
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
                              : <Gamepad2 className="w-9 h-9 text-gray-600" />}
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

          {/* Abzeichen — nur verdiente anzeigen */}
          <section>
            <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">
              🏅 Abzeichen <span className="text-gray-600 normal-case">({earnedBadges.length})</span>
            </h2>
            {earnedBadges.length === 0 && (
              <p className="text-xs text-gray-600 italic">Noch keine Abzeichen verdient.</p>
            )}
            {Object.entries(BADGE_CATEGORY_LABELS).map(([cat, label]) => {
              const catBadges = earnedBadges.filter(b => b.category === cat);
              if (!catBadges.length) return null;
              return (
                <div key={cat} className="mb-4">
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">{label}</p>
                  <div className="flex flex-wrap gap-2">
                    {catBadges.map(badge => (
                      <div key={badge.id} title={badge.desc}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium glass text-white border-white/10 hover:border-teal-500/30 transition-all">
                        <span>{badge.icon}</span>
                        {badge.name}
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
        </div>

        {/* ── Rechte Spalte ────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Aktivitäts-Stats */}
          <section>
            <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">📊 Aktivität</h2>
            <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
              {[
                { icon: <Clock className="w-3.5 h-3.5" />,         label: "Voice-Stunden",  value: `${voiceHours}h`,           color: "text-teal-400"    },
                { icon: <MessageSquare className="w-3.5 h-3.5" />, label: "Nachrichten",    value: `~${messageCount}`,         color: "text-blue-400"   },
                { icon: <CalendarDays className="w-3.5 h-3.5" />,  label: "Events besucht", value: String(eventCount),         color: "text-emerald-400" },
                { icon: <Swords className="w-3.5 h-3.5" />,        label: "Turniere",       value: String(tournamentCount),    color: "text-amber-400"  },
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

          {/* Letzte Events */}
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

          {/* Benachrichtigungen */}
          <section>
            <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">🔔 Benachrichtigungen</h2>
            <div className="glass card-shine rounded-2xl px-2 py-1">
              <PushSubscribeButton />
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
