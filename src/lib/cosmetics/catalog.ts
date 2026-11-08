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

/**
 * Belohnungen, die Artikel freischalten (nicht käuflich). Werden bei jedem Shop-Aufruf aus den
 * echten Daten abgeleitet (lib/cosmetics/service.ts → getRewardKeys) — wird z.B. ein Turniersieger
 * nachträglich korrigiert, wandert die Freischaltung automatisch mit.
 */
export type RewardKey = "tournament_win" | "series_win" | "clip_month" | "clip_year" | "veteran" | "donor";

export const REWARD_META: Record<RewardKey, { label: string; requirement: string }> = {
  tournament_win: { label: "Turniersieg",     requirement: "Gewinne ein Turnier (Event-Pokal oder Eventreihe)." },
  series_win:     { label: "Eventreihe",      requirement: "Gewinne eine komplette Eventreihe." },
  clip_month:     { label: "Clip des Monats", requirement: "Gewinne die Abstimmung zum Clip des Monats." },
  clip_year:      { label: "Clip des Jahres", requirement: "Gewinne die Abstimmung zum Clip des Jahres." },
  veteran:        { label: "Veteran",         requirement: "Sei seit mindestens einem Jahr Mitglied der Community." },
  donor:          { label: "Spende",          requirement: "Unterstütze die Community mit einer Spende." },
};

export type CosmeticUnlock = { reputationLevel: number } | { reward: RewardKey };

/**
 * Jährlich wiederkehrende Saisons ("MM-DD", Berliner Zeit, jeweils inklusive; Ende darf im Folgejahr
 * liegen). `from`/`to` sind nur die Startwerte — der Admin kann Zeitraum und an/aus je Saison unter
 * /admin/shop ändern (ShopSettings.seasons, siehe availability.ts → seasonWindow).
 */
export type SeasonKey =
  | "winter" | "valentine" | "spring" | "easter" | "summer"
  | "autumn" | "halloween" | "christmas" | "newyear";

/** Zeitfenster "MM-DD" bis "MM-DD" (inklusive). */
export interface SeasonWindow { from: string; to: string }

export const SEASON_ORDER: SeasonKey[] = ["winter", "valentine", "spring", "easter", "summer", "autumn", "halloween", "christmas", "newyear"];

export const SEASONS: Record<SeasonKey, { name: string; emoji: string; from: string; to: string }> = {
  winter:    { name: "Winter",       emoji: "❄️", from: "01-07", to: "02-28" },
  valentine: { name: "Valentinstag", emoji: "💘", from: "02-07", to: "02-15" },
  spring:    { name: "Frühling",     emoji: "🌸", from: "03-20", to: "05-31" },
  easter:    { name: "Ostern",       emoji: "🐣", from: "03-25", to: "04-21" },
  summer:    { name: "Sommer",       emoji: "☀️", from: "06-01", to: "08-31" },
  autumn:    { name: "Herbst",       emoji: "🍂", from: "10-01", to: "11-30" },
  halloween: { name: "Halloween",    emoji: "🎃", from: "10-15", to: "11-05" },
  christmas: { name: "Weihnachten",  emoji: "🎄", from: "12-01", to: "12-26" },
  newyear:   { name: "Silvester",    emoji: "🎆", from: "12-27", to: "01-06" },
};

interface CosmeticBase {
  id: string;
  name: string;
  description?: string;
  rarity: CosmeticRarity;
  /** Startpreis in Münzen. null = nicht kaufbar (nur über `unlock` erhältlich). */
  defaultPrice: number | null;
  /** Wird automatisch freigeschaltet: Ansehens-Stufe (höchste je erreichte) oder eine Belohnung. */
  unlock?: CosmeticUnlock;
  /** Saison-Artikel: nur im Zeitfenster der Saison kaufbar (Besitz bleibt danach erhalten). */
  season?: SeasonKey;
  /** Wochen-Exklusiv: nur kaufbar, wenn der Artikel gerade in der Wochen-Rotation ist. */
  rotationOnly?: boolean;
}

/** Text, wie ein nicht käuflicher Artikel freigeschaltet wird. */
export function unlockRequirement(item: Cosmetic): string | null {
  const u = item.unlock;
  if (!u) return null;
  if ("reward" in u) return REWARD_META[u.reward].requirement;
  return item.description ?? `Erreiche Ansehens-Stufe ${u.reputationLevel} in den Community-Jobs.`;
}

