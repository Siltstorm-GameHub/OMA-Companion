import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/roles";
import { getRankFullLabel } from "@/lib/ranks";
import { getAvailableReviewYears, buildYearReview } from "@/lib/year-review";
import { RARITY_CONFIG, type Rarity } from "@/lib/collectibles";
import { EmptyState } from "@/components/EmptyState";
import { CountUp } from "@/components/CountUp";
import CoinIcon from "@/components/CoinIcon";
import RankPointsIcon from "@/components/RankPointsIcon";
import Link from "next/link";
import {
  Gift, CalendarDays, Swords, Clock, MessageSquare, Gamepad2, Medal,
  ArrowRight, Award, Sparkles, Dices, Target, Heart, TrendingUp,
} from "lucide-react";

const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export default async function YearReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const user = await prisma.user.findUnique({
    where:  { id: me.id },
    select: { createdAt: true, username: true, name: true },
  });
  if (!user) redirect("/login");

  const availableYears = getAvailableReviewYears(user.createdAt);

  if (availableYears.length === 0) {
    const nextYear = new Date().getFullYear() + 1;
    return (
      <div className="p-5 sm:p-6 max-w-3xl mx-auto animate-fade-in">
        <EmptyState
          type="generic"
          title="Noch kein Rückblick verfügbar"
          description={`Dein erster Jahresrückblick erscheint hier im Januar ${nextYear}, sobald dein erstes Jahr in der Community abgeschlossen ist.`}
          action={{ label: "Zurück zum Profil", href: "/profile" }}
        />
      </div>
    );
  }

  const { year: yearParam } = await searchParams;
  const requestedYear = yearParam ? parseInt(yearParam, 10) : NaN;
  const year = availableYears.includes(requestedYear) ? requestedYear : availableYears[0];

  const review = await buildYearReview(me.id, year);
  const displayName = user.username ?? user.name ?? "Unbekannt";

  const statTiles: { icon: React.ReactNode; label: string; value: string; sub?: string; accent: string; iconCls: string }[] = [
    { icon: <CalendarDays className="w-4 h-4" />, label: "Events besucht", value: String(review.eventsAttended), accent: "from-emerald-500/8", iconCls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/15" },
    { icon: <Medal className="w-4 h-4" />,         label: "Event-Siege",   value: String(review.eventWins),      accent: "from-amber-500/8",   iconCls: "text-amber-400 bg-amber-500/10 border-amber-500/15" },
    { icon: <Swords className="w-4 h-4" />,        label: "Turniere gespielt", value: String(review.tournamentsPlayed), sub: review.tournamentWins > 0 ? `${review.tournamentWins}× gewonnen` : undefined, accent: "from-rose-500/8", iconCls: "text-rose-400 bg-rose-500/10 border-rose-500/15" },
    { icon: <Gamepad2 className="w-4 h-4" />,      label: "Lieblingsspiel", value: review.topGames[0] ?? "–", sub: review.topGames.slice(1, 3).join(" · ") || undefined, accent: "from-blue-500/8", iconCls: "text-blue-400 bg-blue-500/10 border-blue-500/15" },
    { icon: <Clock className="w-4 h-4" />,         label: "Voice-Stunden (geschätzt)", value: `${review.voiceHoursEstimate}h`, accent: "from-teal-500/8", iconCls: "text-teal-400 bg-teal-500/10 border-teal-500/15" },
    { icon: <MessageSquare className="w-4 h-4" />, label: "Nachrichten (geschätzt)", value: `${review.messagesEstimate}+`, accent: "from-indigo-500/8", iconCls: "text-indigo-400 bg-indigo-500/10 border-indigo-500/15" },
  ];

  return (
    <div className="p-5 sm:p-6 max-w-6xl mx-auto space-y-5 animate-fade-in">

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="glass card-shine relative overflow-hidden rounded-2xl p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/12 via-transparent to-rose-500/8 pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent pointer-events-none" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Gift className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="font-display text-xl font-black text-white tracking-tight">Jahresrückblick {year}</h1>
              <p className="text-xs text-gray-500">{displayName}s Jahr in der Community</p>
            </div>
          </div>

          {availableYears.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {availableYears.map(y => (
                <Link key={y} href={`/profile/rueckblick?year=${y}`}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    y === year
                      ? "bg-violet-500/15 text-violet-300 border-violet-500/30"
                      : "bg-white/[0.03] text-gray-500 border-white/[0.08] hover:text-gray-300 hover:border-white/[0.15]"
                  }`}>
                  {y}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Rang-Reise & Münzen ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="glass card-shine relative overflow-hidden rounded-2xl p-5">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/8 to-transparent pointer-events-none" />
          <p className="relative text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Rang-Reise
          </p>
          <div className="relative flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border ${review.rankStart.color} ${review.rankStart.bg} ${review.rankStart.border}`}>
              {review.rankStart.emoji} {getRankFullLabel(review.rankStart)}
            </span>
            <ArrowRight className="w-4 h-4 text-gray-600 shrink-0" />
            <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border ${review.rankEnd.color} ${review.rankEnd.bg} ${review.rankEnd.border}`}>
              {review.rankEnd.emoji} {getRankFullLabel(review.rankEnd)}
            </span>
            {review.rankedUp && (
              <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Aufgestiegen!
              </span>
            )}
          </div>
          <p className="relative text-xs text-gray-500 mt-3 flex items-center gap-1.5">
            <RankPointsIcon size={12} />
            <span className="text-teal-400 font-semibold tabular-nums">+<CountUp to={review.rankPointsEarned} /></span> Rang-Punkte in {year}
          </p>
        </div>

        <div className="glass card-shine relative overflow-hidden rounded-2xl p-5">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 to-transparent pointer-events-none" />
          <p className="relative text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <CoinIcon size={13} /> Münzen
          </p>
          <div className="relative flex items-end gap-6">
            <div>
              <p className="text-2xl font-black text-amber-400 tabular-nums"><CountUp to={review.coinsEarned} /></p>
              <p className="text-xs text-gray-500 mt-0.5">verdient</p>
            </div>
            <div>
              <p className="text-2xl font-black text-gray-400 tabular-nums"><CountUp to={review.coinsSpent} /></p>
              <p className="text-xs text-gray-500 mt-0.5">ausgegeben</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat-Kacheln ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {statTiles.map((s, i) => (
          <div key={s.label} className={`card-hover card-shine glass relative overflow-hidden rounded-2xl p-4 animate-slide-up stagger-${(i % 6) + 1}`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${s.accent} to-transparent pointer-events-none`} />
            <div className={`relative w-8 h-8 rounded-xl flex items-center justify-center mb-3 border ${s.iconCls}`}>{s.icon}</div>
            <p className="relative text-lg font-black text-white leading-tight truncate" title={s.value}>{s.value}</p>
            {s.sub && <p className="relative text-[10px] text-gray-500 mt-0.5 truncate">{s.sub}</p>}
            <p className="relative text-xs text-gray-400 mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Highlights ───────────────────────────────────────────────── */}
      {(review.biggestWin || review.busiestMonth) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {review.biggestWin && (
            <div className="glass card-shine relative overflow-hidden rounded-2xl p-4">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 to-transparent pointer-events-none" />
              <p className="relative text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">🏆 Größter Gewinn</p>
              <p className="relative text-lg font-black text-amber-400 tabular-nums flex items-center gap-1.5">
                +{review.biggestWin.amount.toLocaleString("de-DE")} <CoinIcon size={14} />
              </p>
              <p className="relative text-xs text-gray-400 mt-1">{review.biggestWin.reason}</p>
            </div>
          )}
          {review.busiestMonth && (
            <div className="glass card-shine relative overflow-hidden rounded-2xl p-4">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 to-transparent pointer-events-none" />
              <p className="relative text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">📈 Aktivster Monat</p>
              <p className="relative text-lg font-black text-white">{MONTH_NAMES[review.busiestMonth.month - 1]}</p>
              <p className="relative text-xs text-gray-400 mt-1">{review.busiestMonth.count} Aktivitäten</p>
            </div>
          )}
        </div>
      )}

      {/* ── Neue Abzeichen ───────────────────────────────────────────── */}
      {review.newBadges.length > 0 && (
        <section>
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" /> {review.newBadges.length} neue Abzeichen
          </h2>
          <div className="glass card-shine rounded-2xl p-4 flex flex-wrap gap-2">
            {review.newBadges.map((b, i) => (
              <span key={`${b.name}-${i}`} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-gray-300">
                <span>{b.icon}</span> {b.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── Neue Collectibles ────────────────────────────────────────── */}
      {review.newCollectibles.length > 0 && (
        <section>
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Gamepad2 className="w-3.5 h-3.5" /> {review.newCollectibles.length} neue Figuren
            {review.rarestCollectible && (
              <span className="text-gray-600 font-normal normal-case tracking-normal">
                · seltenste: {review.rarestCollectible.name}
              </span>
            )}
          </h2>
          <div className="glass card-shine rounded-2xl p-4 flex flex-wrap gap-2">
            {review.newCollectibles.map(item => {
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
        </section>
      )}

      {/* ── Minigames & Extras ───────────────────────────────────────── */}
      {(review.lul || review.duels || review.clickerClicks > 0 || review.predictions || review.donationsTotal > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {review.lul && (
            <div className="glass card-shine relative overflow-hidden rounded-2xl p-4">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 to-transparent pointer-events-none" />
              <p className="relative text-2xl font-black text-white tabular-nums">{review.lul.points}</p>
              <p className="relative text-xs text-gray-400 mt-1.5">LuL-Punkte · {review.lul.spieltage} Spieltage{review.lul.wins > 0 ? ` · ${review.lul.wins} Siege` : ""}</p>
            </div>
          )}
          {review.duels && (
            <div className="glass card-shine relative overflow-hidden rounded-2xl p-4">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/8 to-transparent pointer-events-none" />
              <p className="relative text-2xl font-black text-white tabular-nums">{review.duels.won}/{review.duels.played}</p>
              <p className="relative text-xs text-gray-400 mt-1.5 flex items-center gap-1"><Dices className="w-3 h-3" /> Münzen-Duelle gewonnen</p>
            </div>
          )}
          {review.clickerClicks > 0 && (
            <div className="glass card-shine relative overflow-hidden rounded-2xl p-4">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 to-transparent pointer-events-none" />
              <p className="relative text-2xl font-black text-white tabular-nums">{review.clickerClicks.toLocaleString("de-DE")}</p>
              <p className="relative text-xs text-gray-400 mt-1.5">Klicker-Klicks</p>
            </div>
          )}
          {review.predictions && (
            <div className="glass card-shine relative overflow-hidden rounded-2xl p-4">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 to-transparent pointer-events-none" />
              <p className="relative text-2xl font-black text-white tabular-nums">{review.predictions.correct}/{review.predictions.total}</p>
              <p className="relative text-xs text-gray-400 mt-1.5 flex items-center gap-1"><Target className="w-3 h-3" /> Vorhersagen richtig</p>
            </div>
          )}
          {review.donationsTotal > 0 && (
            <div className="glass card-shine relative overflow-hidden rounded-2xl p-4">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/8 to-transparent pointer-events-none" />
              <p className="relative text-2xl font-black text-white tabular-nums">{review.donationsTotal.toLocaleString("de-DE")}€</p>
              <p className="relative text-xs text-gray-400 mt-1.5 flex items-center gap-1"><Heart className="w-3 h-3" /> gespendet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
