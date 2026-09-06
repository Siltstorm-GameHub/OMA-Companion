"use client";
import { useState } from "react";
import Link from "next/link";
import {
  User, Wrench, Settings, ChevronRight, Gift,
  Clock, MessageSquare, Building2,
} from "lucide-react";
import RankedAvatar from "@/components/RankedAvatar";
import RankIcon from "@/components/RankIcon";
import RankUpFlare from "@/components/RankUpFlare";
import CoinIcon from "@/components/CoinIcon";
import Trophy3DViewer, { type Trophy3DItem } from "@/components/Trophy3DViewer";
import WanderpocalSection, { type WanderpocalHolderInfo } from "@/components/WanderpocalSection";
import { PushSubscribeButton } from "@/components/PushSubscribeButton";
import NotificationPreferences from "@/components/NotificationPreferences";
import ProfileOverlayButton from "@/components/ProfileOverlayButton";
import type { Badge } from "@/lib/badges";
import type { FavoriteGame } from "@/lib/favorite-games";
import type { WanderpocalHolder, WanderpocalStat } from "@/lib/wanderpocal";
import type { MancaveData } from "../mancave/mancave-data";
import { ItemsPanel } from "../mancave/MancaveSharedUI";
import BadgesSection from "./BadgesSection";
import FavoriteGamesSection from "./FavoriteGamesSection";
import SquadsSection, { type ProfileSquad } from "./SquadsSection";
import ProfileCompletion from "./ProfileCompletion";
import ProfileEditor from "./ProfileEditor";
import ProfileStatTiles from "./ProfileStatTiles";
import ProfileRecentEvents, { type ProfileRecentEventEntry } from "./ProfileRecentEvents";
import ProfileQuestsAndTournaments, {
  type ProfileQuestEntry, type ProfileTournamentParticipationEntry,
} from "./ProfileQuestsAndTournaments";
import CommunityJobsPanel from "./CommunityJobsPanel";
import ProfileJobBadge from "./ProfileJobBadge";

interface CustomBadgeDisplay {
  id:       string;
  icon:     string;
  name:     string;
  desc:     string;
  category: string;
  earnedAt: string;
}

interface Props {
  // Hero
  bannerUrl:         string | null;
  displayName:       string;
  avatarUrl:         string | null;
  rankPoints:        number;
  rankLabel:         string;
  rankColor:         string;
  memberSince:       string;
  totalPoints:       number;
  editorBirthday:    string | null;
  editorBio:         string | null;
  editorTwitchLogin: string | null;
  editorBannerUrl:   string | null;

  // Profil-Reiter
  userId:                   string;
  eventCount:               number;
  eventWins:                number;
  pollMasterCount:          number;
  pokaleCount:              number;
  topGames:                 string[];
  favoriteGames:            FavoriteGame[];
  mancaveData:              MancaveData;
  systemBadges:             Badge[];
  customBadges:             CustomBadgeDisplay[];
  showcaseBadgeKeys:        string[];
  voiceHours:               number;
  messageCount:             number;
  coinsEarned:              number;
  coinsSpent:               number;
  questsWithProgress:       ProfileQuestEntry[];
  tournamentParticipations: ProfileTournamentParticipationEntry[];
  squads:                   ProfileSquad[];
  profileCompletionDone: {
    bio:           boolean;
    birthday:      boolean;
    banner:        boolean;
    twitch:        boolean;
    favoriteGames: boolean;
  };
  rewardPerItem: number;
  reviewYears:   number[];

  // Einstellungen-Reiter
  hasTwitch: boolean;
  eventRegs: ProfileRecentEventEntry[];

  // Wanderpokale (3D-Viewer + 2D-Liste inkl. aktuellem Halter, siehe page.tsx)
  wanderpokalItems:    Trophy3DItem[];
  eventPokalItems:     Trophy3DItem[];
  wanderpocalTrophies: WanderpocalHolder[];
  wanderpocalStats:    WanderpocalStat[];
  wanderpocalRankMap:  Record<string, number>;
  wanderpocalHolders:  Record<string, WanderpocalHolderInfo>;
}

type Tab = "profil" | "mancave" | "community_jobs" | "einstellungen";

const TABS: { key: Tab; label: string; icon: typeof User }[] = [
  { key: "profil",         label: "Profil",         icon: User },
  { key: "mancave",        label: "Mancave",        icon: Wrench },
  { key: "community_jobs", label: "Community-Jobs", icon: Building2 },
  { key: "einstellungen",  label: "Einstellungen",  icon: Settings },
];

