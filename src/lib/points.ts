import { prisma } from "./prisma";

// ─── Punkt-Regeln ──────────────────────────────────────────────────────────
export const POINT_RULES = {
  // Turniere
  TOURNAMENT_WIN:         { amount: 1000, reason: "Turniersieg 🏆",          category: "turnier" },
  TOURNAMENT_FINALIST:    { amount:  600, reason: "Turnierfinale erreicht",   category: "turnier" },
  TOURNAMENT_TOP3:        { amount:  350, reason: "Top-3-Platzierung 🥉",     category: "turnier" },
  TOURNAMENT_PARTICIPATE: { amount:  175, reason: "Turnierteilnahme",         category: "turnier" },
  TOURNAMENT_WIN_MATCH:   { amount:   60, reason: "Match gewonnen",           category: "turnier" },
  // Events
  EVENT_ATTEND:           { amount:   80, reason: "Event besucht 📅",         category: "event" },
  EVENT_ORGANIZE:         { amount:  200, reason: "Event organisiert",        category: "event" },
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

// ─── Level-System ──────────────────────────────────────────────────────────
// Brackets sind exakt auf Rang-Schwellen ausgerichtet:
//   L1-5:   100 Pts/Level  →  0 – 499      (Neuling)
//   L6-15:  250 Pts/Level  →  500 – 2.999  (Kämpfer)
//   L16-25: 700 Pts/Level  →  3.000 – 9.999 (Veteran)
//   L26-35: 1500 Pts/Level →  10.000 – 24.999 (Elite)
//   L36-45: 3500 Pts/Level →  25.000 – 59.999 (Legende)
//   L46+:  10000 Pts/Level →  60.000+        (Grandmaster)

export function getLevel(points: number): number {
  if (points < 500)   return Math.max(1, Math.floor(points / 100) + 1);
  if (points < 3000)  return Math.floor((points - 500)   / 250)   + 6;
  if (points < 10000) return Math.floor((points - 3000)  / 700)   + 16;
  if (points < 25000) return Math.floor((points - 10000) / 1500)  + 26;
  if (points < 60000) return Math.floor((points - 25000) / 3500)  + 36;
  return                     Math.floor((points - 60000) / 10000) + 46;
}

/** Gesamtpunkte die benötigt werden um das nächste Level zu erreichen */
export function getNextLevelPoints(points: number): number {
  const lvl = getLevel(points);
  if (lvl < 6)  return lvl * 100;
  if (lvl < 16) return 500   + (lvl - 5)  * 250;
  if (lvl < 26) return 3000  + (lvl - 15) * 700;
  if (lvl < 36) return 10000 + (lvl - 25) * 1500;
  if (lvl < 46) return 25000 + (lvl - 35) * 3500;
  return               60000 + (lvl - 45) * 10000;
}

// ─── Rang-System ───────────────────────────────────────────────────────────
export function getRank(points: number): { label: string; color: string } {
  if (points >= 60000) return { label: "Grandmaster", color: "text-red-400" };
  if (points >= 25000) return { label: "Legende",     color: "text-amber-400" };
  if (points >= 10000) return { label: "Elite",       color: "text-purple-400" };
  if (points >= 3000)  return { label: "Veteran",     color: "text-blue-400" };
  if (points >= 500)   return { label: "Kämpfer",     color: "text-emerald-400" };
  return                      { label: "Neuling",     color: "text-gray-400" };
}

/** Gesamtpunkte am Beginn des aktuellen Levels (untere Grenze) */
export function getLevelStartPoints(points: number): number {
  const lvl = getLevel(points);
  if (lvl <= 1)  return 0;
  if (lvl <= 5)  return (lvl - 1) * 100;
  if (lvl <= 15) return 500  + (lvl - 6)  * 250;
  if (lvl <= 25) return 3000 + (lvl - 16) * 700;
  if (lvl <= 35) return 10000 + (lvl - 26) * 1500;
  if (lvl <= 45) return 25000 + (lvl - 36) * 3500;
  return               60000 + (lvl - 46) * 10000;
}

export function getLevelProgress(points: number): number {
  const lvlMin = getLevelStartPoints(points);
  const lvlMax = getNextLevelPoints(points);
  if (lvlMax <= lvlMin) return 100;
  return Math.min(100, Math.round(((points - lvlMin) / (lvlMax - lvlMin)) * 100));
}

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

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { points: true } });
  if (!user) return null;

  const newPoints = user.points + amount;
  const newLevel  = getLevel(newPoints);
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
    newStreak = 1; // Streak gebrochen oder erster Tag
  } else if (last >= yesterday && last < today) {
    newStreak = user.streak + 1; // Streak verlängert
  } else {
    return; // Heute schon gezählt
  }

  await prisma.user.update({
    where:  { id: userId },
    data:   { streak: newStreak, lastActiveAt: now },
  });

  if (newStreak === 3)   await awardPoints(userId, "STREAK_3D");
  if (newStreak === 7)   await awardPoints(userId, "STREAK_7D");
  if (newStreak === 30)  await awardPoints(userId, "STREAK_30D");
  if (newStreak === 100) await awardPoints(userId, "STREAK_100D");
}
