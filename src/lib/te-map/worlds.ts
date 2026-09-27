// ============================================
// Die 10 begehbaren Welten von OMA Quest (eine je Location) mit je einer kurzen Quest
// ============================================
// Karten werden aus festen Seeds mit dem MapBuilder erzeugt (immer identisch). Quest-Schema:
// Schritt 0 = Auftraggeber ansprechen, Schritt 1 = Ort/Truhe (oder zweiter NPC), Schritt 2 = zurück
// zum Auftraggeber. Ton wie bei den Orten: humoristisch statt episch-ernst.

import { MapBuilder, npcLook } from "./generate";
import { getTemplate } from "./interior";
import { solidOfMap } from "./engine";
import { getMonster } from "@/lib/dnd/combat";
import { FIXED_AMBIENCE } from "@/lib/dnd/oq-ambience";
import { GROUND, type Actor, type Building, type Interior, type Talk, type WorldDef, type WorldQuest } from "./types";

// ── Dialog-Bausteine ────────────────────────────────────────

/** Auftraggeber: Auftrag (Schritt 0), Erinnerung (1), Übergabe (2, schließt ab), danach Plauderei. */
function giverTalk(intro: string[], reminder: string[], turnIn: string[], after: string[]): Talk[] {
  return [
    { step: 0, lines: intro, advance: true },
    { step: 1, lines: reminder },
    { step: 2, lines: turnIn, advance: true },
    { step: "*", lines: after },
  ];
}
/** Truhe: öffnet sich im Schritt 1, davor verschlossen, danach leer. */
function chestTalk(open: string[], locked: string[], empty: string[]): Talk[] {
  return [
    { step: 1, lines: open, advance: true },
    { step: 0, lines: locked },
    { step: "*", lines: empty },
  ];
}
const chatter = (...lines: string[]): Talk[] => [{ step: "*", lines }];

const quest = (slug: string, title: string, objectives: [string, string, string], xpReward: number, requires?: string): WorldQuest => ({
  slug, title, objectives: [...objectives, "Abgeschlossen!"], xpReward, ...(requires ? { requires } : {}),
});

/** Auftraggeber einer Zusatz-Quest (Kette in derselben Welt): Angebot (Schritt 0, rückt vor), stiller Zwischenschritt
 *  (Ziel/Besuch, kein Dialog nötig), Abgabe (letzter Schritt, rückt vor + schließt ab), sonst Plauderei. */
function chainTalk(questSlug: string, offer: string[], turnIn: string[], after: string[], lastStep: number): Talk[] {
  return [
    { step: 0, quest: questSlug, lines: offer, advance: true },
    { step: lastStep, quest: questSlug, lines: turnIn, advance: true },
    { step: "*", lines: after },
  ];
}

// Dach-/Wandblöcke (A3): Dächer braun 0, gold 1, grün 2, rot 3, blau 4, dunkel 5; Wände 0/1 (Zeile 1) bzw. 0/3 (Zeile 3)
/** Innenraum aus einer Vorlage; NPCs/Händler bekommen ein festes Aussehen aus dem Seed. */
const inside = (templateId: string, seed: number): Interior => {
  const it = getTemplate(templateId)!.build();
  return { ...it, actors: it.actors.map((a, i) => (a.kind === "chest" ? a : { ...a, config: npcLook(seed + i) })) };
};

const house = (b: Omit<Building, "roofRows"> & { roofRows?: number }): Building => ({ roofRows: 3, ...b });

// ── 1 Alt-Hafenstadt (Dorf mit Platz) ───────────────────────

