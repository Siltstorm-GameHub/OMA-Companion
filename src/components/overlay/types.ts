/**
 * Gemeinsame Typen und Maße der OBS-Overlays (Event-, Profil- und Streamer-Overlay). Bewusst ohne
 * "use client" und ohne React-Abhängigkeit, damit auch Server-Code (Streams, Layout-Parser,
 * Speichern der Einstellungen) dieselben Definitionen nutzt.
 */
import type { SeriesRankingRow } from "@/lib/seriesRanking";
import type { PauseElementKey, ClipElementKey } from "./sceneLayouts";

export type OverlayEntry = {
  id: string;
  userId: string | null;
  teamId: string | null;
  placement: number | null;
  score: number | null;
  statsJson: string | null;
};

export type OverlayMatch = {
  id: string;
  round: number;
  position: number;
  title: string | null;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  score1: number | null;
  score2: number | null;
  playedAt: string | null;
  entries: OverlayEntry[];
};

export type OverlayUser = { id: string; name: string | null; username: string | null; image: string | null; rankPoints: number };
export type OverlayParticipant = { userId: string; user: OverlayUser };

/** In diesem Projekt hält `name` die rohe (meist kleingeschriebene) Discord-Login-Kennung,
 *  `username` den vom User selbst gepflegten Anzeigenamen mit korrekter Groß-/Kleinschreibung —
 *  daher hier wie im Rest der App `username` zuerst. */
export function displayName(u: OverlayUser | undefined | null): string {
  return u?.username ?? u?.name ?? "Unbekannt";
}

export type OverlayStreamer = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  rankPoints: number;
  twitchLogin: string | null;
};

export type SeriesTable = { seriesName: string; ranking: SeriesRankingRow[] };

/** Inhalt des Event-Overlays, so wie ihn der Stream liefert (siehe lib/overlay-state.ts). */
export type EventOverlayState = {
  id: string;
  title: string;
  status: string;
  format: string | null;
  tournamentStatus: string | null;
  game: string | null;
  statFields: string | null;
  matches: OverlayMatch[];
  participants: OverlayParticipant[];
  /** Profildaten des Streamers, dem dieses Overlay gehört — null bei Event-Links ohne
   *  `streamer`-Parameter oder wenn der User seither gelöscht wurde. */
  streamer: OverlayStreamer | null;
  /** Ligapunkte je User, die dieses Event zu seiner Eventreihe beiträgt — leer, wenn das Event
   *  zu keiner Reihe gehört oder die Spielphase noch nicht abgeschlossen ist. */
  ligaPunkteByUser: Record<string, number>;
  /** Gesamttabelle der Eventreihe (separat von der Einzelevent-"table") — null, wenn das Event
   *  zu keiner Reihe gehört. */
  seriesTable: SeriesTable | null;
  /** Live-Steuerung durchs Touchscreen-Widget (Event.overlayControlJson, siehe schema.prisma) —
   *  `hidden` blendet Elemente unabhängig vom Layout aus, `zoom` zeigt genau ein Element als
   *  Vollbild-Kachel. */
  control: { hidden: ElementKey[]; zoom: ElementKey | null };
};

export type UpcomingEvent = {
  id: string; title: string; startAt: string; game: string | null; coverUrl: string | null;
  /** Spiel passt zu dem, was der Streamer gerade auf Twitch spielt — wird zuerst gezeigt. */
  matchesCurrentGame: boolean;
};

/** Ein Eintrag der Community-Kachel (rotiert intern durch alle vorhandenen). */
export type CommunityItem =
  | { kind: "clip"; label: string; title: string; thumbnailUrl: string | null; by: string | null }
  | { kind: "poll"; question: string; options: { label: string; percent: number }[]; totalVotes: number; ended: boolean }
  | { kind: "wanderpokal"; holders: { title: string; name: string; image: string | null; winCount: number }[] };

/** Ein gerade live streamendes Community-Mitglied (Raid-Tipp). */
export type LiveMember = { userId: string; name: string; image: string | null; twitchLogin: string; game: string; viewers: number };

