/**
 * Übergabe an das Verfassen-Feld des Community-Boards (BoardComposer): Wer woanders "Beitrag dazu", "Erstellen"
 * oder "Idee dazu" tippt, landet im Feed mit vorbefülltem Editor. Zwei Wege:
 *  - URL (teilbar, z. B. von der Turnierseite): /community-board?neu=beitrag|idee|anleitung&event=<id>&werkzeug=bild|clip|umfrage|event
 *  - sessionStorage (aus dem Büro, mit allen Vorbelegungen wie Vorlage, Kampagne, Bildwunsch): stashCompose() + /community-board?neu=1
 */

import type { PostEditorPrefill, ReportEditorTool } from "@/components/community-jobs/ReportEditor";

export type ComposeKind = "post" | "idea" | "guide";

export interface ComposePrefill extends PostEditorPrefill {
  /** Rückblick-Vorlage (Woche/Monat) automatisch einsetzen */
  recap?: "week" | "month";
  /** Idee zu einem Bericht */
  reportId?: string;
}

export interface ComposeRequest {
  kind: ComposeKind;
  eventId?: string;
  tool?: ReportEditorTool;
  prefill?: ComposePrefill;
}

const KEY = "oma.board.compose";

export function stashCompose(req: ComposeRequest) {
  try { window.sessionStorage.setItem(KEY, JSON.stringify(req)); } catch { /* privates Fenster: dann eben leer */ }
}

export function takeCompose(): ComposeRequest | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(KEY);
    const req = JSON.parse(raw) as ComposeRequest;
    return req && (req.kind === "post" || req.kind === "idea" || req.kind === "guide") ? req : null;
  } catch {
    return null;
  }
}

const KIND_BY_PARAM: Record<string, ComposeKind> = { beitrag: "post", "1": "post", idee: "idea", anleitung: "guide" };
const TOOL_BY_PARAM: Record<string, ReportEditorTool> = { bild: "photo", clip: "clip", umfrage: "poll", event: "event" };

export function composeFromParams(p: URLSearchParams): ComposeRequest | null {
  const neu = p.get("neu");
  if (!neu) return null;
  const kind = KIND_BY_PARAM[neu];
  if (!kind) return null;
  const eventId = p.get("event") ?? undefined;
  const tool = TOOL_BY_PARAM[p.get("werkzeug") ?? ""];
  return { kind, eventId, tool };
}

/** Link zum Verfassen-Feld (z. B. "Beitrag dazu erstellen" auf der Turnierseite) */
export function composeHref(kind: "beitrag" | "idee" | "anleitung", eventId?: string): string {
  const q = new URLSearchParams({ neu: kind });
  if (eventId) q.set("event", eventId);
  return `/community-board?${q.toString()}`;
}
