"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Clock, MessageSquare, CheckCircle2, Swords, Gamepad2, Trophy, Gift, ChevronRight,
} from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import WinIcon from "@/components/WinIcon";
import { Modal } from "@/components/ui";
import BadgesSection from "@/app/(dashboard)/profile/BadgesSection";
import ProfileEditor from "@/app/(dashboard)/profile/ProfileEditor";
import { RARITY_CONFIG, type Rarity } from "@/lib/collectibles";
import type { RoomProfileCore, RoomProfileDetails } from "@/lib/room-profile-data";
import { cn } from "@/lib/utils";

type TabKey = "aktivitaet" | "events" | "turniere" | "quests" | "abzeichen" | "sammlung" | "pokale" | "einstellungen";

interface Props {
  open:        boolean;
  onClose:     () => void;
  displayName: string;
  readOnly:    boolean;
  details:     RoomProfileDetails;
  /** Nur im eigenen Zimmer: für den Profil-Editor (Bio, Geburtstag, Twitch, Banner). */
  core?:       RoomProfileCore;
  /** Welcher Monitor angeklickt wurde (roehrenmonitor/monitor_flach/monitor_144)
   *  — bestimmt den Rahmen-Skin. Fehlt er (z.B. externer Aufruf), fällt das
   *  Popup auf die Röhren-Optik zurück. */
  monitorKey?: string;
  /** Serverseitig gerendert, weil WanderpocalSection eine Server-Komponente ist. */
  trophySection: ReactNode;
  /** Nur im eigenen Zimmer: Push-Button und Benachrichtigungs-Einstellungen. */
  settingsSection?: ReactNode;
}

/**
 * Jeder Monitor im Zimmer öffnet dasselbe Popup — der Rahmen übernimmt aber
 * die Optik genau des angeklickten Bildschirmtyps, damit es sich anfühlt, als
 * würde man tatsächlich in DIESEN Monitor hineinschauen statt immer in
 * dieselbe generische Box.
 */
const MONITOR_SKINS: Record<string, { emoji: string; panelClassName: string }> = {
  roehrenmonitor: {
    emoji: "📺",
    panelClassName:
      "bg-[#0d0c0a] border-[14px] border-[#c9b98f] rounded-[36px] " +
      "shadow-[0_0_0_1px_rgba(0,0,0,0.5)_inset,0_20px_60px_rgba(0,0,0,0.6)]",
  },
  monitor_flach: {
    emoji: "🖥️",
    panelClassName:
      "bg-[#0a0a0d] border-[3px] border-black rounded-lg " +
      "shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_20px_60px_rgba(0,0,0,0.6)]",
  },
  monitor_144: {
    emoji: "🎮",
    panelClassName:
      "bg-[#0a0a0d] border-[3px] border-[#1a1a22] rounded-xl " +
      "shadow-[0_0_0_2px_rgba(139,92,246,0.55),0_0_40px_rgba(139,92,246,0.3),0_20px_60px_rgba(0,0,0,0.6)]",
  },
};

/**
 * Was der Monitor anzeigt: alles, was auf der Bühne keinen Platz hat.
 * Bewusst hinter einem Klick — direkt sichtbar bleiben Hero, Stat-Kacheln und
 * Lieblingsspiele.
 */
