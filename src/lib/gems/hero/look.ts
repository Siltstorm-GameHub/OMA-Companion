// ============================================
// OMA Gems — Helden-Look (Cartoon-Stil mit Outline)
// ============================================
// Ein Held besteht aus Bausteinen auf einem gemeinsamen Gerüst (siehe parts.tsx und
// docs/gems-helden-geruest.md): Grundfigur (Körperbau + Waffe, an die Klasse gebunden), Gesicht,
// Hautton, Frisur und Haarfarbe, Farbschema der Ausrüstung, Emblem, Kopfbedeckung, Accessoire, Pose
// und Kartenhintergrund.
// Card.heroLook speichert die Auswahl; fehlt sie, gibt es feste Looks für die Standard-Karten und
// einen stabilen Zufalls-Look aus der Karten-Id für alle anderen. Rein, ohne DOM und ohne DB.

export type HeroClass = "TANK" | "DAMAGE_DEALER" | "SUPPORT";

export interface HeroLook {
  v: 2;
  base: string;
  face: string;
  skin: number;
  hair: string;
  hairColor: number;
  scheme: string;
  emblem: string;
  headgear: string;
  accessory: string;
  pose: string;
  /** Kartenhintergrund (HERO_BACKDROPS, gezeichnet in components/gems/HeroBackdrop.tsx). */
  backdrop: string;
}

interface Option {
  id: string;
  label: string;
}

/** Grundfiguren: Körperbau und Waffe, je Klasse zwei. */
export const HERO_BASES: (Option & { cls: HeroClass })[] = [
  { id: "tank-schild", label: "Schildträger", cls: "TANK" },
  { id: "tank-axt", label: "Axtkämpfer", cls: "TANK" },
  { id: "dd-klinge", label: "Klinge", cls: "DAMAGE_DEALER" },
  { id: "dd-bogen", label: "Bogen", cls: "DAMAGE_DEALER" },
  { id: "support-stab", label: "Stab", cls: "SUPPORT" },
  { id: "support-laterne", label: "Laterne", cls: "SUPPORT" },
];

export const HERO_FACES: Option[] = [
  { id: "froehlich", label: "Fröhlich" },
  { id: "entschlossen", label: "Entschlossen" },
  { id: "grinsen", label: "Grinsen" },
  { id: "ruhig", label: "Ruhig" },
  { id: "frech", label: "Frech" },
  { id: "staunend", label: "Staunend" },
];

export const HERO_SKINS: { base: string; shade: string }[] = [
  { base: "#f8dcc2", shade: "#e8bf9c" },
  { base: "#f1c7a3", shade: "#dfab82" },
  { base: "#e2ad85", shade: "#c98f66" },
  { base: "#c68c62", shade: "#a8714a" },
  { base: "#9c6440", shade: "#7f4e30" },
  { base: "#6f4329", shade: "#57331f" },
];

export const HERO_HAIRS: Option[] = [
  { id: "kurz", label: "Kurz" },
  { id: "stachelig", label: "Stachelig" },
  { id: "pony", label: "Pony" },
  { id: "lang", label: "Lang" },
  { id: "zopf", label: "Zopf" },
  { id: "locken", label: "Locken" },
  { id: "irokese", label: "Irokese" },
  { id: "glatze", label: "Glatze" },
];

export const HERO_HAIR_COLORS: { label: string; base: string; shade: string }[] = [
  { label: "Schwarz", base: "#2a2f3a", shade: "#161a22" },
  { label: "Braun", base: "#7a4a24", shade: "#5a3417" },
  { label: "Blond", base: "#e9c35a", shade: "#c9a03d" },
  { label: "Rot", base: "#d4561c", shade: "#a53f12" },
  { label: "Pink", base: "#f472b6", shade: "#db4f97" },
  { label: "Blau", base: "#60a5fa", shade: "#3b82f6" },
  { label: "Weiß", base: "#eceef2", shade: "#c9ced8" },
  { label: "Grün", base: "#4ade80", shade: "#22b35e" },
];

