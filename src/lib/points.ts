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
  FIRST_LOGIN:            { amount:  100, reason: "Erstes Login 🎉",          category: "community" },
  BIRTHDAY:               { amount:  150, reason: "Geburtstag 🎂",            category: "community" },
} as const;

export type PointRule     = keyof typeof POINT_RULES;
export type PointCategory = "turnier" | "event" | "aktivitaet" | "community";

// Kategorien die auch rankPoints vergeben
const RANK_POINT_CATEGORIES = new Set<PointCategory>(["turnier", "event"]);

export const CATEGORY_LABELS: Record<PointCategory, string> = {
  turnier:     "Turniere",
  event:       "Events",
  aktivitaet:  "Discord-Aktivität",
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

