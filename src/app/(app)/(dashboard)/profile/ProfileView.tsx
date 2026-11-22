import type { ReactNode } from "react";
import Link from "next/link";
import GiftIcon from "@/components/GiftIcon";
import RankedAvatar from "@/components/RankedAvatar";
import CoinIcon from "@/components/CoinIcon";
import PokalSection from "@/components/PokalSection";
import WanderpocalSection from "@/components/WanderpocalSection";
import Trophy3DViewer from "@/components/Trophy3DViewer";
import ProfileTopContributions from "@/components/ProfileTopContributions";
import { PushSubscribeButton } from "@/components/PushSubscribeButton";
import NotificationPreferences from "@/components/NotificationPreferences";
import AccountDataSection from "@/components/AccountDataSection";
import ProfileOverlayButton from "@/components/ProfileOverlayButton";
import { ChevronRight, Clock, MessageSquare, Trophy, Gamepad2, Users, Swords, Vote, ScrollText, ShoppingBag, Settings } from "@/components/icons";
import { POINT_RULES } from "@/lib/points";
import type { ProfileData, ProfileRelation } from "@/lib/profile-data";
import PointsInfoModal from "./PointsInfoModal";
import ProfileEditor from "./ProfileEditor";
import ProfileCompletion from "./ProfileCompletion";
import SquadsSection from "./SquadsSection";
import FavoriteGamesSection from "./FavoriteGamesSection";
import ProfileQuestsAndTournaments from "./ProfileQuestsAndTournaments";
import ProfileRecentEvents from "./ProfileRecentEvents";
import CommunityJobsPanel from "./CommunityJobsPanel";
import ProfileTabs, { type ProfileTabKey } from "./ProfileTabs";
import ProfileEditButton from "./ProfileEditButton";
import ReputationCard from "./ReputationCard";
import { CosmeticName, CosmeticTitle } from "@/components/cosmetics/CosmeticName";
import { getCosmeticOf } from "@/lib/cosmetics/catalog";

const H2 = "text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5";

/** Leerer Abschnitt auf dem EIGENEN Profil: Einladung statt Lücke. Auf fremden Profilen werden leere Abschnitte ausgeblendet. */
function EmptyInvite({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="glass rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-center">
      <Trophy className="w-6 h-6 text-gray-600" />
      <p className="text-xs text-gray-400">{text}</p>
      <Link href={href} className="text-xs text-teal-400 hover:text-teal-300 transition-colors">{cta} →</Link>
    </div>
  );
}

/**
 * "Ich" (eigenes Profil): Schnellzugriff auf Münzen, Quests, Shop und Einstellungen — am Handy
 * sonst nur über das kleine Avatar-Menü erreichbar (Designentwurf: Reiter "Ich").
 */
