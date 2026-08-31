import { prisma } from "./prisma";
import { syncDiscordRole } from "./discord-roles";

// ─── Punkt-Regeln ──────────────────────────────────────────────────────────
export const POINT_RULES = {
  // Turnierplatzierungen → geben rankPoints (Rang-Währung)
  TOURNAMENT_WIN:         { amount: 1000, reason: "Turniersieg 🏆",          category: "turnier" },
  TOURNAMENT_FINALIST:    { amount:  600, reason: "Turnierfinale erreicht",   category: "turnier" },
  TOURNAMENT_TOP3:        { amount:  350, reason: "Top-3-Platzierung 🥉",     category: "turnier" },
  // Turnierteilnahme → nur Münzen (keine rankPoints)
  TOURNAMENT_PARTICIPATE: { amount:  175, reason: "Turnierteilnahme",         category: "aktivitaet" },
  TOURNAMENT_WIN_MATCH:   { amount:   60, reason: "Match gewonnen",           category: "aktivitaet" },
  // Events — nur Münzen (keine rankPoints)
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
  // Profil vervollständigen — je erledigtem Punkt einmalig, siehe lib/profile-completion.ts
  PROFILE_BIO:             { amount:  500, reason: "Profil: Bio ausgefüllt",          category: "community" },
  PROFILE_BIRTHDAY:        { amount:  500, reason: "Profil: Geburtstag hinterlegt",   category: "community" },
  PROFILE_BANNER:          { amount:  500, reason: "Profil: Banner hochgeladen",      category: "community" },
  PROFILE_TWITCH:          { amount:  500, reason: "Profil: Twitch-Kanal verknüpft",  category: "community" },
  PROFILE_FAVORITE_GAMES:  { amount:  500, reason: "Profil: Lieblingsspiele gewählt", category: "community" },
} as const;

export type PointRule     = keyof typeof POINT_RULES;
export type PointCategory = "turnier" | "aktivitaet" | "community";

// ─── Begründungs-Format ────────────────────────────────────────────────────
// Jede Vergabe schreibt eine PointTransaction, deren `reason` sich aus Währungs-Präfix,
// der eigentlichen Begründung und optional dem Geburtstags-Suffix zusammensetzt:
//   "[Münzen] Stunde im Sprachkanal 🎙"        (normal)
//   "[Münzen] Stunde im Sprachkanal 🎙 🎂×2"   (mit Geburtstags-Boost)
// Wer später auf diese Transaktionen zurückgreift (Tages-Caps, Dedupe, Rückbuchung),
// MUSS über reasonVariants() gehen — ein Vergleich mit der nackten Begründung trifft nie.
export const COIN_PREFIX     = "[Münzen]";
export const RANK_PREFIX     = "[Rang-Punkte]";
const BIRTHDAY_SUFFIX        = "🎂×2";

/** Beide möglichen gespeicherten Begründungen einer Vergabe (ohne/mit Geburtstags-Boost). */
export function reasonVariants(prefix: string, baseReason: string): string[] {
  return [`${prefix} ${baseReason}`, `${prefix} ${baseReason} ${BIRTHDAY_SUFFIX}`];
}

// Nur Turnierplatzierungen (1./2./3. Platz) geben rankPoints
// Alles andere (Teilnahme, Events, Discord-Aktivität, Spin, Quests) gibt nur Münzen
const RANK_POINT_CATEGORIES = new Set<PointCategory>(["turnier"]);

