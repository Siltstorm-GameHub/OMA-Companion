// ============================================
// Battle-Engine — Deterministischer Zufallsgenerator
// ============================================
// Seeded PRNG (mulberry32), damit ein Kampf über den gespeicherten `seed`
// exakt reproduzierbar ist (Replay/Debugging über Battle.battleLog).

export type Rng = () => number;

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return function mulberry32() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

export function pickRandom<T>(rng: Rng, items: T[]): T {
  return items[Math.floor(rng() * items.length)];
}