/** Inhalt des persönlichen Profil-Overlays (kein Turnierkontext). */
export type ProfileOverlayState = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  twitchLogin: string | null;
  rankPoints: number;
  rankLabel: string;
  /** Spiel, das der Streamer gerade auf Twitch eingestellt hat (null = nicht live). */
  currentGame: string | null;
  upcomingEvents: UpcomingEvent[];
  community: CommunityItem[];
  liveMembers: LiveMember[];
};

// ── Layout ────────────────────────────────────────────────────────────────────

/** `cycle` lässt ein Element abwechselnd für `onSec` sichtbar und für `offSec` unsichtbar
 *  sein statt dauerhaft zu stehen — z.B. um Platz mit dem Gameplay zu teilen, ohne zu stapeln. */
export type ElementCycle = { onSec: number; offSec: number };
/** Position in Prozent von 1920×1080 (oben links des Elements), optional Größe und Zyklus. */
export type LayoutEntry = { x: number; y: number; scale?: number; cycle?: ElementCycle };
export type LayoutPositions<K extends string> = Partial<Record<K, LayoutEntry>>;

/** Ein vollständiges Layout: welche Elemente wo stehen plus Rotationstakt gestapelter Elemente. */
export type OverlayLayout<K extends string> = { elements: LayoutPositions<K>; rotateSeconds: number };

/** Frei platzierbare Elemente des Event-Overlays. "brand" ist als einziges fix und nie Teil
 *  eines Stapels (siehe STACKABLE_ELEMENTS) — alle anderen dürfen sich zu einer rotierenden
 *  Gruppe stapeln, wenn der Streamer sie in den Einstellungen aufeinander zieht. */
export type ElementKey = "brand" | "liveinfo" | "ticker" | "bracket" | "table" | "seriesTable" | "participants";
export const ELEMENT_KEYS: ElementKey[] = ["brand", "liveinfo", "ticker", "bracket", "table", "seriesTable", "participants"];
export const STACKABLE_ELEMENTS: ElementKey[] = ["liveinfo", "ticker", "bracket", "table", "seriesTable", "participants"];

/** Elemente des persönlichen Profil-Overlays — kleinerer Satz, da kein Turnierkontext existiert. */
export type ProfileElementKey = "brand" | "rank" | "nextEvent" | "community" | "liveMembers";
export const PROFILE_ELEMENT_KEYS: ProfileElementKey[] = ["brand", "rank", "nextEvent", "community", "liveMembers"];
export const PROFILE_STACKABLE: ProfileElementKey[] = ["rank", "nextEvent", "community", "liveMembers"];

/** Nominelle Kachelgrößen (px bei 1920×1080) — für die Kollisionsvermeidung beim Ziehen in
 *  den Einstellungen und für die Breite der jeweils aktiven Kachel im Overlay selbst. Etwas
 *  großzügiger als die tatsächliche Mindestgröße bemessen (Inhalt variiert), damit sich
 *  Elemente in den Einstellungen auch bei mehr Inhalt nie ungewollt berühren. */
/** Einheitliche Kachelmaße: EINE Breite, drei Höhen. Gleich große Kacheln lassen sich passgenau
 *  stapeln und rotieren ohne Größensprung; ein gemischter Stapel nimmt fest die größte Höhe an. */
export const TILE_WIDTH = 460;
export const TILE_HEIGHT = { bar: 90, card: 200, panel: 340 } as const;
const BAR = { width: TILE_WIDTH, height: TILE_HEIGHT.bar };
const CARD = { width: TILE_WIDTH, height: TILE_HEIGHT.card };
const PANEL = { width: TILE_WIDTH, height: TILE_HEIGHT.panel };

export const ELEMENT_SIZE: Record<ElementKey, { width: number; height: number }> = {
  brand:        BAR,
  liveinfo:     BAR,
  ticker:       BAR,
  bracket:      PANEL,
  table:        PANEL,
  seriesTable:  PANEL,
  participants: PANEL,
};

