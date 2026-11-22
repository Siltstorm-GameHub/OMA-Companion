// Umfragen nach dem Event — reine Regeln (auch im Client nutzbar), getestet in event-polls-shared.test.ts.

export type VoterEligibility = "all" | "participants" | "players" | "spectators";

/** Darf jemand mit dieser Anmeldung abstimmen? role: "player" | "spectator" | null (nicht angemeldet) */
export function voterAllowed(eligibility: string, role: string | null | undefined): boolean {
  if (eligibility === "all") return true;
  if (!role) return false;
  if (eligibility === "players") return role === "player";
  if (eligibility === "spectators") return role === "spectator";
  return role === "player" || role === "spectator";
}

/** Wer abstimmen darf — als Hinweis, bevor man klickt */
export const ELIGIBILITY_TEXT: Record<string, string> = {
  all: "Alle Mitglieder dürfen abstimmen",
  participants: "Abstimmen dürfen alle, die beim Event angemeldet waren",
  players: "Abstimmen dürfen nur die Spieler",
  spectators: "Abstimmen dürfen nur die Zuschauer",
};

/**
 * Beim Abschluss als "nicht da" markierte oder ausgeschlossene Spieler — keine wählbaren Kandidaten
 * (vorher standen sie trotzdem zur Wahl, z.B. als MVP).
 */
export function ineligibleCandidates(completionDataJson: string | null | undefined): Set<string> {
  if (!completionDataJson) return new Set();
  try {
    const c = JSON.parse(completionDataJson) as { absentPlayerIds?: string[] | null; excludedUserIds?: string[] | null };
    return new Set([...(c.absentPlayerIds ?? []), ...(c.excludedUserIds ?? [])]);
  } catch {
    return new Set();
  }
}
