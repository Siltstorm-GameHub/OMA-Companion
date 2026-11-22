/**
 * Alte Einzel-Umfragen (pollConfigJson: { enabled, question, coins, rankPoints }) in normale Abstimmungen
 * nach dem Event umwandeln (pollsConfigJson), damit sie in der App abgestimmt und automatisch ausgewertet
 * werden. Betrifft Reihen und noch nicht abgeschlossene Events ohne eigene Umfrage-Einstellung.
 * Bereits abgeschlossene Events bleiben, wie sie sind.
 *
 *   npx tsx scripts/convert-legacy-polls.ts          (zeigt nur, was passieren würde)
 *   npx tsx scripts/convert-legacy-polls.ts --apply  (wandelt um)
 */
import { prisma } from "@/lib/prisma";
import { parsePollsConfigJson, type PollConfig } from "@/lib/event-polls";

const apply = process.argv.includes("--apply");

function convert(raw: string | null): PollConfig | null {
  if (!raw) return null;
  try {
    const legacy = JSON.parse(raw) as { enabled?: boolean; question?: string; coins?: number; rankPoints?: number } | null;
    if (!legacy?.enabled) return null;
    return {
      label: legacy.question?.trim() || "MVP",
      question: legacy.question?.trim() || "Wer war der MVP?",
      voterEligibility: "participants",
      answerType: "players",
      customAnswers: [],
      startOffsetHours: 0,
      endOffsetHours: 24,
      participationCoins: 0,
      participationSeriesPoints: 0,
      winnerCoins: legacy.coins ?? 0,
      winnerRankPoints: legacy.rankPoints ?? 0,
    };
  } catch {
    return null;
  }
}

async function main() {
  const series = await prisma.eventSeries.findMany({ where: { pollConfigJson: { not: null } }, select: { id: true, name: true, pollConfigJson: true, pollsConfigJson: true } });
  let n = 0;
  for (const s of series) {
    const poll = convert(s.pollConfigJson);
    if (!poll || parsePollsConfigJson(s.pollsConfigJson).length > 0) continue;
    console.log(`Reihe „${s.name}“: ${poll.question}`);
    if (apply) await prisma.eventSeries.update({ where: { id: s.id }, data: { pollsConfigJson: JSON.stringify([poll]), pollConfigJson: null } });
    n++;
  }
  const events = await prisma.event.findMany({
    where: { pollConfigJson: { not: null }, status: { in: ["open", "active", "closed"] } },
    select: { id: true, title: true, pollConfigJson: true, pollsConfigJson: true },
  });
  for (const e of events) {
    const poll = convert(e.pollConfigJson);
    if (!poll || parsePollsConfigJson(e.pollsConfigJson).length > 0) continue;
    console.log(`Event „${e.title}“: ${poll.question}`);
    if (apply) await prisma.event.update({ where: { id: e.id }, data: { pollsConfigJson: JSON.stringify([poll]), pollConfigJson: null } });
    n++;
  }
  console.log(apply ? `\n${n} umgewandelt.` : `\n${n} würden umgewandelt. Mit --apply ausführen.`);
}

main().catch(err => { console.error(err); process.exit(1); }).finally(() => prisma.$disconnect());
