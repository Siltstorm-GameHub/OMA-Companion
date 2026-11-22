// Meldungen zum Ergebnis der Umfragen nach dem Event (Regeln "poll_winner" und "poll_result").
// Vorher bekam der Sieger seine Münzen still, und wer abgestimmt hatte, erfuhr vom Ergebnis nichts.

import { prisma } from "@/lib/prisma";
import { dispatchNotification } from "@/lib/notify-dispatch";

type PollReward = {
  pollId: string; label: string; winnerIds: string[]; voterIds: string[];
  winnerCoins: number; winnerRankPoints: number;
};

export async function notifyPollResults(eventId: string, eventTitle: string, polls: PollReward[], excluded: Set<string>) {
  if (polls.length === 0) return;
  const answerTypes = new Map((await prisma.eventPoll.findMany({
    where: { id: { in: polls.map(p => p.pollId) } }, select: { id: true, answerType: true },
  })).map(p => [p.id, p.answerType]));
  const userIds = [...new Set(polls.flatMap(p => answerTypes.get(p.pollId) === "custom" ? [] : p.winnerIds))];
  const names = new Map((await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true, name: true } }))
    .map(u => [u.id, u.username ?? u.name ?? "?"]));
  const url = `/tournament/${eventId}#abstimmung`;

  for (const p of polls) {
    const custom = answerTypes.get(p.pollId) === "custom";
    const winnerNames = p.winnerIds.map(id => (custom ? id : names.get(id) ?? "?"));
    const tie = p.winnerIds.length > 1;
    const winnersText = winnerNames.length === 0 ? "Niemand hat abgestimmt."
      : tie ? `Gleichstand: ${winnerNames.join(", ")}` : winnerNames[0];

    // Sieger (nur bei Personen-Umfragen)
    if (!custom) {
      const winners = p.winnerIds.filter(id => !excluded.has(id));
      const reward = [p.winnerCoins > 0 ? `+${p.winnerCoins} Münzen` : null, p.winnerRankPoints > 0 ? `+${p.winnerRankPoints} Tabellenpunkte` : null]
        .filter(Boolean).join(" · ");
      if (winners.length) {
        await dispatchNotification("poll_winner", {
          users: winners,
          placeholders: { "{eventName}": eventTitle, "{label}": p.label, "{reward}": reward || (tie ? "Gleichstand" : "") },
          urlOverride: url, skipDiscordChannel: true,
        });
      }
    }
    // Alle, die abgestimmt haben (außer den Siegern — die haben ihre eigene Meldung)
    const voters = p.voterIds.filter(id => custom || !p.winnerIds.includes(id));
    if (voters.length && winnerNames.length) {
      await dispatchNotification("poll_result", {
        users: voters,
        placeholders: { "{eventName}": eventTitle, "{label}": p.label, "{winners}": winnersText },
        urlOverride: url, skipDiscordChannel: true,
      });
    }
  }
}
