// ============================================
// Kosmetik-Katalog (Shop) — Optik der Artikel
// ============================================
// Bewusst ohne Imports von prisma & Co.: wird auch von Client-Components (Avatar, Name, Shop)
// genutzt. Preise/Verfügbarkeit kommen NICHT von hier, sondern aus der Admin-Konfiguration
// (lib/cosmetics/config.ts) — `defaultPrice` ist nur der Startwert, solange der Admin nichts setzt.
//
// Neue Artikel: einfach hier anhängen. IDs niemals umbenennen — sie stehen in UserCosmetic.itemId
// und im ausgerüsteten Set der User (User.equippedCosmeticsJson).

export type CosmeticCategory = "frame" | "aura" | "background" | "title" | "nameColor";
export type CosmeticRarity = "common" | "rare" | "epic" | "legendary";

interface CosmeticBase {
  id: string;
  name: string;
  description?: string;
  rarity: CosmeticRarity;
  /** Startpreis in Münzen. null = nicht kaufbar (nur über `unlock` erhältlich). */
  defaultPrice: number | null;
  /** Wird automatisch freigeschaltet, z.B. über die Ansehens-Stufe (höchste je erreichte). */
  unlock?: { reputationLevel: number };
}

/** Rahmen = der (frühere Ansehens-)Ring ums Profilbild. Farben dunkel/mittel/hell, Stufe = Effekt-Stärke. */
export interface FrameCosmetic extends CosmeticBase {
  category: "frame";
  colors: [string, string, string];
  tier: 1 | 2 | 3;
  /** Glow in px (0 = keiner) */
  glow: number;
  /** Zusätzlicher Puls des Glows */
  pulse?: boolean;
  /** Dauer einer Umdrehung */
  speed: string;
}

export type AuraKind = "glow" | "pulse" | "sparkle" | "orbit" | "flame";

/** Aura = Effekt AUSSERHALB des Rahmens. */
export interface AuraCosmetic extends CosmeticBase {
  category: "aura";
  kind: AuraKind;
  color: string;
  color2?: string;
}

/** Hintergrund der Profil-Kopfkarte (CSS background). */
export interface BackgroundCosmetic extends CosmeticBase {
  category: "background";
  css: string;
}

export interface TitleCosmetic extends CosmeticBase {
  category: "title";
  text: string;
  /** Textfarbe des Titels */
  color: string;
}

/** Namensfarbe: einfarbig oder als Verlauf (dann per background-clip:text). */
export interface NameColorCosmetic extends CosmeticBase {
  category: "nameColor";
  color: string;
  gradient?: string;
}

export type Cosmetic = FrameCosmetic | AuraCosmetic | BackgroundCosmetic | TitleCosmetic | NameColorCosmetic;

export const CATEGORY_META: Record<CosmeticCategory, { label: string; plural: string; hint: string }> = {
  frame:      { label: "Rahmen",       plural: "Rahmen",          hint: "Der Ring um dein Profilbild — überall in der App sichtbar." },
  aura:       { label: "Aura",         plural: "Auren",           hint: "Ein Effekt rund um dein Profilbild, zusätzlich zum Rahmen." },
  background: { label: "Hintergrund",  plural: "Hintergründe",    hint: "Der Hintergrund deiner Profil-Kopfkarte." },
  title:      { label: "Titel",        plural: "Titel",           hint: "Steht unter deinem Namen auf Profil und Rangliste." },
  nameColor:  { label: "Namensfarbe",  plural: "Namensfarben",    hint: "Färbt deinen Namen auf Profil und Rangliste." },
};

export const CATEGORY_ORDER: CosmeticCategory[] = ["frame", "aura", "background", "title", "nameColor"];

export const RARITY_META: Record<CosmeticRarity, { label: string; color: string }> = {
  common:    { label: "Gewöhnlich", color: "#a1a1aa" },
  rare:      { label: "Selten",     color: "#38bdf8" },
  epic:      { label: "Episch",     color: "#a78bfa" },
  legendary: { label: "Legendär",   color: "#fbbf24" },
};

