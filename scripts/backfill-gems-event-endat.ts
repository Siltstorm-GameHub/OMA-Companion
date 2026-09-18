/**
 * Einmalig NACH dem Deploy der generischen Event.endAt-Migration auszuführen:
 *   npx tsx scripts/backfill-gems-event-endat.ts
 *
 * WICHTIG: Muss vom Team manuell gegen die echte (Supabase-)Produktions-DB
 * ausgeführt werden — in der Entwicklungs-/Review-Sandbox ist keine DATABASE_URL
 * vorhanden, das Skript kann hier also nicht getestet/ausgeführt werden.
 *
 * Hintergrund: GemsTournament.endAt war bisher das einzige Ende-Datum für
 * OMA-Gems-Turniere. Jetzt trägt generisch Event.endAt das Ende (für alle
 * Event-Typen), GemsTournament.endAt ist deprecated und wird bei neuen
 * Turnieren nicht mehr gesetzt. Für bestehende Turniere, die vor der Migration
 * angelegt wurden, muss der alte Wert einmalig nach Event.endAt übertragen
 * werden, damit z.B. finalizeDueGemsTournaments() (das jetzt über Event.endAt
 * abfragt) sie weiterhin korrekt findet.
 *
 * Sicher mehrfach ausführbar (idempotent): überträgt nur GemsTournament.endAt
 * → Event.endAt, wenn Event.endAt noch nicht gesetzt ist. Bereits migrierte
 * oder neu angelegte Events (Event.endAt schon gesetzt) werden übersprungen.
 */
import { prisma } from "@/lib/prisma";

async function main() {
  const tournaments = await prisma.gemsTournament.findMany({
    where: { endAt: { not: null }, event: { endAt: null } },
    select: { id: true, endAt: true, event: { select: { id: true, title: true } } },
  });

  let updated = 0;
  for (const tournament of tournaments) {
    if (!tournament.endAt) continue; // TS-Guard, durch die where-Klausel oben eigentlich ausgeschlossen
    await prisma.event.update({
      where: { id: tournament.event.id },
      data: { endAt: tournament.endAt },
    });
    updated++;
    console.log(`✓ Event "${tournament.event.title}" (${tournament.event.id}): endAt ← ${tournament.endAt.toISOString()}`);
  }

  console.log(`\nFertig: ${updated} Event(s) mit endAt aus GemsTournament.endAt befüllt.`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
