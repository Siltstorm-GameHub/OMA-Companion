/** Umfragen in Beiträgen — client-sichere Konstanten und Typen (kein Prisma). */

export const POLL_KINDS = ["opinion", "quiz", "event_winner"] as const;
export type PollKind = (typeof POLL_KINDS)[number];

export const POLL_KIND_LABELS: Record<PollKind, string> = {
  opinion: "Meinung",
  quiz: "Quiz (richtige Antwort vorab festlegen)",
  event_winner: "Wer gewinnt das Event?",
};

export const POLL_OPTIONS_MIN = 2;
export const POLL_OPTIONS_MAX = 6;
export const POLL_QUESTION_MAX = 200;
export const POLL_OPTION_MAX = 80;
export const POLL_PARTICIPATION_MAX = 10;
export const POLL_CORRECT_MAX = 100;

/** Umfrage aus dem Editor. Bei event_winner kommen die Antworten automatisch aus den Event-Spielern. */
export interface PollInput {
  question: string;
  kind: PollKind;
  options: string[];
  /** Quiz: Index der richtigen Antwort (bleibt bis zur Auflösung geheim). */
  correctIndex?: number | null;
  participationReward: number;
  correctReward: number;
  /** ISO-Zeitpunkt, bis wann abgestimmt werden kann (Quiz/Meinung; Event-Gewinner: Event-Start). */
  closesAt?: string | null;
}

/** Umfrage, wie sie im Board ankommt (richtige Antwort erst nach der Auflösung). */
export interface PollView {
  id: string; question: string; kind: PollKind;
  options: { id: string; label: string; votes: number }[];
  totalVotes: number; myOptionId: string | null;
  closesAt: string | null; resolved: boolean; correctOptionId: string | null;
  participationReward: number; correctReward: number;
}

export function parsePollInput(raw: unknown): PollInput | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== "object") return undefined;
  const p = raw as Record<string, unknown>;
  const kind = POLL_KINDS.includes(p.kind as PollKind) ? (p.kind as PollKind) : "opinion";
  return {
    question: typeof p.question === "string" ? p.question : "",
    kind,
    options: Array.isArray(p.options) ? p.options.filter((o): o is string => typeof o === "string") : [],
    correctIndex: typeof p.correctIndex === "number" ? p.correctIndex : null,
    participationReward: typeof p.participationReward === "number" ? Math.round(p.participationReward) : 0,
    correctReward: typeof p.correctReward === "number" ? Math.round(p.correctReward) : 0,
    closesAt: typeof p.closesAt === "string" && p.closesAt ? p.closesAt : null,
  };
}