function hafenstadt(): WorldDef {
  const m = new MapBuilder(36, 28, "outdoor", 101);
  m.border("trees");
  m.road([[0, 13], [34, 13]], 2);
  m.road([[17, 2], [17, 25]], 2);
  m.fill(GROUND.cobble, 13, 10, 10, 8);
  m.keepClear(13, 10, 10, 8);
  m.building(house({ name: "Hafenmeisterei", x: 4, y: 3, w: 6, roof: { k: 0, r: 0 }, wall: { k: 0, r: 1 }, doorDx: 2, windowDx: [0, 4] }));
  m.building(house({ name: "Fischhalle", x: 24, y: 3, w: 7, roof: { k: 3, r: 0 }, wall: { k: 4, r: 1 }, doorDx: 3, windowDx: [1, 5], sign: "shopSword", role: "shop" }));
  m.building(house({ name: "Lagerhaus", x: 4, y: 19, w: 6, roof: { k: 2, r: 0 }, wall: { k: 0, r: 3 }, doorDx: 2, windowDx: [0, 4], interior: inside("lager", 601) }));
  m.building(house({ name: "Zum Halben Anker", x: 22, y: 19, w: 7, roof: { k: 4, r: 0 }, wall: { k: 0, r: 1 }, doorDx: 3, windowDx: [1, 5], sign: "shopMug", interior: inside("taverne", 501), role: "tavern" }));
  m.road([[6, 8], [6, 13]], 2);
  m.road([[27, 8], [27, 13]], 2);
  m.road([[6, 24], [17, 24]], 2);
  m.road([[25, 24], [18, 24]], 2);
  m.road([[31, 14], [31, 18]], 2);
  // Platz
  m.place("fountain", 16, 10);
  for (const [x, y] of [[13, 10], [22, 10], [13, 15], [22, 15]]) m.place("lamp", x, y);
  m.place("benchWide", 14, 16);
  m.place("flowerTub", 20, 16);
  m.place("noticeBoard", 15, 8);
  m.questboard("brett", "Schwarzes Brett", 15, 8, [
    "Ein Brett voller angepinnter Zettel: Gesuche, Verträge, ein paar durchgestrichene Preise.",
    "Ganz unten hängt wieder eine dieser Patchnotizen.",
  ]);
  m.place("sign", 19, 8);
  m.place("planks", 32, 22);
  m.chest("fracht", "Frachtkiste", 31, 19, chestTalk(
    ["Du stemmst die Frachtkiste auf … Fisch. Sehr, sehr alter Fisch.", "Ganz unten liegt der Frachtbrief. Den nimmst du mit."],
    ["Die Kiste ist zugenagelt. Erst muss jemand sagen, wonach du suchst."],
    ["Nur noch der Geruch ist übrig."],
  ));
  m.npc("olga", "Hafenmeisterin Olga", 9, 10, "left", 11, giverTalk(
    ["Da bist du ja! Eine ganze Ladung ist verschwunden, samt Frachtbrief.", "Der Brief steckt bestimmt in der Frachtkiste am Ostende der Straße. Holst du ihn?"],
    ["Die Frachtkiste steht im Osten, am Ende des Seitenwegs hinter der Hauptstraße."],
    ["Der Frachtbrief! Endlich weiß ich, was wir vermissen. Nämlich alles.", "Hier, deine Belohnung — und der Rat, nie wieder Fisch im Schatten zu lagern."],
    ["Der Hafen läuft, dank dir. Fast."],
  ));
  m.npc("knut", "Matrose Knut", 29, 10, "down", 12, [
    { step: "*", requires: ["knut-garn"], lines: ["Na, alter Fuchs? Das mit dem Fass bleibt unter uns."] },
    { step: "*", time: "night", lines: ["Nachts wird's hier gruselig. Da flüstern mir die Möwen Sachen zu."] },
    {
      step: "*",
      lines: ["Ich fahre zur See, seit ich denken kann. Also seit gestern.", "Das Meer? Das ist da hinten irgendwo. Ich such's morgen."],
      choices: [
        {
          text: "Ich versuche, ihm ein Seemannsgarn zu entlocken.",
          check: { ability: "cha", dc: 10 },
          success: { lines: ["Knut grinst und verrät dir, wo er sein Notgeld versteckt hat: unter dem dritten Fass. Du findest ein paar Münzen."], gold: 15, flags: ["knut-garn"] },
          fail: { lines: ["Knut winkt ab: \"Betriebsgeheimnis.\""] },
        },
        { text: "Ich nicke höflich und gehe weiter.", success: { lines: ["Knut nickt zurück. Ein Gespräch unter Männern des Meeres."] } },
      ],
    },
  ]);
  m.addActor({
    id: "berta", kind: "merchant", name: "Händlerin Berta", x: 19, y: 16, dir: "left", config: npcLook(13),
    shop: ["rostschwert", "lederruestung", "wanderstiefel", "glueckstaler", "koeder-einfach", "koeder-gut", "bierkrug"],
    talk: [{ step: "*", lines: ["Frisch vom Kahn! Naja, vom Kahn. Schau dich um."] }],
  });
  m.sign("schild", "Schild", 19, 8, ["Willkommen in Alt-Hafenstadt! Es riecht nach Fisch und schlechten Entscheidungen."]);
  m.sign("patchnotiz", "Angepinnter Zettel", 15, 9, [
    "„Patchnotiz 0.7.3: Fischgeruch in Alt-Hafenstadt um 4% erhöht. Für ein ausgewogeneres Spielerlebnis.“",
    "Niemand weiß, wer diese Zettel überall aufhängt. Oder warum.",
  ]);
  for (const [x, y] of [[3, 8], [10, 8]]) m.place("barrel", x, y);
  m.place("crate", 23, 8);
  m.place("hay", 30, 24);
  m.scatter(["flowerBed", "rocks", "hedgeFlowers"], 14, [2, 2, 32, 24]);

  // ── Kapitel 0: Ausbildung (Tutorial-Kette, nur hier in Alt-Hafenstadt) ──
  m.npc("boris", "Wehrmeister Boris", 9, 16, "right", 14, [
    ...chainTalk("welt-hafenstadt-q2",
      ["Na, Frischling? Bevor du dich Monstern stellst, übe an etwas Kleinem. Da drüben am Kai wimmelt's von Giftegeln.", "Erledige einen. Ich hab schon Schlimmeres bluten sehen."],
      ["Einen Giftegel weniger. Respekt — oder Glück. Meistens ist es Glück.", "Als Nächstes: Zähmen. Kauf dir bei Berta einen Zähmköder und mach dir einen Freund, statt ihn zu verhauen."],
      ["Kai ist im Osten. Die Dinger sind harmlos, solange du nicht schläfst."],
      2),
    ...chainTalk("welt-hafenstadt-q3",
      ["Ein Zähmköder von Berta, ein Monster unter einem Viertel seiner Lebenspunkte, fertig ist der Begleiter.", "Zähm mir irgendwas. Ich zähl's nicht nach."],
      ["Schau dir das an, dein eigenes kleines Monster! Es folgt dir jetzt überall hin. Fast schon niedlich.", "Wenn du weiterkommen willst, schau auch mal in deinen Fähigkeitsbaum — da wartet einiges."],
      ["Berta verkauft die Köder gleich hier auf dem Platz."],
      2),
    { step: "*", lines: ["Haltung, Klinge, Nerven aus Stahl. Zwei von drei reichen meistens."] },
  ]);
  m.npc("mira", "Reiseleiterin Mira", 21, 8, "down", 15, [
    { step: 0, quest: "welt-hafenstadt-q4", lines: ["Du warst noch nie außerhalb der Stadt? Das ändern wir. Reis einmal in den Krähwald — und wieder zurück, wenn's dich nicht verschluckt.", "Die Weltkarte findest du über deinen Charakter. Ich warte hier."], advance: true },
    { step: "*", lines: ["Reisen bildet — und seit du die ganze Geschichte durch hast, biete ich hier auch Schnellreise an. Kostet ein paar Münzen, aber spart dir Wochen.", "Erst die Hauptgeschichte durch, dann das Geschäft. War schon immer so."], fastTravel: true },
  ]);

  return {
    slug: "hafenstadt", title: "Alt-Hafenstadt", map: m.build({ x: 17, y: 15 }),
    quest: quest("welt-hafenstadt", "Die verlorene Fracht", [
      "Sprich mit Hafenmeisterin Olga.", "Finde die Frachtkiste im Osten der Stadt.", "Bring den Frachtbrief zu Olga.",
    ], 40),
    extraQuests: [
      {
        slug: "welt-hafenstadt-q2", title: "Erste Übung", xpReward: 30, requires: "welt-hafenstadt",
        objectives: ["Sprich mit Wehrmeister Boris.", "Besiege einen Giftegel am Kai.", "Melde dich bei Boris zurück.", "Abgeschlossen!"],
        steps: [
          { kind: "talk", text: "Sprich mit Wehrmeister Boris." },
          { kind: "goal", text: "Besiege einen Giftegel.", objectiveType: "MONSTER_SLAIN", targetRef: "ratte", targetCount: 1 },
          { kind: "talk", text: "Melde dich bei Boris zurück." },
        ],
      },
      {
        slug: "welt-hafenstadt-q3", title: "Ein neuer Freund", xpReward: 30, requires: "welt-hafenstadt-q2",
        objectives: ["Sprich mit Boris.", "Zähme ein Monster (Köder bei Berta kaufen).", "Zeig Boris deinen neuen Begleiter.", "Abgeschlossen!"],
        steps: [
          { kind: "talk", text: "Sprich mit Boris." },
          { kind: "goal", text: "Zähme ein Monster.", objectiveType: "COMPANION_TAMED", targetCount: 1 },
          { kind: "talk", text: "Zeig Boris deinen neuen Begleiter." },
        ],
      },
      {
        slug: "welt-hafenstadt-q4", title: "Erste Reise", xpReward: 30, requires: "welt-hafenstadt-q3",
        objectives: ["Sprich mit Reiseleiterin Mira.", "Reise in den Krähwald.", "Kehre nach Alt-Hafenstadt zurück.", "Abgeschlossen!"],
        steps: [
          { kind: "talk", text: "Sprich mit Reiseleiterin Mira." },
          { kind: "visit", text: "Reise in den Krähwald.", location: "waldpfad" },
          { kind: "visit", text: "Kehre nach Alt-Hafenstadt zurück.", location: "hafenstadt" },
        ],
      },
    ],
  };
}

// ── 2 Krähwald ──────────────────────────────────────────────