/** Farbschemata der Ausrüstung: main (Fläche), dark (Schatten), light (Glanz), metal (Rüstteile). */
export const HERO_SCHEMES: (Option & { main: string; dark: string; light: string; metal: string })[] = [
  { id: "tuerkis", label: "OMA-Türkis", main: "#14b8a6", dark: "#0f766e", light: "#5eead4", metal: "#94a3b8" },
  { id: "rot", label: "Kampfrot", main: "#ef4444", dark: "#b91c1c", light: "#fca5a5", metal: "#a1a1aa" },
  { id: "violett", label: "Violett", main: "#8b5cf6", dark: "#6d28d9", light: "#c4b5fd", metal: "#a5b4fc" },
  { id: "nacht", label: "Mitternacht", main: "#3b82f6", dark: "#1e3a8a", light: "#93c5fd", metal: "#64748b" },
  { id: "glut", label: "Glut", main: "#f97316", dark: "#9a3412", light: "#fdba74", metal: "#a8a29e" },
  { id: "gold", label: "Saison-Gold", main: "#eab308", dark: "#854d0e", light: "#fde047", metal: "#fef3c7" },
  { id: "wald", label: "Wald", main: "#22c55e", dark: "#166534", light: "#86efac", metal: "#a3a38f" },
  { id: "rose", label: "Rose", main: "#ec4899", dark: "#9d174d", light: "#f9a8d4", metal: "#d4d4d8" },
];

export const HERO_EMBLEMS: Option[] = [
  { id: "juwel", label: "OMA-Juwel" },
  { id: "stern", label: "Stern" },
  { id: "krone", label: "Krone" },
  { id: "herz", label: "Herz" },
  { id: "blitz", label: "Blitz" },
];

export const HERO_HEADGEAR: Option[] = [
  { id: "keine", label: "Keine" },
  { id: "helm", label: "Helm" },
  { id: "kapuze", label: "Kapuze" },
  { id: "stirnband", label: "Stirnband" },
  { id: "muetze", label: "Mütze" },
];

export const HERO_ACCESSORIES: Option[] = [
  { id: "keins", label: "Keins" },
  { id: "umhang", label: "Umhang" },
  { id: "brille", label: "Brille" },
  { id: "schal", label: "Schal" },
  { id: "headset", label: "Headset" },
];

export const HERO_POSES: Option[] = [
  { id: "stehen", label: "Stehen" },
  { id: "angriff", label: "Angriff" },
  { id: "jubel", label: "Jubel" },
];

/** Kartenhintergründe im Cartoon-Stil (ersetzen die Pixel-Szenen). */
export const HERO_BACKDROPS: Option[] = [
  { id: "wiese", label: "Wiese" },
  { id: "wald", label: "Wald" },
  { id: "berge", label: "Berge" },
  { id: "kueste", label: "Küste" },
  { id: "wueste", label: "Wüste" },
  { id: "burg", label: "Burg" },
  { id: "nacht", label: "Nacht" },
  { id: "vulkan", label: "Vulkan" },
];

/** Hintergründe, die allen von Anfang an offenstehen (Zufalls-Looks wählen nur daraus). */
const FREE_BACKDROPS = ["wiese", "wald", "berge"];

const CLASS_SCHEME: Record<HeroClass, string> = { TANK: "tuerkis", DAMAGE_DEALER: "rot", SUPPORT: "violett" };

const has = (list: Option[], id: unknown): id is string => typeof id === "string" && list.some((o) => o.id === id);
const index = (len: number, value: unknown, fallback: number) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value < len ? value : fallback;

export function basesForClass(cls: HeroClass): string[] {
  return HERO_BASES.filter((b) => b.cls === cls).map((b) => b.id);
}

