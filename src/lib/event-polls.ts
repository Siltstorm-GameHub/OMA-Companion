import { prisma } from "@/lib/prisma";

export type PollConfig = {
  label: string;
  question: string;
  voterEligibility: "all" | "participants" | "players" | "spectators";
  answerType: "players" | "spectators" | "custom";
  customAnswers: string[];
  startOffsetHours: number;
  endOffsetHours: number;
  participationCoins: number;
  participationSeriesPoints: number;
  winnerCoins: number;
  winnerRankPoints: number;
};

/** Legt die tatsächlich abstimmbaren EventPoll-Datensätze für ein Event an, ausgehend
 * von dessen (geerbter) pollsConfigJson-Konfiguration. Ohne diesen Schritt existiert nur
 * die Konfiguration, aber keine echte Umfrage, auf die User abstimmen könnten. */
export async function createPollsForEvent(
  eventId: string,
  eventStartAt: Date,
  pollsConfigJson: PollConfig[] | null | undefined,
) {
  if (!pollsConfigJson || pollsConfigJson.length === 0) return;
  for (const cfg of pollsConfigJson) {
    const startAt = new Date(eventStartAt.getTime() + cfg.startOffsetHours * 3600_000);
    const endAt   = new Date(eventStartAt.getTime() + cfg.endOffsetHours   * 3600_000);
    await prisma.eventPoll.create({
      data: {
        eventId,
        label:                    cfg.label,
        question:                 cfg.question,
        voterEligibility:         cfg.voterEligibility,
        answerType:               cfg.answerType,
        customAnswers:            cfg.customAnswers?.length ? JSON.stringify(cfg.customAnswers) : null,
        startAt,
        endAt,
        participationCoins:       cfg.participationCoins,
        participationSeriesPoints: cfg.participationSeriesPoints,
        winnerCoins:              cfg.winnerCoins,
        winnerRankPoints:         cfg.winnerRankPoints,
      },
    });
  }
}

/** Parst eine pollsConfigJson-Spalte (String) sicher in ein PollConfig[]. */
export function parsePollsConfigJson(json: string | null | undefined): PollConfig[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed as PollConfig[] : [];
  } catch { return []; }
}
