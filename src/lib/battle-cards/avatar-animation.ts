// ============================================
// Battle Cards — Kampf-Avatar-Animationen (Spritesheets)
// ============================================
// Card.avatarAnimationsJson ist in Prisma nur `Json` (siehe schema.prisma) —
// hier wird die Struktur geprüft, bevor sie an die Kampf-UI weitergereicht
// wird (gleiches Muster wie skill-schema.ts für die Skill-Felder).
//
// Format-Vertrag für die spätere Export-Pipeline (Blender/Mixamo → WebP,
// siehe Vorhaben-Dokument): ein Zustand = EIN Spritesheet-Bild (transparentes
// WebP/PNG), Frames nebeneinander in einer Zeile, alle Frames gleich breit.
// Die Sammlungs-Ansicht (Karten-Browser, Lineup, Kartendetail) bleibt
// unverändert das statische `Card.imageUrl` — nur der Kampf-Bildschirm
// (LiveBattleView/BattleScreen) nutzt diese Animationen, mit automatischem
// Rückfall auf das statische Bild, solange ein Zustand (oder das ganze Set)
// noch fehlt.

import { z } from "zod";

export const AVATAR_ANIMATION_STATES = ["idle", "attack", "hit", "victory"] as const;
export type AvatarAnimationState = (typeof AVATAR_ANIMATION_STATES)[number];

const avatarAnimationClipSchema = z.object({
  /** Spritesheet-URL, Frames nebeneinander, gleich breit (frameWidth = Bildbreite / frames). */
  spriteUrl: z.string().min(1),
  frames: z.number().int().min(1).max(60),
  /** Wiedergabe-Geschwindigkeit in Frames/Sekunde. */
  fps: z.number().min(1).max(60),
  /** Idle/Victory laufen standardmäßig in Schleife, Attack/Hit standardmäßig einmalig
   *  (siehe DEFAULT_LOOP unten) — hier nur zum Überschreiben nötig. */
  loop: z.boolean().optional(),
});

export type AvatarAnimationClip = z.infer<typeof avatarAnimationClipSchema>;

const avatarAnimationSetSchema = z
  .object({
    idle: avatarAnimationClipSchema.optional(),
    attack: avatarAnimationClipSchema.optional(),
    hit: avatarAnimationClipSchema.optional(),
    victory: avatarAnimationClipSchema.optional(),
  })
  .partial();

export type AvatarAnimationSet = z.infer<typeof avatarAnimationSetSchema>;

export const DEFAULT_LOOP: Record<AvatarAnimationState, boolean> = {
  idle: true,
  attack: false,
  hit: false,
  victory: true,
};

/** Parst Card.avatarAnimationsJson — `null`/`undefined`/leeres Objekt liefert `null`
 *  (Karte hat noch keine Kampf-Animationen, UI fällt aufs statische Bild zurück).
 *  Ein strukturell kaputter Wert wirft NICHT, sondern liefert ebenfalls `null` —
 *  eine fehlerhafte Animation soll den Kampf nicht blockieren, nur unanimiert bleiben. */
export function parseAvatarAnimations(value: unknown): AvatarAnimationSet | null {
  if (value == null) return null;
  const result = avatarAnimationSetSchema.safeParse(value);
  if (!result.success) return null;
  const set = result.data;
  const hasAnyClip = AVATAR_ANIMATION_STATES.some((state) => set[state] != null);
  return hasAnyClip ? set : null;
}

/** Liefert den Clip für den gewünschten Zustand, mit Rückfall auf `idle` (z.B. wenn
 *  nur Idle exportiert wurde, aber noch keine Attack-Animation existiert). */
export function pickAvatarAnimationClip(
  set: AvatarAnimationSet | null | undefined,
  state: AvatarAnimationState
): AvatarAnimationClip | null {
  if (!set) return null;
  return set[state] ?? (state !== "idle" ? set.idle ?? null : null) ?? null;
}
