// Pixel-Figuren (Time Elements) der Standard-Karten — Einzige Quelle: Seed-Daten und Kartenansicht nutzen dieselbe Liste,
// damit die Figur auch ohne erneuten Seed in der Datenbank erscheint.
import type { TeCharacterConfig } from "@/lib/te-character";

export const STANDARD_AVATARS: Record<string, TeCharacterConfig> = {
  "Bastionella": {"v": 1, "skin": 3, "layers": {"head": "head5", "hair": "hair10_c1", "top": "top15_c3", "bottom": "bottom13_c3", "weapon": "sword1"}},
  "Betonbert": {"v": 1, "skin": 0, "layers": {"head": "head9", "hat": "hat3", "top": "top17_c8", "bottom": "bottom12_c8", "weapon": "shield2L_c2"}},
  "Scherbe": {"v": 1, "skin": 1, "layers": {"head": "head2", "hat": "hat4_c2", "top": "top13", "bottom": "bottom9", "weapon": "sword2_c3"}},
  "Fernrohr": {"v": 1, "skin": 5, "layers": {"head": "head1", "hair": "hair3_c1", "top": "top19_c5", "bottom": "bottom10_c7", "weapon": "gun1"}},
  "Pflästerchen": {"v": 1, "skin": 2, "layers": {"head": "head6", "hair": "hair13_c8", "top": "top17_c8", "bottom": "bottom14_c6", "weapon": "wand1_c8"}},
  "Kato_09": {"v": 1, "skin": 1, "layers": {"head": "head4", "hair": "hair16_c5", "top": "top22_c9", "bottom": "bottom11_c6"}},
  "Kupferkurt": {"v": 1, "skin": 3, "layers": {"head": "head8", "hat": "hat3_c1", "top": "top14_c7", "bottom": "bottom8_c4", "weapon": "shield2L_c3"}},
  "Nachtklinge": {"v": 1, "skin": 1, "layers": {"head": "head3", "hat": "hat5_c2", "top": "top18_c8", "bottom": "bottom5_c3", "weapon": "sword2"}},
  "Trübsal": {"v": 1, "skin": 0, "layers": {"head": "head7", "hat": "hat6_c2", "top": "top22_c9", "bottom": "bottom6_c4", "weapon": "wand1_c2"}},
};

export const standardAvatarOf = (name: string, rarity: string): TeCharacterConfig | null => (rarity === "STANDARD" ? STANDARD_AVATARS[name] ?? null : null);
