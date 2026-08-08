/**
 * Katalog aller Gaming-Zimmer-Möbel.
 *
 * Bewusst reiner Code ohne Prisma-Import: Client-Komponenten (Shop, Editor,
 * Bühne) importieren dieses Modul direkt. Die Datenbank speichert nur `itemKey`
 * plus Position — Größe, Preis und Freischalt-Tags stehen hier, damit sich
 * Balancing ändern lässt, ohne Daten zu migrieren.
 */

export type RoomZone = "wall" | "floor";

export type RoomCategory =
  | "tapete" | "bodenbelag" | "schreibtisch" | "rechner" | "bildschirm"
  | "peripherie" | "sitzen" | "licht" | "deko" | "konsole" | "moebel" | "vitrine";

/**
 * Freischalt-Merkmale. Jobs fordern Tags, keine konkreten Item-Keys — so kann
 * ein neues Möbelstück eine alte Job-Anforderung erfüllen, ohne dass der
 * Job-Katalog angefasst werden muss.
 */
export type RoomTag =
  | "desk" | "chair" | "chair_gaming" | "pc" | "pc_gaming" | "pc_highend"
  | "monitor" | "monitor_144" | "crt" | "mic" | "cam" | "keyboard_mech"
  | "headset" | "streamdeck" | "capture" | "ringlight" | "console" | "console_retro"
  | "light" | "neon" | "bed" | "plant" | "shelf" | "trophy_shelf" | "whiteboard"
  | "powerstrip" | "led_wall" | "vitrine";

export interface RoomItemDef {
  key:         string;
  label:       string;       // Deutsch, erscheint im Shop
  description: string;       // Ein Satz, gerne mit Humor
  zone:        RoomZone;
  category:    RoomCategory;
  w:           number;       // Breite in Rasterzellen (0 bei Flächen)
  h:           number;       // Höhe in Rasterzellen (0 bei Flächen)
  price:       number;       // Münzen. 0 = Grundausstattung, nicht kaufbar
  minTier:     number;       // Rangstufe 1–6, ab der es im Shop auftaucht
  maxOwned:    number;       // Wie viele Exemplare besitzbar sind
  tags:        RoomTag[];
  /**
   * "desk"  = die Zellen direkt darunter müssen zu einem Tisch gehören
   * "floor" = muss auf dem Boden stehen (unterste Rasterzeile)
   * null    = frei platzierbar. Nur für Zone "floor" relevant.
   */
  mustStandOn: "desk" | "floor" | null;
  accent:      "violet" | "teal" | "amber" | "rose" | "slate";
  /**
   * Optionales PNG-Sprite (Supabase Storage). Ist es gesetzt, rendert
   * RoomItemSprite das Bild statt des handgebauten Inline-SVG — pro Item
   * austauschbar, ohne Code-Änderung.
   */
  imageUrl?:   string;
  /**
   * Manche Canva-Fotos füllen ihre Rasterbox schlecht aus (z.B. ein hoher,
   * schmaler Mikrofon-Schnitt in einer quadratischen 1×1-Box) und wirken
   * dadurch neben besser ausfüllenden Nachbarn winzig. Ein moderater
   * Boost-Faktor (>1) vergrößert das gerenderte Bild gleichmäßig um den
   * unteren Mittelpunkt herum — bewusst klein gehalten (≤1.2), damit es
   * nicht sichtbar in Nachbarzellen hineinragt.
   */
  renderScale?: number;
  starter?:    boolean;      // Teil der Grundausstattung (DEFAULT_ROOM)
  /** Klickbar auf der Bühne: öffnet das jeweilige Overlay. */
  interactive?: "crt" | "vitrine" | "jobboard";
}

/** Flächen werden gekauft, aber nie platziert — sie sitzen auf Room.wallpaperKey / floorKey. */
export function isSurface(def: RoomItemDef): boolean {
  return def.category === "tapete" || def.category === "bodenbelag";
}

/**
 * Fest eingebaut: darf verschoben, aber nie eingelagert werden.
 * Betrifft genau die drei interaktiven Möbel — sie sind der Zugang zum Profil
 * (Röhrenmonitor), zur Sammlung (Vitrine) und zur Jobbörse (schwarzes Brett).
 * Die übrige Grundausstattung (Bett, Wackeltisch, Billig-PC, Bürostuhl) MUSS
 * einlagerbar bleiben, sonst passt später kein Endgame-Setup mehr auf den Boden.
 */