/** Kurzlabel der Freischalt-Quelle (für Karten/Admin). */
export function unlockLabel(item: Cosmetic): string | null {
  const u = item.unlock;
  if (!u) return null;
  return "reward" in u ? REWARD_META[u.reward].label : "Community-Jobs";
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

export type AuraKind = "glow" | "pulse" | "sparkle" | "orbit" | "flame" | "ripple";

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

export type JobBadgeTier = "silver" | "gold" | "platinum";

export interface TitleCosmetic extends CosmeticBase {
  category: "title";
  text: string;
  /** Textfarbe des Titels */
  color: string;
  /** Community-Job-Titel: als Abzeichen mit Metall-Optik dargestellt (statt nur farbigem Text). */
  jobBadge?: JobBadgeTier;
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
  { id: "frame:emerald",  category: "frame", name: "Smaragd",       rarity: "common",    defaultPrice: 350,  colors: ["#064e3b", "#a7f3d0", "#10b981"], tier: 1, glow: 0,  speed: "12s" },
  { id: "frame:ice",      category: "frame", name: "Eiskristall",   rarity: "rare",      defaultPrice: 850,  colors: ["#0c4a6e", "#f0f9ff", "#7dd3fc"], tier: 2, glow: 10, speed: "10s" },
  { id: "frame:sakura",   category: "frame", name: "Kirschblüte",   rarity: "rare",      defaultPrice: 900,  colors: ["#831843", "#fff1f2", "#f9a8d4"], tier: 2, glow: 10, speed: "10s" },
  { id: "frame:midnight", category: "frame", name: "Mitternacht",   rarity: "rare",      defaultPrice: 1000, colors: ["#1e1b4b", "#c7d2fe", "#6366f1"], tier: 2, glow: 12, speed: "9s" },
  { id: "frame:toxic",    category: "frame", name: "Giftgrün",      rarity: "epic",      defaultPrice: 2200, colors: ["#1a2e05", "#ecfccb", "#84cc16"], tier: 3, glow: 16, speed: "7s" },
  { id: "frame:obsidian", category: "frame", name: "Obsidian",      rarity: "epic",      defaultPrice: 2500, colors: ["#09090b", "#ef4444", "#3f0d0d"], tier: 3, glow: 14, speed: "8s" },
  { id: "frame:prism",    category: "frame", name: "Prisma",        rarity: "legendary", defaultPrice: 6500, colors: ["#d946ef", "#22d3ee", "#facc15"], tier: 3, glow: 20, speed: "4s", pulse: true },

  // ── Auren ───────────────────────────────────────────────────────────────
  { id: "aura:teal-glow",   category: "aura", name: "Türkiser Schein",  rarity: "common",    defaultPrice: 400,  kind: "glow",    color: "#14b8a6" },
  { id: "aura:amber-glow",  category: "aura", name: "Goldener Schein",  rarity: "common",    defaultPrice: 400,  kind: "glow",    color: "#f59e0b" },
  { id: "aura:rose-pulse",  category: "aura", name: "Herzschlag",       rarity: "rare",      defaultPrice: 1000, kind: "pulse",   color: "#f43f5e" },
  { id: "aura:violet-pulse",category: "aura", name: "Arkaner Puls",     rarity: "rare",      defaultPrice: 1000, kind: "pulse",   color: "#8b5cf6" },
  { id: "aura:stardust",    category: "aura", name: "Sternenstaub",     rarity: "epic",      defaultPrice: 2500, kind: "sparkle", color: "#fde68a", color2: "#93c5fd" },
  { id: "aura:orbit",       category: "aura", name: "Umlaufbahn",       rarity: "epic",      defaultPrice: 2500, kind: "orbit",   color: "#22d3ee", color2: "#a78bfa" },
  { id: "aura:flame",       category: "aura", name: "Flammenkranz",     rarity: "legendary", defaultPrice: 6000, kind: "flame",   color: "#f97316", color2: "#fde047" },
  { id: "aura:emerald-glow", category: "aura", name: "Smaragdschein",    rarity: "common",    defaultPrice: 400,  kind: "glow",    color: "#10b981" },
  { id: "aura:ice-glow",     category: "aura", name: "Frostschein",      rarity: "common",    defaultPrice: 400,  kind: "glow",    color: "#7dd3fc" },
  { id: "aura:toxic-pulse",  category: "aura", name: "Giftpuls",         rarity: "rare",      defaultPrice: 1000, kind: "pulse",   color: "#84cc16" },
  { id: "aura:ripple",       category: "aura", name: "Schockwelle",      rarity: "rare",      defaultPrice: 1200, kind: "ripple",  color: "#38bdf8" },
  { id: "aura:ripple-gold",  category: "aura", name: "Goldene Wellen",   rarity: "epic",      defaultPrice: 2200, kind: "ripple",  color: "#fbbf24" },
  { id: "aura:fireflies",    category: "aura", name: "Glühwürmchen",     rarity: "epic",      defaultPrice: 2500, kind: "sparkle", color: "#bef264", color2: "#fde047" },
  { id: "aura:binary-star",  category: "aura", name: "Doppelstern",      rarity: "epic",      defaultPrice: 2800, kind: "orbit",   color: "#fbbf24", color2: "#f43f5e" },
  { id: "aura:frostfire",    category: "aura", name: "Eisflamme",        rarity: "legendary", defaultPrice: 6500, kind: "flame",   color: "#38bdf8", color2: "#e0f2fe" },

  // ── Profil-Hintergründe ─────────────────────────────────────────────────
  { id: "bg:midnight",  category: "background", name: "Mitternacht",  rarity: "common",    defaultPrice: 300,  css: "linear-gradient(135deg, rgba(30,58,138,0.35), rgba(15,23,42,0.1) 60%, rgba(30,27,75,0.35))" },
  { id: "bg:forest",    category: "background", name: "Waldlicht",    rarity: "common",    defaultPrice: 300,  css: "linear-gradient(160deg, rgba(20,83,45,0.4), rgba(6,78,59,0.1) 55%, rgba(132,204,22,0.15))" },
  { id: "bg:ember",     category: "background", name: "Glut",         rarity: "rare",      defaultPrice: 800,  css: "radial-gradient(ellipse at 15% 110%, rgba(234,88,12,0.45), transparent 60%), radial-gradient(ellipse at 90% -10%, rgba(220,38,38,0.3), transparent 55%)" },
  { id: "bg:ocean",     category: "background", name: "Tiefsee",      rarity: "rare",      defaultPrice: 800,  css: "radial-gradient(ellipse at 80% 120%, rgba(8,145,178,0.45), transparent 60%), linear-gradient(180deg, rgba(12,74,110,0.25), rgba(2,6,23,0.05))" },
  { id: "bg:aurora",    category: "background", name: "Polarlicht",   rarity: "epic",      defaultPrice: 2000, css: "linear-gradient(115deg, rgba(16,185,129,0.3), rgba(59,130,246,0.18) 40%, rgba(168,85,247,0.3) 75%, rgba(236,72,153,0.2))" },
  { id: "bg:sunset",    category: "background", name: "Abendrot",     rarity: "epic",      defaultPrice: 2000, css: "linear-gradient(180deg, rgba(251,146,60,0.35), rgba(236,72,153,0.25) 50%, rgba(91,33,182,0.3))" },
  { id: "bg:checker",   category: "background", name: "Zielflagge",   rarity: "rare",      defaultPrice: 1000, css: "repeating-conic-gradient(rgba(255,255,255,0.05) 0% 25%, transparent 0% 50%) 0 0 / 24px 24px, linear-gradient(135deg, rgba(20,184,166,0.15), transparent)" },
  { id: "bg:royal",     category: "background", name: "Königshalle",  rarity: "legendary", defaultPrice: 5000, css: "radial-gradient(circle at 50% -20%, rgba(251,191,36,0.4), transparent 55%), repeating-linear-gradient(45deg, rgba(251,191,36,0.06) 0 2px, transparent 2px 14px), linear-gradient(180deg, rgba(88,28,135,0.35), rgba(30,10,60,0.2))" },
  { id: "bg:desert",    category: "background", name: "Wüstensand",   rarity: "common",    defaultPrice: 300,  css: "linear-gradient(170deg, rgba(217,119,6,0.3), rgba(120,53,15,0.12) 60%, rgba(253,230,138,0.15))" },
  { id: "bg:lavender",  category: "background", name: "Lavendel",     rarity: "common",    defaultPrice: 300,  css: "linear-gradient(135deg, rgba(167,139,250,0.3), rgba(76,29,149,0.08) 60%, rgba(244,114,182,0.15))" },
  { id: "bg:sakura",    category: "background", name: "Kirschblüte",  rarity: "rare",      defaultPrice: 900,  css: "radial-gradient(circle at 12% 20%, rgba(249,168,212,0.35) 0 6%, transparent 7%), radial-gradient(circle at 78% 70%, rgba(249,168,212,0.25) 0 4%, transparent 5%), radial-gradient(circle at 55% 15%, rgba(255,241,242,0.2) 0 3%, transparent 4%), linear-gradient(160deg, rgba(190,24,93,0.25), rgba(80,7,36,0.1))" },
  { id: "bg:storm",     category: "background", name: "Gewitter",     rarity: "rare",      defaultPrice: 1000, css: "linear-gradient(115deg, transparent 46%, rgba(253,224,71,0.35) 47%, transparent 49%), linear-gradient(180deg, rgba(30,41,59,0.6), rgba(51,65,85,0.25))" },
  { id: "bg:carbon",    category: "background", name: "Carbon",       rarity: "rare",      defaultPrice: 1000, css: "repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 4px, transparent 4px 8px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.25) 0 4px, transparent 4px 8px), linear-gradient(180deg, rgba(39,39,42,0.5), rgba(9,9,11,0.3))" },
  { id: "bg:neon-grid", category: "background", name: "Neonraster",   rarity: "epic",      defaultPrice: 2200, css: "linear-gradient(rgba(236,72,153,0.18) 1px, transparent 1px) 0 0 / 22px 22px, linear-gradient(90deg, rgba(34,211,238,0.18) 1px, transparent 1px) 0 0 / 22px 22px, linear-gradient(180deg, rgba(88,28,135,0.35), rgba(15,23,42,0.2))" },
  { id: "bg:galaxy",    category: "background", name: "Galaxie",      rarity: "legendary", defaultPrice: 6000, css: "radial-gradient(circle at 20% 30%, #fff 0 1px, transparent 1.5px), radial-gradient(circle at 70% 20%, #fff 0 1px, transparent 1.5px), radial-gradient(circle at 85% 65%, #fff 0 1px, transparent 1.5px), radial-gradient(circle at 40% 80%, #fff 0 1px, transparent 1.5px), radial-gradient(circle at 10% 75%, #fff 0 1px, transparent 1.5px), radial-gradient(ellipse at 60% 50%, rgba(168,85,247,0.45), transparent 55%), radial-gradient(ellipse at 25% 40%, rgba(59,130,246,0.35), transparent 50%), linear-gradient(180deg, rgba(2,6,23,0.6), rgba(30,27,75,0.4))" },

  // ── Titel ───────────────────────────────────────────────────────────────
  { id: "title:newbie",      category: "title", name: "Frischling",       text: "Frischling",       color: "#a1a1aa", rarity: "common",    defaultPrice: 200 },
  { id: "title:lucky",       category: "title", name: "Glückspilz",       text: "Glückspilz",       color: "#4ade80", rarity: "common",    defaultPrice: 400 },
  { id: "title:nightowl",    category: "title", name: "Nachteule",        text: "Nachteule",        color: "#818cf8", rarity: "common",    defaultPrice: 400 },
  { id: "title:chatterbox",  category: "title", name: "Quasselstrippe",   text: "Quasselstrippe",   color: "#60a5fa", rarity: "rare",      defaultPrice: 800 },
  { id: "title:tactician",   category: "title", name: "Taktiker",         text: "Taktiker",         color: "#2dd4bf", rarity: "rare",      defaultPrice: 800 },
  { id: "title:shark",       category: "title", name: "Turnier-Hai",      text: "Turnier-Hai",      color: "#38bdf8", rarity: "epic",      defaultPrice: 2000 },
  { id: "title:oracle",      category: "title", name: "Orakel",           text: "Orakel",           color: "#c084fc", rarity: "epic",      defaultPrice: 2000 },
  { id: "title:legend",      category: "title", name: "Lebende Legende",  text: "Lebende Legende",  color: "#fbbf24", rarity: "legendary", defaultPrice: 6000 },
  { id: "title:regular",      category: "title", name: "Stammgast",        text: "Stammgast",        color: "#a8a29e", rarity: "common",    defaultPrice: 300 },
  { id: "title:teamplayer",   category: "title", name: "Teamplayer",       text: "Teamplayer",       color: "#34d399", rarity: "common",    defaultPrice: 400 },
  { id: "title:calm",         category: "title", name: "Ruhepol",          text: "Ruhepol",          color: "#93c5fd", rarity: "common",    defaultPrice: 400 },
  { id: "title:partybeast",   category: "title", name: "Feierbiest",       text: "Feierbiest",       color: "#f472b6", rarity: "rare",      defaultPrice: 800 },
  { id: "title:comeback",     category: "title", name: "Comeback-Kid",     text: "Comeback-Kid",     color: "#fb923c", rarity: "rare",      defaultPrice: 900 },
  { id: "title:clutch",       category: "title", name: "Clutch-Ass",       text: "Clutch-Ass",       color: "#f87171", rarity: "epic",      defaultPrice: 2000 },
  { id: "title:trophyhunter", category: "title", name: "Pokaljäger",       text: "Pokaljäger",       color: "#facc15", rarity: "epic",      defaultPrice: 2200 },
  { id: "title:finalboss",    category: "title", name: "Endgegner",        text: "Endgegner",        color: "#ef4444", rarity: "legendary", defaultPrice: 6000 },
  { id: "title:oldmaster",    category: "title", name: "Old Master",       text: "Old Master",       color: "#2dd4bf", rarity: "legendary", defaultPrice: 8000 },
  // Community-Job-Titel (nicht kaufbar, über das Ansehen freigeschaltet) — IDs bleiben, damit ausgerüstete Titel erhalten bleiben
  { id: "title:rep-silver",  category: "title", name: "Community-Job: Silber", text: "Community-Job: Silber", color: "#d4dae3", jobBadge: "silver",   rarity: "rare",      defaultPrice: null, unlock: { reputationLevel: 2 }, description: "Exklusiv: Erreiche in den Community-Jobs die Stufe Silber." },
  { id: "title:rep-gold",    category: "title", name: "Community-Job: Gold",   text: "Community-Job: Gold",   color: "#fbbf24", jobBadge: "gold",     rarity: "epic",      defaultPrice: null, unlock: { reputationLevel: 3 }, description: "Exklusiv: Erreiche in den Community-Jobs die Stufe Gold." },
  { id: "title:rep-platinum",category: "title", name: "Community-Job: Platin", text: "Community-Job: Platin", color: "#a5f3fc", jobBadge: "platinum", rarity: "legendary", defaultPrice: null, unlock: { reputationLevel: 4 }, description: "Exklusiv: Erreiche in den Community-Jobs die Stufe Platin." },

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
  { id: "name:mint",     category: "nameColor", name: "Minze",        color: "#6ee7b7", rarity: "common",    defaultPrice: 400 },
  { id: "name:lavender", category: "nameColor", name: "Lavendel",     color: "#c4b5fd", rarity: "common",    defaultPrice: 400 },
  { id: "name:copper",   category: "nameColor", name: "Kupfer",       color: "#e0915a", rarity: "common",    defaultPrice: 400 },
  { id: "name:ice",      category: "nameColor", name: "Eisblau",      color: "#bae6fd", rarity: "rare",      defaultPrice: 1000 },
  { id: "name:crimson",  category: "nameColor", name: "Blutrot",      color: "#ef4444", rarity: "rare",      defaultPrice: 1000 },
  { id: "name:fire",     category: "nameColor", name: "Feuer",        color: "#f97316", gradient: "linear-gradient(90deg, #fde047, #f97316, #dc2626)", rarity: "epic", defaultPrice: 2500 },
  { id: "name:toxic",    category: "nameColor", name: "Giftig",       color: "#a3e635", gradient: "linear-gradient(90deg, #d9f99d, #84cc16, #15803d)", rarity: "epic", defaultPrice: 2500 },
  { id: "name:galaxy",   category: "nameColor", name: "Galaxie",      color: "#a78bfa", gradient: "linear-gradient(90deg, #60a5fa, #a78bfa, #f0abfc, #60a5fa)", rarity: "epic", defaultPrice: 2800 },
  { id: "name:goldleaf", category: "nameColor", name: "Blattgold",    color: "#fbbf24", gradient: "linear-gradient(90deg, #fef3c7, #fbbf24, #b45309, #fde68a)", rarity: "legendary", defaultPrice: 6500 },

  // ── Saison-Artikel (nur im Zeitfenster der Saison kaufbar) ───────────────
  { id: "bg:autumn-leaves",   category: "background", name: "Herbstlaub",     rarity: "rare",      defaultPrice: 900,  season: "autumn",    css: "radial-gradient(circle at 15% 25%, rgba(234,88,12,0.4) 0 5%, transparent 6%), radial-gradient(circle at 70% 15%, rgba(202,138,4,0.35) 0 4%, transparent 5%), radial-gradient(circle at 85% 75%, rgba(185,28,28,0.35) 0 5%, transparent 6%), radial-gradient(circle at 35% 85%, rgba(217,119,6,0.3) 0 3.5%, transparent 4.5%), linear-gradient(170deg, rgba(120,53,15,0.4), rgba(69,26,3,0.15))" },
  { id: "name:autumn",        category: "nameColor",  name: "Laubfarben",     rarity: "epic",      defaultPrice: 2000, season: "autumn",    color: "#ea580c", gradient: "linear-gradient(90deg, #facc15, #ea580c, #b91c1c, #ca8a04)" },
  { id: "frame:pumpkin",      category: "frame",      name: "Kürbis",         rarity: "epic",      defaultPrice: 2200, season: "halloween", colors: ["#431407", "#fed7aa", "#f97316"], tier: 3, glow: 16, speed: "7s" },
  { id: "aura:ghost",         category: "aura",       name: "Geisterhauch",   rarity: "epic",      defaultPrice: 2400, season: "halloween", kind: "sparkle", color: "#e9d5ff", color2: "#a3e635" },
  { id: "title:ghosthunter",  category: "title",      name: "Geisterjäger",   rarity: "rare",      defaultPrice: 900,  season: "halloween", text: "Geisterjäger", color: "#a3e635" },
  { id: "frame:candycane",    category: "frame",      name: "Zuckerstange",   rarity: "epic",      defaultPrice: 2200, season: "christmas", colors: ["#7f1d1d", "#ffffff", "#ef4444"], tier: 3, glow: 14, speed: "6s" },
  { id: "aura:snow",          category: "aura",       name: "Schneegestöber", rarity: "epic",      defaultPrice: 2400, season: "christmas", kind: "sparkle", color: "#ffffff", color2: "#bae6fd" },
  { id: "bg:winter-forest",   category: "background", name: "Winterwald",     rarity: "rare",      defaultPrice: 900,  season: "christmas", css: "radial-gradient(circle at 20% 20%, #fff 0 1px, transparent 1.5px), radial-gradient(circle at 60% 35%, #fff 0 1px, transparent 1.5px), radial-gradient(circle at 85% 15%, #fff 0 1px, transparent 1.5px), radial-gradient(circle at 40% 60%, #fff 0 1px, transparent 1.5px), linear-gradient(0deg, rgba(20,83,45,0.45), transparent 45%), linear-gradient(180deg, rgba(30,58,138,0.35), rgba(15,23,42,0.15))" },
  { id: "title:elf",          category: "title",      name: "Wichtel",        rarity: "rare",      defaultPrice: 900,  season: "christmas", text: "Wichtel", color: "#f87171" },
  { id: "aura:fireworks",     category: "aura",       name: "Feuerwerk",      rarity: "legendary", defaultPrice: 5500, season: "newyear",   kind: "sparkle", color: "#f472b6", color2: "#facc15" },
  { id: "name:fireworks",     category: "nameColor",  name: "Funkenregen",    rarity: "epic",      defaultPrice: 2500, season: "newyear",   color: "#facc15", gradient: "linear-gradient(90deg, #f472b6, #facc15, #38bdf8, #f472b6)" },
  { id: "title:newyear",      category: "title",      name: "Neujahrs-Held",  rarity: "rare",      defaultPrice: 900,  season: "newyear",   text: "Neujahrs-Held", color: "#facc15" },
  // Winter
  { id: "frame:frostcrown",   category: "frame",      name: "Frostkrone",       rarity: "epic",      defaultPrice: 2200, season: "winter",    colors: ["#0c4a6e", "#ffffff", "#bae6fd"], tier: 3, glow: 16, speed: "8s" },
  { id: "aura:blizzard",      category: "aura",       name: "Schneesturm",      rarity: "epic",      defaultPrice: 2400, season: "winter",    kind: "sparkle", color: "#ffffff", color2: "#7dd3fc" },
  { id: "bg:polar-night",     category: "background", name: "Polarnacht",       rarity: "rare",      defaultPrice: 900,  season: "winter",    css: "radial-gradient(ellipse at 50% -10%, rgba(34,211,238,0.35), transparent 55%), linear-gradient(100deg, transparent 20%, rgba(16,185,129,0.22) 40%, rgba(129,140,248,0.2) 60%, transparent 80%), linear-gradient(180deg, rgba(8,47,73,0.55), rgba(2,6,23,0.4))" },
  { id: "title:frostbite",    category: "title",      name: "Frostbeule",       rarity: "rare",      defaultPrice: 800,  season: "winter",    text: "Frostbeule", color: "#7dd3fc" },
  // Valentinstag
  { id: "frame:rosegold",     category: "frame",      name: "Roségold",         rarity: "epic",      defaultPrice: 2200, season: "valentine", colors: ["#881337", "#ffe4e6", "#fb7185"], tier: 3, glow: 16, speed: "7s", pulse: true },
  { id: "aura:hearts",        category: "aura",       name: "Herzflattern",     rarity: "epic",      defaultPrice: 2400, season: "valentine", kind: "sparkle", color: "#f43f5e", color2: "#f9a8d4" },
  { id: "name:valentine",     category: "nameColor",  name: "Verliebt",         rarity: "epic",      defaultPrice: 2000, season: "valentine", color: "#fb7185", gradient: "linear-gradient(90deg, #fda4af, #f43f5e, #f9a8d4)" },
  { id: "title:sweetheart",   category: "title",      name: "Herzblatt",        rarity: "rare",      defaultPrice: 800,  season: "valentine", text: "Herzblatt", color: "#f472b6" },
  // Frühling
  { id: "bg:meadow",          category: "background", name: "Blütenwiese",      rarity: "rare",      defaultPrice: 900,  season: "spring",    css: "radial-gradient(circle at 15% 80%, rgba(244,114,182,0.4) 0 4%, transparent 5%), radial-gradient(circle at 40% 90%, rgba(250,204,21,0.4) 0 3%, transparent 4%), radial-gradient(circle at 75% 85%, rgba(196,181,253,0.4) 0 4%, transparent 5%), linear-gradient(0deg, rgba(34,197,94,0.35), transparent 50%), linear-gradient(180deg, rgba(125,211,252,0.25), rgba(15,23,42,0.1))" },
  { id: "aura:pollen",        category: "aura",       name: "Blütenstaub",      rarity: "rare",      defaultPrice: 1100, season: "spring",    kind: "sparkle", color: "#fde047", color2: "#bbf7d0" },
  { id: "name:spring",        category: "nameColor",  name: "Frühlingsbote",    rarity: "epic",      defaultPrice: 2000, season: "spring",    color: "#86efac", gradient: "linear-gradient(90deg, #86efac, #f9a8d4, #fde68a)" },
  { id: "title:springfever",  category: "title",      name: "Frühlingsgefühle", rarity: "rare",      defaultPrice: 800,  season: "spring",    text: "Frühlingsgefühle", color: "#f9a8d4" },
  // Ostern
  { id: "frame:easteregg",    category: "frame",      name: "Osterei",          rarity: "epic",      defaultPrice: 2000, season: "easter",    colors: ["#a5b4fc", "#fef9c3", "#f9a8d4"], tier: 3, glow: 12, speed: "9s" },
  { id: "aura:easter",        category: "aura",       name: "Pastellglanz",     rarity: "rare",      defaultPrice: 1100, season: "easter",    kind: "orbit", color: "#f9a8d4", color2: "#a5f3fc" },
  { id: "bg:easter",          category: "background", name: "Eiersuche",        rarity: "rare",      defaultPrice: 900,  season: "easter",    css: "radial-gradient(ellipse 5% 7% at 20% 75%, rgba(249,168,212,0.55), transparent), radial-gradient(ellipse 5% 7% at 55% 85%, rgba(165,243,252,0.55), transparent), radial-gradient(ellipse 5% 7% at 82% 70%, rgba(253,224,71,0.5), transparent), linear-gradient(0deg, rgba(74,222,128,0.3), transparent 45%), linear-gradient(180deg, rgba(196,181,253,0.2), rgba(15,23,42,0.1))" },
  { id: "title:egghunter",    category: "title",      name: "Eiersucher",       rarity: "rare",      defaultPrice: 800,  season: "easter",    text: "Eiersucher", color: "#fde68a" },
  // Sommer
  { id: "frame:sunshine",     category: "frame",      name: "Sonnenschein",     rarity: "epic",      defaultPrice: 2200, season: "summer",    colors: ["#9a3412", "#fef9c3", "#facc15"], tier: 3, glow: 18, speed: "6s" },
  { id: "aura:heatwave",      category: "aura",       name: "Hitzewelle",       rarity: "epic",      defaultPrice: 2400, season: "summer",    kind: "ripple", color: "#fb923c" },
  { id: "bg:beach",           category: "background", name: "Strandabend",      rarity: "rare",      defaultPrice: 900,  season: "summer",    css: "radial-gradient(circle at 70% 55%, rgba(253,186,116,0.6), transparent 22%), linear-gradient(180deg, rgba(251,146,60,0.35), rgba(236,72,153,0.25) 45%, rgba(14,165,233,0.35) 60%, rgba(253,230,138,0.25) 85%)" },
  { id: "name:tropical",      category: "nameColor",  name: "Tropisch",         rarity: "epic",      defaultPrice: 2000, season: "summer",    color: "#2dd4bf", gradient: "linear-gradient(90deg, #facc15, #fb923c, #2dd4bf)" },

  // ── Wochen-Exklusiv (je Woche ist einer davon kaufbar) ──────────────────
  { id: "frame:nebula",   category: "frame",      name: "Nebel",         rarity: "legendary", defaultPrice: 7000, rotationOnly: true, colors: ["#4c1d95", "#f5d0fe", "#ec4899"], tier: 3, glow: 22, speed: "5s", pulse: true },
  { id: "aura:comet",     category: "aura",       name: "Komet",         rarity: "legendary", defaultPrice: 7000, rotationOnly: true, kind: "orbit", color: "#fde68a", color2: "#f97316" },
  { id: "bg:synthwave",   category: "background", name: "Synthwave",     rarity: "legendary", defaultPrice: 6500, rotationOnly: true, css: "linear-gradient(rgba(236,72,153,0.25) 1px, transparent 1px) 0 60% / 100% 14px, radial-gradient(circle at 50% 75%, rgba(251,146,60,0.55), transparent 35%), linear-gradient(180deg, rgba(76,29,149,0.55), rgba(190,24,93,0.35) 70%, rgba(15,23,42,0.4))" },
  { id: "name:holo",      category: "nameColor",  name: "Hologramm",     rarity: "legendary", defaultPrice: 7000, rotationOnly: true, color: "#a5f3fc", gradient: "linear-gradient(90deg, #a5f3fc, #f0abfc, #fef08a, #a7f3d0, #a5f3fc)" },
  { id: "title:mythic",   category: "title",      name: "Mythos",        rarity: "legendary", defaultPrice: 7500, rotationOnly: true, text: "Mythos", color: "#f0abfc" },

  // ── Belohnungen (nicht käuflich) ─────────────────────────────────────────
  { id: "frame:champion",        category: "frame",     name: "Champion",       rarity: "legendary", defaultPrice: null, unlock: { reward: "tournament_win" }, colors: ["#7c2d12", "#fef3c7", "#f59e0b"], tier: 3, glow: 20, speed: "6s", pulse: true },
  { id: "title:series-champion", category: "title",     name: "Serienchampion", rarity: "legendary", defaultPrice: null, unlock: { reward: "series_win" },     text: "Serienchampion", color: "#f59e0b" },
  { id: "aura:spotlight",        category: "aura",      name: "Rampenlicht",    rarity: "epic",      defaultPrice: null, unlock: { reward: "clip_month" },     kind: "ripple", color: "#e879f9" },
  { id: "title:clip-legend",     category: "title",     name: "Clip-Legende",   rarity: "legendary", defaultPrice: null, unlock: { reward: "clip_year" },      text: "Clip-Legende", color: "#e879f9" },
  { id: "title:veteran",         category: "title",     name: "Veteran",        rarity: "rare",      defaultPrice: null, unlock: { reward: "veteran" },        text: "Veteran", color: "#94a3b8" },
  { id: "name:donor",            category: "nameColor", name: "Herzblut",       rarity: "epic",      defaultPrice: null, unlock: { reward: "donor" },          color: "#f43f5e", gradient: "linear-gradient(90deg, #fda4af, #f43f5e, #be123c)" },
  { id: "title:supporter",       category: "title",     name: "Supporter",      rarity: "epic",      defaultPrice: null, unlock: { reward: "donor" },          text: "Supporter", color: "#fb7185" },
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
    .filter((c): c is TitleCosmetic => c.category === "title" && repLevel(c) !== null && repLevel(c)! <= peakLevel)
    .sort((a, b) => repLevel(b)! - repLevel(a)!);
}

function repLevel(c: Cosmetic): number | null {
  return c.unlock && "reputationLevel" in c.unlock ? c.unlock.reputationLevel : null;
}

/** Per Belohnung freigeschaltete Artikel (bei gegebenen erreichten Belohnungen). */
export function rewardItemsFor(rewards: Iterable<RewardKey>): Cosmetic[] {
  const set = new Set(rewards);
  return COSMETICS.filter(c => !!c.unlock && "reward" in c.unlock && set.has(c.unlock.reward));
}

// ── Sets ──────────────────────────────────────────────────────────────────────
// Thematisch passende Artikel als Bündel. Preis = Summe der noch fehlenden Artikel (jeweils zum
// aktuellen Preis inkl. Wochen-Rabatt) abzüglich Set-Rabatt. Nur kaufbar, wenn alle fehlenden
// Artikel gerade kaufbar sind.

export interface CosmeticSet {
  id: string;
  name: string;
  description: string;
  items: string[];
  discountPct: number;
}

export const COSMETIC_SETS: CosmeticSet[] = [
  { id: "set:fire",    name: "Feuer-Set",       description: "Für alle, die heiß laufen.",               items: ["frame:inferno", "aura:flame", "name:fire", "title:clutch"],          discountPct: 20 },
  { id: "set:ice",     name: "Eis-Set",         description: "Kühler Kopf, kalte Clutches.",             items: ["frame:ice", "aura:frostfire", "name:ice", "title:calm"],             discountPct: 20 },
  { id: "set:galaxy",  name: "Galaxie-Set",     description: "Nicht von dieser Welt.",                   items: ["frame:violet", "aura:stardust", "bg:galaxy", "name:galaxy"],         discountPct: 20 },
  { id: "set:sakura",  name: "Kirschblüten-Set",description: "Sanft, aber gefährlich.",                  items: ["frame:sakura", "bg:sakura", "name:rose", "aura:rose-pulse"],         discountPct: 15 },
  { id: "set:toxic",   name: "Gift-Set",        description: "Nichts für schwache Nerven.",              items: ["frame:toxic", "aura:toxic-pulse", "name:toxic", "bg:neon-grid"],     discountPct: 15 },
  { id: "set:gold",    name: "Gold-Set",        description: "Für Pokaljäger mit Stil.",                 items: ["frame:gold", "aura:ripple-gold", "name:goldleaf", "title:trophyhunter"], discountPct: 20 },
  { id: "set:starter", name: "Einsteiger-Set",  description: "Der günstige Start in die Kosmetik.",      items: ["frame:teal", "aura:teal-glow", "name:teal", "title:newbie"],         discountPct: 25 },
];

export function getSet(id: string): CosmeticSet | undefined {
  return COSMETIC_SETS.find(s => s.id === id);
}

// ── Zeit (Berliner Datum) für Saison & Wochen-Rotation ─────────────────────────

/** Datum in Berliner Zeit als { y, m, d }. */
export function berlinDate(now: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(now);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

const mmdd = (m: number, d: number) => m * 100 + d;
const parseMmdd = (s: string) => { const [m, d] = s.split("-").map(Number); return mmdd(m, d); };

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Gültiges "MM-DD" (29.02. erlaubt — in Nicht-Schaltjahren greift dann der 28.02. bzw. 01.03.). */
export function isValidMmdd(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{2}-\d{2}$/.test(s)) return false;
  const [m, d] = s.split("-").map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= DAYS_IN_MONTH[m - 1];
}

/** "MM-DD" → "TT.MM." */
export function formatMmdd(s: string): string {
  const [m, d] = s.split("-");
  return `${d}.${m}.`;
}

export function isSeasonActive(season: SeasonKey, now: Date, window: SeasonWindow = SEASONS[season]): boolean {
  const { m, d } = berlinDate(now);
  const cur = mmdd(m, d);
  const from = parseMmdd(window.from);
  const to = parseMmdd(window.to);
  return from <= to ? cur >= from && cur <= to : cur >= from || cur <= to;
}

/** Ende (letzter Tag, 23:59:59 Berliner Zeit ≈ UTC+1) der gerade laufenden Saison. */
export function seasonEnd(season: SeasonKey, now: Date, window: SeasonWindow = SEASONS[season]): Date {
  const { y, m } = berlinDate(now);
  const [tm, td] = window.to.split("-").map(Number);
  const year = tm < m ? y + 1 : y; // Saison läuft über den Jahreswechsel
  return new Date(Date.UTC(year, tm - 1, td, 22, 59, 59));
}

/** ISO-Woche des Berliner Datums, z.B. "2026-W45" — Schlüssel für die Wochen-Rotation (Wechsel montags). */
export function isoWeekKey(now: Date): string {
  const { y, m, d } = berlinDate(now);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Nächster Montag 00:00 Berliner Zeit (≈ UTC+1) — Ende der aktuellen Angebotswoche. */
export function weekEnd(now: Date): Date {
  const { y, m, d } = berlinDate(now);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + (8 - day));
  return new Date(date.getTime() - 60 * 60_000);
}

/** Deterministische Auswahl (gleiche Woche → gleiche Artikel für alle). */
export function seededPick<T>(items: T[], count: number, seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rand = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr.slice(0, Math.max(0, count));
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