export default function CrtProfileModal({
  open, onClose, displayName, readOnly, details, core, monitorKey, trophySection, settingsSection,
}: Props) {
  const [tab, setTab] = useState<TabKey>("aktivitaet");
  const skin = MONITOR_SKINS[monitorKey ?? ""] ?? MONITOR_SKINS.roehrenmonitor;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "aktivitaet", label: "Aktivität" },
    { key: "events",     label: "Events" },
    { key: "turniere",   label: "Turniere" },
    { key: "quests",     label: "Quests" },
    { key: "abzeichen",  label: "Abzeichen" },
    { key: "sammlung",   label: "Sammlung" },
    { key: "pokale",     label: "Pokale" },
    ...(settingsSection ? [{ key: "einstellungen" as const, label: "Einstellungen" }] : []),
  ];

  return (
    <Modal open={open} onClose={onClose} size="lg" title={`${skin.emoji} ${displayName}`} panelClassName={skin.panelClassName}>
      {/* Tab-Leiste — horizontal scrollbar, damit sie auf dem Handy nicht umbricht */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 pb-3 mb-4 border-b border-white/[0.06]">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap",
              tab === t.key
                ? "bg-teal-500/15 text-teal-300 border border-teal-500/25"
                : "text-gray-500 hover:text-gray-300 border border-transparent"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "aktivitaet" && (
        <div className="rounded-2xl overflow-hidden divide-y divide-white/[0.04] border border-white/[0.06]">
          {[
            { icon: <Clock className="w-3.5 h-3.5" />,         label: "Voice-Stunden",     value: `${details.voiceHours}h`,                          color: "text-teal-400"  },
            { icon: <MessageSquare className="w-3.5 h-3.5" />, label: "Nachrichten",       value: details.messageCount.toLocaleString("de-DE"),      color: "text-blue-400"  },
            { icon: <CoinIcon size={14} />,                    label: "Münzen gesammelt",  value: details.coinsEarned.toLocaleString("de-DE"),       color: "text-amber-400" },
            { icon: <CoinIcon size={14} />,                    label: "Münzen ausgegeben", value: details.coinsSpent.toLocaleString("de-DE"),        color: "text-rose-400"  },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between px-4 py-3">
              <div className={cn("flex items-center gap-2 text-xs", s.color)}>
                {s.icon}<span className="text-gray-400">{s.label}</span>
              </div>
              <span className="text-sm font-semibold text-white tabular-nums">{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "events" && (
        details.events.length === 0
          ? <Empty text="Noch keine Events besucht." />
          : (
            <div className="rounded-2xl overflow-hidden divide-y divide-white/[0.04] border border-white/[0.06]">
              {details.events.map(e => (
                <Link key={e.id} href={`/tournament/${e.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors group">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-teal-300 transition-colors">{e.title}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {new Date(e.startAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Berlin" })}
                      {e.game ? ` · ${e.game}` : ""}
                    </p>
                  </div>
                  {e.placement !== null && (
                    <span className={cn(
                      "ml-3 shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border tabular-nums",
                      e.placement === 1 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                      e.placement === 2 ? "bg-gray-400/10 text-gray-300 border-gray-400/20" :
                      e.placement === 3 ? "bg-orange-700/10 text-orange-400 border-orange-700/20" :
                                          "bg-white/[0.04] text-gray-500 border-white/[0.06]"
                    )}>#{e.placement}</span>
                  )}
                </Link>
              ))}
            </div>
          )
      )}

      {tab === "turniere" && (
        details.tournaments.length === 0
          ? <Empty text="Noch an keinem Turnier teilgenommen." />
          : (
            <div className="rounded-2xl overflow-hidden divide-y divide-white/[0.04] border border-white/[0.06]">
              {details.tournaments.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center shrink-0">
                    <WinIcon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{t.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t.wins === 0 && t.losses === 0
                        ? "Keine Matches gespielt"
                        : [t.wins > 0 ? `${t.wins} Siege` : null, t.losses > 0 ? `${t.losses} Niederlagen` : null]
                            .filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className={cn(
                    "text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1 shrink-0",
                    t.finalRank === 1 ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                      : "bg-white/[0.04] text-gray-500 border-white/[0.06]"
                  )}>
                    {t.finalRank === 1 ? <><WinIcon size={11} /> Sieger</> : t.eliminated ? "Ausgeschieden" : "Aktiv"}
                  </span>
                </div>
              ))}
            </div>
          )
      )}

      {tab === "quests" && (
        details.quests.length === 0
          ? <Empty text="Diesen Monat gibt es keine Quests." />
          : (
            <div className="space-y-2">
              {details.quests.map(q => {
                const pct = Math.round((q.current / q.target) * 100);
                return (
                  <div key={q.id} className={cn(
                    "rounded-xl px-4 py-3 relative overflow-hidden border",
                    q.completed ? "border-emerald-500/20 bg-emerald-500/[0.03]" : "border-white/[0.06]"
                  )}>
                    <div className={cn("absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b rounded-l-xl", q.bar)} />
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{q.icon}</span>
                        <span className={cn("text-sm font-medium truncate", q.completed ? "text-emerald-300" : "text-white")}>{q.title}</span>
                        {q.completed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-500 tabular-nums">{q.current}/{q.target}</span>
                        <span className="text-xs text-amber-400 font-semibold flex items-center gap-0.5 tabular-nums">
                          +{q.reward}<CoinIcon size={10} />
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full bg-gradient-to-r transition-all", q.bar)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )
      )}

      {tab === "abzeichen" && (
        <BadgesSection
          systemBadges={details.badges}
          customBadges={details.customBadges}
          showcaseKeys={details.showcaseBadgeKeys}
          readOnly={readOnly}
        />
      )}

      {tab === "sammlung" && (
        details.collections.length === 0
          ? <Empty text="Noch keine Sammlerstücke. Der Shop wartet." />
          : (
            <div className="space-y-3">
              {details.collections.map(col => (
                <div key={col.id} className="rounded-2xl p-4 border border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-3">
                    {col.coverImageUrl
                      ? <img src={col.coverImageUrl} alt={col.name} className="w-7 h-7 object-contain rounded" loading="lazy" />
                      : <Gamepad2 className="w-7 h-7 text-gray-600" />}
                    <span className="text-sm font-semibold text-white">{col.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-gray-500">
                      {col.items.length} Figuren
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {col.items.map(item => {
                      const rarity = RARITY_CONFIG[item.rarity as Rarity] ?? RARITY_CONFIG.common;
                      return (
                        <div key={item.id} title={item.name}
                          className={cn("flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-xl border bg-white/[0.02]", rarity.border, rarity.glow)}>
                          {item.imageUrl
                            ? <img src={item.imageUrl} alt={item.name} className="w-9 h-9 object-contain" loading="lazy" />
                            : <Gamepad2 className="w-9 h-9 text-gray-600" />}
                          <span className={cn("text-[9px] font-medium", rarity.color)}>{item.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
      )}

      {tab === "pokale" && (
        details.trophies.length === 0 && details.trophyStats.length === 0
          ? <Empty text="Noch keine Wanderpokale erobert." icon={<Trophy className="w-8 h-8" />} />
          : <>{trophySection}</>
      )}

      {tab === "einstellungen" && (
        <div className="space-y-5">
          {!readOnly && core && (
            <>
              <ProfileEditor
                birthday={core.birthday}
                bio={core.bio}
                twitchLogin={core.twitchLogin}
                bannerUrl={core.bannerUrl}
              />
              {core.reviewYears.length > 0 && (
                <Link href="/profile/rueckblick"
                  className="rounded-2xl p-4 flex items-center justify-between gap-4 border border-white/[0.06] hover:bg-white/[0.03] transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                      <Gift className="w-4 h-4 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Dein Jahresrückblick {core.reviewYears[0]}</p>
                      <p className="text-xs text-gray-500">Punkte, Events, Siege und mehr</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-violet-400 transition-colors shrink-0" />
                </Link>
              )}
            </>
          )}
          {settingsSection}
        </div>
      )}
    </Modal>
  );
}

function Empty({ text, icon }: { text: string; icon?: ReactNode }) {
  return (
    <div className="py-10 text-center text-gray-500">
      <div className="flex justify-center mb-3 text-gray-700">{icon ?? <Swords className="w-8 h-8" />}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}