function waldpfad(): WorldDef {
  const m = new MapBuilder(36, 28, "outdoor", 202);
  m.border("trees");
  m.road([[2, 20], [10, 20], [10, 12], [22, 12], [22, 6], [31, 6]], 2);
  m.fill(GROUND.dirt, 28, 4, 6, 6);
  m.keepClear(28, 4, 6, 6);
  m.road([[10, 8], [6, 8]], 1);
  m.place("log", 28, 10);
  m.chest("kompass", "Moosige Truhe", 5, 8, chestTalk(
    ["Unter Moos und Laub liegt eine Truhe. Darin: Holz' Kompass, der stur nach Osten zeigt.", "Immerhin weißt du jetzt, wo Osten ist."],
    ["Eine moosbewachsene Truhe. Ohne Grund fasst du sie lieber nicht an."],
    ["Die Truhe ist leer. Nur ein Käfer wohnt jetzt darin."],
  ));
  m.npc("holz", "Förster Holz", 30, 8, "left", 21, [
    ...giverTalk(
      ["Ein Wald, in dem nie jemand den direkten Weg findet — und ausgerechnet mein Kompass ist weg!", "Ich glaube, er liegt in einer Truhe im Nordwesten, irgendwo hinter dem Abzweig."],
      ["Nimm den Abzweig nach Nordwesten und such die moosige Truhe. Nicht im Kreis laufen!"],
      ["Mein Kompass! Er zeigt zwar falsch, aber er ist mein Kompass.", "Aber sag mal — seit ein paar Tagen läuft am Nordhang ein Wolf immer denselben Kreis. Stur. Wie festgefroren."],
      ["Ich gehe gleich los. Wenn ich den Ausgang finde."],
    ),
    ...chainTalk("welt-waldpfad-q2",
      ["Dieser Wolf am Nordhang — rennt los, bleibt stehen, rennt exakt dieselbe Route noch mal. Als hätte er sein eigenes Gedächtnis verloren.", "Erledige ihn, bevor er sich noch mehr im eigenen Schwanz verbeißt."],
      ["Ruhig jetzt, der Wolf. In seinem Fell klebte was Papierartiges.", "„Patchnotiz 0.7.4: Wolf-Verhalten zurückgesetzt (Bugfix).“ Wer schreibt so was, mitten im Wald?"],
      ["Nimm den Abzweig nach Norden. Der Wolf lief zuletzt da oben im Kreis."],
      2),
    { step: "*", lines: ["Wer sich verirrt, bleibt einfach stehen und wartet auf den Wald."] },
  ]);
  m.npc("pilzsammler", "Pilzsammlerin Frida", 12, 16, "up", 22, chatter("Nur die roten sind giftig. Oder die weißen. Oder die braunen. Ich frage immer erst den Pilz."));
  m.scatter(["tree", "darkTree"], 46, [2, 2, 32, 24], { spacing: 0 });
  m.scatter(["fruitBush", "stump", "log", "mushrooms", "flowerBed"], 26, [2, 2, 32, 24]);
  m.scatter(["jBushBig", "jBushMid", "jBushSmall"], 8, [2, 2, 32, 24]);
  m.scatter(["jFlowerWhite", "jFlowerYellow", "jFlowerPink", "jTuftA"], 12, [2, 2, 32, 24]);
  return {
    slug: "waldpfad", title: "Der Krähwald", map: m.build({ x: 3, y: 20 }),
    quest: quest("welt-waldpfad", "Der Weg aus dem Wald", [
      "Sprich mit Förster Holz an der Lichtung.", "Finde die moosige Truhe im Nordwesten.", "Bring den Kompass zu Förster Holz.",
    ], 40, "welt-hafenstadt-q4"),
    extraQuests: [
      {
        slug: "welt-waldpfad-q2", title: "Der Ruckler im Unterholz", xpReward: 35, requires: "welt-waldpfad",
        objectives: ["Sprich mit Förster Holz.", "Besiege den kreisenden Wolf im Norden.", "Melde dich bei Holz zurück.", "Abgeschlossen!"],
        steps: [
          { kind: "talk", text: "Sprich mit Förster Holz." },
          { kind: "goal", text: "Besiege den kreisenden Wolf.", objectiveType: "MONSTER_SLAIN", targetRef: "wolf", targetCount: 1 },
          { kind: "talk", text: "Melde dich bei Holz zurück." },
        ],
      },
    ],
  };
}

// ── 3 Küste der 1000 Ausreden ───────────────────────────────

function kuestenstrasse(): WorldDef {
  const m = new MapBuilder(36, 28, "outdoor", 303);
  m.border("rocks");
  m.fill(GROUND.sand, 2, 16, 32, 10);
  m.road([[2, 12], [33, 12]], 2);
  m.road([[12, 13], [12, 22]], 2);
  m.place("planks", 20, 17);
  m.place("log", 6, 20);
  m.place("hay", 26, 8);
  m.place("fenceH", 4, 10); m.place("fenceH", 6, 10); m.place("fenceH", 26, 10);
  m.chest("lieferung", "Lieferung unterm Steg", 12, 23, chestTalk(
    ["Die Kiste ist erstaunlich leicht. Darin liegt ein Zettel: 'Lieferung folgt. Bald.'", "Du nimmst die Empfangsbestätigung mit — die einzige echte Lieferung an der Küste."],
    ["Eine Kiste unterm Steg. Ohne guten Grund fasst du sie nicht an."],
    ["Die Kiste ist leer. Wie jede Lieferung."],
  ));
  m.npc("sven", "Schmuggler Sven", 27, 14, "left", 31, [
    ...giverTalk(
      ["Psst. Ich habe eigentlich nur eine letzte Lieferung. Danach höre ich auf. Ehrlich.", "Sie liegt in der Kiste unterm Steg im Westen. Holst du mir die Bestätigung?"],
      ["Die Kiste ist am Ende des Sandwegs, südlich der Straße. Schön unauffällig!"],
      ["Die Bestätigung! Jetzt darf ich guten Gewissens weitermachen.", "Aber sag mal — derselbe Wegelagerer klaut mir seit Tagen dieselbe Kiste. Ich jag ihn weg, er steht wieder da. Als hätte er nie was gelernt."],
      ["Nur noch eine allerletzte. Wirklich."],
    ),
    ...chainTalk("welt-kuestenstrasse-q2",
      ["Immer derselbe Kerl, immer dieselbe Kiste, immer derselbe Fluchtweg. Wenn das kein Trick ist, ist das zumindest sehr unkreativ.", "Verjag ihn endgültig. Vielleicht bleibt's dann auch so."],
      ["Endlich Ruhe. In seiner Tasche war ein Zettel, kein Gold.", "„Diebstahl-Ereignis dupliziert sich (Bugfix folgt).“ Also war's doch ein Trick. Nur nicht seiner."],
      ["Er lungert meistens an der Straße rum, nicht weit von hier."],
      2),
    { step: "*", lines: ["Ich schmuggle nur das Nötigste. Und ein bisschen mehr."] },
  ]);
  m.npc("fischer", "Fischer Anselm", 6, 14, "down", 32, chatter("Ich fange nichts. Aber ich fange es mit Stil."));
  m.scatter(["rocks", "rockGrey", "bonesPile", "hedge4"], 16, [2, 2, 32, 24]);
  m.scatter(["log", "hay", "rockSmall"], 8, [2, 15, 32, 10]);
  m.scatter(["bPalmA", "bPalmC", "bPalmHammock"], 6, [2, 15, 32, 10], { spacing: 2 });
  m.scatter(["bStarOrange", "bStarBlue", "bShellA", "bShellB", "bShellPink", "bRockBig"], 14, [2, 15, 32, 10]);
  return {
    slug: "kuestenstrasse", title: "Küste der 1000 Ausreden", map: m.build({ x: 3, y: 12 }),
    quest: quest("welt-kuestenstrasse", "Die allerletzte Lieferung", [
      "Sprich mit Schmuggler Sven.", "Finde die Kiste unterm Steg.", "Bring die Bestätigung zu Sven.",
    ], 40, "welt-waldpfad-q2"),
    extraQuests: [
      {
        slug: "welt-kuestenstrasse-q2", title: "Derselbe Wegelagerer, derselbe Trick", xpReward: 35, requires: "welt-kuestenstrasse",
        objectives: ["Sprich mit Schmuggler Sven.", "Verjag den immer wiederkehrenden Wegelagerer.", "Melde dich bei Sven zurück.", "Abgeschlossen!"],
        steps: [
          { kind: "talk", text: "Sprich mit Schmuggler Sven." },
          { kind: "goal", text: "Besiege den Wegelagerer.", objectiveType: "MONSTER_SLAIN", targetRef: "wegelagerer", targetCount: 1 },
          { kind: "talk", text: "Melde dich bei Sven zurück." },
        ],
      },
    ],
  };
}

// ── 4 Schnarchpass ──────────────────────────────────────────

