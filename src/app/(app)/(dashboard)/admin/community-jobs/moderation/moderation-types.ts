/** Client-sichere Typen/Optionen für die Moderation (das Service-Modul zieht Prisma mit). */

export const MODERATION_TYPE_OPTIONS = [
  { id: "report", label: "Berichte", canHide: true },
  { id: "asset", label: "Bilder & Clips", canHide: true },
  { id: "marketing_post", label: "Werbe-Posts", canHide: true },
  { id: "idea", label: "Ideen", canHide: true },
  { id: "guide", label: "Anleitungen", canHide: true },
  { id: "comment", label: "Kommentare", canHide: false },
  { id: "album", label: "Alben", canHide: false },
  { id: "campaign", label: "Kampagnen", canHide: false },
  { id: "photo_request", label: "Bildwünsche", canHide: false },
] as const;

export interface ModerationItemDto {
  type: string; id: string; title: string; authorId: string; authorName: string; createdAt: string;
  hidden: boolean; hiddenReason: string | null; url: string | null; canHide: boolean;
}
