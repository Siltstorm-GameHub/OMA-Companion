// ============================================
// Battle-Engine — Deterministischer Zufallsgenerator
// ============================================
// Seeded PRNG (mulberry32), damit ein Kampf über den gespeicherten `seed`
// exakt reproduzierbar ist (Replay/Debugging über Battle.battleLog).

/** Callable wie zuvor (`rng()`), zusätzlich mit `getState()` für interaktive Kämpfe:
 *  der interne mulberry32-State lässt sich damit zwischen zwei API-Requests
 *  persistieren (z.B. als Teil von LiveBattle.stateJson) und über `createRng(state)`
 *  exakt an derselben Stelle fortsetzen — ohne alle bisherigen Aufrufe zu wiederholen. */
export interface Rng {
  (): number;
  getState(): number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const rng = (function mulberry32() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }) as Rng;
  rng.getState = () => state;
  return rng;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

export function pickRandom<T>(rng: Rng, items: T[]): T {
  return items[Math.floor(rng() * items.length)];
}