function bergpass(): WorldDef {
  const m = new MapBuilder(36, 28, "outdoor", 404);
  m.border("rocks");
  m.fill(GROUND.stone, 2, 2, 32, 24);
  m.road([[2, 24], [12, 24], [12, 16], [24, 16], [24, 8], [32, 8]], 2);
  m.npc("frieda", "Wanderin Frieda", 8, 23, "up", 41, giverTalk(
    ["Zzz … hm? Oh! Ich soll dem Wachposten oben eine Botschaft bringen, aber ich bin so müde.", "Sag ihm bitte: 'Der Pass schnarcht wieder.' Er versteht das."],
    ["Der Wachposten steht ganz oben am Ende des Weges. Sag ihm: 'Der Pass schnarcht wieder.'"],
    ["Er hat es verstanden? Wunderbar. Dann kann ich weiterschlafen. Danke!"],
    ["Zzz …"],
  ));
  m.npc("wachposten", "Wachposten Rolf", 30, 10, "down", 42, [
    { step: 1, lines: ["'Der Pass schnarcht wieder'? Das habe ich befürchtet. Sag Frieda: Ich höre es schon seit Stunden.", "Sie soll ausschlafen, ich halte die Stellung."], advance: true },
    ...chainTalk("welt-bergpass-q2",
      ["Wo wir schon bei Geräuschen sind: der Bär unten am Abzweig brüllt seit Tagen exakt denselben Brüller. Immer gleich lang, immer gleiche Tonhöhe.", "Bring ihn zum Schweigen, bevor ich noch anfange mitzuzählen."],
      ["Endlich Stille. Ihm klebte ein Zettel im Fell.", "„Sound-Loop hängt (Audio-Patch in Vorbereitung).“ Kein Wunder, dass er sich anhörte wie eine kaputte Spieluhr."],
      ["Er brüllt unten am Abzweig, kurz vor der Steigung."],
      2),
    { step: "*", lines: ["Steil, kalt, und benannt nach dem Geräusch, das man beim Erklimmen macht. Hier oben höre ich nichts anderes."] },
  ]);
  m.scatter(["rockBig", "rockGrey", "darkTree", "stalagmite"], 34, [2, 2, 32, 24]);
  m.scatter(["skull", "bonesPile", "rockSmall"], 8, [2, 2, 32, 24]);
  m.scatter(["aSpikesBig", "aSpikes", "aRock", "aTreeTall"], 8, [2, 2, 32, 24]);
  return {
    slug: "bergpass", title: "Schnarchpass", map: m.build({ x: 3, y: 24 }),
    quest: quest("welt-bergpass", "Der müde Bote", [
      "Sprich mit Wanderin Frieda.", "Überbringe Wachposten Rolf die Botschaft am Ende des Passes.", "Kehre zu Frieda zurück.",
    ], 40, "welt-kuestenstrasse-q2"),
    extraQuests: [
      {
        slug: "welt-bergpass-q2", title: "Der Bär, der immer gleich brüllt", xpReward: 35, requires: "welt-bergpass",
        objectives: ["Sprich mit Wachposten Rolf.", "Bring den Bären am Abzweig zum Schweigen.", "Melde dich bei Rolf zurück.", "Abgeschlossen!"],
        steps: [
          { kind: "talk", text: "Sprich mit Wachposten Rolf." },
          { kind: "goal", text: "Besiege den Bären.", objectiveType: "MONSTER_SLAIN", targetRef: "baer", targetCount: 1 },
          { kind: "talk", text: "Melde dich bei Rolf zurück." },
        ],
      },
    ],
  };
}

// ── 5 Ruine des Ewigen Praktikanten ─────────────────────────

function ruinen(): WorldDef {
  const m = new MapBuilder(36, 28, "outdoor", 505);
  m.border("trees");
  m.fill(GROUND.stone, 10, 6, 17, 14);
  m.keepClear(10, 6, 17, 14);
  m.road([[17, 26], [17, 20]], 2);
  // Mauern: Nord und Süd mit Lücke, Ost/West aus Säulen
  for (const x of [10, 14, 18, 22]) m.place("ruinWall", x, 5);
  for (const x of [10, 12, 14]) m.place("ruinWall2", x, 20);
  for (const x of [21, 23, 25]) m.place("ruinWall2", x, 20);
  for (const y of [6, 9, 12, 15, 18]) { m.place("ruinPillar", 9, y); m.place("ruinPillar", 26, y); }
  m.place("obelisk", 17, 8);
  m.place("pillar", 13, 9); m.place("pillar", 22, 9); m.place("brokenPillar", 13, 16); m.place("brokenPillar", 22, 16);
  // Friedhof im Westen
  for (let i = 0; i < 6; i++) m.place(i % 2 ? "graveCross" : "grave", 3 + (i % 3) * 2, 8 + Math.floor(i / 3) * 3);
  m.chest("dokumentation", "Staubige Kiste", 24, 9, chestTalk(
    ["In der Kiste liegt eine Rolle: 'Dokumentation, Version 0.1 — wird nachgereicht'.", "Zumindest steht das Deckblatt schon."],
    ["Eine staubige Kiste. Vielleicht weiß der Geist etwas darüber."],
    ["Nur noch Staub und ein Post-it: 'TODO'."],
  ));
  m.npc("geist", "Geist des Praktikanten", 18, 13, "down", 51, [
    ...giverTalk(
      ["Buhuu … ich habe die Ruine gebaut, aber nie dokumentiert. Nun spuke ich, bis jemand die Doku findet.", "Sie müsste in der Kiste im Nordosten der Halle liegen."],
      ["Die Kiste steht im Nordosten der Halle, hinter den Säulen."],
      ["Die Dokumentation! Ich kann in Frieden ruhen — oder wenigstens in Rente.", "Aber hörst du das? Auf dem Friedhof erhebt sich seit Tagen derselbe Wiedergänger. Steht auf, fällt um, steht wieder auf. Als würde sein eigener Rollback fehlschlagen."],
      ["Ich bin frei! Jetzt muss ich nur noch die Onboarding-Unterlagen finden."],
    ),
    ...chainTalk("welt-ruinen-q2",
      ["Ein Wiedergänger, der nicht mal richtig wiedergehen kann. Erlöse ihn endgültig, bevor er noch öfter umfällt."],
      ["Diesmal bleibt er liegen. In seinen Knochenfingern: noch so ein Zettel.", "„Rollback fehlgeschlagen — Geist erneut gespawnt (Hotfix ausstehend).“ Nicht mal das Sterben klappt hier richtig."],
      ["Er steht auf dem Friedhof im Westen, zwischen den Gräbern."],
      2),
    { step: "*", lines: ["Ich bin frei! Jetzt muss ich nur noch die Onboarding-Unterlagen finden."] },
  ]);
  m.npc("wanderer", "Grabwächter Ludwig", 6, 14, "right", 52, chatter("Hier liegt jeder, der irgendwann mal 'kurz schauen' wollte."));
  m.sign("mahnmal", "Mahnmal", 17, 8, ["Hier ruht der Praktikant, der nie dokumentiert hat. Möge sein Wiki Erlösung finden."]);
  m.scatter(["bonesPile", "skull", "bones", "skullPile", "mushrooms"], 12, [10, 6, 17, 14]);
  m.scatter(["tree", "darkTree", "fruitBush", "rocks"], 24, [2, 2, 32, 24]);
  m.scatter(["aSpikes", "aRockBig", "aBone1", "aBone2", "aSkull", "aGrave1", "aGrave2"], 12, [2, 2, 32, 24]);
  return {
    slug: "ruinen", title: "Ruine des Ewigen Praktikanten", map: m.build({ x: 17, y: 25 }),
    quest: quest("welt-ruinen", "Die fehlende Dokumentation", [
      "Sprich mit dem Geist des Praktikanten in der Halle.", "Finde die staubige Kiste im Nordosten der Ruine.", "Bring die Dokumentation zum Geist.",
    ], 50, "welt-bergpass-q2"),
    extraQuests: [
      {
        slug: "welt-ruinen-q2", title: "Der Wiedergänger, der nicht wiedergehen kann", xpReward: 40, requires: "welt-ruinen",
        objectives: ["Sprich mit dem Geist des Praktikanten.", "Erlöse den Wiedergänger auf dem Friedhof.", "Melde dich beim Geist zurück.", "Abgeschlossen!"],
        steps: [
          { kind: "talk", text: "Sprich mit dem Geist des Praktikanten." },
          { kind: "goal", text: "Besiege den Wiedergänger.", objectiveType: "MONSTER_SLAIN", targetRef: "wiedergaenger", targetCount: 1 },
          { kind: "talk", text: "Melde dich beim Geist zurück." },
        ],
      },
    ],
  };
}

