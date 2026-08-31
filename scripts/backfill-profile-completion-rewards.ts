/**
 * Einmalig auszuführen NACH dem Deploy des "Profil vervollständigen"-Features:
 *   npx tsx scripts/backfill-profile-completion-rewards.ts
 *
 * Zahlt bestehenden Usern die 500-Münzen-Belohnung pro Profil-Item (Bio, Geburtstag,
 * Banner, Twitch-Kanal, Lieblingsspiele) nach, die sie schon VOR Einführung des Features
 * ausgefüllt hatten und für die sie deshalb nie automatisch belohnt wurden.
 *
 * Sicher mehrfach ausführbar: awardProfileCompletionIfNeeded() prüft pro User+Item über
 * die PointTransaction-Historie (everAwarded), ob schon vergeben wurde, und überspringt
 * in dem Fall — ein erneuter Lauf zahlt also nichts doppelt aus und verschickt auch keine
 * zweite Benachrichtigung an bereits abgefertigte User.
 */
import { prisma } from "@/lib/prisma";
import { PROFILE_COMPLETION_ITEMS } from "@/lib/profile-completion";
import { awardProfileCompletionIfNeeded } from "@/lib/profile-completion-award";
import { POINT_RULES } from "@/lib/points";
import { createNotification } from "@/lib/notifications";
import { parseFavoriteGames } from "@/lib/favorite-games";

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true, bio: true, birthday: true, bannerUrl: true,
      twitchLogin: true, favoriteGamesJson: true,
    },
  });

  let notifiedUsers = 0;
  let totalRewards = 0;

  for (const user of users) {
    const filled: Record<string, boolean> = {
      bio:           !!user.bio,
      birthday:      !!user.birthday,
      banner:        !!user.bannerUrl,
      twitch:        !!user.twitchLogin,
      favoriteGames: parseFavoriteGames(user.favoriteGamesJson).length > 0,
    };

    const newlyAwarded: string[] = [];
    let coins = 0;

    for (const item of PROFILE_COMPLETION_ITEMS) {
      if (!filled[item.key]) continue;
      const awarded = await awardProfileCompletionIfNeeded(user.id, item.rule);
      if (awarded) {
        newlyAwarded.push(item.label);
        coins += POINT_RULES[item.rule].amount;
      }
    }

    if (newlyAwarded.length === 0) continue;

    await createNotification(user.id, {
      type: "coins",
      title: `${coins.toLocaleString("de-DE")} Münzen nachträglich gutgeschrieben 🪙`,
      body: `Dein Profil war schon vorher ausgefüllt bei: ${newlyAwarded.join(", ")}. Dafür gab's ${coins.toLocaleString("de-DE")} Münzen.`,
      url: "/profile",
    });

    notifiedUsers++;
    totalRewards += newlyAwarded.length;
    console.log(`✓ ${user.id}: +${coins} Münzen (${newlyAwarded.join(", ")})`);
  }

  console.log(`\nFertig: ${notifiedUsers} User benachrichtigt, ${totalRewards} Einzel-Belohnungen vergeben.`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