export function isFixed(def: RoomItemDef): boolean {
  return !!def.interactive;
}

export const ROOM_CATEGORY_LABELS: Record<RoomCategory, string> = {
  tapete:       "Tapeten",
  bodenbelag:   "Böden",
  schreibtisch: "Schreibtische",
  sitzen:       "Sitzmöbel",
  rechner:      "Rechner",
  bildschirm:   "Bildschirme",
  peripherie:   "Peripherie",
  konsole:      "Konsolen",
  licht:        "Licht & Neon",
  deko:         "Deko",
  moebel:       "Möbel",
  vitrine:      "Vitrinen",
};

/** Reihenfolge der Kategorien im Shop — günstig und nützlich zuerst. */
const CATEGORY_ORDER: RoomCategory[] = [
  "schreibtisch", "sitzen", "rechner", "bildschirm", "peripherie",
  "konsole", "licht", "deko", "moebel", "vitrine", "tapete", "bodenbelag",
];

export const ROOM_TAG_LABELS: Record<RoomTag, string> = {
  desk:          "Schreibtisch",
  chair:         "Sitzgelegenheit",
  chair_gaming:  "Gaming-Stuhl",
  pc:            "Rechner",
  pc_gaming:     "Gaming-PC",
  pc_highend:    "High-End-PC",
  monitor:       "Monitor",
  monitor_144:   "144Hz-Monitor",
  crt:           "Röhrenmonitor",
  mic:           "Mikrofon",
  cam:           "Webcam",
  keyboard_mech: "Mechanische Tastatur",
  headset:       "Headset",
  streamdeck:    "Stream-Deck",
  capture:       "Capture-Karte",
  ringlight:     "Ringlicht",
  console:       "Konsole",
  console_retro: "Retro-Konsole",
  light:         "Lichtquelle",
  neon:          "Neon-Element",
  bed:           "Bett",
  plant:         "Pflanze",
  shelf:         "Regal",
  trophy_shelf:  "Pokalregal",
  whiteboard:    "Whiteboard",
  powerstrip:    "Steckdosenleiste",
  led_wall:      "LED-Wand",
  vitrine:       "Vitrine",
};

