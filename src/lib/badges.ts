export interface Badge {
  id: string;
  icon: string;
  name: string;
  desc: string;
  earned: boolean;
  category: "community" | "aktivitaet" | "events" | "turniere" | "punkte";
  progress?: { current: number; target: number };
}

export const BADGE_CATEGORY_LABELS: Record<Badge["category"], string> = {
  community:  "Community",
  aktivitaet: "Aktivität",
  events:     "Events",
  turniere:   "Turniere",
  punkte:     "Punkte",
};

export type BadgeStats = {
  points: number;
  voiceHours: number;
  messageCount: number;
  eventCount: number;
  tournamentCount: number;
  tournamentWins: number;
  eventWins?: number;
  mvpCount?: number;
};

type BadgeDef = {
  id: string;
  icon: string;
  name: string;
  desc: string;
  category: Badge["category"];
  check: (d: BadgeStats) => boolean;
  progress?: (d: BadgeStats) => { current: number; target: number };
};

const BADGE_DEFS: BadgeDef[] = [
  {
    id: "welcome", icon: "🎉", name: "Willkommen", desc: "Erstmals angemeldet", category: "community",
    check: () => true,
  },
  {
    id: "voice_1h", icon: "🎙️", name: "Voice-Fan", desc: "1 Stunde im Sprachkanal", category: "aktivitaet",
    check: d => d.voiceHours >= 1,
    progress: d => ({ current: Math.min(d.voiceHours, 1), target: 1 }),
  },
  {
    id: "voice_10h", icon: "🎙️", name: "Voice-Veteran", desc: "10 Stunden im Sprachkanal", category: "aktivitaet",
    check: d => d.voiceHours >= 10,
    progress: d => ({ current: Math.min(d.voiceHours, 10), target: 10 }),
  },
  {
    id: "voice_50h", icon: "🎙️", name: "Voice-Legende", desc: "50 Stunden im Sprachkanal", category: "aktivitaet",
    check: d => d.voiceHours >= 50,
    progress: d => ({ current: Math.min(d.voiceHours, 50), target: 50 }),
  },
  {
    id: "msg_50", icon: "💬", name: "Gesprächig", desc: "50 Nachrichten gesendet", category: "aktivitaet",
    check: d => d.messageCount >= 50,
    progress: d => ({ current: Math.min(d.messageCount, 50), target: 50 }),
  },
  {
    id: "msg_500", icon: "💬", name: "Chatterbox", desc: "500 Nachrichten gesendet", category: "aktivitaet",
    check: d => d.messageCount >= 500,
    progress: d => ({ current: Math.min(d.messageCount, 500), target: 500 }),
  },
  {
    id: "event_1", icon: "📅", name: "Teilnehmer", desc: "1 Event besucht", category: "events",
    check: d => d.eventCount >= 1,
    progress: d => ({ current: Math.min(d.eventCount, 1), target: 1 }),
  },
  {
    id: "event_5", icon: "📅", name: "Eventgänger", desc: "5 Events besucht", category: "events",
    check: d => d.eventCount >= 5,
    progress: d => ({ current: Math.min(d.eventCount, 5), target: 5 }),
  },
  {
    id: "event_10", icon: "📅", name: "Stammgast", desc: "10 Events besucht", category: "events",
    check: d => d.eventCount >= 10,
    progress: d => ({ current: Math.min(d.eventCount, 10), target: 10 }),
  },
  {
    id: "event_25", icon: "🗓️", name: "Urgestein", desc: "25 Events besucht", category: "events",
    check: d => d.eventCount >= 25,
    progress: d => ({ current: Math.min(d.eventCount, 25), target: 25 }),
  },
  {
    id: "event_win_1", icon: "🥇", name: "Erster Sieg", desc: "Ein Event gewonnen (1. Platz)", category: "events",
    check: d => (d.eventWins ?? 0) >= 1,
    progress: d => ({ current: Math.min(d.eventWins ?? 0, 1), target: 1 }),
  },
  {
    id: "event_win_5", icon: "🏅", name: "Seriensieger", desc: "5 Events gewonnen", category: "events",
    check: d => (d.eventWins ?? 0) >= 5,
    progress: d => ({ current: Math.min(d.eventWins ?? 0, 5), target: 5 }),
  },
  {
    id: "mvp_1", icon: "⭐", name: "MVP", desc: "Einmal als MVP ausgezeichnet", category: "events",
    check: d => (d.mvpCount ?? 0) >= 1,
    progress: d => ({ current: Math.min(d.mvpCount ?? 0, 1), target: 1 }),
  },
  {
    id: "mvp_3", icon: "🌟", name: "Fan-Liebling", desc: "3× MVP ausgezeichnet", category: "events",
    check: d => (d.mvpCount ?? 0) >= 3,
    progress: d => ({ current: Math.min(d.mvpCount ?? 0, 3), target: 3 }),
  },
  {
    id: "t_1", icon: "⚔️", name: "Turnierkämpfer", desc: "1 Turnier gespielt", category: "turniere",
    check: d => d.tournamentCount >= 1,
    progress: d => ({ current: Math.min(d.tournamentCount, 1), target: 1 }),
  },
  {
    id: "t_win", icon: "🏆", name: "Champion", desc: "Erstes Turnier gewonnen", category: "turniere",
    check: d => d.tournamentWins >= 1,
    progress: d => ({ current: Math.min(d.tournamentWins, 1), target: 1 }),
  },
  {
    id: "t_win_5", icon: "👑", name: "Dynastiegründer", desc: "5 Turniersiege", category: "turniere",
    check: d => d.tournamentWins >= 5,
    progress: d => ({ current: Math.min(d.tournamentWins, 5), target: 5 }),
  },
  {
    id: "pts_500", icon: "⭐", name: "Aufsteiger", desc: "500 Punkte erreicht", category: "punkte",
    check: d => d.points >= 500,
    progress: d => ({ current: Math.min(d.points, 500), target: 500 }),
  },
  {
    id: "pts_2k", icon: "🌟", name: "Erfahren", desc: "2.000 Punkte erreicht", category: "punkte",
    check: d => d.points >= 2000,
    progress: d => ({ current: Math.min(d.points, 2000), target: 2000 }),
  },
  {
    id: "pts_5k", icon: "💫", name: "Elite", desc: "5.000 Punkte erreicht", category: "punkte",
    check: d => d.points >= 5000,
    progress: d => ({ current: Math.min(d.points, 5000), target: 5000 }),
  },
  {
    id: "pts_10k", icon: "✨", name: "Grandmaster", desc: "10.000 Punkte erreicht", category: "punkte",
    check: d => d.points >= 10000,
    progress: d => ({ current: Math.min(d.points, 10000), target: 10000 }),
  },
];

export { BADGE_DEFS };

export function computeBadges(d: BadgeStats, earnedKeys?: Set<string>): Badge[] {
  return BADGE_DEFS.map(def => {
    const earned = earnedKeys ? earnedKeys.has(def.id) : def.check(d);
    return {
      id:       def.id,
      icon:     def.icon,
      name:     def.name,
      desc:     def.desc,
      category: def.category,
      earned,
      progress: !earned && def.progress ? def.progress(d) : undefined,
    };
  });
}

/** Returns badge keys that are newly earned (not in alreadyEarned) */
export function findNewlyEarnedBadges(d: BadgeStats, alreadyEarned: Set<string>): string[] {
  return BADGE_DEFS
    .filter(def => !alreadyEarned.has(def.id) && def.check(d))
    .map(def => def.id);
}

/** Find a badge definition by key */
export function getBadgeDef(key: string): BadgeDef | undefined {
  return BADGE_DEFS.find(d => d.id === key);
}
