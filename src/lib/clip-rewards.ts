import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

/**
 * Zuordnung von Clip-Erstellern (Twitch) zu Community-Konten für Clip des Monats / des Jahres.
 *
 * Quellen, in dieser Reihenfolge:
 *  1. Twitch-User-ID (bleibt bei Umbenennung gleich) — User.twitchUserId bzw. TwitchClipperLink
 *  2. Twitch-Login — User.twitchLogin (Profil) bzw. TwitchClipperLink (von Admins verknüpft)
 *
 * Findet sich kein Konto, wird die Belohnung als PendingClipReward vorgemerkt und automatisch
 * ausgezahlt, sobald jemand den Twitch-Account im Profil hinterlegt oder ein Admin ihn verknüpft.
 */

export type TwitchIdentity = { login: string | null; id: string | null };

const norm = (login: string | null | undefined) => login?.trim().toLowerCase() || null;

/** Login-Treffer nur zulassen, wenn die gespeicherte ID nicht widerspricht (Login nach Umbenennung neu vergeben). */
const idCompatible = (storedId: string | null, id: string | null) => !id || !storedId || storedId === id;

export async function findUserForTwitch({ login, id }: TwitchIdentity): Promise<string | null> {
  const lower = norm(login);

  if (id) {
    const byId = await prisma.user.findUnique({ where: { twitchUserId: id }, select: { id: true, deletedAt: true } });
    if (byId && !byId.deletedAt) return byId.id;
    const linkById = await prisma.twitchClipperLink.findUnique({ where: { twitchUserId: id }, select: { userId: true } });
    if (linkById) return linkById.userId;
  }
  if (!lower) return null;

  const byLogin = await prisma.user.findUnique({
    where: { twitchLogin: lower },
    select: { id: true, twitchUserId: true, deletedAt: true },
  });
  if (byLogin && !byLogin.deletedAt && idCompatible(byLogin.twitchUserId, id)) {
    // ID nachtragen, damit der nächste Abgleich auch nach einer Umbenennung klappt
    if (id && !byLogin.twitchUserId) {
      await prisma.user.update({ where: { id: byLogin.id }, data: { twitchUserId: id } }).catch(() => {});
    }
    return byLogin.id;
  }

  const linkByLogin = await prisma.twitchClipperLink.findUnique({ where: { twitchLogin: lower } });
  if (linkByLogin && idCompatible(linkByLogin.twitchUserId, id)) {
    if (id && !linkByLogin.twitchUserId) {
      await prisma.twitchClipperLink.update({ where: { id: linkByLogin.id }, data: { twitchUserId: id } }).catch(() => {});
    }
    return linkByLogin.userId;
  }

  return null;
}

/** Bucht die Sieger-Münzen — höchstens einmal pro User und Grund (z.B. bei Gleichstand mehrerer eigener Clips). */
export async function awardClipReward(userId: string, amount: number, reason: string): Promise<boolean> {
  const already = await prisma.pointTransaction.findFirst({ where: { userId, reason }, select: { id: true } });
  if (already) return false;
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { points: { increment: amount } } }),
    prisma.pointTransaction.create({ data: { userId, amount, reason } }),
  ]);
  return true;
}

export async function recordPendingClipReward(data: {
  contestKind: "monthly" | "yearly";
  contestId: string;
  nominationId: string;
  twitchLogin: string;
  twitchUserId: string | null;
  amount: number;
  reason: string;
}) {
  // Unique (contestKind, contestId, twitchLogin): bei Gleichstand mehrerer Clips desselben Erstellers nur einmal.
  await prisma.pendingClipReward.createMany({
    data: [{ ...data, twitchLogin: data.twitchLogin.toLowerCase() }],
    skipDuplicates: true,
  });
}

/**
 * Zahlt alle vorgemerkten Clip-Belohnungen aus, die zu den Twitch-Accounts dieses Users passen
 * (Profil-Twitch + Admin-Verknüpfungen). Gibt Anzahl und Summe der ausgezahlten Belohnungen zurück.
 */
