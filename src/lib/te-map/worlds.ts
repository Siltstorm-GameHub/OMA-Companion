// ============================================
// Die 10 begehbaren Welten von OMA Quest (eine je Location) mit je einer kurzen Quest
// ============================================
// Karten werden aus festen Seeds mit dem MapBuilder erzeugt (immer identisch). Quest-Schema:
// Schritt 0 = Auftraggeber ansprechen, Schritt 1 = Ort/Truhe (oder zweiter NPC), Schritt 2 = zurück
// zum Auftraggeber. Ton wie bei den Orten: humoristisch statt episch-ernst.

import { MapBuilder } from "./generate";
import { GROUND, type Actor, type Building, type Talk, type WorldDef, type WorldQuest } from "./types";

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

const quest = (slug: string, title: string, objectives: [string, string, string], xpReward: number): WorldQuest => ({
  slug, title, objectives: [...objectives, "Abgeschlossen!"], xpReward,
});

// Dach-/Wandblöcke (A3): Dächer braun 0, gold 1, grün 2, rot 3, blau 4, dunkel 5; Wände 0/1 (Zeile 1) bzw. 0/3 (Zeile 3)
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
  m.building(house({ name: "Fischhalle", x: 24, y: 3, w: 7, roof: { k: 3, r: 0 }, wall: { k: 4, r: 1 }, doorDx: 3, windowDx: [1, 5], sign: "shopSword" }));
  m.building(house({ name: "Lagerhaus", x: 4, y: 19, w: 6, roof: { k: 2, r: 0 }, wall: { k: 0, r: 3 }, doorDx: 2, windowDx: [0, 4] }));
  m.building(house({ name: "Zum Halben Anker", x: 22, y: 19, w: 7, roof: { k: 4, r: 0 }, wall: { k: 0, r: 1 }, doorDx: 3, windowDx: [1, 5], sign: "shopMug" }));
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
  m.npc("knut", "Matrose Knut", 29, 10, "down", 12, chatter("Ich fahre zur See, seit ich denken kann. Also seit gestern.", "Das Meer? Das ist da hinten irgendwo. Ich such's morgen."));
  m.sign("schild", "Schild", 19, 8, ["Willkommen in Alt-Hafenstadt! Es riecht nach Fisch und schlechten Entscheidungen."]);
  for (const [x, y] of [[3, 8], [10, 8]]) m.place("barrel", x, y);
  m.place("crate", 23, 8);
  m.place("hay", 30, 24);
  m.scatter(["flowerBed", "rocks", "hedgeFlowers"], 14, [2, 2, 32, 24]);
  return { slug: "hafenstadt", title: "Alt-Hafenstadt", map: m.build({ x: 17, y: 15 }), quest: quest("welt-hafenstadt", "Die verlorene Fracht", [
    "Sprich mit Hafenmeisterin Olga.", "Finde die Frachtkiste im Osten der Stadt.", "Bring den Frachtbrief zu Olga.",
  ], 40) };
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
  m.npc("holz", "Förster Holz", 30, 8, "left", 21, giverTalk(
    ["Ein Wald, in dem nie jemand den direkten Weg findet — und ausgerechnet mein Kompass ist weg!", "Ich glaube, er liegt in einer Truhe im Nordwesten, irgendwo hinter dem Abzweig."],
    ["Nimm den Abzweig nach Nordwesten und such die moosige Truhe. Nicht im Kreis laufen!"],
    ["Mein Kompass! Er zeigt zwar falsch, aber er ist mein Kompass.", "Danke. Ich zeige dir dafür einen Trick: Wer sich verirrt, bleibt einfach stehen und wartet auf den Wald."],
    ["Ich gehe gleich los. Wenn ich den Ausgang finde."],
  ));
  m.npc("pilzsammler", "Pilzsammlerin Frida", 12, 16, "up", 22, chatter("Nur die roten sind giftig. Oder die weißen. Oder die braunen. Ich frage immer erst den Pilz."));
  m.scatter(["tree", "darkTree"], 46, [2, 2, 32, 24], { spacing: 0 });
  m.scatter(["fruitBush", "stump", "log", "mushrooms", "flowerBed"], 26, [2, 2, 32, 24]);
  return { slug: "waldpfad", title: "Der Krähwald", map: m.build({ x: 3, y: 20 }), quest: quest("welt-waldpfad", "Der Weg aus dem Wald", [
    "Sprich mit Förster Holz an der Lichtung.", "Finde die moosige Truhe im Nordwesten.", "Bring den Kompass zu Förster Holz.",
  ], 40) };
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
  m.npc("sven", "Schmuggler Sven", 27, 14, "left", 31, giverTalk(
    ["Psst. Ich habe eigentlich nur eine letzte Lieferung. Danach höre ich auf. Ehrlich.", "Sie liegt in der Kiste unterm Steg im Westen. Holst du mir die Bestätigung?"],
    ["Die Kiste ist am Ende des Sandwegs, südlich der Straße. Schön unauffällig!"],
    ["Die Bestätigung! Jetzt darf ich guten Gewissens weitermachen.", "Das war ja die letzte Lieferung. Bis zur nächsten."],
    ["Nur noch eine allerletzte. Wirklich."],
  ));
  m.npc("fischer", "Fischer Anselm", 6, 14, "down", 32, chatter("Ich fange nichts. Aber ich fange es mit Stil."));
  m.scatter(["rocks", "rockGrey", "bonesPile", "hedge4"], 16, [2, 2, 32, 24]);
  m.scatter(["log", "hay", "rockSmall"], 8, [2, 15, 32, 10]);
  return { slug: "kuestenstrasse", title: "Küste der 1000 Ausreden", map: m.build({ x: 3, y: 12 }), quest: quest("welt-kuestenstrasse", "Die allerletzte Lieferung", [
    "Sprich mit Schmuggler Sven.", "Finde die Kiste unterm Steg.", "Bring die Bestätigung zu Sven.",
  ], 40) };
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
    { step: "*", lines: ["Steil, kalt, und benannt nach dem Geräusch, das man beim Erklimmen macht. Hier oben höre ich nichts anderes."] },
  ]);
  m.scatter(["rockBig", "rockGrey", "darkTree", "stalagmite"], 34, [2, 2, 32, 24]);
  m.scatter(["skull", "bonesPile", "rockSmall"], 8, [2, 2, 32, 24]);
  return { slug: "bergpass", title: "Schnarchpass", map: m.build({ x: 3, y: 24 }), quest: quest("welt-bergpass", "Der müde Bote", [
    "Sprich mit Wanderin Frieda.", "Überbringe Wachposten Rolf die Botschaft am Ende des Passes.", "Kehre zu Frieda zurück.",
  ], 40) };
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
  m.npc("geist", "Geist des Praktikanten", 18, 13, "down", 51, giverTalk(
    ["Buhuu … ich habe die Ruine gebaut, aber nie dokumentiert. Nun spuke ich, bis jemand die Doku findet.", "Sie müsste in der Kiste im Nordosten der Halle liegen."],
    ["Die Kiste steht im Nordosten der Halle, hinter den Säulen."],
    ["Die Dokumentation! Ich kann in Frieden ruhen — oder wenigstens in Rente.", "Danke. Ich hinterlasse dir meinen Lieblingsstift."],
    ["Ich bin frei! Jetzt muss ich nur noch die Onboarding-Unterlagen finden."],
  ));
  m.npc("wanderer", "Grabwächter Ludwig", 6, 14, "right", 52, chatter("Hier liegt jeder, der irgendwann mal 'kurz schauen' wollte."));
  m.sign("mahnmal", "Mahnmal", 17, 8, ["Hier ruht der Praktikant, der nie dokumentiert hat. Möge sein Wiki Erlösung finden."]);
  m.scatter(["bonesPile", "skull", "bones", "skullPile", "mushrooms"], 12, [10, 6, 17, 14]);
  m.scatter(["tree", "darkTree", "fruitBush", "rocks"], 24, [2, 2, 32, 24]);
  return { slug: "ruinen", title: "Ruine des Ewigen Praktikanten", map: m.build({ x: 17, y: 25 }), quest: quest("welt-ruinen", "Die fehlende Dokumentation", [
    "Sprich mit dem Geist des Praktikanten in der Halle.", "Finde die staubige Kiste im Nordosten der Ruine.", "Bring die Dokumentation zum Geist.",
  ], 50) };
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
  m.npc("kind", "Hofhund-Flüsterer", 22, 16, "left", 62, chatter("Der Hund gehört niemandem. Aber er kommt immer wieder. Fast wie ein Bewohner."));
  m.place("hedge4", 12, 16); m.place("fenceH", 2, 12); m.place("fenceH", 4, 12);
  m.scatter(["tree", "darkTree", "fruitBush", "flowerBed", "stump", "rocks", "hay", "scarecrow"], 42, [2, 2, 32, 24]);
  return { slug: "verlassenes_dorf", title: "Dorf Nirgendwo", map: m.build({ x: 3, y: 14 }), quest: quest("welt-verlassenes-dorf", "Der Beweis für Nirgendwo", [
    "Sprich mit dem letzten Einwohner.", "Finde die Kiste im Garten hinter dem Wirtshaus.", "Bring den Ortsschein zum Einwohner.",
  ], 40) };
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
  m.npc("schmuggler", "Zwielichtiger Kunde", 14, 15, "up", 72, chatter("Ich habe nichts zu verzollen. Außer diesem einen Sack. Und diesem. Und dem da."));
  m.scatter(["crateBlue", "waterBarrel", "jar", "jarGrey", "rockBig", "stalagmite", "mushrooms", "skull", "rockGrey"], 44, [3, 3, 30, 22]);
  return { slug: "schmugglerhoehle", title: "Höhle der Zweiten Meinung", map: m.build({ x: 5, y: 22 }), quest: quest("welt-schmugglerhoehle", "Plan B", [
    "Sprich mit Höhlenwirtin Gundula.", "Finde die Kiste in der Sackgasse im Nordwesten.", "Bring Plan B zu Gundula.",
  ], 50) };
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
  m.npc("schmied", "Schmiedin Thora", 15, 17, "up", 82, chatter("Schwerter, Äxte, Krüge. Vor allem Krüge. Für alles andere ist die Wache zu betrunken."));
  m.place("fountain", 16, 12);
  m.place("pillar", 12, 11); m.place("pillar", 22, 11); m.place("stoneBlocks", 12, 17); m.place("stoneBlocks", 22, 17);
  m.scatter(["waterBarrel", "barrel", "jar", "jarGrey", "crateBlue", "rockBig", "stalagmite", "mushrooms"], 40, [3, 3, 30, 22]);
  return { slug: "zwergenfeste", title: "Bierbart-Feste", map: m.build({ x: 17, y: 24 }), quest: quest("welt-zwergenfeste", "Der leere Krug", [
    "Sprich mit Zwerg Brumm am Festplatz.", "Finde das verschlossene Fass im Südosten.", "Bring das Rezept zu Brumm.",
  ], 50) };
}

