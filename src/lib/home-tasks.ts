// Aufgaben-Karte der Startseite ("Heute für dich"): welche offenen Dinge als Kachel auftauchen,
// jeweils mit Unterzeile (was es bringt oder bis wann). Reine Funktion — getestet in
// home-tasks.test.ts. Die Tagesumfrage ist keine Kachel, sie steht immer direkt aufgeklappt auf
// der Startseite (HomeTaskBar → DailyPollBanner).

export type HomeTaskTone = "amber" | "violet" | "orange" | "teal" | "twitch";

export type HomeTask = {
  key: "spin" | "clip" | "swipe" | "results" | "quest";
  /** Kurzer Titel der Kachel */
  label: string;
  /** Zweite Zeile: Nutzen oder Frist */
  sub: string;
  href: string;
  tone: HomeTaskTone;
  /** Höchstens zu holende Münzen (für "bis zu … Münzen" im Kopf) */
  coins?: number;
  /** Fortschritt 0–1 (Quest) */
  progress?: number;
  /** Wegklickbar: diese Event-IDs werden beim ✕ ausgeblendet (Cookie RESULTS_HIDE_COOKIE) */
  dismissIds?: string[];
};

/** Cookie mit den Event-IDs, deren "Ergebnisse sind da"-Erinnerung weggeklickt wurde (kommagetrennt) */
export const RESULTS_HIDE_COOKIE = "home_results_hidden";
/** Höchstens so viele IDs merken — ältere Events fallen ohnehin aus "kürzlich beendet" raus */
export const RESULTS_HIDE_MAX = 30;

export function parseHiddenResults(value: string | null | undefined): string[] {
  if (!value) return [];
  try { value = decodeURIComponent(value); } catch { /* roh verwenden */ }
  return value.split(",").map(s => s.trim()).filter(Boolean).slice(-RESULTS_HIDE_MAX);
}

/** Neue Cookie-Liste: bisherige + neue IDs, ohne Duplikate, auf RESULTS_HIDE_MAX gekürzt */
export function addHiddenResults(current: string[], ids: string[]): string[] {
  return [...current.filter(id => !ids.includes(id)), ...ids].slice(-RESULTS_HIDE_MAX);
}

export interface HomeTaskInput {
  loggedIn: boolean;
  spunToday: boolean;
  /** Höchster Münz-Gewinn am Glücksrad (aus der Shop-Konfiguration) */
  spinMaxCoins?: number;
  swipe: { open: number; drop: { open: number } | null } | null;
  clipVotingOpen: boolean;
  clipVoted: boolean;
  /** Ende des Clip-Votings (für "endet in 2 Tagen") */
  clipVotingEndsAt?: string | Date | null;
  /** "Ergebnisse sind da" — kürzlich abgeschlossene Events mit Ergebnis (neuestes zuerst) */
  recentResults: { id: string; title: string; href: string }[];
  /** Weggeklickte Ergebnis-Erinnerungen (Event-IDs) */
  hiddenResultIds?: string[];
  quests: { title: string; current: number; target: number; completed: boolean; reward?: number }[];
  /** Bezugszeitpunkt für Fristen (ms) */
  now?: number;
}

/** Ab diesem Fortschritt gilt eine Quest als "fast fertig" und bekommt eine Kachel */
export const QUEST_NEAR_DONE = 0.5;

/** "endet heute", "endet morgen", "endet in 3 Tagen" */
export function endsIn(end: string | Date, now: number): string {
  const ms = new Date(end).getTime() - now;
  const h = Math.ceil(ms / 3_600_000);
  if (h <= 0) return "endet jetzt";
  if (h < 24) return `endet in ${h} Std`;
  const d = Math.round(h / 24);
  return d === 1 ? "endet morgen" : `endet in ${d} Tagen`;
}

export function buildHomeTasks(input: HomeTaskInput): HomeTask[] {
  if (!input.loggedIn) return [];
  const tasks: HomeTask[] = [];
  const now = input.now ?? Date.now();

  if (!input.spunToday) {
    const max = input.spinMaxCoins ?? 0;
    tasks.push({
      key: "spin", label: "Glücksrad drehen", href: "/shop#gluecksrad", tone: "amber",
      sub: max > 0 ? `Täglich gratis · bis ${max} Münzen` : "Täglich gratis",
      ...(max > 0 ? { coins: max } : {}),
    });
  }

  if (input.clipVotingOpen && !input.clipVoted) {
    tasks.push({
      key: "clip", label: "Clip des Monats wählen", href: "/clip-des-monats", tone: "twitch",
      sub: input.clipVotingEndsAt ? `Voting ${endsIn(input.clipVotingEndsAt, now)}` : "Deine Stimme zählt",
    });
  }

  const drop = input.swipe?.drop?.open ?? 0;
  if (drop > 0) {
    tasks.push({ key: "swipe", label: "Drop der Woche", sub: `${drop} neue${drop === 1 ? "s Spiel" : " Spiele"} swipen`, href: "/spiele", tone: "orange" });
  } else if ((input.swipe?.open ?? 0) > 0) {
    const n = input.swipe!.open;
    tasks.push({ key: "swipe", label: "GameSwipe", sub: `${n} ${n === 1 ? "Spiel" : "Spiele"} bewerten`, href: "/spiele", tone: "orange" });
  }

  const hidden = new Set(input.hiddenResultIds ?? []);
  const results = input.recentResults.filter(r => !hidden.has(r.id));
  const result = results[0];
  if (result) {
    const more = results.length - 1;
    tasks.push({
      key: "results", label: "Ergebnisse sind da", href: result.href, tone: "teal",
      sub: `${result.title}${more > 0 ? ` +${more} weitere` : ""}`,
      // ✕ blendet alle Ergebnisse aus, auf die die Kachel gerade hinweist
      dismissIds: results.map(r => r.id),
    });
  }

  const near = input.quests
    .filter(q => !q.completed && q.target > 0 && q.current / q.target >= QUEST_NEAR_DONE)
    .sort((a, b) => b.current / b.target - a.current / a.target)[0];
  if (near) {
    tasks.push({
      key: "quest", label: "Quest fast geschafft", href: "/quests", tone: "violet",
      sub: `${near.title} ${near.current}/${near.target}${near.reward ? ` · +${near.reward}` : ""}`,
      progress: Math.min(1, near.current / near.target),
      ...(near.reward ? { coins: near.reward } : {}),
    });
  }

  return tasks;
}

/** Summe der zu holenden Münzen (Kopf der Karte) */
export const homeTaskCoins = (tasks: HomeTask[]) => tasks.reduce((s, t) => s + (t.coins ?? 0), 0);

/** Die Quests, die am nächsten am Ziel sind (offen zuerst, dann nach Fortschritt) */
export function closestQuests<T extends { current: number; target: number; completed: boolean }>(quests: T[], n = 2): T[] {
  return quests
    .filter(q => !q.completed)
    .sort((a, b) => (b.target ? b.current / b.target : 0) - (a.target ? a.current / a.target : 0))
    .slice(0, n);
}
