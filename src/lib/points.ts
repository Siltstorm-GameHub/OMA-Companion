import { prisma } from "./prisma";

export const POINT_RULES = {
  // Turniere
  TOURNAMENT_WIN:         { amount: 500, reason: "Turniersieg 🏆",          category: "turnier" },
  TOURNAMENT_FINALIST:    { amount: 300, reason: "Turnierfinale erreicht",   category: "turnier" },
  TOURNAMENT_TOP3:        { amount: 200, reason: "Top-3-Platzierung 🥉",     category: "turnier" },
  TOURNAMENT_PARTICIPATE: { amount: 100, reason: "Turnierteilnahme",         category: "turnier" },
  TOURNAMENT_WIN_MATCH:   { amount: 30,  reason: "Match gewonnen",           category: "turnier" },
  // Events
  EVENT_ATTEND:           { amount: 50,  reason: "Event besucht 📅",         category: "event" },
  EVENT_ORGANIZE:         { amount: 150, reason: "Event organisiert",        category: "event" },
  // Discord Aktivität
  VOICE_HOUR:             { amount: 10,  reason: "Stunde im Sprachkanal 🎙", category: "aktivitaet" },
  VOICE_DAILY_BONUS:      { amount: 25,  reason: "Täglich im Voice aktiv",   category: "aktivitaet" },
  MESSAGE_10:             { amount: 5,   reason: "10 Nachrichten gesendet",  category: "aktivitaet" },
  MESSAGE_DAILY_BONUS:    { amount: 15,  reason: "Täglich im Chat aktiv",    category: "aktivitaet" },
  REACTION_RECEIVED:      { amount: 1,   reason: "Reaktion erhalten",        category: "aktivitaet" },
  // Community
  INVITE_MEMBER:          { amount: 100, reason: "Mitglied eingeladen 👥",   category: "community" },
  STREAK_3D:              { amount: 30,  reason: "3-Tage-Streak 🔥",         category: "streak" },
  STREAK_7D:              { amount: 75,  reason: "7-Tage-Streak 🔥🔥",       category: "streak" },
  STREAK_30D:             { amount: 300, reason: "30-Tage-Streak 🔥🔥🔥",    category: "streak" },
  FIRST_LOGIN:            { amount: 50,  reason: "Erstes Login 🎉",          category: "community" },
  BIRTHDAY:               { amount: 100, reason: "Geburtstag 🎂",            category: "community" },
} as const;

export type PointRule = keyof typeof POINT_RULES;
export type PointCategory = "turnier" | "event" | "aktivitaet" | "streak" | "community";

export const CATEGORY_LABELS: Record<PointCategory, string> = {
  turnier:     "Turniere",
  event:       "Events",
  aktivitaet:  "Discord-Aktivität",
  streak:      "Streaks",
  community:   "Community",
};

// Tägliche Caps: verhindert Farming
export const DAILY_CAPS: Partial<Record<PointRule, number>> = {
  VOICE_HOUR:        50,  // max 5 Stunden pro Tag gewertet
  MESSAGE_10:        25,  // max 50 Nachrichten pro Tag gewertet
  REACTION_RECEIVED: 10,
};

export function getLevel(points: number): number {
  if (points < 500)  return Math.max(1, Math.floor(points / 100) + 1);
  if (points < 2000) return Math.floor((points - 500) / 300) + 6;
  if (points < 5000) return Math.floor((points - 2000) / 150) + 11;
  return Math.floor((points - 5000) / 200) + 21;
}

export function getRank(points: number): { label: string; color: string } {
  if (points >= 10000) return { label: "Grandmaster", color: "text-red-400" };
  if (points >= 5000)  return { label: "Legende",     color: "text-amber-400" };
  if (points >= 2000)  return { label: "Elite",       color: "text-purple-400" };
  if (points >= 500)   return { label: "Kämpfer",     color: "text-blue-400" };
  return                      { label: "Neuling",     color: "text-gray-400" };
}

export function getNextLevelPoints(points: number): number {
  const lvl = getLevel(points);
  if (lvl < 6)  return lvl * 100;
  if (lvl < 11) return 500 + (lvl - 5) * 300;
  if (lvl < 21) return 2000 + (lvl - 10) * 150;
  return 5000 + (lvl - 20) * 200;
}

export function getLevelProgress(points: number): number {
  const current = getNextLevelPoints(points - 1);
  const next = getNextLevelPoints(points);
  const prev = getNextLevelPoints(points) - (next - current);
  return Math.round(((points - prev) / (next - prev)) * 100);
}

export async function awardPoints(userId: string, rule: PointRule, customReason?: string) {
  const { amount, reason } = POINT_RULES[rule];

  // Täglichen Cap prüfen
  const cap = DAILY_CAPS[rule];
  if (cap !== undefined) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySum = await prisma.pointTransaction.aggregate({
      where: { userId, reason, createdAt: { gte: today } },
      _sum: { amount: true },
    });
    if ((todaySum._sum.amount ?? 0) >= cap) return null; // Cap erreicht
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { points: true } });
  if (!user) return null;

  const newPoints = user.points + amount;
  const newLevel = getLevel(newPoints);
  const leveledUp = newLevel > getLevel(user.points);

  const [transaction, updated] = await prisma.$transaction([
    prisma.pointTransaction.create({
      data: { userId, amount, reason: customReason ?? reason },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { points: newPoints, level: newLevel },
      select: { id: true, points: true, level: true },
    }),
  ]);

  return { transaction, user: updated, leveledUp };
}

// Streak prüfen und ggf. Bonus vergeben
export async function checkAndAwardStreak(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streak: true, lastActiveAt: true },
  });
  if (!user) return;

  const now = new Date();
  const last = user.lastActiveAt;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  let newStreak = user.streak;

  if (!last || last < yesterday) {
    newStreak = 1; // Streak gebrochen oder erster Tag
  } else if (last >= yesterday && last < today) {
    newStreak = user.streak + 1; // Streak verlängert
  } else {
    return; // Heute schon gezählt
  }

  await prisma.user.update({
    where: { id: userId },
    data: { streak: newStreak, lastActiveAt: now },
  });

  if (newStreak === 3)  await awardPoints(userId, "STREAK_3D");
  if (newStreak === 7)  await awardPoints(userId, "STREAK_7D");
  if (newStreak === 30) await awardPoints(userId, "STREAK_30D");
}
