// Veröffentlichungs-Status eines Events (Event.publishStateJson) — reine Typen/Helfer, auch im
// Client nutzbar. Die Logik dazu steht in lib/event-publish.ts.

export type PublishStep = "discord_event" | "announcement" | "notification";
export type PublishError = { step: PublishStep; message: string; at: string };
export type PublishState = { notifiedAt?: string; errors: PublishError[] };

export const PUBLISH_STEP_LABELS: Record<PublishStep, string> = {
  discord_event: "Discord-Event anlegen",
  announcement:  "Ankündigung im Discord-Kanal",
  notification:  "Push-/In-App-Benachrichtigung",
};

export function parsePublishState(json: string | null | undefined): PublishState {
  if (!json) return { errors: [] };
  try {
    const raw = JSON.parse(json) as Partial<PublishState>;
    return { notifiedAt: raw.notifiedAt, errors: Array.isArray(raw.errors) ? raw.errors : [] };
  } catch { return { errors: [] }; }
}
