import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { resolveStoreId } from "@/lib/blob-store";

export const DELETED_USER_NAME = "Gelöschtes Mitglied";
/** Muss im Lösch-Dialog eingetippt werden. */
export const DELETE_CONFIRM_PHRASE = "LÖSCHEN";

/**
 * Löscht ein Konto auf Wunsch des Mitglieds (DSGVO Art. 17).
 *
 * Bewusst Anonymisierung statt `user.delete()`: An der User-Zeile hängen
 * Turnierergebnisse, Brackets, Abstimmungen und Karten anderer Spieler. Ein
 * hartes Löschen würde deren Historie zerreißen (bzw. an Foreign Keys
 * scheitern). Stattdessen wird alles entfernt, was die Person identifiziert —
 * zurück bleibt ein namenloser Platzhalter "Gelöschtes Mitglied".
 *
 * Danach ist die Discord-Verknüpfung weg: Ein erneuter Login legt ein neues,
 * leeres Konto an. Bestehende JWT-Sessions werden in src/auth.ts über
 * `deletedAt` ungültig.
 */
export async function anonymizeUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { discordId: true, bannerUrl: true, deletedAt: true },
  });
  if (!user || user.deletedAt) return;

  const card = user.discordId
    ? await prisma.card.findUnique({ where: { linkedDiscordId: user.discordId }, select: { id: true } })
    : null;

  await prisma.$transaction([
    // Login-Verknüpfungen und Geräte
    prisma.account.deleteMany({ where: { userId } }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.pushSubscription.deleteMany({ where: { userId } }),
    prisma.inAppNotification.deleteMany({ where: { userId } }),
    // Freitext ohne Bezug für andere
    prisma.lobbyMessage.deleteMany({ where: { userId } }),

    // Community-Karte: andere Spieler besitzen sie ggf. — Karte bleibt, Personenbezug geht
    ...(card ? [
      prisma.card.update({
        where: { id: card.id },
        data: { linkedDiscordId: null, name: DELETED_USER_NAME, imageUrl: null, sourceStatsJson: undefined, heroLook: undefined },
      }),
    ] : []),

    prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        leftServerAt: new Date(),
        name: DELETED_USER_NAME,
        username: null,
        email: null,
        emailVerified: null,
        image: null,
        discordId: null,
        role: "user",
        points: 0,
        rankPoints: 0,
        twitchLogin: null,
        overlayToken: null,
        overlayLayoutJson: null,
        overlayControlJson: null,
        overlayClipsOptIn: false,
        overlayClipsOptOut: true,
        birthday: null,
        birthdayBoostUntil: null,
        bio: null,
        bannerUrl: null,
        vitrineSlotsJson: null,
        favoriteGamesJson: null,
        notificationPrefs: "{}",
        lastActiveAt: null,
        lastLoginAt: null,
      },
    }),
  ]);

  // Eigenes Banner aus dem Blob-Store entfernen (fremde https-URLs ignorieren)
  if (user.bannerUrl?.includes(".blob.vercel-storage.com")) {
    const storeId = resolveStoreId();
    await del(user.bannerUrl, storeId ? { storeId } : undefined).catch(err =>
      console.error("[account-deletion] Banner-Löschung fehlgeschlagen:", err),
    );
  }
}

/** Datenauskunft (DSGVO Art. 15/20): die zum Konto gespeicherten Daten als JSON. */
export async function buildUserExport(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    omit: { overlayToken: true },
    include: {
      pointTransactions: { orderBy: { createdAt: "asc" } },
      eventRegistrations: { include: { event: { select: { title: true, startAt: true } } } },
      tournamentParticipants: true,
      squadMemberships: true,
      matchResultSubmissions: true,
      questProgress: true,
      dailySpins: true,
      donations: { omit: { note: true } },
      lobbyMessages: true,
      clipSubmissions: true,
      eventPredictionsMade: true,
      eventPollVotes: true,
      dailyPollVotes: true,
      communityStreams: true,
      notifications: true,
      serverApplications: true,
      communityJobApplications: true,
      communityJobMemberships: true,
      communityJobWeeklyPayouts: true,
      jobReports: true,
      jobMediaAssets: true,
      marketingPosts: true,
      coachGuides: true,
      communityIdeas: true,
      communityIdeaVotes: true,
      communityBoardComments: true,
      pokale: true,
      battleCardUserCards: true,
      pushSubscriptions: { select: { createdAt: true } },
      accounts: { select: { provider: true, providerAccountId: true } },
    },
  });
  if (!user) return null;
  return {
    exportedAt: new Date().toISOString(),
    hinweis: "Datenauskunft der OMA Companion App. Inhalte, die du anderen Mitgliedern zugeordnet hast (z. B. Votes für andere), sind teilweise nur als ID enthalten.",
    user,
  };
}