export function classOfBase(base: string): HeroClass {
  return HERO_BASES.find((b) => b.id === base)?.cls ?? "TANK";
}

/** Stabiler Zufall aus einem Text — gleiche Karte, gleiche Figur. */
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Grund-Look einer Klasse — nur kostenlose Teile, Farbschema in Klassenfarbe. */
export function defaultLook(cls: HeroClass): HeroLook {
  return {
    v: 2,
    base: basesForClass(cls)[0],
    face: "froehlich",
    skin: 1,
    hair: "kurz",
    hairColor: 1,
    scheme: CLASS_SCHEME[cls],
    emblem: "juwel",
    headgear: cls === "TANK" ? "helm" : "keine",
    accessory: "keins",
    pose: "stehen",
    backdrop: "wiese",
  };
}

/** Stabiler Zufalls-Look für Karten ohne eigenen Look (aus der Karten-Id). */
export function randomLook(seed: string, cls: HeroClass): HeroLook {
  const rng = seededRandom(seed);
  const pick = <T,>(items: T[]): T => items[Math.floor(rng() * items.length)];
  const bases = basesForClass(cls);
  const headgearChance = cls === "TANK" ? 0.6 : cls === "SUPPORT" ? 0.4 : 0.3;
  const classHeadgear = cls === "TANK" ? "helm" : cls === "SUPPORT" ? "kapuze" : "stirnband";
  // Reihenfolge der Zufallszüge nicht ändern — sonst sähen bestehende Karten anders aus.
  const look: Omit<HeroLook, "backdrop"> = {
    v: 2,
    base: pick(bases),
    face: pick(HERO_FACES).id,
    skin: Math.floor(rng() * HERO_SKINS.length),
    hair: pick(HERO_HAIRS.filter((h) => h.id !== "glatze")).id,
    hairColor: Math.floor(rng() * HERO_HAIR_COLORS.length),
    scheme: CLASS_SCHEME[cls],
    emblem: "juwel",
    headgear: rng() < headgearChance ? classHeadgear : "keine",
    accessory: "keins",
    pose: "stehen",
  };
  return { ...look, backdrop: pick(FREE_BACKDROPS) };
}

/** Prüft einen gespeicherten Look feldweise; Ungültiges fällt auf den Grund-Look zurück. Die
 *  Grundfigur muss zur Klasse der Karte passen. */
export function sanitizeHeroLook(raw: unknown, cls: HeroClass, fallback: HeroLook = defaultLook(cls)): HeroLook {
  if (!raw || typeof raw !== "object") return fallback;
  const r = raw as Record<string, unknown>;
  return {
    v: 2,
    base: typeof r.base === "string" && basesForClass(cls).includes(r.base) ? r.base : fallback.base,
    face: has(HERO_FACES, r.face) ? r.face : fallback.face,
    skin: index(HERO_SKINS.length, r.skin, fallback.skin),
    hair: has(HERO_HAIRS, r.hair) ? r.hair : fallback.hair,
    hairColor: index(HERO_HAIR_COLORS.length, r.hairColor, fallback.hairColor),
    scheme: has(HERO_SCHEMES, r.scheme) ? r.scheme : fallback.scheme,
    emblem: has(HERO_EMBLEMS, r.emblem) ? r.emblem : fallback.emblem,
    headgear: has(HERO_HEADGEAR, r.headgear) ? r.headgear : fallback.headgear,
    accessory: has(HERO_ACCESSORIES, r.accessory) ? r.accessory : fallback.accessory,
    pose: has(HERO_POSES, r.pose) ? r.pose : fallback.pose,
    backdrop: has(HERO_BACKDROPS, r.backdrop) ? r.backdrop : fallback.backdrop,
  };
}

const L = (look: Omit<HeroLook, "v">): HeroLook => ({ v: 2, ...look });

