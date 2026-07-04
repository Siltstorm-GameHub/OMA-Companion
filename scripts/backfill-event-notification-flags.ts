/**
 * Einmalig auszuführen NACH dem Deploy des isEventNotification/eventAudience-Schemas:
 *   npx tsx scripts/backfill-event-notification-flags.ts
 *
 * Setzt isEventNotification/eventAudience für die 6 Event-bezogenen Regeln auf sinnvolle
 * Defaults. Das ist ein einmaliger Backfill (NICHT Teil des Build-Skripts wie
 * seed-notification-rules.ts) — würde man das bei jedem Deploy erneut laufen lassen,
 * würden spätere Admin-Anpassungen an diesen zwei Feldern über die UI wieder zurückgesetzt.
 */
import { prisma } from "@/lib/prisma";

const DEFAULTS: { key: string; isEventNotification: boolean; eventAudience: "all" | "participants" }[] = [
  { key: "event_new",          isEventNotification: true, eventAudience: "all" },
  { key: "event_reminder",     isEventNotification: true, eventAudience: "participants" },
  { key: "event_started",      isEventNotification: true, eventAudience: "participants" },
  { key: "event_ended",        isEventNotification: true, eventAudience: "participants" },
  { key: "tournament_started", isEventNotification: true, eventAudience: "all" },
  { key: "tournament_result",  isEventNotification: true, eventAudience: "participants" },
];

async function main() {
  for (const d of DEFAULTS) {
    await prisma.notificationRule.updateMany({
      where: { key: d.key },
      data: { isEventNotification: d.isEventNotification, eventAudience: d.eventAudience },
    });
    console.log(`✓ ${d.key} → isEventNotification=${d.isEventNotification}, eventAudience=${d.eventAudience}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