/**
 * Mobile Ansicht der eigenen Profilseite (siehe Teil B des Mancave-Umbau-
 * Plans) — löst die separate `MancaveMobileApp` ab, deren Inhalte inhaltlich
 * ohnehin nur das Profil wiederholten. Immer sichtbare Hero-Section oben,
 * darunter 3 Reiter (Profil/Job/Einstellungen), gleiche Tab-Konvention wie
 * die alte `MancaveMobileApp` (lokaler State, Button-Grid mit lucide-Icons).
 */
export default function ProfileMobileView(props: Props) {
  const {
    bannerUrl, displayName, avatarUrl, rankPoints, rankLabel, rankColor, memberSince, totalPoints,
    editorBirthday, editorBio, editorTwitchLogin, editorBannerUrl,
    userId, eventCount, eventWins, pollMasterCount, pokaleCount, topGames, favoriteGames, mancaveData: initialMancaveData,
    systemBadges, customBadges, showcaseBadgeKeys, voiceHours, messageCount, coinsEarned, coinsSpent,
    questsWithProgress, tournamentParticipations, squads, profileCompletionDone, rewardPerItem, reviewYears,
    hasTwitch, eventRegs,
    wanderpokalItems, eventPokalItems, wanderpocalTrophies, wanderpocalStats, wanderpocalRankMap, wanderpocalHolders,
  } = props;

  const [tab, setTab] = useState<Tab>("profil");
  // Lokaler State statt direkt `initialMancaveData`, gleicher Zweck wie in
  // MonitorScreenContent (MancaveSharedUI.tsx): ItemsPanel patcht
  // Änderungen (Ausbau-Stufen, Münzstand) hier rein, ohne dass die ganze
  // Profilseite dafür neu geladen werden muss.
  const [mancaveData, setMancaveData] = useState(initialMancaveData);
  // React-empfohlenes Muster "State beim Prop-Wechsel anpassen" (react.dev)
  // statt useEffect: läuft während des Renders, kein Cascading-Render-Risiko.
  const [prevInitialMancaveData, setPrevInitialMancaveData] = useState(initialMancaveData);
  if (initialMancaveData !== prevInitialMancaveData) {
    setPrevInitialMancaveData(initialMancaveData);
    setMancaveData(initialMancaveData);
  }

  return (
    <div className="space-y-4">
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="glass card-shine relative overflow-hidden rounded-2xl p-5">
        {bannerUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- beliebiger Blob-/Fremd-Host */}
            <img src={bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/40 pointer-events-none" />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-teal-900/10 pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <div className="relative flex items-center gap-3.5">
          <div className="relative shrink-0">
            <RankUpFlare userId={userId} rankPoints={rankPoints}>
              <RankedAvatar rankPoints={rankPoints} src={avatarUrl} alt={displayName} size={64} rounded="2xl" />
            </RankUpFlare>
            <span className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0d0d0f]"
              style={{ boxShadow: "0 0 6px rgba(52,211,153,0.8)" }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-white truncate">{displayName}</p>
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${rankColor} mt-0.5`}>
              <RankIcon rankPoints={rankPoints} size="xs" showPips={false} /> {rankLabel}
            </span>
            <p className="text-[11px] text-gray-500 mt-1">Mitglied seit {memberSince}</p>
            <div className="mt-1"><ProfileJobBadge userId={userId} /></div>
            <div className="flex items-center gap-1 mt-1">
              <CoinIcon size={11} />
              <span className="text-[11px] text-amber-400 font-medium tabular-nums">{totalPoints.toLocaleString("de-DE")} Münzen</span>
            </div>
          </div>
        </div>

        {/* Gruß/Bio, Geburtstag, Twitch-Kanal + "Profil bearbeiten" — alles in
            EINER Anzeige (ProfileEditor), nicht zusätzlich hier nochmal
            manuell gerendert (das war vorher doppelt, siehe Desktop-Fix). */}
        {/* Eigene id (nicht "profile-editor" wie im Desktop-Block) — beide
            Blöcke sind wegen der CSS-only lg:hidden/lg:block-Weiche gleich-
            zeitig im DOM, ein doppeltes id-Attribut wäre ungültiges HTML. */}
        <div id="profile-editor-mobile" className="relative mt-3">
          <ProfileEditor
            birthday={editorBirthday}
            bio={editorBio}
            twitchLogin={editorTwitchLogin}
            bannerUrl={editorBannerUrl}
          />
        </div>
      </div>

      {/* ── Reiter-Leiste ───────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-1.5">
        {TABS.map(t => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-colors"
              style={{
                background: active ? "rgba(45,212,191,0.14)" : "rgba(255,255,255,0.03)",
                border: active ? "1px solid rgba(45,212,191,0.3)" : "1px solid transparent",
              }}>
              <Icon className={`w-4 h-4 ${active ? "text-teal-300" : "text-gray-500"}`} />
              <span className={`text-[10px] font-medium ${active ? "text-teal-300" : "text-gray-500"}`}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Reiter-Inhalt ───────────────────────────────────────────── */}
      <div key={tab} className="space-y-5">
        {tab === "profil" && (
          <>
            <ProfileStatTiles
              rankPoints={rankPoints}
              eventCount={eventCount}
              eventWins={eventWins}
              pollMasterCount={pollMasterCount}
              pokaleCount={pokaleCount}
              topGames={topGames}
            />

            {reviewYears.length > 0 && (
              <Link href="/profile/rueckblick"
                className="card-hover card-shine glass relative overflow-hidden rounded-2xl p-4 flex items-center justify-between gap-3 group">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-rose-500/8 pointer-events-none" />
                <div className="relative flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                    <Gift className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Dein Jahresrückblick {reviewYears[0]}</p>
                    <p className="text-[11px] text-gray-500">Dein Jahr im Überblick</p>
                  </div>
                </div>
                <ChevronRight className="relative w-4 h-4 text-gray-600 group-hover:text-violet-400 transition-colors shrink-0" />
              </Link>
            )}

            <FavoriteGamesSection games={favoriteGames} viewerId={userId} />

            <section className="space-y-3">
              <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">🏆 Wanderpokale</h2>
              <Trophy3DViewer items={wanderpokalItems} emptyMessage="Noch keine Wanderpokale gewonnen" />
              <WanderpocalSection
                trophies={wanderpocalTrophies}
                userStats={wanderpocalStats}
                rankMap={wanderpocalRankMap}
                holders={wanderpocalHolders}
              />
            </section>

            <section>
              <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">🥇 Event-Pokale</h2>
              <Trophy3DViewer items={eventPokalItems} emptyMessage="Noch keine Event-Pokale gewonnen" />
            </section>

            <BadgesSection
              systemBadges={systemBadges}
              customBadges={customBadges}
              showcaseKeys={showcaseBadgeKeys}
            />

            <section>
              <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">📊 Aktivität</h2>
              <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
                {[
                  { icon: <Clock className="w-3.5 h-3.5" />,         label: "Voice-Stunden",     value: `${voiceHours}h`,                    color: "text-teal-400"  },
                  { icon: <MessageSquare className="w-3.5 h-3.5" />, label: "Nachrichten",       value: String(messageCount),                color: "text-blue-400"  },
                  { icon: <CoinIcon size={14} />,                     label: "Münzen gesammelt",  value: coinsEarned.toLocaleString("de-DE"), color: "text-amber-400" },
                  { icon: <CoinIcon size={14} />,                     label: "Münzen ausgegeben", value: coinsSpent.toLocaleString("de-DE"),  color: "text-rose-400"  },
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

            <ProfileQuestsAndTournaments
              questsWithProgress={questsWithProgress}
              tournamentParticipations={tournamentParticipations}
              userId={userId}
            />

            <SquadsSection squads={squads} />
            <ProfileCompletion done={profileCompletionDone} rewardPerItem={rewardPerItem} />
          </>
        )}

        {tab === "mancave" && (
          <ItemsPanel data={mancaveData} onDataChange={setMancaveData} />
        )}

        {tab === "community_jobs" && <CommunityJobsPanel />}

        {tab === "einstellungen" && (
          <>
            <section>
              <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">🔔 Benachrichtigungen</h2>
              <div className="flex flex-col gap-3">
                <div className="glass card-shine rounded-2xl px-2 py-1">
                  <PushSubscribeButton />
                </div>
                <NotificationPreferences />
              </div>
            </section>

            <section>
              <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">📺 Stream-Overlay</h2>
              <ProfileOverlayButton hasTwitch={hasTwitch} />
            </section>

            <ProfileRecentEvents eventRegs={eventRegs} userId={userId} />
          </>
        )}
      </div>
    </div>
  );
}