export const COSMETICS: Cosmetic[] = [
  // ── Rahmen ──────────────────────────────────────────────────────────────
  { id: "frame:steel",    category: "frame", name: "Stahl",         rarity: "common",    defaultPrice: 300,  colors: ["#27272a", "#e4e4e7", "#71717a"], tier: 1, glow: 0,  speed: "12s" },
  { id: "frame:teal",     category: "frame", name: "Türkis",        rarity: "common",    defaultPrice: 300,  colors: ["#0f3d39", "#99f6e4", "#14b8a6"], tier: 1, glow: 0,  speed: "12s" },
  { id: "frame:bronze",   category: "frame", name: "Bronze",        rarity: "common",    defaultPrice: 400,  colors: ["#5c391a", "#f0c9a0", "#cd7f32"], tier: 1, glow: 0,  speed: "12s" },
  { id: "frame:rose",     category: "frame", name: "Rosé",          rarity: "rare",      defaultPrice: 800,  colors: ["#4c0519", "#fecdd3", "#f43f5e"], tier: 2, glow: 10, speed: "10s" },
  { id: "frame:silver",   category: "frame", name: "Silber",        rarity: "rare",      defaultPrice: 900,  colors: ["#4b5563", "#f1f5f9", "#c0c7d1"], tier: 2, glow: 10, speed: "10s" },
  { id: "frame:violet",   category: "frame", name: "Amethyst",      rarity: "epic",      defaultPrice: 2000, colors: ["#2e1065", "#ddd6fe", "#8b5cf6"], tier: 3, glow: 16, speed: "8s" },
  { id: "frame:gold",     category: "frame", name: "Gold",          rarity: "epic",      defaultPrice: 2500, colors: ["#713f12", "#fef3c7", "#fbbf24"], tier: 3, glow: 16, speed: "8s" },
  { id: "frame:platinum", category: "frame", name: "Platin",        rarity: "legendary", defaultPrice: 5000, colors: ["#164e63", "#ecfeff", "#a5f3fc"], tier: 3, glow: 22, speed: "6s", pulse: true },
  { id: "frame:inferno",  category: "frame", name: "Inferno",       rarity: "legendary", defaultPrice: 6000, colors: ["#7f1d1d", "#fde047", "#f97316"], tier: 3, glow: 22, speed: "5s", pulse: true },

  // ── Auren ───────────────────────────────────────────────────────────────
  { id: "aura:teal-glow",   category: "aura", name: "Türkiser Schein",  rarity: "common",    defaultPrice: 400,  kind: "glow",    color: "#14b8a6" },
  { id: "aura:amber-glow",  category: "aura", name: "Goldener Schein",  rarity: "common",    defaultPrice: 400,  kind: "glow",    color: "#f59e0b" },
  { id: "aura:rose-pulse",  category: "aura", name: "Herzschlag",       rarity: "rare",      defaultPrice: 1000, kind: "pulse",   color: "#f43f5e" },
  { id: "aura:violet-pulse",category: "aura", name: "Arkaner Puls",     rarity: "rare",      defaultPrice: 1000, kind: "pulse",   color: "#8b5cf6" },
  { id: "aura:stardust",    category: "aura", name: "Sternenstaub",     rarity: "epic",      defaultPrice: 2500, kind: "sparkle", color: "#fde68a", color2: "#93c5fd" },
  { id: "aura:orbit",       category: "aura", name: "Umlaufbahn",       rarity: "epic",      defaultPrice: 2500, kind: "orbit",   color: "#22d3ee", color2: "#a78bfa" },
  { id: "aura:flame",       category: "aura", name: "Flammenkranz",     rarity: "legendary", defaultPrice: 6000, kind: "flame",   color: "#f97316", color2: "#fde047" },

  // ── Profil-Hintergründe ─────────────────────────────────────────────────
  { id: "bg:midnight",  category: "background", name: "Mitternacht",  rarity: "common",    defaultPrice: 300,  css: "linear-gradient(135deg, rgba(30,58,138,0.35), rgba(15,23,42,0.1) 60%, rgba(30,27,75,0.35))" },
  { id: "bg:forest",    category: "background", name: "Waldlicht",    rarity: "common",    defaultPrice: 300,  css: "linear-gradient(160deg, rgba(20,83,45,0.4), rgba(6,78,59,0.1) 55%, rgba(132,204,22,0.15))" },
  { id: "bg:ember",     category: "background", name: "Glut",         rarity: "rare",      defaultPrice: 800,  css: "radial-gradient(ellipse at 15% 110%, rgba(234,88,12,0.45), transparent 60%), radial-gradient(ellipse at 90% -10%, rgba(220,38,38,0.3), transparent 55%)" },
  { id: "bg:ocean",     category: "background", name: "Tiefsee",      rarity: "rare",      defaultPrice: 800,  css: "radial-gradient(ellipse at 80% 120%, rgba(8,145,178,0.45), transparent 60%), linear-gradient(180deg, rgba(12,74,110,0.25), rgba(2,6,23,0.05))" },
  { id: "bg:aurora",    category: "background", name: "Polarlicht",   rarity: "epic",      defaultPrice: 2000, css: "linear-gradient(115deg, rgba(16,185,129,0.3), rgba(59,130,246,0.18) 40%, rgba(168,85,247,0.3) 75%, rgba(236,72,153,0.2))" },
  { id: "bg:sunset",    category: "background", name: "Abendrot",     rarity: "epic",      defaultPrice: 2000, css: "linear-gradient(180deg, rgba(251,146,60,0.35), rgba(236,72,153,0.25) 50%, rgba(91,33,182,0.3))" },
  { id: "bg:checker",   category: "background", name: "Zielflagge",   rarity: "rare",      defaultPrice: 1000, css: "repeating-conic-gradient(rgba(255,255,255,0.05) 0% 25%, transparent 0% 50%) 0 0 / 24px 24px, linear-gradient(135deg, rgba(20,184,166,0.15), transparent)" },
  { id: "bg:royal",     category: "background", name: "Königshalle",  rarity: "legendary", defaultPrice: 5000, css: "radial-gradient(circle at 50% -20%, rgba(251,191,36,0.4), transparent 55%), repeating-linear-gradient(45deg, rgba(251,191,36,0.06) 0 2px, transparent 2px 14px), linear-gradient(180deg, rgba(88,28,135,0.35), rgba(30,10,60,0.2))" },

  // ── Titel ───────────────────────────────────────────────────────────────
  { id: "title:newbie",      category: "title", name: "Frischling",       text: "Frischling",       color: "#a1a1aa", rarity: "common",    defaultPrice: 200 },
  { id: "title:lucky",       category: "title", name: "Glückspilz",       text: "Glückspilz",       color: "#4ade80", rarity: "common",    defaultPrice: 400 },
  { id: "title:nightowl",    category: "title", name: "Nachteule",        text: "Nachteule",        color: "#818cf8", rarity: "common",    defaultPrice: 400 },
  { id: "title:chatterbox",  category: "title", name: "Quasselstrippe",   text: "Quasselstrippe",   color: "#60a5fa", rarity: "rare",      defaultPrice: 800 },
  { id: "title:tactician",   category: "title", name: "Taktiker",         text: "Taktiker",         color: "#2dd4bf", rarity: "rare",      defaultPrice: 800 },
  { id: "title:shark",       category: "title", name: "Turnier-Hai",      text: "Turnier-Hai",      color: "#38bdf8", rarity: "epic",      defaultPrice: 2000 },
  { id: "title:oracle",      category: "title", name: "Orakel",           text: "Orakel",           color: "#c084fc", rarity: "epic",      defaultPrice: 2000 },
  { id: "title:legend",      category: "title", name: "Lebende Legende",  text: "Lebende Legende",  color: "#fbbf24", rarity: "legendary", defaultPrice: 6000 },
  // Ansehen (nicht kaufbar) — ersetzt den früheren Ansehens-Ring
  { id: "title:rep-silver",  category: "title", name: "Silbernes Ansehen", text: "Silbernes Ansehen", color: "#c0c7d1", rarity: "rare",      defaultPrice: null, unlock: { reputationLevel: 2 }, description: "Erreiche Ansehen-Stufe Silber in den Community-Jobs." },
  { id: "title:rep-gold",    category: "title", name: "Goldenes Ansehen",  text: "Goldenes Ansehen",  color: "#fbbf24", rarity: "epic",      defaultPrice: null, unlock: { reputationLevel: 3 }, description: "Erreiche Ansehen-Stufe Gold in den Community-Jobs." },
  { id: "title:rep-platinum",category: "title", name: "Platin-Ansehen",    text: "Platin-Ansehen",    color: "#a5f3fc", rarity: "legendary", defaultPrice: null, unlock: { reputationLevel: 4 }, description: "Erreiche Ansehen-Stufe Platin in den Community-Jobs." },

  // ── Namensfarben ────────────────────────────────────────────────────────
  { id: "name:teal",     category: "nameColor", name: "Türkis",       color: "#2dd4bf", rarity: "common",    defaultPrice: 400 },
  { id: "name:sky",      category: "nameColor", name: "Himmelblau",   color: "#38bdf8", rarity: "common",    defaultPrice: 400 },
  { id: "name:rose",     category: "nameColor", name: "Rosé",         color: "#fb7185", rarity: "common",    defaultPrice: 400 },
  { id: "name:lime",     category: "nameColor", name: "Limette",      color: "#a3e635", rarity: "common",    defaultPrice: 400 },
  { id: "name:gold",     category: "nameColor", name: "Gold",         color: "#fbbf24", rarity: "rare",      defaultPrice: 1000 },
  { id: "name:violet",   category: "nameColor", name: "Amethyst",     color: "#c084fc", rarity: "rare",      defaultPrice: 1000 },
  { id: "name:sunset",   category: "nameColor", name: "Abendrot",     color: "#fb923c", gradient: "linear-gradient(90deg, #fb923c, #f43f5e, #a855f7)", rarity: "epic", defaultPrice: 2500 },
  { id: "name:ocean",    category: "nameColor", name: "Ozean",        color: "#22d3ee", gradient: "linear-gradient(90deg, #22d3ee, #3b82f6, #14b8a6)", rarity: "epic", defaultPrice: 2500 },
  { id: "name:rainbow",  category: "nameColor", name: "Regenbogen",   color: "#f472b6", gradient: "linear-gradient(90deg, #f87171, #fbbf24, #4ade80, #38bdf8, #a78bfa, #f472b6)", rarity: "legendary", defaultPrice: 6000 },
];