// ── 9 Frostgipfel ───────────────────────────────────────────

function frostgipfel(): WorldDef {
  const m = new MapBuilder(36, 28, "outdoor", 909);
  m.border("rocks");
  m.fill(GROUND.stone, 2, 2, 32, 24);
  m.road([[4, 25], [4, 18], [16, 18], [16, 10], [28, 10], [28, 5]], 2, GROUND.sand);
  m.chest("gipfelfahne", "Gipfelkiste", 28, 4, chestTalk(
    ["Auf dem Gipfel steht eine Kiste mit einer Fahne: 'Ich war hier. (Nächste Woche.)'", "Du nimmst die Fahne mit — Beweis, dass es jemand geschafft hat."],
    ["Die Gipfelkiste. Bernd hat bestimmt eine Meinung dazu."],
    ["Leer. Die Fahne hast du längst."],
  ));
  m.npc("bernd", "Bergsteiger Bernd", 5, 22, "right", 91, giverTalk(
    ["Ich erklimme den Gipfel nächste Woche. Das sage ich seit Generationen.", "Holst du mir die Fahne von der Gipfelkiste? Dann weiß ich, dass sich die Mühe lohnt."],
    ["Der Weg führt im Zickzack nach oben. Die Gipfelkiste steht ganz im Nordosten."],
    ["Die Fahne! Sie ist echt. Und ich habe sie nicht mal selbst geholt. Genau mein Stil.", "Danke — nächste Woche gehe ich wirklich hinauf."],
    ["Nächste Woche. Ganz sicher."],
  ));
  m.npc("wetter", "Wettermann Wilhelm", 20, 12, "down", 92, chatter("Heute: Schnee. Morgen: Schnee. Übermorgen: Überraschung, Schnee."));
  m.scatter(["rockBig", "rockGrey", "darkTree", "stalagmite", "skull", "bonesPile", "obelisk"], 36, [2, 2, 32, 24]);
  return { slug: "frostgipfel", title: "Frostgipfel des ewigen Aufschubs", map: m.build({ x: 5, y: 25 }), quest: quest("welt-frostgipfel", "Nächste Woche vielleicht", [
    "Sprich mit Bergsteiger Bernd.", "Hole die Fahne aus der Gipfelkiste im Nordosten.", "Bring die Fahne zu Bernd.",
  ], 50) };
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
  m.npc("froschkoenig", "Verwunschene Kröte", 26, 10, "down", 102, chatter("Küss mich, dann werde ich ein Prinz. Oder eine noch größere Kröte. Kommt auf den Tag an."));
  m.scatter(["lily", "lilyPink", "reeds", "reedsTuft"], 44, [2, 2, 32, 24]);
  m.scatter(["darkTree", "tree", "log", "stump", "mushrooms", "rockSmall"], 24, [2, 2, 32, 24]);
  return { slug: "sumpf", title: "Sumpf der verlorenen Socken", map: m.build({ x: 4, y: 4 }), quest: quest("welt-sumpf", "Die eine Socke", [
    "Sprich mit Sockensammler Otto.", "Finde die Sockenkiste im Südosten des Sumpfes.", "Bring die grün gestreifte Socke zu Otto.",
  ], 40) };
}

// ── Zugriff ─────────────────────────────────────────────────

const BUILDERS: Record<string, () => WorldDef> = {
  hafenstadt, waldpfad, kuestenstrasse, bergpass, ruinen, verlassenes_dorf: verlassenesDorf,
  schmugglerhoehle, zwergenfeste, frostgipfel, sumpf,
};

const cache = new Map<string, WorldDef>();

export const WORLD_SLUGS = Object.keys(BUILDERS);

/** Welt einer Location (oder undefined für unbekannte Slugs). Wird einmal erzeugt und dann gemerkt. */
export function getWorld(slug: string): WorldDef | undefined {
  const build = BUILDERS[slug];
  if (!build) return undefined;
  let w = cache.get(slug);
  if (!w) { w = build(); cache.set(slug, w); }
  return w;
}

export type { Actor };
