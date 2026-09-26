// ============================================
// Startvorlagen für neue Locations: statt einer leeren Karte gibt es ein Grundgerüst, das schon spielbar ist
// ============================================

import { defaultCustomWorldDoc, type CustomWorldDoc } from "./custom-world";
import { placeActor, placeStamp, rectGround, setInteriorFromTemplate, setWall } from "./custom-world-edit";
import { GROUND, type Building } from "./types";
import type { StampId } from "./stamps";

export type StarterId = "leer" | "dorf" | "lichtung" | "hoehle";

export const STARTERS: { id: StarterId; label: string; description: string; theme: "outdoor" | "cave"; icon: string }[] = [
  { id: "dorf", label: "Dorf", description: "Wege, Taverne und Laden mit Innenräumen, ein Brunnen.", theme: "outdoor", icon: "🏘️" },
  { id: "lichtung", label: "Lichtung", description: "Waldlichtung mit Lagerfeuer und Blumen.", theme: "outdoor", icon: "🌲" },
  { id: "hoehle", label: "Höhle", description: "Dunkle Höhle mit Felswänden, Fackeln und einer Truhe.", theme: "cave", icon: "🕳️" },
  { id: "leer", label: "Leere Karte", description: "Nur Gras (bzw. Höhlenboden) — du baust alles selbst.", theme: "outdoor", icon: "📄" },
];

const stamps = (d: CustomWorldDoc, list: [StampId, number, number][]) => list.reduce((doc, [id, x, y]) => placeStamp(doc, id, x, y), d);

const house = (x: number, y: number, w: number, doorDx: number, k: number, name: string, sign?: Building["sign"]): Building => ({
  x, y, w, roofRows: 3, roof: { k, r: 0 }, wall: { k: 0, r: 1 }, doorDx, windowDx: w >= 5 ? [0, w - 1].filter((i) => i !== doorDx) : [], name, ...(sign ? { sign } : {}),
});

export function starterDoc(id: StarterId, theme: "outdoor" | "cave" = "outdoor"): CustomWorldDoc {
  const base = defaultCustomWorldDoc(id === "hoehle" ? "cave" : theme);
  switch (id) {
    case "dorf": {
      let d = base;
      d = rectGround(d, 2, 15, 27, 16, GROUND.dirt);
      d = rectGround(d, 14, 8, 15, 16, GROUND.dirt);
      d = { ...d, title: "Neues Dorf", buildings: [house(4, 6, 6, 2, 0, "Taverne", "shopMug"), house(19, 6, 5, 2, 1, "Laden", "shopSword")] };
      d = setInteriorFromTemplate(d, 0, "taverne");
      d = setInteriorFromTemplate(d, 1, "laden");
      return stamps(d, [["fountain", 6, 13], ["tree", 3, 17], ["tree", 24, 17], ["lamp", 12, 12], ["lamp", 17, 12], ["flowerBed", 20, 12]]);
    }
    case "lichtung": {
      const d = { ...base, title: "Neue Lichtung" };
      return stamps(d, [["campfire", 12, 13], ["tree", 4, 5], ["tree", 22, 5], ["tree", 3, 15], ["tree", 24, 15], ["flowerBed", 17, 13], ["flowerBed", 9, 17], ["rocks", 19, 17], ["log", 9, 12]]);
    }
    case "hoehle": {
      let d: CustomWorldDoc = { ...base, title: "Neue Höhle", ground: base.ground };
      d = rectGround(d, 8, 8, 21, 17, GROUND.dirt);
      for (let x = 6; x <= 23; x++) { d = setWall(d, x, 6, true); d = setWall(d, x, 7, true); }
      for (let y = 8; y <= 18; y++) { d = setWall(d, 6, y, true); d = setWall(d, 23, y, true); }
      d = placeActor(d, "chest", 20, 9).doc;
      return stamps(d, [["stalagmite", 9, 9], ["stalagmite", 19, 15], ["torchStand", 10, 16], ["torchStand", 18, 9], ["rockSmall", 12, 10]]);
    }
    default:
      return base;
  }
}