function MeTiles({ coins }: { coins: number }) {
  const tiles: { href: string; label: string; sub: ReactNode; icon: ReactNode; tone: string }[] = [
    { href: "/points", label: "Münzen", sub: <span className="tabular-nums">{coins.toLocaleString("de-DE")} · Verlauf</span>, icon: <CoinIcon size={20} />, tone: "bg-coin-soft" },
    { href: "/quests", label: "Quests", sub: "Monatsaufgaben", icon: <ScrollText className="size-5 text-primary-fg" />, tone: "bg-primary-soft" },
    { href: "/shop", label: "Shop", sub: "Rahmen, Titel, Farben", icon: <ShoppingBag className="size-5 text-violet-300" />, tone: "bg-violet-500/15" },
    { href: "/profile?tab=einstellungen", label: "Einstellungen", sub: "Benachrichtigungen, Konto", icon: <Settings className="size-5 text-muted" />, tone: "bg-surface-3" },
  ];
  return (
    <nav aria-label="Ich" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => (
        <Link key={t.href} href={t.href} className="flex min-h-16 items-center gap-3 rounded-card border border-line bg-surface px-3.5 py-3 transition-colors hover:border-line-strong hover:bg-surface-2">
          <span className={`grid size-10 shrink-0 place-items-center rounded-control ${t.tone}`}>{t.icon}</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-fg">{t.label}</span>
            <span className="block truncate text-xs text-muted">{t.sub}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
}

function Stat({ value, label, href, cls = "text-white" }: { value: ReactNode; label: string; href?: string; cls?: string }) {
  const inner = (
    <>
      <span className={`block text-lg sm:text-xl font-black tabular-nums leading-none ${cls}`}>{value}</span>
      <span className="block text-xs text-gray-500 mt-1">{label}</span>
    </>
  );
  return href
    ? <Link href={href} className="min-w-[3.5rem] text-center hover:opacity-80 transition-opacity">{inner}</Link>
    : <div className="min-w-[3.5rem] text-center">{inner}</div>;
}

/**
 * EIN responsives Profil-Layout für das eigene Profil und fremde Profile (Desktop und Handy).
 * Kopf = Visitenkarte mit Kennzahlen; darunter Reiter Übersicht · Erfolge · Aktivität, beim eigenen
 * Profil zusätzlich Community-Jobs und Einstellungen (dort auch der Profil-Editor). Fremde Profile
 * bekommen statt "Bearbeiten" Aktionen (`actions`) und, was euch verbindet (`relation`).
 */
export default function ProfileView({ data, isOwn, viewerId, initialTab = "overview", topBar, actions, relation }: {
  data: ProfileData; isOwn: boolean; viewerId?: string;
  initialTab?: ProfileTabKey;
  /** Navigationszeile über dem Kopf (fremde Profile: "Zurück"). */
  topBar?: ReactNode;
  /** Aktionen im Kopf (fremde Profile). */
  actions?: ReactNode;
  /** Gemeinsame Events/Spiele mit dem Betrachter (fremde Profile). */
  relation?: ProfileRelation;
}) {
  void viewerId;
  const { user, displayName, look } = data;
  const background = getCosmeticOf(look.background, "background");
  const pokaleTotal = data.pokale.length + data.wanderpocalTrophies.length;

  // ── Kopf: Visitenkarte ──
  const hero = (
    <section aria-label={displayName} className="glass relative overflow-hidden rounded-card p-4 sm:p-6">
      {background && <div className="absolute inset-0 pointer-events-none" style={{ background: background.css }} />}

      <div className="relative flex items-start gap-4">
        <RankedAvatar userId={user.id} look={look} src={user.image} alt={displayName} size={72} rounded="2xl" />
        <div className="flex-1 min-w-0">
          <CosmeticName as="h1" nameColor={look.nameColor} className="block text-2xl sm:text-3xl font-extrabold text-fg tracking-tight truncate">{displayName}</CosmeticName>
          <CosmeticTitle title={look.title} className="mt-0.5" />
          <p className="text-xs text-gray-500 mt-0.5">Mitglied seit {data.memberSince}</p>
          {user.bio && <p className="text-sm text-gray-300 mt-2 leading-relaxed max-w-xl">{user.bio}</p>}
        </div>
        {isOwn && <div className="shrink-0"><ProfileEditButton /></div>}
      </div>

      <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 sm:gap-x-6 border-t border-line pt-4">
        <Stat value={`#${data.leaderboardRank}`} label={`Rang von ${data.totalUsers}`} href="/leaderboard" />
        <Stat value={data.rankPoints.toLocaleString("de-DE")} label="Punkte" cls={isOwn ? "text-teal-300" : "text-primary-fg"} />
        <Stat value={data.eventCount} label="Events" />
        <Stat value={data.eventWins} label="Siege" />
        <Stat value={pokaleTotal} label="Pokale" />
        <Stat value={<span className="inline-flex items-center gap-1"><CoinIcon size={14} />{data.totalPoints.toLocaleString("de-DE")}</span>}
          label="Münzen" cls="text-amber-400" href={isOwn ? "/shop" : undefined} />
        {isOwn && <div className="ml-auto"><PointsInfoModal /></div>}
      </div>

      {actions && <div className="relative mt-4">{actions}</div>}
    </section>
  );

  // ── Was euch verbindet (nur fremde Profile) ──
  const relationCard = relation && (relation.sharedEvents > 0 || relation.sharedInGameIds.length > 0) ? (
    <section aria-label="Was euch verbindet" className="glass rounded-2xl p-4 border border-teal-400/20">
      <h2 className={H2}><Users className="w-3.5 h-3.5 text-teal-400" /> Ihr beide</h2>
      <ul className="space-y-1.5 text-sm text-gray-300">
        {relation.sharedEvents > 0 && (
          <li className="flex items-center gap-2"><Swords className="w-3.5 h-3.5 text-gray-500" />
            {relation.sharedEvents} {relation.sharedEvents === 1 ? "Event" : "Events"} zusammen gespielt</li>
        )}
        {relation.sharedInGameIds.length > 0 && (
          <li className="flex items-center gap-2"><Gamepad2 className="w-3.5 h-3.5 text-gray-500" />
            bei {relation.sharedInGameIds.length} {relation.sharedInGameIds.length === 1 ? "Spiel" : "Spielen"} beide am Start</li>
        )}
      </ul>
      <Link href={`/profile/compare/${user.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-teal-300 hover:text-teal-200">
        Im Detail vergleichen <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </section>
  ) : null;

  // ── Reiter: Übersicht ──
  const overview = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
      <div className="lg:col-span-2 space-y-5 min-w-0">
        <FavoriteGamesSection games={data.favoriteGames} current={data.currentGames} inGames={data.inGames}
          sharedIds={relation?.sharedInGameIds} readOnly={!isOwn} displayName={displayName} />
        {(isOwn || data.eventRegs.length > 0) && (
          <ProfileRecentEvents eventRegs={data.eventRegs} userId={user.id} isOwn={isOwn} />
        )}
      </div>
      <div className="space-y-5 min-w-0">
        {relationCard}
        <ReputationCard level={data.reputation.level} points={data.reputation.points} peakLevel={data.reputation.peakLevel} isOwn={isOwn} />
        <SquadsSection squads={data.squads} />
        <ProfileTopContributions userId={user.id} isOwn={isOwn} />
      </div>
    </div>
  );

  // ── Reiter: Erfolge (eine Vitrine statt drei verstreuter Abschnitte) ──
  const hasWanderpokale = data.wanderpokalItems.length > 0 || data.wanderpocalTrophies.length > 0 || data.wanderpocalStats.length > 0;
  const hasAnyAchievement = data.pokale.length > 0 || hasWanderpokale || data.pollMasterCount > 0 || data.eventWins > 0;
  const achievements = (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { icon: <Trophy className="w-4 h-4 text-yellow-300" />, value: data.eventWins, label: "Event-Siege" },
          { icon: <Trophy className="w-4 h-4 text-amber-400" />, value: data.pokale.length, label: "Event-Pokale" },
          { icon: <Trophy className="w-4 h-4 text-teal-300" />, value: data.wanderpocalTrophies.length, label: "Wanderpokale" },
          { icon: <Vote className="w-4 h-4 text-violet-300" />, value: data.pollMasterCount, label: "Abstimmungen gewonnen", title: "Als MVP gewählt oder Community-Champion" },
        ].map(s => (
          <div key={s.label} className="glass rounded-2xl px-4 py-3" title={s.title}>
            <div className="flex items-center gap-2">{s.icon}<span className="text-xl font-black text-white tabular-nums">{s.value}</span></div>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {!hasAnyAchievement && isOwn && (
        <EmptyInvite text="Noch keine Erfolge. Gewinn ein Event, hol dir einen Pokal oder werd zum MVP gewählt." href="/events" cta="Zu den Events" />
      )}

      <PokalSection pokale={data.pokale} ownerName={displayName} />

      {hasWanderpokale && (
        <div className="space-y-3">
          <WanderpocalSection trophies={data.wanderpocalTrophies} userStats={data.wanderpocalStats}
            rankMap={data.wanderpocalRankMap} holders={data.wanderpocalHolders} />
          {data.wanderpokalItems.length > 0 && <Trophy3DViewer items={data.wanderpokalItems} />}
        </div>
      )}

      {data.eventPokalItems.length > 0 && (
        <section>
          <h2 className={H2}><Trophy className="w-3.5 h-3.5 text-amber-400" /> Event-Pokale in 3D</h2>
          <Trophy3DViewer items={data.eventPokalItems} />
        </section>
      )}
    </div>
  );

  // ── Reiter: Aktivität ──
  const activity = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      <div className="space-y-5 min-w-0">
        <section>
          <h2 className={H2}><Clock className="w-3.5 h-3.5 text-teal-500/70" /> Auf dem Server</h2>
          <div className="glass rounded-2xl overflow-hidden divide-y divide-line">
            {[
              { icon: <Clock className="w-3.5 h-3.5 text-teal-400" />,          label: "Voice-Stunden",     value: `${data.voiceHours} h` },
              { icon: <MessageSquare className="w-3.5 h-3.5 text-blue-400" />,  label: "Nachrichten",       value: data.messageCount.toLocaleString("de-DE") },
              { icon: <CoinIcon size={14} />,                                   label: "Münzen gesammelt",  value: data.coinsEarned.toLocaleString("de-DE") },
              { icon: <CoinIcon size={14} />,                                   label: "Münzen ausgegeben", value: data.coinsSpent.toLocaleString("de-DE") },
              ...(data.topGames.length > 0
                ? [{ icon: <Gamepad2 className="w-3.5 h-3.5 text-indigo-300" />, label: "Meist gespielt bei Events", value: data.topGames.slice(0, 3).join(" · ") }]
                : []),
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex items-center gap-2 text-xs text-gray-400 shrink-0">{s.icon}{s.label}</span>
                <span className="text-sm font-semibold text-white text-right truncate">{s.value}</span>
              </div>
            ))}
          </div>
        </section>

        {isOwn && data.reviewYears.length > 0 && (
          <Link href="/profile/rueckblick"
            className="glass relative overflow-hidden rounded-2xl p-4 flex items-center justify-between gap-4 group hover:border-violet-400/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                <GiftIcon size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Dein Jahresrückblick {data.reviewYears[0]}</p>
                <p className="text-xs text-gray-500">Punkte, Events, Siege und mehr</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-violet-400 transition-colors shrink-0" />
          </Link>
        )}
      </div>

      {/* Monats-Quests nur auf dem eigenen Profil — für Besucher sagen sie wenig */}
      {isOwn && (
        <div className="space-y-5 min-w-0">
          <ProfileQuestsAndTournaments questsWithProgress={data.questsWithProgress} tournamentParticipations={[]} userId={user.id} />
        </div>
      )}
    </div>
  );

  // ── Reiter: Einstellungen (eigenes Profil) — Profil-Editor oben ──
  const settings = isOwn ? (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      <div className="space-y-5">
        <section id="profile-editor" className="scroll-mt-24">
          <h2 className={H2}>Profil</h2>
          <div className="glass rounded-2xl p-4">
            <ProfileEditor birthday={data.editorBirthday} bio={user.bio ?? null} twitchLogin={user.twitchLogin ?? null} />
          </div>
        </section>
        <section id="notifications">
          <h2 className={H2}>Benachrichtigungen</h2>
          <div className="flex flex-col gap-3">
            <div className="glass rounded-2xl px-2 py-1">
              <PushSubscribeButton />
            </div>
            <NotificationPreferences />
          </div>
        </section>
      </div>
      <div className="space-y-5">
        <section id="overlay">
          <h2 className={H2}>Stream-Overlay</h2>
          <ProfileOverlayButton hasTwitch={!!user.twitchLogin} />
        </section>
        <AccountDataSection />
      </div>
    </div>
  ) : undefined;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">
      {topBar}
      {hero}
      {isOwn && <MeTiles coins={data.totalPoints} />}
      {isOwn && <ProfileCompletion done={data.profileCompletionDone} rewardPerItem={POINT_RULES.PROFILE_BIO.amount} />}
      <ProfileTabs initialTab={initialTab} panels={{
        overview,
        achievements,
        activity,
        ...(isOwn ? { community_jobs: <CommunityJobsPanel />, settings } : {}),
      }} />
    </div>
  );
}
