import { prisma } from "./prisma";

// ─── Punkt-Regeln ──────────────────────────────────────────────────────────
export const POINT_RULES = {
  // Turniere
  TOURNAMENT_WIN:         { amount: 1000, reason: "Turniersieg 🏆",          category: "turnier" },
  TOURNAMENT_FINALIST:    { amount:  600, reason: "Turnierfinale erreicht",   category: "turnier" },
  TOURNAMENT_TOP3:        { amount:  350, reason: "Top-3-Platzierung 🥉",     category: "turnier" },
  TOURNAMENT_PARTICIPATE: { amount:  175, reason: "Turnierteilnahme",         category: "turnier" },
  TOURNAMENT_WIN_MATCH:   { amount:   60, reason: "Match gewonnen",           category: "turnier" },
  // Events — Anmeldung gibt nur Münzen (keine rankPoints)
  EVENT_ATTEND:           { amount:   80, reason: "Event besucht 📅",         category: "aktivitaet" },
  EVENT_ORGANIZE:         { amount:  200, reason: "Event organisiert",        category: "aktivitaet" },
  // Discord-Aktivität
  VOICE_HOUR:             { amount:   15, reason: "Stunde im Sprachkanal 🎙", category: "aktivitaet" },
  VOICE_DAILY_BONUS:      { amount:   30, reason: "Täglich im Voice aktiv",   category: "aktivitaet" },
  MESSAGE_10:             { amount:    8, reason: "10 Nachrichten gesendet",  category: "aktivitaet" },
  MESSAGE_DAILY_BONUS:    { amount:   20, reason: "Täglich im Chat aktiv",    category: "aktivitaet" },
  REACTION_RECEIVED:      { amount:    2, reason: "Reaktion erhalten",        category: "aktivitaet" },
  // Community
  INVITE_MEMBER:          { amount:  150, reason: "Mitglied eingeladen 👥",   category: "community" },
  STREAK_3D:              { amount:   60, reason: "3-Tage-Streak 🔥",         category: "streak" },
  STREAK_7D:              { amount:  200, reason: "7-Tage-Streak 🔥🔥",       category: "streak" },
  STREAK_30D:             { amount:  750, reason: "30-Tage-Streak 🔥🔥🔥",    category: "streak" },
  STREAK_100D:            { amount: 3000, reason: "100-Tage-Streak 👑",       category: "streak" },
  FIRST_LOGIN:            { amount:  100, reason: "Erstes Login 🎉",          category: "community" },
  BIRTHDAY:               { amount:  150, reason: "Geburtstag 🎂",            category: "community" },
} as const;

export type PointRule     = keyof typeof POINT_RULES;
export type PointCategory = "turnier" | "event" | "aktivitaet" | "streak" | "community";

// Kategorien die auch rankPoints vergeben
const RANK_POINT_CATEGORIES = new Set<PointCategory>(["turnier", "event"]);

export const CATEGORY_LABELS: Record<PointCategory, string> = {
  turnier:     "Turniere",
  event:       "Events",
  aktivitaet:  "Discord-Aktivität",
  streak:      "Streaks",
  community:   "Community",
};

// Tägliche Caps: verhindert Farming
export const DAILY_CAPS: Partial<Record<PointRule, number>> = {
  VOICE_HOUR:        90,  // max 6 Stunden/Tag gewertet
  MESSAGE_10:        40,  // max 50 Nachrichten/Tag gewertet
  REACTION_RECEIVED: 20,
};

// ─── Punkte vergeben ───────────────────────────────────────────────────────
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
    if ((todaySum._sum.amount ?? 0) >= cap) return null;
  }

  // Geburtstags-Boost: 2x Punkte wenn aktiv
  const userBoost = await prisma.user.findUnique({ where: { id: userId }, select: { birthdayBoostUntil: true } });
  const hasBirthdayBoost = userBoost?.birthdayBoostUntil && userBoost.birthdayBoostUntil > new Date();
  const finalAmount = hasBirthdayBoost ? amount * 2 : amount;

  const givesRankPoints = RANK_POINT_CATEGORIES.has(POINT_RULES[rule].category as PointCategory);

  const [transaction, updated] = await prisma.$transaction([
    prisma.pointTransaction.create({
      data: { userId, amount: finalAmount, reason: (customReason ?? reason) + (hasBirthdayBoost ? " 🎂×2" : "") },
    }),
    prisma.user.update({
      where:  { id: userId },
      data:   {
        points:     { increment: finalAmount },
        ...(givesRankPoints && { rankPoints: { increment: finalAmount } }),
      },
      select: { id: true, points: true, rankPoints: true },
    }),
  ]);

  return { transaction, user: updated };
}

// ─── Streak prüfen ─────────────────────────────────────────────────────────
export async function checkAndAwardStreak(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streak: true, lastActiveAt: true },
  });
  if (!user) return;

  const now       = new Date();
  const last      = user.lastActiveAt;
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(0, 0, 0, 0);
  const today     = new Date(now); today.setHours(0, 0, 0, 0);

  let newStreak = user.streak;

  if (!last || last < yesterday) {
    newStreak = 1;
  } else if (last >= yesterday && last < today) {
    newStreak = user.streak + 1;
  } else {
    return;
  }

  await prisma.user.update({ where: { id: userId }, data: { streak: newStreak, lastActiveAt: now } });

  if (newStreak === 3)   await awardPoints(userId, "STREAK_3D");
  if (newStreak === 7)   await awardPoints(userId, "STREAK_7D");
  if (newStreak === 30)  await awardPoints(userId, "STREAK_30D");
  if (newStreak === 100) await awardPoints(userId, "STREAK_100D");
}
