/**
 * Einmalige Korrektur der Community-Job-Wochengehälter, die vor dem Fix in
 * runWeeklyPayout für die LAUFENDE statt die abgeschlossene Woche berechnet
 * wurden (Score dadurch nahezu 0).
 *
 *   npx tsx scripts/fix-community-job-payouts.ts          # Trockenlauf, schreibt nichts
 *   npx tsx scripts/fix-community-job-payouts.ts --apply  # Änderungen anwenden
 *
 * Pro bestehender Zeile:
 *  - Woche abgeschlossen: Zeile mit dem korrekten Ganzwochen-Ergebnis neu
 *    berechnen; nur die Differenz NACHZAHLEN (positive Differenz). Negative
 *    Differenzen werden nur gemeldet, nicht zurückgebucht.
 *  - Woche noch nicht beendet: Zeile löschen und ausgezahlte Münzen
 *    zurückbuchen, damit der Cron die Woche nach Ablauf korrekt auszahlt
 *    (bestehende Zeilen würde er sonst überspringen).
 *
 * Nutzt die aktuelle Tarif-/Bonus-Konfiguration und den aktuellen Stand der
 * Bewertungen (inkl. inzwischen überstimmter Anfechtungen).
 */
import { prisma } from "@/lib/prisma";
import "@/lib/community-job-bootstrap";
import { computeWeeklyPayout } from "@/lib/community-job-service";
import { getCommunityJob } from "@/lib/community-jobs";
import { COIN_PREFIX } from "@/lib/points";

const APPLY = process.argv.includes("--apply");

async function main() {
  const now = new Date();
  const rows = await prisma.communityJobWeeklyPayout.findMany({ orderBy: { weekStart: "asc" } });
  console.log(`${APPLY ? "ANWENDEN" : "TROCKENLAUF"}: ${rows.length} Zeilen geprüft`);

  let corrected = 0, unchanged = 0, reset = 0, negative = 0, skipped = 0, totalCoins = 0;

  for (const row of rows) {
    const label = getCommunityJob(row.jobKey)?.label ?? row.jobKey;
    const tag = `${row.userId} · ${label} · Woche ${row.weekStart.toISOString().slice(0, 10)}`;

    if (row.weekEnd > now) {
      console.log(`[zurücksetzen] ${tag}: Woche läuft noch, Zeile löschen, ${row.coinsAwarded} Münzen zurückbuchen`);
      if (APPLY) {
        await prisma.$transaction(async tx => {
          await tx.communityJobWeeklyPayout.delete({ where: { id: row.id } });
          if (row.coinsAwarded > 0) {
            await tx.user.update({ where: { id: row.userId }, data: { points: { decrement: row.coinsAwarded } } });
            await tx.pointTransaction.create({
              data: {
                userId: row.userId, amount: -row.coinsAwarded,
                reason: `${COIN_PREFIX} Korrektur Wochengehalt (Woche noch nicht abgeschlossen): ${label}`,
              },
            });
          }
        });
      }
      reset++;
      continue;
    }

    const member = await prisma.communityJobMember.findFirst({
      where: { userId: row.userId, jobKey: row.jobKey, contractStartAt: { lt: row.weekEnd } },
      orderBy: { contractStartAt: "desc" },
    });
    if (!member) {
      console.warn(`[übersprungen] ${tag}: keine passende Mitgliedschaft gefunden`);
      skipped++;
      continue;
    }

    const outcome = await computeWeeklyPayout(member, row.weekStart, row.weekEnd);
    const delta = outcome.coinsAwarded - row.coinsAwarded;

    if (delta < 0) {
      console.warn(`[negativ] ${tag}: korrekt wären ${outcome.coinsAwarded}, gezahlt ${row.coinsAwarded} (keine Rückbuchung)`);
      negative++;
    }
    const sameResult = outcome.rawScore === row.rawScore && outcome.tierLabel === row.tierLabel
      && outcome.voteBonusMultiplier === row.voteBonusMultiplier && outcome.baseCoins === row.baseCoins;
    if (sameResult) { unchanged++; continue; }

    console.log(`[korrigieren] ${tag}: Score ${row.rawScore} → ${outcome.rawScore}, ${row.coinsAwarded} → ${outcome.coinsAwarded} Münzen (Nachzahlung ${Math.max(0, delta)})`);
    if (APPLY) {
      await prisma.$transaction(async tx => {
        await tx.communityJobWeeklyPayout.update({
          where: { id: row.id },
          data: {
            rawScore: outcome.rawScore, tierLabel: outcome.tierLabel, baseCoins: outcome.baseCoins,
            voteBonusMultiplier: outcome.voteBonusMultiplier,
            coinsAwarded: Math.max(outcome.coinsAwarded, row.coinsAwarded),
          },
        });
        if (delta > 0) {
          await tx.user.update({ where: { id: row.userId }, data: { points: { increment: delta } } });
          await tx.pointTransaction.create({
            data: {
              userId: row.userId, amount: delta,
              reason: `${COIN_PREFIX} Nachzahlung Wochengehalt ${row.weekStart.toISOString().slice(0, 10)}: ${label}${outcome.tierLabel ? ` (${outcome.tierLabel})` : ""}`,
            },
          });
        }
      });
    }
    corrected++;
    if (delta > 0) totalCoins += delta;
  }

  console.log(`Fertig: ${corrected} korrigiert (${totalCoins} Münzen nachgezahlt), ${reset} zurückgesetzt, ${unchanged} unverändert, ${negative} negativ gemeldet, ${skipped} übersprungen.`);
  if (!APPLY) console.log("Trockenlauf — mit --apply ausführen, um die Änderungen zu schreiben.");
}

main().catch(err => { console.error(err); process.exit(1); }).finally(() => prisma.$disconnect());
