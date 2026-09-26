// Deutsche Namen der Objekte (Editor-Auswahl und Interaktions-Hinweise im Spiel)

import type { StampId } from "./stamps";
import { PACK_LABELS } from "./stamps-packs";

export const STAMP_LABELS: Partial<Record<StampId, string>> = {
  ...PACK_LABELS,
  tree: "Baum", darkTree: "Dunkler Baum", hedge4: "Hecke", hedgeFlowers: "Blumenhecke", fruitBush: "Beerenbusch", flowerBed: "Blumenbeet",
  flowerTub: "Blumentrog", flowerTubYellow: "Blumentopf", planter: "Pflanzkasten", reeds: "Schilf", reedsTuft: "Schilfbüschel", lily: "Seerose",
  lilyPink: "Rosa Seerose", stump: "Baumstumpf", fountain: "Brunnen", benchWide: "Bank", lamp: "Laterne", noticeBoard: "Anschlagtafel",
  planks: "Bretter", fenceH: "Zaun", crate: "Kiste", barrel: "Fass", hay: "Heu", log: "Baumstamm", rocks: "Steine", scarecrow: "Vogelscheuche",
  ruinWall: "Ruinenmauer", ruinWall2: "Mauerstück", ruinPillar: "Ruinensäule", obelisk: "Obelisk", grave: "Grab", graveCross: "Grabkreuz",
  bonesPile: "Knochenhaufen", pillar: "Säule", brokenPillar: "Kaputte Säule", stoneBlocks: "Steinblöcke", skull: "Schädel", bones: "Knochen",
  skullPile: "Schädelhaufen", mushrooms: "Pilze", rockBig: "Großer Fels", rockGrey: "Grauer Fels", rockSmall: "Kleiner Fels",
  stalagmite: "Stalagmit", armPostL: "Laternenpfosten links", armPostR: "Laternenpfosten rechts", campfire: "Lagerfeuer", campfireSmall: "Kleines Lagerfeuer", torchStand: "Fackelständer", wallTorch: "Wandfackel", hearthFire: "Herdfeuer", stoveFire: "Ofenfeuer", crateBlue: "Blaue Kiste", waterBarrel: "Wasserfass", jar: "Krug", jarGrey: "Grauer Krug",
};