export const PROFILE_ELEMENT_SIZE: Record<ProfileElementKey, { width: number; height: number }> = {
  brand:       BAR,
  rank:        CARD,
  nextEvent:   CARD,
  community:   CARD,
  liveMembers: CARD,
};

export const DEFAULT_ROTATE_SECONDS = 14;
export const EDGE_MARGIN = 28;    // Abstand aller Kacheln zum Bildschirmrand
export const PANEL_FADE_MS = 900;
export const CYCLE_FADE_MS = 1000;
export const ZOOM_EXIT_MS = 500; // muss zur oma-zoom-out-Animationsdauer in MotionStyles passen
/** Platz, den der Panel-Rahmen selbst braucht (Innenabstand, Rahmen, Überschrift) — der Rest der
 *  Kachelhöhe gehört dem Inhalt, damit Listen und Karten die Kachel bis unten ausfüllen. */
export const PANEL_CHROME = 62;
export const PANEL_LIST_HEIGHT = TILE_HEIGHT.panel - PANEL_CHROME; // Listen scrollen intern statt die Kachel wachsen zu lassen
export const PANEL_LIST_HEIGHT_COMPACT = PANEL_LIST_HEIGHT;
/** Inhaltshöhe der Karten (Nächstes Event, Clips, Gerade live). */
export const CARD_BODY_HEIGHT = TILE_HEIGHT.card - PANEL_CHROME;

/** Die fünf Größenstufen der Kacheln (Editor und Live-Steuerung) — klein bis groß. */
export const SCALE_STEPS = [
  { value: 0.7, label: "XS", title: "Sehr klein" },
  { value: 0.85, label: "S", title: "Klein" },
  { value: 1, label: "M", title: "Normal" },
  { value: 1.15, label: "L", title: "Groß" },
  { value: 1.3, label: "XL", title: "Sehr groß" },
] as const;

/** Nächstgelegene Größenstufe (ältere Layouts hatten stufenlose Werte). */
export function snapScale(scale: number | undefined): number {
  const s = scale ?? 1;
  return SCALE_STEPS.reduce((best, step) => (Math.abs(step.value - s) < Math.abs(best - s) ? step.value : best), 1 as number);
}
export const TICKER_ENTRIES_WIDTH = 400; // Feste Breite für die FFA-Mitspielerliste im Match-Ticker

/** Payload des festen Streamer-Links: zeigt das gerade gestreamte Event, sonst das Profil. */
export type StreamerOverlayPayload = (
  | { mode: "event"; eventId: string; event: EventOverlayState; layout: OverlayLayout<ElementKey> }
  | {
      mode: "profile"; profile: ProfileOverlayState; layout: OverlayLayout<ProfileElementKey>;
      /** Eigene Live-Steuerung, aufs Profil-Overlay zugeschnitten (im Event-Modus steckt sie in event.control). */
      profileControl: { hidden: ProfileElementKey[]; zoom: ProfileElementKey | null };
    }
) & {
  /** Daten des Streamers selbst — braucht auch die Pausen-Szene im Event-Modus. */
  streamer: OverlayStreamer;
  /** Text der Pausen-Szene (null = Standardtext). */
  pauseText: string | null;
  /** Leicht-Modus: keine Unschärfe-/Glas-Effekte, keine Dauer-Animationen. */
  lite: boolean;
  /** Per Live-Steuerung gewählte Szene — gilt für den Link ohne `&scene=`. */
  scene: OverlayScene;
  /** Hintergrund der Pausen-Szene (Schlüssel aus pauseBackgrounds.ts). */
  pauseBackground: string;
  /** Einstellungen der Clip-Szenen (Intro, Clips, Outro). */
  clips: ClipSceneConfig;
  /** Ende des Intro-Countdowns (ms seit Epoch), per Live-Steuerung gestartet — null = kein Countdown. */
  countdownUntil: number | null;
  /** "Nächster Clip" aus der Live-Steuerung (Zeitstempel, jede Änderung = weiterspringen). */
  clipSkip: number | null;
  /** Layouts der Pausen- und der Clip-Szenen (gespeichert oder Standard). */
  pauseLayout: OverlayLayout<PauseElementKey>;
  clipLayout: OverlayLayout<ClipElementKey>;
};

