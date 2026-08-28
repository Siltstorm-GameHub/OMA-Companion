// ============================================
// Karten-Bild auflösen — Community-Karten nutzen live das Profilbild
// ============================================
// Community-Karten zeigen automatisch das aktuelle Profilbild (User.image)
// des verknüpften Mitglieds — nicht als Snapshot gespeichert, sondern bei
// jedem Rendern frisch aufgelöst, damit ein späterer Avatar-Wechsel sich
// sofort niederschlägt. Ausnahme: "imageUrl" steht in card.overriddenFields
// (z.B. ein Admin hat manuell ein eigenes Bild gesetzt) — dann gilt der
// gespeicherte Card.imageUrl-Wert.

export interface CardImageInput {
  rarity: "STANDARD" | "COMMUNITY";
  imageUrl: string | null;
  linkedDiscordId: string | null;
  overriddenFields: string[];
}

export function resolveCardImageUrl(
  card: CardImageInput,
  avatarByDiscordId: Map<string, string | null>
): string | null {
  if (card.rarity === "COMMUNITY" && card.linkedDiscordId && !card.overriddenFields.includes("imageUrl")) {
    const live = avatarByDiscordId.get(card.linkedDiscordId);
    if (live) return live;
  }
  return card.imageUrl;
}