// ── 6 Dorf Nirgendwo ────────────────────────────────────────

function verlassenesDorf(): WorldDef {
  const m = new MapBuilder(36, 28, "outdoor", 606);
  m.border("trees");
  m.road([[2, 14], [33, 14]], 2);
  const dark = { k: 5, r: 0 };
  m.building(house({ name: "Verfallenes Haus", x: 5, y: 4, w: 6, roof: dark, wall: { k: 0, r: 3 }, doorDx: 2, windowDx: [0, 4] }));
  m.building(house({ name: "Schiefes Haus", x: 15, y: 3, w: 5, roof: dark, wall: { k: 4, r: 1 }, doorDx: 2, windowDx: [0, 3] }));
  m.building(house({ name: "Altes Wirtshaus", x: 25, y: 5, w: 7, roof: dark, wall: { k: 0, r: 3 }, doorDx: 3, windowDx: [1, 5], sign: "shopMug" }));
  m.road([[7, 9], [7, 14]], 2);
  m.road([[17, 8], [17, 14]], 2);
  m.road([[28, 10], [28, 14]], 2);
  m.road([[31, 15], [31, 22]], 2);
  m.chest("gartenkiste", "Kiste im Garten", 31, 23, chestTalk(
    ["Hinter dem Wirtshaus, unter Unkraut: die Kiste. Darin liegt der Ortsschein von 'Nirgendwo'.", "Postleitzahl: existiert nicht. Aber immerhin ein Stempel!"],
    ["Eine alte Kiste im verwilderten Garten. Erst mal jemanden fragen."],
    ["Nur Unkraut und ein rostiger Löffel."],
  ));
  m.npc("einwohner", "Der letzte Einwohner", 10, 16, "up", 61, giverTalk(
    ["Einwohnerzahl: unklar. Ich glaube, ich bin es. Ich brauche den Ortsschein, um zu beweisen, dass es das Dorf gibt.", "Er liegt in der Kiste im Garten hinter dem Wirtshaus, ganz im Osten."],
    ["Die Kiste steht hinter dem Wirtshaus im Garten. Den Weg im Osten nach Süden folgen."],
    ["Der Ortsschein! Nirgendwo existiert also wirklich. Ich muss mich setzen.", "Danke — du bist der erste Besucher seit Jahren. Und wohl der einzige."],
    ["Ich bin jetzt offiziell jemand. Ein tolles Gefühl."],
  ));
  m.npc("kind", "Hofhund-Flüsterer", 22, 16, "left", 62, [
    ...chainTalk("welt-verlassenes_dorf-q2",
      ["Der Hund gehört niemandem. Aber weißt du, was mich mehr stört? Das Skelett bei den Gräbern. Steht seit Tagen auf genau derselben Stelle, bewegt sich nicht, blickt ins Leere.", "Als wäre es noch nicht fertig geladen. Erledige es, bevor es noch mehr Leute gruselt."],
      ["Weg ist es. Zwischen den Rippen: ein Zettel.", "„Textur konnte nicht geladen werden — Platzhalter aktiv (Fix folgt).“ Erklärt einiges. Vielleicht ist ganz Nirgendwo nur ein Platzhalter."],
      ["Es steht bei den Gräbern im Süden, bewegt sich nie."],
      2),
    { step: "*", lines: ["Der Hund kommt trotzdem immer wieder. Fast wie ein Bewohner."] },
  ]);
  m.place("hedge4", 12, 16); m.place("fenceH", 2, 12); m.place("fenceH", 4, 12);
  m.scatter(["tree", "darkTree", "fruitBush", "flowerBed", "stump", "rocks", "hay", "scarecrow"], 42, [2, 2, 32, 24]);
  m.scatter(["aTreeTall", "aTreeBig"], 5, [2, 2, 32, 24]);
  m.scatter(["aGrave1", "aGrave2", "aGrave3", "aBone1", "aBone2", "aSkull", "aBone3", "aLog"], 12, [2, 2, 32, 24]);
  return {
    slug: "verlassenes_dorf", title: "Dorf Nirgendwo", map: m.build({ x: 3, y: 14 }),
    quest: quest("welt-verlassenes-dorf", "Der Beweis für Nirgendwo", [
      "Sprich mit dem letzten Einwohner.", "Finde die Kiste im Garten hinter dem Wirtshaus.", "Bring den Ortsschein zum Einwohner.",
    ], 40, "welt-ruinen-q2"),
    extraQuests: [
      {
        slug: "welt-verlassenes_dorf-q2", title: "Das Skelett, das nie fertig geladen hat", xpReward: 40, requires: "welt-verlassenes-dorf",
        objectives: ["Sprich mit dem Hofhund-Flüsterer.", "Besiege das reglose Skelett bei den Gräbern.", "Melde dich zurück.", "Abgeschlossen!"],
        steps: [
          { kind: "talk", text: "Sprich mit dem Hofhund-Flüsterer." },
          { kind: "goal", text: "Besiege das Skelett.", objectiveType: "MONSTER_SLAIN", targetRef: "skelett", targetCount: 1 },
          { kind: "talk", text: "Melde dich zurück." },
        ],
      },
    ],
  };
}

// ── 7 Höhle der Zweiten Meinung ─────────────────────────────

function schmugglerhoehle(): WorldDef {
  const m = new MapBuilder(36, 28, "cave", 707);
  m.border("cave", 3);
  m.road([[4, 22], [11, 22], [11, 13], [27, 13], [27, 7]], 2);
  m.road([[11, 8], [7, 8]], 1);
  m.chest("plan-b", "Versteckte Kiste", 6, 8, chestTalk(
    ["In der Kiste liegt 'Plan B' — mit Kaffeeflecken und einem Eselsohr.", "Plan A war offenbar so schlecht, dass Plan B gleich mit rausmusste."],
    ["Eine Kiste in einer Sackgasse. Bestimmt wichtig — oder nur eine Sackgasse."],
    ["Leer. Plan C existiert nicht."],
  ));
  m.npc("gundula", "Höhlenwirtin Gundula", 29, 8, "left", 71, giverTalk(
    ["Hierher kommt man, wenn Plan A schlecht war. Ich habe Plan B — aber ich habe ihn verlegt.", "Ich glaube, er liegt in der Kiste ganz im Nordwesten, in der Sackgasse."],
    ["Plan B liegt in der Kiste im Nordwesten. Folge dem Seitengang von der Kreuzung aus."],
    ["Plan B! Und er ist sogar leserlich. Sehr verdächtig.", "Hier, für dich. Wer weiß, wann du einen Plan B brauchst."],
    ["Jetzt haben wir Plan B. Für Plan C ist es zu früh."],
  ));
  m.npc("schmuggler", "Zwielichtiger Kunde", 14, 15, "up", 72, [
    ...chainTalk("welt-schmugglerhoehle-q2",
      ["Ich habe nichts zu verzollen. Außer diesem einen Sack. Und diesem. Und — sag mal, siehst du das Schattenauge da hinten auch? Mal ist es da, mal nicht.", "Kann sich wohl nicht entscheiden, ob es sichtbar sein will. Zweite Meinung eben. Mach's weg."],
      ["Weg, und diesmal endgültig sichtbar tot. In seinem Schatten lag ein Zettel.", "„Sichtbarkeits-Flag flackert (Rendering-Fix in Arbeit).“ Selbst die Geister hier können sich nicht entscheiden."],
      ["Es flackert irgendwo hier im Hauptgang, mal zu sehen, mal nicht."],
      2),
    { step: "*", lines: ["Ich habe nichts zu verzollen. Außer diesem einen Sack. Und diesem. Und dem da."] },
  ]);
  m.scatter(["crateBlue", "waterBarrel", "jar", "jarGrey", "rockBig", "stalagmite", "mushrooms", "skull", "rockGrey"], 44, [3, 3, 30, 22]);
  m.scatter(["dCrystalBig", "dCrystalA", "dCrystalB", "dCrystalC", "dCrystalCluster", "dBoulderA", "dBoulderB"], 18, [2, 2, 32, 24]);
  return {
    slug: "schmugglerhoehle", title: "Höhle der Zweiten Meinung", map: m.build({ x: 5, y: 22 }),
    quest: quest("welt-schmugglerhoehle", "Plan B", [
      "Sprich mit Höhlenwirtin Gundula.", "Finde die Kiste in der Sackgasse im Nordwesten.", "Bring Plan B zu Gundula.",
    ], 50, "welt-verlassenes_dorf-q2"),
    extraQuests: [
      {
        slug: "welt-schmugglerhoehle-q2", title: "Das Schattenauge, das sich nicht entscheiden kann", xpReward: 40, requires: "welt-schmugglerhoehle",
        objectives: ["Sprich mit dem zwielichtigen Kunden.", "Besiege das flackernde Schattenauge.", "Melde dich zurück.", "Abgeschlossen!"],
        steps: [
          { kind: "talk", text: "Sprich mit dem zwielichtigen Kunden." },
          { kind: "goal", text: "Besiege das Schattenauge.", objectiveType: "MONSTER_SLAIN", targetRef: "schattenauge", targetCount: 1 },
          { kind: "talk", text: "Melde dich zurück." },
        ],
      },
    ],
  };
}