/** Szenen des festen Streamer-Links (`&scene=…`) — je OBS-Szene eine eigene Browser-Quelle. */
export type OverlayScene = "gameplay" | "pause" | "intro" | "clips" | "outro";
export const OVERLAY_SCENES: OverlayScene[] = ["gameplay", "pause", "intro", "clips", "outro"];
export const DEFAULT_PAUSE_TEXT = "Gleich geht's weiter";
export const DEFAULT_INTRO_TEXT = "Stream startet gleich";
export const DEFAULT_OUTRO_TEXT = "Danke fürs Zuschauen!";

/** Welche Community-Clips der Loop zeigt. */
export type ClipSource = "all" | "top" | "recent" | "game";
export const CLIP_SOURCES: ClipSource[] = ["all", "top", "recent", "game"];

export const SCENE_LABELS: Record<OverlayScene, string> = {
  gameplay: "Spiel", pause: "Pause", intro: "Intro", clips: "Clips", outro: "Outro",
};

export type ClipSceneConfig = {
  source: ClipSource;
  /** Clips stumm abspielen — schützt vor Problemen mit Musik in fremden Clips. */
  muted: boolean;
  /** Eigener Text der Intro- bzw. Outro-Szene, null = Standardtext. */
  introText: string | null;
  outroText: string | null;
};

/** Ein Clip im Community-Clip-Loop (Twitch-Clip, eingebettet über den offiziellen Player). */
export type OverlayClip = {
  id: string;
  title: string;
  /** Anzeigename und Login des Kanals, auf dem der Clip entstand. */
  channel: string;
  channelLogin: string;
  /** Wer den Clip geschnitten hat. */
  creator: string;
  durationSec: number;
  views: number;
  game: string | null;
  /** Twitch-Game-ID — für die Erkennung von Spielen ab 18 (Alters-Hinweis im Player). */
  gameId: string | null;
  createdAt: string;
  thumbnailUrl: string;
};

/** Einstellungsseite des festen Streamer-Links (in der App, Login nötig). */
export const STREAMER_OVERLAY_SETTINGS_PATH = "/profile/overlay";

/** Live-Steuerung des eigenen Streamer-Overlays (User.overlayControlJson). Schlüssel sind
 *  Element-Schlüssel beider Modi (ElementKey bzw. ProfileElementKey). */
export type OverlayControl = {
  hidden: string[];
  zoom: string | null;
  /** Zeitpunkt (ms), ab dem der Zoom automatisch endet — null = bis zum Zurücksetzen. */
  zoomUntil: number | null;
  /** Aktive Szene des Links ohne `&scene=` (Spiel, Pause, Intro, Clips, Outro). */
  scene: OverlayScene;
  /** Ende des Intro-Countdowns (ms seit Epoch), null = keiner. */
  countdownUntil: number | null;
  /** Zeitpunkt des letzten "Nächster Clip" (ms) — jede Änderung springt im Clip-Loop weiter. */
  clipSkip: number | null;
};

export const ELEMENT_LABELS: Record<ElementKey, string> = {
  brand: "OMA-Logo & Ich",
  liveinfo: "Live / Event / Spiel",
  ticker: "Aktuelles Match",
  bracket: "Turnierbaum",
  table: "Tabelle",
  seriesTable: "Gesamttabelle",
  participants: "Teilnehmer",
};

export const PROFILE_ELEMENT_LABELS: Record<ProfileElementKey, string> = {
  brand: "OMA-Logo & Ich",
  rank: "Rang",
  nextEvent: "Nächstes Event",
  community: "Clips",
  liveMembers: "Gerade live",
};

/** Elemente, die sich groß einblenden lassen — die Marke und die schmalen Info-Kacheln nicht. */
export const ZOOMABLE_ELEMENTS: ElementKey[] = ["ticker", "bracket", "table", "seriesTable", "participants"];
export const ZOOMABLE_PROFILE_ELEMENTS: ProfileElementKey[] = ["nextEvent", "community", "liveMembers", "rank"];
