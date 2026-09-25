// ============================================
// Autotiles (RPG-Maker-Blöcke, 16-px-Kacheln, Viertelkacheln à 8 px)
// ============================================
// Ein Autotile-Block besteht aus Viertelkacheln (qx, qy). Für jede der vier Ecken einer Zielkachel
// wird aus den drei Nachbarn Seite/Seite/Diagonale (gleicher Typ oder nicht) die passende
// Viertelkachel gewählt. Reine Funktionen, kein DOM.
//
// Bodenblock (Time-Elements A2, 2×3 Kacheln = 4×6 Viertel):
//   Zeilen 0–1: links = Füllung, rechts = Innenecken (Aussparungen der Nachbarn)
//   Zeilen 2–5: 2×2-Kacheln-Insel mit Außenecken, Kanten und Mitte
// Wandblock (A3, 2×2 Kacheln = 4×4 Viertel): nur die Insel, keine Innenecken.

export type Quarter = readonly [number, number];
export type Quarters = readonly [Quarter, Quarter, Quarter, Quarter]; // TL, TR, BL, BR

/** same(dx, dy): liegt an Offset (dx, dy) dieselbe Fläche? */
export type SameFn = (dx: number, dy: number) => boolean;

export function groundQuarters(same: SameFn): Quarters {
  const pick = (
    dx: -1 | 1, dy: -1 | 1,
    fill: Quarter, concave: Quarter, corner: Quarter, edgeH: Quarter, edgeV: Quarter,
  ): Quarter => {
    const h = same(dx, 0);
    const v = same(0, dy);
    if (h && v) return same(dx, dy) ? fill : concave;
    if (!h && !v) return corner;
    // h ohne v: es fehlt der vertikale Nachbar → waagerechte Kante oben/unten
    return h ? edgeH : edgeV;
  };
  return [
    pick(-1, -1, [0, 0], [2, 0], [0, 2], [1, 2], [0, 3]),
    pick(1, -1, [1, 0], [3, 0], [3, 2], [2, 2], [3, 3]),
    pick(-1, 1, [0, 1], [2, 1], [0, 5], [1, 5], [0, 4]),
    pick(1, 1, [1, 1], [3, 1], [3, 5], [2, 5], [3, 4]),
  ];
}

export function wallQuarters(same: SameFn): Quarters {
  const pick = (
    dx: -1 | 1, dy: -1 | 1,
    fill: Quarter, corner: Quarter, edgeH: Quarter, edgeV: Quarter,
  ): Quarter => {
    const h = same(dx, 0);
    const v = same(0, dy);
    if (h && v) return fill;
    if (!h && !v) return corner;
    return h ? edgeH : edgeV;
  };
  return [
    pick(-1, -1, [1, 1], [0, 0], [1, 0], [0, 1]),
    pick(1, -1, [2, 1], [3, 0], [2, 0], [3, 1]),
    pick(-1, 1, [1, 2], [0, 3], [1, 3], [0, 2]),
    pick(1, 1, [2, 2], [3, 3], [2, 3], [3, 2]),
  ];
}
