/** Menschenlesbare Labels für Event-Felder, die als Platzhalter in
 *  Benachrichtigungs-Vorlagen (NotificationRule) verwendet werden. */

export const FORMAT_LABELS: Record<string, string> = {
  single_elimination: "K.O.-System",
  double_elimination: "Double Elimination",
  round_robin:        "Jeder gegen Jeden",
  liga:                "Liga",
  ffa:                 "Free for All",
  coop_stats:          "Kooperativ",
  avg_stats:           "Durchschnitts-Statistiken",
};

export const GENRE_LABELS: Record<string, string> = {
  arcade:      "Arcade",
  beat_em_up:  "Beat-em-Up",
  sport:       "Sport",
  racing:      "Racing",
  shooter:     "Shooter",
  community:   "Community",
};

export function formatLabel(format: string | null | undefined): string {
  if (!format) return "–";
  return FORMAT_LABELS[format] ?? format;
}

export function genreLabel(genre: string | null | undefined): string {
  if (!genre) return "–";
  return GENRE_LABELS[genre] ?? genre;
}

/** Teilnahme-Münzen eines Events: primär aus placementRewardsJson, sonst Fallback auf das
 *  veraltete pointReward-Feld (für Events, die vor der Umstellung erstellt wurden). */
export function eventParticipationCoins(event: { placementRewardsJson?: string | null; pointReward?: number | null }): number {
  if (event.placementRewardsJson) {
    try {
      const r = JSON.parse(event.placementRewardsJson) as { participationCoins?: number };
      if (r.participationCoins != null) return r.participationCoins;
    } catch { /* ignore */ }
  }
  return event.pointReward ?? 0;
}
