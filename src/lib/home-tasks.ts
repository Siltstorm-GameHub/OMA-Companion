// Aufgabenleiste der Startseite ("Heute für dich"): welche offenen Dinge als Chip auftauchen.
// Reine Funktion — getestet in home-tasks.test.ts. Die Tagesumfrage zählt der Aufrufer separat,
// weil sie direkt auf der Startseite aufgeklappt wird.

export type HomeTaskTone = "amber" | "violet" | "orange" | "teal" | "twitch";

export type HomeTask = { key: string; label: string; href: string; tone: HomeTaskTone };

export interface HomeTaskInput {
  loggedIn: boolean;
  spunToday: boolean;
  swipe: { open: number; drop: { open: number } | null } | null;
  clipVotingOpen: boolean;
  clipVoted: boolean;
  /** "Ergebnisse sind da" — kürzlich abgeschlossene Events mit Ergebnis (neuestes zuerst) */
  recentResults: { title: string; href: string }[];
  quests: { title: string; current: number; target: number; completed: boolean }[];
}

/** Ab diesem Fortschritt gilt eine Quest als "fast fertig" und bekommt einen Chip */
export const QUEST_NEAR_DONE = 0.5;

export function buildHomeTasks(input: HomeTaskInput): HomeTask[] {
  if (!input.loggedIn) return [];
  const tasks: HomeTask[] = [];

  if (!input.spunToday) tasks.push({ key: "spin", label: "Glücksrad drehen", href: "/shop#gluecksrad", tone: "amber" });

  if (input.clipVotingOpen && !input.clipVoted) {
    tasks.push({ key: "clip", label: "Clip des Monats wählen", href: "/clip-des-monats", tone: "twitch" });
  }

  const drop = input.swipe?.drop?.open ?? 0;
  if (drop > 0) {
    tasks.push({ key: "swipe", label: `Drop der Woche: ${drop} ${drop === 1 ? "Spiel" : "Spiele"}`, href: "/spiele", tone: "orange" });
  } else if ((input.swipe?.open ?? 0) > 0) {
    const n = input.swipe!.open;
    tasks.push({ key: "swipe", label: `${n} ${n === 1 ? "Spiel" : "Spiele"} in GameSwipe`, href: "/spiele", tone: "orange" });
  }

  const result = input.recentResults[0];
  if (result) {
    const more = input.recentResults.length - 1;
    tasks.push({ key: "results", label: `Ergebnisse: ${result.title}${more > 0 ? ` +${more}` : ""}`, href: result.href, tone: "teal" });
  }

  const near = input.quests
    .filter(q => !q.completed && q.target > 0 && q.current / q.target >= QUEST_NEAR_DONE)
    .sort((a, b) => b.current / b.target - a.current / a.target)[0];
  if (near) {
    tasks.push({ key: "quest", label: `Quest: ${near.title} ${near.current}/${near.target}`, href: "/quests", tone: "teal" });
  }

  return tasks;
}

/** Die Quests, die am nächsten am Ziel sind (offen zuerst, dann nach Fortschritt) */
export function closestQuests<T extends { current: number; target: number; completed: boolean }>(quests: T[], n = 2): T[] {
  return quests
    .filter(q => !q.completed)
    .sort((a, b) => (b.target ? b.current / b.target : 0) - (a.target ? a.current / a.target : 0))
    .slice(0, n);
}