/** Feste Looks der 9 Standard-Karten — feste Charaktere, nicht veränderbar. */
export const STANDARD_LOOKS: Record<string, HeroLook> = {
  Bastionella: L({ backdrop: "burg", base: "tank-schild", face: "entschlossen", skin: 1, hair: "lang", hairColor: 3, scheme: "tuerkis", emblem: "juwel", headgear: "helm", accessory: "keins", pose: "stehen" }),
  Betonbert: L({ backdrop: "berge", base: "tank-axt", face: "grinsen", skin: 3, hair: "kurz", hairColor: 0, scheme: "tuerkis", emblem: "juwel", headgear: "helm", accessory: "keins", pose: "stehen" }),
  Kupferkurt: L({ backdrop: "wueste", base: "tank-schild", face: "ruhig", skin: 2, hair: "locken", hairColor: 1, scheme: "glut", emblem: "juwel", headgear: "keine", accessory: "schal", pose: "stehen" }),
  Scherbe: L({ backdrop: "wiese", base: "dd-klinge", face: "grinsen", skin: 2, hair: "stachelig", hairColor: 0, scheme: "rot", emblem: "juwel", headgear: "keine", accessory: "schal", pose: "angriff" }),
  Fernrohr: L({ backdrop: "kueste", base: "dd-bogen", face: "entschlossen", skin: 4, hair: "kurz", hairColor: 2, scheme: "rot", emblem: "juwel", headgear: "keine", accessory: "brille", pose: "stehen" }),
  Nachtklinge: L({ backdrop: "nacht", base: "dd-klinge", face: "ruhig", skin: 0, hair: "pony", hairColor: 6, scheme: "nacht", emblem: "blitz", headgear: "kapuze", accessory: "keins", pose: "angriff" }),
  Pflästerchen: L({ backdrop: "wiese", base: "support-stab", face: "froehlich", skin: 0, hair: "pony", hairColor: 4, scheme: "violett", emblem: "herz", headgear: "kapuze", accessory: "keins", pose: "stehen" }),
  Kato_09: L({ backdrop: "wald", base: "support-laterne", face: "frech", skin: 2, hair: "zopf", hairColor: 5, scheme: "violett", emblem: "juwel", headgear: "keine", accessory: "headset", pose: "stehen" }),
  Trübsal: L({ backdrop: "wald", base: "support-stab", face: "staunend", skin: 5, hair: "irokese", hairColor: 7, scheme: "wald", emblem: "juwel", headgear: "muetze", accessory: "keins", pose: "stehen" }),
};

/** Der Look einer Karte: gespeicherter Look, sonst der feste der Standard-Karten, sonst ein stabiler
 *  Zufalls-Look aus der Karten-Id. */
export function effectiveHeroLook(card: { id: string; name: string; rarity: string; class: HeroClass; heroLook?: unknown }): HeroLook {
  const standard = card.rarity === "STANDARD" ? STANDARD_LOOKS[card.name] : undefined;
  const fallback = standard ?? randomLook(card.id, card.class);
  return card.heroLook ? sanitizeHeroLook(card.heroLook, card.class, fallback) : fallback;
}

/** Look einer Kampf-Einheit. Kämpfe, die vor den Cartoon-Helden gespeichert wurden, tragen im JSON
 *  nur die frühere Pixel-Figur (Feld „teCharacter“) — für sie wird der Look aus Karten-Id, Name und
 *  Klasse abgeleitet. Monster (ohne beides) bleiben Bild. */
export function heroLookForUnit(unit: {
  cardId: string;
  name: string;
  class: HeroClass;
  rarity?: string;
  heroLook?: HeroLook | null;
}): HeroLook | null {
  if (unit.heroLook) return unit.heroLook;
  if (!(unit as { teCharacter?: unknown }).teCharacter) return null;
  return effectiveHeroLook({ id: unit.cardId, name: unit.name, rarity: unit.rarity ?? "STANDARD", class: unit.class });
}