// ── 8 Bierbart-Feste ────────────────────────────────────────

function zwergenfeste(): WorldDef {
  const m = new MapBuilder(36, 28, "cave", 808);
  m.border("cave", 3);
  m.fill(GROUND.cobble, 12, 11, 12, 8);
  m.keepClear(12, 11, 12, 8);
  m.road([[17, 4], [17, 25]], 2);
  m.road([[3, 15], [33, 15]], 2);
  const stone = { k: 5, r: 0 };
  m.building(house({ name: "Brauhaus", x: 5, y: 4, w: 7, roof: stone, wall: { k: 4, r: 1 }, doorDx: 3, windowDx: [1, 5], sign: "shopMug" }));
  m.building(house({ name: "Schmiede", x: 24, y: 4, w: 6, roof: stone, wall: { k: 0, r: 3 }, doorDx: 2, windowDx: [0, 4], sign: "shopSword" }));
  m.building(house({ name: "Wohnhöhle", x: 6, y: 19, w: 6, roof: stone, wall: { k: 0, r: 1 }, doorDx: 2, windowDx: [0, 4] }));
  m.road([[8, 9], [8, 15]], 2);
  m.road([[26, 9], [26, 15]], 2);
  m.road([[8, 24], [17, 24]], 2);
  m.chest("fass", "Verschlossenes Fass", 29, 21, chestTalk(
    ["Du klopfst dreimal, das Fass antwortet: gluck, gluck. Darin liegt das Rezept: 'Wasser. Aber nur ein bisschen.'", "Das ist der Krug-Ersatz, den Brumm brauchte."],
    ["Ein Fass mit Schloss. Brumm sagt sicher, warum es sich lohnt."],
    ["Das Fass ist leer. Ein Zwerg würde weinen."],
  ));
  m.road([[19, 21], [29, 21]], 2);
  m.npc("brumm", "Zwerg Brumm", 22, 13, "left", 81, giverTalk(
    ["Bei meinem Bart: Unser Krug ist leer! Die Verteidigung der Feste besteht ausschließlich aus Met.", "Im Fass im Süden liegt das Notrezept. Holst du es, ehe die Wache Durst kriegt?"],
    ["Das Fass steht im Südosten, den Weg vom Platz aus nach unten und dann rechts."],
    ["Das Rezept! Ich erkenne meine Handschrift: kaum lesbar, aber voller Zuversicht.", "Du hast die Feste gerettet. Ein Bier auf dich!"],
    ["Die Feste ist wieder wehrhaft. Zumindest bis zum nächsten Fass."],
  ));
  m.npc("schmied", "Schmiedin Thora", 15, 17, "up", 82, [
    ...chainTalk("welt-zwergenfeste-q2",
      ["Schwerter, Äxte, Krüge. Vor allem Krüge. Aber sag mal — der Knochenwächter drüben trifft mich, bevor er überhaupt ausholt. Seine Klinge ist schneller als seine eigene Bewegung.", "Das ist nicht gruselig, das ist einfach unfair. Mach dem ein Ende."],
      ["Ruhe, endlich passend zur Reihenfolge. In seinem Brustkorb: ein Zettel.", "„Treffererkennung läuft der Animation voraus (Fix folgt).“ Kein Wunder, dass er schneller zuschlug, als er sich bewegte."],
      ["Er steht auf der anderen Seite des Platzes, gleich neben den Säulen."],
      2),
    { step: "*", lines: ["Für alles andere ist die Wache zu betrunken."] },
  ]);
  m.place("fountain", 16, 12);
  m.place("pillar", 12, 11); m.place("pillar", 22, 11); m.place("stoneBlocks", 12, 17); m.place("stoneBlocks", 22, 17);
  m.scatter(["waterBarrel", "barrel", "jar", "jarGrey", "crateBlue", "rockBig", "stalagmite", "mushrooms"], 40, [3, 3, 30, 22]);
  m.scatter(["dCrystalA", "dCrystalB", "dGargoyle", "dMoonStatue", "dBat"], 8, [2, 2, 32, 24]);
  return {
    slug: "zwergenfeste", title: "Bierbart-Feste", map: m.build({ x: 17, y: 24 }),
    quest: quest("welt-zwergenfeste", "Der leere Krug", [
      "Sprich mit Zwerg Brumm am Festplatz.", "Finde das verschlossene Fass im Südosten.", "Bring das Rezept zu Brumm.",
    ], 50, "welt-schmugglerhoehle-q2"),
    extraQuests: [
      {
        slug: "welt-zwergenfeste-q2", title: "Der Knochenwächter, der zu früh trifft", xpReward: 45, requires: "welt-zwergenfeste",
        objectives: ["Sprich mit Schmiedin Thora.", "Besiege den vorschnellen Knochenwächter.", "Melde dich bei Thora zurück.", "Abgeschlossen!"],
        steps: [
          { kind: "talk", text: "Sprich mit Schmiedin Thora." },
          { kind: "goal", text: "Besiege den Knochenwächter.", objectiveType: "MONSTER_SLAIN", targetRef: "knochenwaechter", targetCount: 1 },
          { kind: "talk", text: "Melde dich bei Thora zurück." },
        ],
      },
    ],
  };
}

// ── 9 Frostgipfel ───────────────────────────────────────────