const BY_ID = new Map(COSMETICS.map(c => [c.id, c]));

export function getCosmetic(id: string | null | undefined): Cosmetic | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function getCosmeticOf<C extends CosmeticCategory>(id: string | null | undefined, category: C): Extract<Cosmetic, { category: C }> | undefined {
  const c = getCosmetic(id);
  return c && c.category === category ? (c as Extract<Cosmetic, { category: C }>) : undefined;
}

/** Ausgerüstetes Set. Fehlender Key = nichts gewählt (bei Titel: bester Ansehens-Titel automatisch), null = bewusst leer. */
export type EquippedCosmetics = Partial<Record<CosmeticCategory, string | null>>;

export function parseEquipped(json: string | null | undefined): EquippedCosmetics {
  if (!json) return {};
  try {
    const raw = JSON.parse(json);
    if (!raw || typeof raw !== "object") return {};
    const out: EquippedCosmetics = {};
    for (const cat of CATEGORY_ORDER) {
      const v = (raw as Record<string, unknown>)[cat];
      if (v === null) out[cat] = null;
      else if (typeof v === "string" && getCosmeticOf(v, cat)) out[cat] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/** Freigeschaltete Ansehens-Titel bei gegebener (höchster) Ansehens-Stufe — der beste zuerst. */
export function reputationTitlesFor(peakLevel: number): TitleCosmetic[] {
  return COSMETICS
    .filter((c): c is TitleCosmetic => c.category === "title" && !!c.unlock && c.unlock.reputationLevel <= peakLevel)
    .sort((a, b) => (b.unlock!.reputationLevel - a.unlock!.reputationLevel));
}

/**
 * Was ein User nach außen zeigt (aufgelöst, für Avatar/Name/Titel). Wird vom Server berechnet
 * (lib/cosmetics/service.ts → getUserLooks) und an Client-Components weitergereicht.
 */
export interface UserLook {
  frame?: string;
  aura?: string;
  nameColor?: string;
  title?: string;
  background?: string;
}

/** Ausgerüstetes Set → sichtbares Aussehen. Titel ohne Wahl = bester Ansehens-Titel. */
export function resolveLook(equipped: EquippedCosmetics, reputationPeakLevel: number): UserLook {
  const look: UserLook = {};
  for (const cat of ["frame", "aura", "nameColor", "background"] as const) {
    const id = equipped[cat];
    if (id && getCosmeticOf(id, cat)) look[cat] = id;
  }
  if (equipped.title === undefined) {
    const best = reputationTitlesFor(reputationPeakLevel)[0];
    if (best) look.title = best.id;
  } else if (equipped.title && getCosmeticOf(equipped.title, "title")) {
    look.title = equipped.title;
  }
  return look;
}