export const ROOM_ITEMS: RoomItemDef[] = [
  // ── Flächen: Tapeten ──────────────────────────────────────────────────────
  {
    key: "tapete_raufaser", label: "Raufaser (vergilbt)",
    description: "Seit 1987 an der Wand. Riecht noch nach Zigarettenrauch von früher.",
    zone: "wall", category: "tapete", w: 0, h: 0, price: 0, minTier: 1, maxOwned: 1,
    tags: [], mustStandOn: null, accent: "slate", starter: true,
  },
  {
    key: "tapete_pixel", label: "Pixel-Tapete",
    description: "8-Bit-Muster in Violett. Deine Augen brauchen zwei Tage Eingewöhnung.",
    zone: "wall", category: "tapete", w: 0, h: 0, price: 900, minTier: 1, maxOwned: 1,
    tags: [], mustStandOn: null, accent: "violet",
  },
  {
    key: "tapete_scifi", label: "Sci-Fi-Paneele",
    description: "Als hätte jemand ein Raumschiff tapeziert. Genau das war der Plan.",
    zone: "wall", category: "tapete", w: 0, h: 0, price: 2600, minTier: 3, maxOwned: 1,
    tags: [], mustStandOn: null, accent: "teal",
  },

  // ── Flächen: Böden ────────────────────────────────────────────────────────
  {
    key: "boden_linoleum", label: "Linoleum (fleckig)",
    description: "Pflegeleicht, hieß es damals. Die Flecken sagen etwas anderes.",
    zone: "floor", category: "bodenbelag", w: 0, h: 0, price: 0, minTier: 1, maxOwned: 1,
    tags: [], mustStandOn: null, accent: "slate", starter: true,
  },
  {
    key: "boden_holz", label: "Holzdielen",
    description: "Knarzt bei jedem Schritt — dafür sieht es endlich nach Wohnung aus.",
    zone: "floor", category: "bodenbelag", w: 0, h: 0, price: 1200, minTier: 2, maxOwned: 1,
    tags: [], mustStandOn: null, accent: "amber",
  },
  {
    key: "boden_scifi", label: "Gitterrost-Boden",
    description: "Industrieller Sci-Fi-Look. Barfuß laufen ist ab jetzt keine Option mehr.",
    zone: "floor", category: "bodenbelag", w: 0, h: 0, price: 3400, minTier: 4, maxOwned: 1,
    tags: [], mustStandOn: null, accent: "teal",
  },

  // ── Wand: Deko & Licht ────────────────────────────────────────────────────
  {
    key: "jobbrett", label: "Schwarzes Brett",
    description: "Hier hängen die Stellenanzeigen. Draufklicken und bewerben.",
    zone: "wall", category: "deko", w: 2, h: 2, price: 0, minTier: 1, maxOwned: 1,
    tags: [], mustStandOn: null, accent: "amber", starter: true, interactive: "jobboard",
    imageUrl: "/room-items/jobbrett.png",
  },
  {
    key: "poster_retro", label: "Retro-Gaming-Poster",
    description: "Ein Spiel, das du nie gespielt hast, aber das Cover ist unschlagbar.",
    zone: "wall", category: "deko", w: 2, h: 2, price: 250, minTier: 1, maxOwned: 4,
    tags: [], mustStandOn: null, accent: "rose",
  },
  {
    key: "regal_holz", label: "Wandregal",
    description: "Platz für Krimskrams, den du nie wieder anfasst.",
    zone: "wall", category: "moebel", w: 3, h: 1, price: 400, minTier: 1, maxOwned: 3,
    tags: ["shelf"], mustStandOn: null, accent: "amber",
    imageUrl: "/room-items/regal_holz.png",
  },
  {
    key: "led_stripe", label: "LED-Stripe",
    description: "Regenbogen an der Wand. Verbessert deine Reaktionszeit um exakt 0 %.",
    zone: "wall", category: "licht", w: 4, h: 1, price: 600, minTier: 1, maxOwned: 3,
    tags: ["light"], mustStandOn: null, accent: "violet",
    imageUrl: "/room-items/led_stripe.png", renderScale: 1.15,
  },
  {
    key: "pokalregal", label: "Pokalregal",
    description: "Endlich ein Ort für die Trophäen, statt sie im Flur zu stapeln.",
    zone: "wall", category: "moebel", w: 3, h: 1, price: 1800, minTier: 3, maxOwned: 1,
    tags: ["shelf", "trophy_shelf"], mustStandOn: null, accent: "amber",
    imageUrl: "/room-items/pokalregal.png",
  },
  {
    key: "whiteboard", label: "Taktik-Whiteboard",
    description: "Pfeile, Kreise, Kaffeeflecken. Der Plan ergibt nur für dich Sinn.",
    zone: "wall", category: "deko", w: 3, h: 2, price: 2000, minTier: 4, maxOwned: 1,
    tags: ["whiteboard"], mustStandOn: null, accent: "teal",
    imageUrl: "/room-items/whiteboard.png",
  },
  {
    key: "nanoleaf", label: "Wabenpaneele",
    description: "Leuchtende Sechsecke. Der halbe Stromverbrauch, der ganze Effekt.",
    zone: "wall", category: "licht", w: 3, h: 2, price: 2400, minTier: 3, maxOwned: 2,
    tags: ["light", "neon"], mustStandOn: null, accent: "violet",
    imageUrl: "/room-items/nanoleaf.png",
  },
  {
    key: "neon_schild", label: 'Neon-Schild "ZOCKEN"',
    description: "Damit auch der Postbote weiß, was hier läuft.",
    zone: "wall", category: "licht", w: 3, h: 1, price: 3200, minTier: 4, maxOwned: 1,
    tags: ["neon", "light"], mustStandOn: null, accent: "rose",
    imageUrl: "/room-items/neon_schild.png",
  },
  {
    key: "led_wand", label: "LED-Videowand",
    description: "Sechs Felder pure Angeberei. Der Nachbar sieht das Flackern durchs Fenster.",
    zone: "wall", category: "licht", w: 6, h: 3, price: 14000, minTier: 6, maxOwned: 1,
    tags: ["led_wall", "light"], mustStandOn: null, accent: "violet",
    imageUrl: "/room-items/led_wand.png",
  },

  // ── Boden: Schreibtische ──────────────────────────────────────────────────
  {
    key: "schreibtisch_alt", label: "Wackeltisch",
    description: "Ein Bierdeckel unter dem linken Bein hält ihn seit Jahren im Gleichgewicht.",
    zone: "floor", category: "schreibtisch", w: 3, h: 2, price: 0, minTier: 1, maxOwned: 1,
    tags: ["desk"], mustStandOn: "floor", accent: "slate", starter: true,
    imageUrl: "/room-items/schreibtisch_alt.png",
  },
  {
    key: "schreibtisch_eck", label: "Eck-Gamingtisch",
    description: "Kabelkanal, Getränkehalter, Kopfhörerhaken. Endlich erwachsen.",
    zone: "floor", category: "schreibtisch", w: 4, h: 2, price: 2600, minTier: 2, maxOwned: 1,
    tags: ["desk"], mustStandOn: "floor", accent: "teal",
    imageUrl: "/room-items/schreibtisch_eck.png",
  },

  // ── Boden: Sitzmöbel ──────────────────────────────────────────────────────
  {
    key: "stuhl_buero", label: "Bürostuhl (quietscht)",
    description: "Die Gasfeder gibt nach zwanzig Minuten auf. Jedes Mal.",
    zone: "floor", category: "sitzen", w: 1, h: 2, price: 150, minTier: 1, maxOwned: 1,
    tags: ["chair"], mustStandOn: "floor", accent: "slate",
    imageUrl: "/room-items/stuhl_buero.png",
  },
  {
    key: "stuhl_gaming", label: "Gaming-Thron",
    description: "RGB im Sitzkissen. Ergonomisch fragwürdig, optisch unverhandelbar.",
    zone: "floor", category: "sitzen", w: 1, h: 2, price: 2200, minTier: 3, maxOwned: 1,
    tags: ["chair", "chair_gaming"], mustStandOn: "floor", accent: "rose",
    imageUrl: "/room-items/stuhl_gaming.png",
  },

  // ── Boden: Rechner ────────────────────────────────────────────────────────
  {
    key: "pc_billig", label: "Billig-Kiste",
    description: "Startet in vier Minuten. Der Lüfter klingt wie ein Föhn aus den 90ern.",
    zone: "floor", category: "rechner", w: 1, h: 2, price: 0, minTier: 1, maxOwned: 1,
    tags: ["pc"], mustStandOn: "floor", accent: "slate", starter: true,
    imageUrl: "/room-items/pc_billig.png",
  },
  {
    key: "pc_gaming", label: "Gaming-PC",
    description: "Glasseitenteil, damit alle sehen, wie ordentlich du verkabelt hast.",
    zone: "floor", category: "rechner", w: 1, h: 2, price: 3500, minTier: 2, maxOwned: 1,
    tags: ["pc", "pc_gaming"], mustStandOn: "floor", accent: "violet",
    imageUrl: "/room-items/pc_gaming.png",
  },
  {
    key: "pc_highend", label: "High-End-Rig",
    description: "Wasserkühlung, zu viele Lüfter, eigener Sicherungskasten.",
    zone: "floor", category: "rechner", w: 1, h: 2, price: 11000, minTier: 5, maxOwned: 1,
    tags: ["pc", "pc_gaming", "pc_highend"], mustStandOn: "floor", accent: "teal",
    imageUrl: "/room-items/pc_highend.png",
  },

  // ── Boden: Bildschirme (auf dem Tisch) ────────────────────────────────────
  {
    key: "roehrenmonitor", label: "Röhrenmonitor",
    description: "17 Zoll, 40 Kilo, flimmert. Zeigt dir alles, was du wissen willst — draufklicken!",
    zone: "floor", category: "bildschirm", w: 1, h: 1, price: 0, minTier: 1, maxOwned: 1,
    tags: ["crt", "monitor"], mustStandOn: "desk", accent: "teal", starter: true, interactive: "crt",
    imageUrl: "/room-items/roehrenmonitor.png",
  },
  {
    key: "monitor_flach", label: "Flachbildschirm",
    description: "Flach, hell, unspektakulär. Ein echter Fortschritt.",
    zone: "floor", category: "bildschirm", w: 1, h: 1, price: 700, minTier: 1, maxOwned: 3,
    tags: ["monitor"], mustStandOn: "desk", accent: "slate",
    imageUrl: "/room-items/monitor_flach.png",
  },
  {
    key: "monitor_144", label: "144Hz-Monitor",
    description: "Ab jetzt sind alle Niederlagen wieder deine eigene Schuld.",
    zone: "floor", category: "bildschirm", w: 1, h: 1, price: 1900, minTier: 3, maxOwned: 3,
    tags: ["monitor", "monitor_144"], mustStandOn: "desk", accent: "violet",
    imageUrl: "/room-items/monitor_144.png",
  },

  // ── Boden: Peripherie ─────────────────────────────────────────────────────
  {
    key: "steckdosenleiste", label: "Steckdosenleiste",
    description: "Sechsfach, mit Schalter. Die Grundlage jeder ernsthaften Karriere.",
    zone: "floor", category: "peripherie", w: 2, h: 1, price: 120, minTier: 1, maxOwned: 2,
    tags: ["powerstrip"], mustStandOn: "floor", accent: "slate",
    imageUrl: "/room-items/steckdosenleiste.png", renderScale: 1.15,
  },
  {
    key: "webcam", label: "Webcam",
    description: "Zeigt dein Gesicht und im Hintergrund deinen Wäscheberg.",
    zone: "floor", category: "peripherie", w: 1, h: 1, price: 550, minTier: 1, maxOwned: 1,
    tags: ["cam"], mustStandOn: null, accent: "slate",
    imageUrl: "/room-items/webcam.png",
  },
  {
    key: "headset", label: "Headset",
    description: "Das Ohrpolster löst sich langsam auf, aber der Sound sitzt.",
    zone: "floor", category: "peripherie", w: 1, h: 1, price: 600, minTier: 1, maxOwned: 1,
    tags: ["headset"], mustStandOn: null, accent: "teal",
    imageUrl: "/room-items/headset.png",
  },
  {
    key: "tastatur_mech", label: "Mechanische Tastatur",
    description: "Blaue Switches. Deine Mitbewohner hassen dich jetzt offiziell.",
    zone: "floor", category: "peripherie", w: 1, h: 1, price: 650, minTier: 2, maxOwned: 1,
    tags: ["keyboard_mech"], mustStandOn: null, accent: "violet",
    imageUrl: "/room-items/tastatur_mech.png",
  },
  {
    key: "mikrofon", label: "Podcast-Mikrofon",
    description: "Nimmt jedes Wort auf — auch das Kühlschrankbrummen aus der Küche.",
    zone: "floor", category: "peripherie", w: 1, h: 1, price: 800, minTier: 2, maxOwned: 1,
    tags: ["mic"], mustStandOn: null, accent: "amber",
    imageUrl: "/room-items/mikrofon.png", renderScale: 1.2,
  },
  {
    key: "ringlicht", label: "Ringlicht",
    description: "Lässt dich zehn Jahre jünger aussehen. Nicht genug, aber immerhin.",
    zone: "floor", category: "peripherie", w: 1, h: 2, price: 1100, minTier: 3, maxOwned: 1,
    tags: ["ringlight", "light"], mustStandOn: "floor", accent: "amber",
    imageUrl: "/room-items/ringlicht.png",
  },
  {
    key: "capture", label: "Capture-Karte",
    description: "Nimmt alles auf, auch die Runden, die niemand sehen sollte.",
    zone: "floor", category: "peripherie", w: 1, h: 1, price: 1400, minTier: 4, maxOwned: 1,
    tags: ["capture"], mustStandOn: null, accent: "rose",
    imageUrl: "/room-items/capture.png", renderScale: 1.15,
  },
  {
    key: "streamdeck", label: "Stream-Deck",
    description: "Fünfzehn Tasten, von denen du drei benutzt. Sieht trotzdem professionell aus.",
    zone: "floor", category: "peripherie", w: 1, h: 1, price: 1600, minTier: 4, maxOwned: 1,
    tags: ["streamdeck"], mustStandOn: null, accent: "violet",
    imageUrl: "/room-items/streamdeck.png",
  },

  // ── Boden: Konsolen ───────────────────────────────────────────────────────
  {
    key: "konsole_retro", label: "Retro-Konsole",
    description: "Modul reinstecken, kurz reinpusten, läuft. Alte Schule eben.",
    zone: "floor", category: "konsole", w: 1, h: 1, price: 900, minTier: 2, maxOwned: 2,
    tags: ["console", "console_retro"], mustStandOn: null, accent: "amber",
    imageUrl: "/room-items/konsole_retro.png", renderScale: 1.1,
  },
  {
    key: "konsole_neu", label: "Aktuelle Konsole",
    description: "Größer als der Fernseher, auf dem sie laufen sollte.",
    zone: "floor", category: "konsole", w: 1, h: 1, price: 2800, minTier: 3, maxOwned: 2,
    tags: ["console"], mustStandOn: null, accent: "teal", renderScale: 1.1,
    imageUrl: "/room-items/konsole_neu.png",
  },

  // ── Boden: Möbel & Deko ───────────────────────────────────────────────────
  {
    key: "bett", label: "Durchgelegenes Bett",
    description: "Die Matratze hat die Form deines Rückens angenommen. Rückwärts.",
    zone: "floor", category: "moebel", w: 2, h: 2, price: 0, minTier: 1, maxOwned: 1,
    tags: ["bed"], mustStandOn: "floor", accent: "slate", starter: true,
    imageUrl: "/room-items/bett.png",
  },
  {
    key: "vitrine", label: "Vitrine",
    description: "Deine Sammlung hinter Glas. Draufklicken und angeben.",
    zone: "floor", category: "vitrine", w: 2, h: 3, price: 0, minTier: 1, maxOwned: 1,
    tags: ["vitrine"], mustStandOn: "floor", accent: "amber", starter: true, interactive: "vitrine",
    imageUrl: "/room-items/vitrine.png",
  },
  {
    key: "pflanze", label: "Zimmerpflanze (halbtot)",
    description: "Gießen war letzten Monat. Sie hält durch, aus Trotz.",
    zone: "floor", category: "deko", w: 1, h: 2, price: 180, minTier: 1, maxOwned: 3,
    tags: ["plant"], mustStandOn: "floor", accent: "teal",
    imageUrl: "/room-items/pflanze.png",
  },
  {
    key: "teppich", label: "Fleckenteppich",
    description: "Jeder Fleck erzählt eine Geschichte. Die meisten handeln von Energydrinks.",
    zone: "floor", category: "deko", w: 3, h: 1, price: 300, minTier: 1, maxOwned: 2,
    tags: [], mustStandOn: "floor", accent: "rose",
    imageUrl: "/room-items/teppich.png",
  },
  {
    key: "kaffeemaschine", label: "Kaffeemaschine",
    description: "Der eigentliche Motor deiner Karriere.",
    zone: "floor", category: "deko", w: 1, h: 1, price: 450, minTier: 1, maxOwned: 1,
    tags: [], mustStandOn: null, accent: "amber",
    imageUrl: "/room-items/kaffeemaschine.png",
  },
  {
    key: "rollator", label: "Getunter Rollator",
    description: "Unterbodenbeleuchtung, Getränkehalter, Spoiler. Fraktion Rollator grüßt.",
    zone: "floor", category: "deko", w: 2, h: 2, price: 4000, minTier: 5, maxOwned: 1,
    tags: [], mustStandOn: "floor", accent: "violet",
    imageUrl: "/room-items/rollator.png",
  },
];

export const ROOM_ITEM_MAP: Readonly<Record<string, RoomItemDef>> =
  Object.freeze(Object.fromEntries(ROOM_ITEMS.map(i => [i.key, i])));

export function getRoomItem(key: string): RoomItemDef | null {
  return ROOM_ITEM_MAP[key] ?? null;
}

/** Alle Items der Grundausstattung — Basis für DEFAULT_ROOM und materializeRoom(). */
export const STARTER_ITEM_KEYS: string[] =
  ROOM_ITEMS.filter(i => i.starter && !isSurface(i)).map(i => i.key);

/**
 * Shop-Gruppierung: alle kaufbaren Items nach Kategorie.
 * Items über dem Rang des Users werden NICHT gefiltert, sondern mitgeliefert —
 * der Shop zeigt sie ausgegraut an, weil sichtbare Ziele motivieren.
 */
export function shopItems(): { category: RoomCategory; label: string; items: RoomItemDef[] }[] {
  return CATEGORY_ORDER
    .map(category => ({
      category,
      label: ROOM_CATEGORY_LABELS[category],
      items: ROOM_ITEMS
        .filter(i => i.category === category && i.price > 0)
        .sort((a, b) => a.price - b.price),
    }))
    .filter(g => g.items.length > 0);
}