export const CATEGORY_LABELS: Record<PointCategory, string> = {
  turnier:    "Turnierplatzierungen",
  aktivitaet: "Events & Discord-Aktivität",
  community:  "Community",
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
      where: { userId, reason: { in: reasonVariants(COIN_PREFIX, reason) }, createdAt: { gte: today } },
      _sum: { amount: true },
    });
    if ((todaySum._sum.amount ?? 0) >= cap) return null;
  }

  // Punkte VOR der Vergabe lesen (für Rang-Wechsel-Erkennung im Bot)
  const before = await prisma.user.findUnique({
    where:  { id: userId },
    select: { points: true, rankPoints: true, birthdayBoostUntil: true, discordId: true },
  });
  const pointsBefore   = before?.points     ?? 0;
  const rankPointsBefore = before?.rankPoints ?? 0;

  // Geburtstags-Boost: 2x Punkte wenn aktiv
  const hasBirthdayBoost = before?.birthdayBoostUntil && before.birthdayBoostUntil > new Date();
  const finalAmount = hasBirthdayBoost ? amount * 2 : amount;

  const givesRankPoints = RANK_POINT_CATEGORIES.has(POINT_RULES[rule].category as PointCategory);

  const fullReason = (customReason ?? reason) + (hasBirthdayBoost ? ` ${BIRTHDAY_SUFFIX}` : "");

  const results = await prisma.$transaction([
    prisma.pointTransaction.create({
      data: { userId, amount: finalAmount, reason: `${COIN_PREFIX} ${fullReason}` },
    }),
    ...(givesRankPoints ? [prisma.pointTransaction.create({
      data: { userId, amount: finalAmount, reason: `${RANK_PREFIX} ${fullReason}` },
    })] : []),
    prisma.user.update({
      where:  { id: userId },
      data:   {
        points:     { increment: finalAmount },
        ...(givesRankPoints && { rankPoints: { increment: finalAmount } }),
      },
      select: { id: true, points: true, rankPoints: true },
    }),
  ]);

  const transaction = results[0] as { id: string; userId: string; amount: number; reason: string; createdAt: Date };
  const updated     = results[results.length - 1] as { id: string; points: number; rankPoints: number };

  // Discord-Rolle synchronisieren wenn rankPoints sich geändert haben
  if (givesRankPoints) {
    syncDiscordRole(userId, before?.discordId, rankPointsBefore, updated.rankPoints).catch(() => {});
  }

  return { transaction, user: updated, pointsBefore };
}

/**
 * Wurde diese Regel heute für den User bereits vergeben?
 * Für Boni, die pro Kalendertag nur einmal fällig sind (Tages-Boni). Prüft gegen die
 * PointTransactions statt gegen In-Memory-Zähler, damit ein Bot-Neustart keine
 * Doppelvergabe auslöst.
 */
export async function awardedToday(userId: string, rule: PointRule): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const existing = await prisma.pointTransaction.findFirst({
    where: {
      userId,
      reason:    { in: reasonVariants(COIN_PREFIX, POINT_RULES[rule].reason) },
      createdAt: { gte: today },
    },
    select: { id: true },
  });
  return existing !== null;
}

/** Wurde diese Regel für den User jemals vergeben? Für einmalige Boni (z.B. FIRST_LOGIN). */
export async function everAwarded(userId: string, rule: PointRule): Promise<boolean> {
  const existing = await prisma.pointTransaction.findFirst({
    where: { userId, reason: { in: reasonVariants(COIN_PREFIX, POINT_RULES[rule].reason) } },
    select: { id: true },
  });
  return existing !== null;
}

/**
 * Bucht eine frühere Vergabe exakt zurück — anhand der tatsächlich geschriebenen
 * Transaktionen, nicht anhand der heutigen Regel-Konfiguration. Dadurch stimmt die
 * Rückbuchung auch dann, wenn Beträge zwischenzeitlich geändert wurden oder beim
 * Vergeben ein Geburtstags-Boost (×2) aktiv war.
 *
 * `baseReason` ist die Begründung OHNE Währungs-Präfix und ohne Boost-Suffix, also
 * genau das, was als `customReason` an awardPoints() übergeben wurde.
 *
 * Gibt zurück, wie viel tatsächlich zurückgebucht wurde.
 */
export async function revokePointsByReason(userId: string, baseReason: string) {
  const txns = await prisma.pointTransaction.findMany({
    where: {
      userId,
      amount: { gt: 0 },
      reason: { in: [...reasonVariants(COIN_PREFIX, baseReason), ...reasonVariants(RANK_PREFIX, baseReason)] },
    },
    select: { amount: true, reason: true },
  });
  if (txns.length === 0) return { coins: 0, rankPoints: 0 };

  let coins = 0;
  let rankPoints = 0;
  for (const t of txns) {
    if (t.reason.startsWith(COIN_PREFIX)) coins += t.amount;
    else rankPoints += t.amount;
  }

  const correctionReason = `[Korrektur] ${baseReason}`;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        ...(coins      !== 0 && { points:     { increment: -coins      } }),
        ...(rankPoints !== 0 && { rankPoints: { increment: -rankPoints } }),
      },
    }),
    ...(coins !== 0 ? [prisma.pointTransaction.create({
      data: { userId, amount: -coins, reason: `${COIN_PREFIX} ${correctionReason}` },
    })] : []),
    ...(rankPoints !== 0 ? [prisma.pointTransaction.create({
      data: { userId, amount: -rankPoints, reason: `${RANK_PREFIX} ${correctionReason}` },
    })] : []),
  ]);

  return { coins, rankPoints };
}

