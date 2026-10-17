/**
 * Einmalige Umstellung für OMA Gems: Karten-Stufen und Duplikate → Münzen.
 *
 *   npx tsx scripts/convert-card-levels.ts           # Trockenlauf: zeigt nur, was passieren würde
 *   npx tsx scripts/convert-card-levels.ts --apply   # schreibt gut und setzt die Karten zurück
 *
 * Muss manuell gegen die Produktions-DB ausgeführt werden (DATABASE_URL in der Umgebung) —
 * VOR prisma/manual-sql/drop_oma_quest_duels_levels.sql, das die Spalten "level" und
 * "duplicates" von "UserCard" entfernt. Liest und schreibt diese Spalten per rohem SQL, weil
 * sie im aktuellen Prisma-Schema nicht mehr vorkommen. Existieren sie nicht mehr, meldet das
 * Skript, dass nichts zu tun ist.
 *
 * Pro Spieler wird gutgeschrieben (siehe lib/battle-cards/card-coins.ts):
 *  - für jede Karte über Stufe 1 die dafür bezahlten Upgrade-Kosten (effektive Kostentabelle,
 *    also inkl. Admin-Override),
 *  - für jede überzählige Kopie (duplicates − 1) DUPLICATE_COIN_VALUE Münzen.
 * Die Gutschrift wird als PointTransaction gebucht und per In-App-Benachrichtigung gemeldet,
 * danach stehen alle Karten des Spielers auf Stufe 1 / 1 Kopie.
 *
 * Idempotent: Nach dem Lauf gibt es keine Karten über Stufe 1 bzw. mit Duplikaten mehr, ein
 * zweiter Lauf findet also nichts. Jeder Spieler wird in einer eigenen Transaktion umgestellt.
 */
import type { CardRarity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { COIN_PREFIX } from "@/lib/points";
import { createNotification } from "@/lib/notifications";
import { computeCardRefund, loadLegacyUpgradeCosts, DUPLICATE_COIN_VALUE } from "@/lib/battle-cards/card-coins";

const REASON = `${COIN_PREFIX} OMA Gems: Umstellung Karten-Level`;

interface LegacyUserCard {
  id: string;
  userId: string;
  level: number;
  duplicates: number;
  rarity: CardRarity;
}

async function legacyColumnsExist(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) AS count FROM information_schema.columns
    WHERE table_name = 'UserCard' AND column_name IN ('level', 'duplicates')`;
  return Number(rows[0]?.count ?? 0) === 2;
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (!(await legacyColumnsExist())) {
    console.log('Die Spalten "level"/"duplicates" gibt es nicht mehr — die Umstellung ist bereits erledigt.');
    return;
  }

  const costs = await loadLegacyUpgradeCosts();
  console.log(apply ? "== ANWENDEN ==" : "== TROCKENLAUF (nichts wird geschrieben, --apply zum Ausführen) ==");
  console.log("Upgrade-Kosten:", JSON.stringify(costs));
  console.log("Münzen je Duplikat:", JSON.stringify(DUPLICATE_COIN_VALUE), "\n");

  const cards = await prisma.$queryRaw<LegacyUserCard[]>`
    SELECT uc."id", uc."userId", uc."level", uc."duplicates", c."rarity"::text AS "rarity"
    FROM "UserCard" uc JOIN "Card" c ON c."id" = uc."cardId"
    WHERE uc."level" > 1 OR uc."duplicates" > 1`;

  const byUser = new Map<string, { cardIds: string[]; upgrade: number; dupes: number; total: number }>();
  for (const uc of cards) {
    const refund = computeCardRefund(uc.rarity, uc.level, uc.duplicates, costs);
    const entry = byUser.get(uc.userId) ?? { cardIds: [], upgrade: 0, dupes: 0, total: 0 };
    entry.cardIds.push(uc.id);
    entry.upgrade += refund.upgradeCoins;
    entry.dupes += refund.duplicateCoins;
    entry.total += refund.total;
    byUser.set(uc.userId, entry);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [...byUser.keys()] } },
    select: { id: true, username: true, name: true },
  });
  const nameOf = new Map(users.map((u) => [u.id, u.username ?? u.name ?? u.id]));

  let grandTotal = 0;
  for (const [userId, e] of [...byUser].sort((a, b) => b[1].total - a[1].total)) {
    grandTotal += e.total;
    console.log(
      `${(nameOf.get(userId) ?? userId).padEnd(24)} ${String(e.cardIds.length).padStart(3)} Karten  ` +
        `Upgrades ${String(e.upgrade).padStart(6)}  Duplikate ${String(e.dupes).padStart(6)}  = ${String(e.total).padStart(6)} Münzen`
    );
    if (!apply) continue;

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`UPDATE "UserCard" SET "level" = 1, "duplicates" = 1 WHERE "id" = ANY(${e.cardIds})`;
      if (e.total > 0) {
        await tx.user.update({ where: { id: userId }, data: { points: { increment: e.total } } });
        await tx.pointTransaction.create({ data: { userId, amount: e.total, reason: REASON } });
      }
    });
    if (e.total > 0) {
      await createNotification(userId, {
        type: "coins",
        title: "OMA Gems: Karten-Stufen umgestellt",
        body: `Karten haben keine Stufen mehr. Für deine Upgrades und Duplikate hast du ${e.total} Münzen erhalten.`,
        url: "/gems?tab=sammlung",
      });
    }
  }

  console.log(`\n${byUser.size} Spieler, ${cards.length} Karten, insgesamt ${grandTotal} Münzen${apply ? " gutgeschrieben" : " (Trockenlauf)"}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
