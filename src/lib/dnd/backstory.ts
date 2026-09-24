// ============================================
// Backstory-Textbausteine (kostenfrei, kein LLM)
// ============================================
// Einfache Template-Zusammensetzung analog zum Story-System — wird einmalig
// bei der Charaktererstellung gezogen, danach ist backstory frei editierbar
// (kein overriddenFields-Kandidat).

const OPENERS = [
  "Bevor die Legende begann, war {name} nur",
  "Niemand erinnert sich mehr genau, aber angeblich war {name} früher",
  "{name} erzählt es unterschiedlich, aber am häufigsten heißt es,",
  "Die Gerüchteküche in Alt-Hafenstadt ist sich einig:",
];

const ORIGINS = [
  "ein*e gescheiterte*r Gemüsehändler*in mit zu viel Ehrgeiz.",
  "auf der Flucht vor einer Schuld bei einem Zwerg namens Bierbart.",
  "eigentlich nur wegen einer Wette hier gelandet.",
  "die/der Letzte einer langen Reihe erfolgloser Abenteurer-Dynastien.",
  "beim Falschen Schild eingekehrt und nie wieder weggekommen.",
  "aus einem Dorf, das offiziell nicht auf der Karte existiert.",
];

const HOOKS = [
  "Jetzt zieht es {pronoun} raus in die Welt — offiziell wegen des Abenteuers, inoffiziell wegen offener Rechnungen.",
  "Seitdem sucht {pronoun} nach etwas, das größer ist als die eigene Vergangenheit — oder zumindest nach dem nächsten Auftrag.",
  "Was als Ausrede begann, ist inzwischen fast schon ein Lebenslauf.",
  "Ein Wanderpokal, eine Prophezeiung und ein verlorener Hut später ist {pronoun} immer noch dabei.",
];

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function generateBackstory(
  name: string,
  gender: "male" | "female" = "male",
  rng: () => number = Math.random
): string {
  const pronoun = gender === "female" ? "sie" : "ihn";
  const opener = pick(OPENERS, rng).replace("{name}", name);
  const origin = pick(ORIGINS, rng);
  const hook = pick(HOOKS, rng).replace("{pronoun}", pronoun);
  return `${opener} ${origin} ${hook}`;
}