function frostgipfel(): WorldDef {
  const m = new MapBuilder(36, 28, "outdoor", 909);
  m.border("rocks");
  m.fill(GROUND.snow, 2, 2, 32, 24);
  m.fill(GROUND.ice, 20, 15, 9, 6);
  m.fill(GROUND.ice, 6, 4, 8, 5);
  m.fill(GROUND.ice, 2, 12, 4, 4);
  m.road([[4, 25], [4, 18], [16, 18], [16, 10], [28, 10], [28, 5]], 2, GROUND.stone);
  m.place("xIgloo", 8, 20);
  m.place("xSnowmanB", 14, 22);
  m.place("xSnowmanC", 15, 22);
  m.chest("gipfelfahne", "Gipfelkiste", 28, 4, chestTalk(
    ["Auf dem Gipfel steht eine Kiste mit einer Fahne: 'Ich war hier. (Nächste Woche.)'", "Du nimmst die Fahne mit — Beweis, dass es jemand geschafft hat."],
    ["Die Gipfelkiste. Bernd hat bestimmt eine Meinung dazu."],
    ["Leer. Die Fahne hast du längst."],
  ));
  m.npc("bernd", "Bergsteiger Bernd", 5, 22, "right", 91, [
    ...giverTalk(
      ["Ich erklimme den Gipfel nächste Woche. Das sage ich seit Generationen.", "Holst du mir die Fahne von der Gipfelkiste? Dann weiß ich, dass sich die Mühe lohnt."],
      ["Der Weg führt im Zickzack nach oben. Die Gipfelkiste steht ganz im Nordosten."],
      ["Die Fahne! Sie ist echt. Und ich habe sie nicht mal selbst geholt. Genau mein Stil.", "Weißt du, warum ich nie wirklich hochgehe? Ganz oben, jenseits der Gipfelkiste, ist immer 'noch was im Bau'. Seit Generationen. Das kann kein Zufall sein."],
      ["Nächste Woche. Ganz sicher."],
    ),
    ...chainTalk("welt-frostgipfel-q3",
      ["Was da oben hockt, ist kein Berg-Ding. Es sieht aus wie ein Werkzeugkasten mit Ego, und es murmelt ständig etwas von 'kommendem Update'.", "Nimm ein paar Leute mit. Ich bleibe hier — Höhenangst, oder so was Ähnliches. Wirklich."],
      ["Es ist weg?! Endlich — nach all den Generationen 'nächste Woche'.", "Vielleicht steig ich jetzt wirklich mal hoch. Nächste Woche."],
      ["Ganz oben, jenseits der Gipfelkiste. Nimm Verstärkung mit."],
      2),
    { step: "*", lines: ["Nächste Woche. Ganz sicher."] },
  ]);
  m.npc("wetter", "Wettermann Wilhelm", 20, 12, "down", 92, [
    ...chainTalk("welt-frostgipfel-q2",
      ["Heute: Schnee. Morgen: Schnee. Übermorgen: Überraschung, Schnee.", "Aber der Frostgeist beim Ostgrat — der ist seit einer Woche 'fast weg'. Flackert, verblasst, ist aber immer noch da. Räum ihn weg, bevor er sich in meiner Wettervorhersage einnistet."],
      ["Endlich vollständig verschwunden, nicht nur halb. In der Kälte lag ein Zettel.", "„Objekt nicht vollständig entladen (Speicherleck, Fix in Arbeit).“ Erklärt, warum hier nichts jemals ganz weggeht. Nicht mal der Winter."],
      ["Er treibt am Ostgrat, halb da, halb nicht."],
      2),
    { step: "*", lines: ["Heute: Schnee. Morgen: Schnee. Übermorgen: Überraschung, Schnee."] },
  ]);
  m.scatter(["sTree", "sDarkTree"], 24, [2, 2, 32, 24]);
  m.scatter(["xSnowLump1", "xSnowLump2", "rockGrey", "rockBig"], 22, [2, 2, 32, 24]);
  m.scatter(["dCrystalBig", "dCrystalA", "dCrystalB", "dCrystalC", "dCrystalCluster", "dCrystalSmallA"], 9, [2, 2, 32, 24]);
  m.scatter(["xSnowmanA", "xSnowmanD", "skull", "bonesPile"], 5, [2, 2, 32, 24]);
  return {
    slug: "frostgipfel", title: "Frostgipfel des ewigen Aufschubs", map: m.build({ x: 5, y: 25 }),
    quest: quest("welt-frostgipfel", "Nächste Woche vielleicht", [
      "Sprich mit Bergsteiger Bernd.", "Hole die Fahne aus der Gipfelkiste im Nordosten.", "Bring die Fahne zu Bernd.",
    ], 50, "welt-sumpf-q2"),
    extraQuests: [
      {
        slug: "welt-frostgipfel-q2", title: "Der Frostgeist, der nie ganz weggeht", xpReward: 45, requires: "welt-frostgipfel",
        objectives: ["Sprich mit Wettermann Wilhelm.", "Besiege den halb entladenen Frostgeist.", "Melde dich bei Wilhelm zurück.", "Abgeschlossen!"],
        steps: [
          { kind: "talk", text: "Sprich mit Wettermann Wilhelm." },
          { kind: "goal", text: "Besiege den Frostgeist.", objectiveType: "MONSTER_SLAIN", targetRef: "frostgeist", targetCount: 1 },
          { kind: "talk", text: "Melde dich bei Wilhelm zurück." },
        ],
      },
      {
        slug: "welt-frostgipfel-q3", title: "Der Patch", xpReward: 120, requires: "welt-frostgipfel-q2",
        objectives: ["Sprich mit Bergsteiger Bernd.", "Bezwinge Der Patch auf dem wahren Gipfel.", "Melde dich bei Bernd zurück.", "Abgeschlossen!"],
        steps: [
          { kind: "talk", text: "Sprich mit Bergsteiger Bernd." },
          { kind: "goal", text: "Bezwinge Der Patch.", objectiveType: "MONSTER_SLAIN", targetRef: "derpatch", targetCount: 1 },
          { kind: "talk", text: "Melde dich bei Bernd zurück." },
        ],
      },
    ],
  };
}

// ── 10 Sumpf der verlorenen Socken ──────────────────────────