export async function claimPendingClipRewards(userId: string): Promise<{ claimed: number; coins: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twitchLogin: true,
      twitchUserId: true,
      deletedAt: true,
      twitchClipperLinks: { select: { twitchLogin: true, twitchUserId: true } },
    },
  });
  if (!user || user.deletedAt) return { claimed: 0, coins: 0 };

  const identities: TwitchIdentity[] = [
    { login: norm(user.twitchLogin), id: user.twitchUserId },
    ...user.twitchClipperLinks.map((l) => ({ login: norm(l.twitchLogin), id: l.twitchUserId })),
  ].filter((i) => i.login || i.id);
  if (identities.length === 0) return { claimed: 0, coins: 0 };

  const ids = identities.map((i) => i.id).filter((v): v is string => !!v);
  const logins = identities.map((i) => i.login).filter((v): v is string => !!v);

  const candidates = await prisma.pendingClipReward.findMany({
    where: {
      claimedAt: null,
      OR: [
        ...(ids.length ? [{ twitchUserId: { in: ids } }] : []),
        ...(logins.length ? [{ twitchLogin: { in: logins } }] : []),
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  const matches = candidates.filter((r) =>
    (r.twitchUserId && ids.includes(r.twitchUserId)) ||
    identities.some((i) => i.login === r.twitchLogin && idCompatible(i.id, r.twitchUserId)),
  );

  let claimed = 0;
  let coins = 0;
  for (const reward of matches) {
    const paid = await prisma.$transaction(async (tx) => {
      // Gegen doppelte Auszahlung bei parallelen Aufrufen: nur wer den Eintrag tatsächlich umstellt, zahlt.
      const res = await tx.pendingClipReward.updateMany({
        where: { id: reward.id, claimedAt: null },
        data: { claimedAt: new Date(), claimedByUserId: userId },
      });
      if (res.count === 0) return false;

      // Gewinner-Clip dem Konto zuordnen (Anzeige im Admin-Bereich und auf den Clip-Seiten)
      await tx.clipNomination.updateMany({
        where: { id: reward.nominationId, submittedByUserId: null },
        data: { submittedByUserId: userId },
      });

      const already = await tx.pointTransaction.findFirst({ where: { userId, reason: reward.reason }, select: { id: true } });
      if (already) return false;
      await tx.user.update({ where: { id: userId }, data: { points: { increment: reward.amount } } });
      await tx.pointTransaction.create({ data: { userId, amount: reward.amount, reason: reward.reason } });
      return true;
    });

    if (paid) {
      claimed++;
      coins += reward.amount;
      await createNotification(userId, {
        type: "coins",
        title: "🏆 Clip-Belohnung gutgeschrieben",
        body: `${reward.amount} Münzen für deinen Gewinner-Clip (${reward.reason.replace(/^\[Münzen\]\s*/, "")}).`,
        url: reward.contestKind === "yearly" ? "/clip-des-jahres" : "/clip-des-monats",
      });
    }
  }

  return { claimed, coins };
}

/**
 * Admin-Verknüpfung dauerhaft merken: Twitch-Account → User. Ist der Login bereits einem anderen
 * Konto zugeordnet (Profil oder frühere Verknüpfung), wird abgebrochen statt umgehängt.
 */
export async function rememberTwitchLink(
  userId: string,
  { login, id }: TwitchIdentity,
  createdById: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const lower = norm(login);
  if (!lower) return { ok: false, error: "Kein Twitch-Login vorhanden" };

  const existingUserId = await findUserForTwitch({ login: lower, id });
  if (existingUserId && existingUserId !== userId) {
    return { ok: false, error: `Twitch-Account „${lower}" ist bereits einem anderen Konto zugeordnet` };
  }
  if (existingUserId === userId) return { ok: true }; // schon bekannt (Profil oder frühere Verknüpfung)

  // Gleicher Login als Profil-Twitch eines anderen Kontos, aber mit abweichender ID → nicht anlegen (Unique)
  const profileOwner = await prisma.user.findUnique({ where: { twitchLogin: lower }, select: { id: true } });
  if (profileOwner && profileOwner.id !== userId) {
    return { ok: false, error: `Twitch-Login „${lower}" ist im Profil eines anderen Kontos hinterlegt` };
  }
  if (profileOwner?.id === userId) return { ok: true };

  await prisma.twitchClipperLink.upsert({
    where: { twitchLogin: lower },
    create: { userId, twitchLogin: lower, twitchUserId: id, createdById },
    // Login gehörte früher einer anderen ID (Umbenennung) → Eintrag übernehmen
    update: { userId, twitchUserId: id, createdById },
  });
  return { ok: true };
}
