/**
 * Einmalig auszuführen:
 *   npx tsx scripts/update-notification-rules-2026-07.ts
 *
 * Wendet die am 2026-07-12 beschlossenen Notification-Änderungen auf bereits
 * persistierte NotificationRule-Zeilen an (seed-notification-rules.ts überschreibt
 * bestehende Zeilen nicht, siehe dessen `update: {}`):
 *
 *  - event_started: Push zusätzlich aktivieren
 *  - tournament_started, tournament_result, lul_suggest: Regeln entfernt
 *    (soft-delete, damit sie aus /admin/notifications verschwinden)
 */
import { prisma } from "@/lib/prisma";

async function main() {
  const pushUpdate = await prisma.notificationRule.updateMany({
    where: { key: "event_started" },
    data:  { pushEnabled: true },
  });
  console.log(`✓ event_started → pushEnabled=true (${pushUpdate.count} Zeile(n))`);

  const removedKeys = ["tournament_started", "tournament_result", "lul_suggest"];
  for (const key of removedKeys) {
    const res = await prisma.notificationRule.updateMany({
      where: { key },
      data:  { deleted: true },
    });
    console.log(`✓ ${key} → deleted=true (${res.count} Zeile(n))`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
