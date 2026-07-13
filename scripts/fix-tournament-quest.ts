/**
 * Einmalig auszuführen, um bereits generierte Monats-Quests vom alten Typ TOURNAMENT
 * (z.B. "Nimm an 1 Turnier(en) teil") auf EVENT_ATTEND umzustellen. TOURNAMENT wurde aus
 * der aktiven Rotation entfernt (Turniere laufen jetzt über Events → EVENT_ATTEND), aber
 * bereits erzeugte Quest-Zeilen aus der DB bleiben davon unberührt und können nie erfüllt
 * werden, weil nirgends mehr updateQuestProgress(..., "TOURNAMENT", ...) aufgerufen wird.
 *
 *   npx tsx scripts/fix-tournament-quest.ts
 */
import { prisma } from "@/lib/prisma";

async function main() {
  const stale = await prisma.quest.findMany({ where: { type: "TOURNAMENT" } });

  if (!stale.length) {
    console.log("Keine TOURNAMENT-Quests gefunden.");
    return;
  }

  for (const q of stale) {
    const newDescription = q.description.replace(/Turnier\(en\)/g, "Event(s)");
    await prisma.quest.update({
      where: { id: q.id },
      data: {
        type: "EVENT_ATTEND",
        title: q.title.includes("Turnier") ? "Event-Enthusiast" : q.title,
        description: newDescription,
      },
    });
    console.log(`✓ Quest "${q.title}" (${q.month}/${q.year}) → EVENT_ATTEND: "${newDescription}"`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
