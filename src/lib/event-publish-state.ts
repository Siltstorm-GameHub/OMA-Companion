// Veröffentlichungs-Status eines Events (Event.publishStateJson) — reine Typen/Helfer, auch im
// Client nutzbar. Die Logik dazu steht in lib/event-publish.ts.

export type PublishStep = "discord_event" | "announcement" | "notification";
export type PublishError = { step: PublishStep; message: string; at: string };
export type PublishState = {
  notifiedAt?: string;
  errors: PublishError[];
  /** Check-in: Meldung "Check-in ist offen" verschickt (lib/checkin-notify.ts) */
  checkInNotifiedAt?: string;
  /** Check-in: Nicht-Eingecheckte nach der Auslosung informiert (lib/checkin-notify.ts) */
  notDrawnNotifiedAt?: string;
  /** "Event läuft jetzt" verschickt (Discord-Bot oder App-Start, lib/event-started-notify.ts) */
  startedNotifiedAt?: string;
  /** Auslosung gemeldet — eine weitere Auslosung heißt dann "Neu ausgelost" */
  drawNotifiedAt?: string;
};

export const PUBLISH_STEP_LABELS: Record<PublishStep, string> = {
  discord_event: "Discord-Event anlegen",
  announcement:  "Ankündigung im Discord-Kanal",
  notification:  "Push-/In-App-Benachrichtigung",
};

export function parsePublishState(json: string | null | undefined): PublishState {
  if (!json) return { errors: [] };
  try {
    const raw = JSON.parse(json) as Partial<PublishState>;
    return {
      notifiedAt: raw.notifiedAt, errors: Array.isArray(raw.errors) ? raw.errors : [],
      ...(typeof raw.checkInNotifiedAt === "string" && { checkInNotifiedAt: raw.checkInNotifiedAt }),
      ...(typeof raw.notDrawnNotifiedAt === "string" && { notDrawnNotifiedAt: raw.notDrawnNotifiedAt }),
      ...(typeof raw.startedNotifiedAt === "string" && { startedNotifiedAt: raw.startedNotifiedAt }),
      ...(typeof raw.drawNotifiedAt === "string" && { drawNotifiedAt: raw.drawNotifiedAt }),
    };
  } catch { return { errors: [] }; }
}
