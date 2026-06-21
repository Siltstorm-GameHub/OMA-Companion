export interface Badge {
  id: string;
  icon: string;
  name: string;
  desc: string;
  earned: boolean;
  category: "community" | "aktivitaet" | "events" | "turniere" | "punkte";
}

export const BADGE_CATEGORY_LABELS: Record<Badge["category"], string> = {
  community:  "Community",
  aktivitaet: "Aktivität",
  events:     "Events",
  turniere:   "Turniere",
  punkte:     "Punkte",
};

export function computeBadges(d: {
  points: number;
  voiceHours: number;
  messageCount: number;
  eventCount: number;
  tournamentCount: number;
  tournamentWins: number;
  eventWins?: number;
  mvpCount?: number;
}): Badge[] {
  const eventWins = d.eventWins ?? 0;
  const mvpCount  = d.mvpCount  ?? 0;
  return [
    { id: "welcome",      icon: "🎉", name: "Willkommen",      desc: "Erstmals angemeldet",            earned: true,                       category: "community"  },
    { id: "voice_1h",     icon: "🎙️", name: "Voice-Fan",       desc: "1 Stunde im Sprachkanal",        earned: d.voiceHours >= 1,          category: "aktivitaet" },
    { id: "voice_10h",    icon: "🎙️", name: "Voice-Veteran",   desc: "10 Stunden im Sprachkanal",      earned: d.voiceHours >= 10,         category: "aktivitaet" },
    { id: "voice_50h",    icon: "🎙️", name: "Voice-Legende",   desc: "50 Stunden im Sprachkanal",      earned: d.voiceHours >= 50,         category: "aktivitaet" },
    { id: "msg_50",       icon: "💬", name: "Gesprächig",      desc: "50 Nachrichten gesendet",        earned: d.messageCount >= 50,       category: "aktivitaet" },
    { id: "msg_500",      icon: "💬", name: "Chatterbox",      desc: "500 Nachrichten gesendet",       earned: d.messageCount >= 500,      category: "aktivitaet" },
    { id: "event_1",      icon: "📅", name: "Teilnehmer",      desc: "1 Event besucht",                earned: d.eventCount >= 1,          category: "events"     },
    { id: "event_5",      icon: "📅", name: "Eventgänger",     desc: "5 Events besucht",               earned: d.eventCount >= 5,          category: "events"     },
    { id: "event_10",     icon: "📅", name: "Stammgast",       desc: "10 Events besucht",              earned: d.eventCount >= 10,         category: "events"     },
    { id: "event_25",     icon: "🗓️", name: "Urgestein",       desc: "25 Events besucht",              earned: d.eventCount >= 25,         category: "events"     },
    { id: "event_win_1",  icon: "🥇", name: "Erster Sieg",     desc: "Ein Event gewonnen (1. Platz)",  earned: eventWins >= 1,             category: "events"     },
    { id: "event_win_5",  icon: "🏅", name: "Seriensieger",    desc: "5 Events gewonnen",              earned: eventWins >= 5,             category: "events"     },
    { id: "mvp_1",        icon: "⭐", name: "MVP",             desc: "Einmal als MVP ausgezeichnet",   earned: mvpCount >= 1,              category: "events"     },
    { id: "mvp_3",        icon: "🌟", name: "Fan-Liebling",    desc: "3× MVP ausgezeichnet",           earned: mvpCount >= 3,              category: "events"     },
    { id: "t_1",          icon: "⚔️", name: "Turnierkämpfer",  desc: "1 Turnier gespielt",             earned: d.tournamentCount >= 1,     category: "turniere"   },
    { id: "t_win",        icon: "🏆", name: "Champion",        desc: "Erstes Turnier gewonnen",        earned: d.tournamentWins >= 1,      category: "turniere"   },
    { id: "t_win_5",      icon: "👑", name: "Dynastiegründer", desc: "5 Turniersiege",                 earned: d.tournamentWins >= 5,      category: "turniere"   },
    { id: "pts_500",      icon: "⭐", name: "Aufsteiger",      desc: "500 Punkte erreicht",            earned: d.points >= 500,            category: "punkte"     },
    { id: "pts_2k",       icon: "🌟", name: "Erfahren",        desc: "2.000 Punkte erreicht",          earned: d.points >= 2000,           category: "punkte"     },
    { id: "pts_5k",       icon: "💫", name: "Elite",           desc: "5.000 Punkte erreicht",          earned: d.points >= 5000,           category: "punkte"     },
    { id: "pts_10k",      icon: "✨", name: "Grandmaster",     desc: "10.000 Punkte erreicht",         earned: d.points >= 10000,          category: "punkte"     },
  ];
}