function sumpf(): WorldDef {
  const m = new MapBuilder(36, 28, "outdoor", 1010);
  m.border("trees");
  m.fill(GROUND.sand, 2, 2, 32, 24);
  m.road([[3, 4], [12, 4], [12, 14], [24, 14], [24, 22], [32, 22]], 2, GROUND.dirt);
  m.chest("sockenkiste", "Sockenkiste", 32, 24, chestTalk(
    ["Die Kiste ist randvoll mit Socken — aber jede ist ein Einzelstück. Nur eine ist grün gestreift: Ottos Socke.", "Du nimmst sie mit."],
    ["Eine Kiste voller … Fäden? Frag erst Otto, worum es geht."],
    ["Nur noch ein Loch im Boden. Und eine einsame Socke, die nicht Otto gehört."],
  ));
  m.npc("otto", "Sockensammler Otto", 14, 9, "right", 101, giverTalk(
    ["Ausrüstung geht hierher, um nie wiederzukommen. Ich suche meine grün gestreifte Socke, das Gegenstück ist schon vor Jahren versunken.", "Bestimmt liegt sie in der Sockenkiste im Südosten. Bringst du sie mir?"],
    ["Die Sockenkiste steht im Südosten am Ende des Wegs."],
    ["Meine Socke! Endlich ein Paar. Ich muss mich vor Freude in den Sumpf setzen.", "Danke. Du bist ein wahrer Freund — und ein kleiner Held."],
    ["Zwei Socken, ein Fuß. Warte, das stimmt so nicht ganz."],
  ));
  m.npc("froschkoenig", "Verwunschene Kröte", 26, 10, "down", 102, [
    ...chainTalk("welt-sumpf-q2",
      ["Küss mich, dann werde ich ein Prinz. Oder eine noch größere Kröte. Kommt auf den Tag an.", "Aber schau dir lieber den Goblin drüben an: Arme starr ausgestreckt, Beine gerade, bewegt sich kein bisschen. Sieht aus wie eine sehr schlechte Statue von sich selbst."],
      ["Hat sich endlich hingelegt, wie ein normales Wesen. Zwischen den Fingern klemmte Papier.", "„Animationsrig nicht vollständig geladen (Fix folgt).“ Tja. Wenigstens weiß ich jetzt, warum ICH manchmal so stehe."],
      ["Er starrt reglos irgendwo hier im Sumpf, Arme ausgebreitet."],
      2),
    { step: "*", lines: ["Küss mich, dann werde ich ein Prinz. Oder eine noch größere Kröte. Kommt auf den Tag an."] },
  ]);
  m.scatter(["lily", "lilyPink", "reeds", "reedsTuft"], 44, [2, 2, 32, 24]);
  m.scatter(["darkTree", "tree", "log", "stump", "mushrooms", "rockSmall"], 24, [2, 2, 32, 24]);
  m.scatter(["jTree1", "jTree2", "jBushBig", "jBushMid", "jBushSmall", "jHollowLog"], 12, [2, 2, 32, 24]);
  m.scatter(["jFlowerWhite", "jFlowerYellow", "jFlowerPink", "jTuftA", "jTuftB", "jRocks"], 22, [2, 2, 32, 24]);
  return {
    slug: "sumpf", title: "Sumpf der verlorenen Socken", map: m.build({ x: 4, y: 4 }),
    quest: quest("welt-sumpf", "Die eine Socke", [
      "Sprich mit Sockensammler Otto.", "Finde die Sockenkiste im Südosten des Sumpfes.", "Bring die grün gestreifte Socke zu Otto.",
    ], 40, "welt-zwergenfeste-q2"),
    extraQuests: [
      {
        slug: "welt-sumpf-q2", title: "Der Goblin in der Ladehaltung", xpReward: 45, requires: "welt-sumpf",
        objectives: ["Sprich mit der verwunschenen Kröte.", "Besiege den erstarrten Goblin.", "Melde dich bei der Kröte zurück.", "Abgeschlossen!"],
        steps: [
          { kind: "talk", text: "Sprich mit der verwunschenen Kröte." },
          { kind: "goal", text: "Besiege den Goblin.", objectiveType: "MONSTER_SLAIN", targetRef: "goblin", targetCount: 1 },
          { kind: "talk", text: "Melde dich bei der Kröte zurück." },
        ],
      },
    ],
  };
}

// ── Zugriff ─────────────────────────────────────────────────

const BUILDERS: Record<string, () => WorldDef> = {
  hafenstadt, waldpfad, kuestenstrasse, bergpass, ruinen, verlassenes_dorf: verlassenesDorf,
  schmugglerhoehle, zwergenfeste, frostgipfel, sumpf,
};

const cache = new Map<string, WorldDef>();

export const WORLD_SLUGS = Object.keys(BUILDERS);

// ── Monster-Figuren der festen Locations ────────────────────
// Ort als Anteil der Kartengröße; der Platz wird zur nächsten freien, vom Startpunkt erreichbaren Kachel mit Luft drumherum verschoben.

const MONSTER_SPOTS: Record<string, [string, number, number, ("elite" | "boss")?][]> = {
  hafenstadt: [["ratte", 0.2, 0.7], ["ratte", 0.8, 0.75], ["schleimschaedel", 0.5, 0.85]],
  waldpfad: [["wolf", 0.5, 0.4], ["waldwolf", 0.65, 0.25], ["dornenbeisser", 0.75, 0.7], ["wegelagerer", 0.4, 0.8], ["blutegel", 0.25, 0.3]],
  kuestenstrasse: [["wegelagerer", 0.5, 0.5], ["skelett", 0.8, 0.3]],
  bergpass: [["baer", 0.6, 0.5], ["goblin", 0.35, 0.7], ["daemonenauge", 0.8, 0.3]],
  ruinen: [["schattenwolf", 0.15, 0.8, "elite"], ["skelett", 0.3, 0.4], ["flatterschaedel", 0.7, 0.6], ["golem", 0.5, 0.25, "elite"], ["wiedergaenger", 0.85, 0.85]],
  verlassenes_dorf: [["schattenwolf", 0.25, 0.75], ["goblin", 0.5, 0.5], ["skelett", 0.75, 0.35]],
  schmugglerhoehle: [["goblin", 0.5, 0.45], ["hauptmann", 0.7, 0.7, "boss"], ["schattenauge", 0.25, 0.6]],
  zwergenfeste: [["knochenwaechter", 0.3, 0.6], ["golem", 0.6, 0.4, "elite"], ["totenkaefer", 0.8, 0.7]],
  frostgipfel: [["eisbaer", 0.2, 0.35, "elite"], ["rentier", 0.75, 0.7], ["eisbaerjunges", 0.45, 0.85], ["frostwolf", 0.5, 0.5], ["eisschleim", 0.3, 0.7], ["frostgeist", 0.6, 0.3], ["drache", 0.85, 0.25, "elite"], ["derpatch", 0.95, 0.08]],
  sumpf: [["blutegel", 0.3, 0.7], ["schleimschaedel", 0.5, 0.5], ["goblin", 0.75, 0.6], ["hoellenschaedel", 0.85, 0.2]],
};

/** Monster-Figuren auf freie, erreichbare Kacheln nahe den Anteils-Positionen setzen (Kennung `<prefix><n>`). */
export function placeSpots(w: WorldDef, spots: [string, number, number, ("elite" | "boss")?][] | undefined, prefix: string): WorldDef {
  const m = w.map;
  if (!spots?.length) return w;
  const solid = solidOfMap(m);
  // Vom Startpunkt erreichbare Kacheln
  const reach = Array.from({ length: m.rows }, () => Array<boolean>(m.cols).fill(false));
  const queue: [number, number][] = [[m.spawn.x, m.spawn.y]];
  reach[m.spawn.y][m.spawn.x] = true;
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < m.cols && ny < m.rows && !solid[ny][nx] && !reach[ny][nx]) { reach[ny][nx] = true; queue.push([nx, ny]); }
    }
  }
  const open = (x: number, y: number) => x >= 0 && y >= 0 && x < m.cols && y < m.rows && !solid[y][x];
  const openAround = (x: number, y: number) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].filter(([dx, dy]) => open(x + dx, y + dy)).length;
  const actors = [...m.actors];
  spots.forEach(([monsterId, fx, fy, tier], i) => {
    const mo = getMonster(monsterId);
    if (!mo) return;
    const hx = Math.round(fx * (m.cols - 1));
    const hy = Math.round(fy * (m.rows - 1));
    let best: [number, number] | null = null;
    let bestD = Infinity;
    for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) {
      if (!reach[y][x] || solid[y][x] || openAround(x, y) < 7) continue;
      if (Math.abs(x - m.spawn.x) + Math.abs(y - m.spawn.y) < 6) continue;
      const d = Math.abs(x - hx) + Math.abs(y - hy);
      if (d < bestD) { best = [x, y]; bestD = d; }
    }
    if (!best) return;
    solid[best[1]][best[0]] = true;
    actors.push({ id: `${prefix}${i + 1}`, kind: "monster", name: mo.name, x: best[0], y: best[1], dir: "down", monster: mo.id, ...(tier ? { tier } : {}), talk: [{ step: "*", lines: [mo.blurb] }] });
  });
  return { ...w, map: { ...m, actors } };
}

function addMonsters(w: WorldDef): WorldDef {
  return placeSpots(w, MONSTER_SPOTS[w.slug], "mon");
}

/** Welt einer Location (oder undefined für unbekannte Slugs). Wird einmal erzeugt und dann gemerkt. */
export function getWorld(slug: string): WorldDef | undefined {
  const build = BUILDERS[slug];
  if (!build) return undefined;
  let w = cache.get(slug);
  if (!w) { const built = addMonsters(build()); w = FIXED_AMBIENCE[slug] ? { ...built, ambience: FIXED_AMBIENCE[slug] } : built; cache.set(slug, w); }
  return w;
}

export type { Actor };
