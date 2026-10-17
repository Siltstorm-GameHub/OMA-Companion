// Übernimmt gelieferte Helden-Zeichnungen in die App (OMA Gems, Phase 10e).
//
//   npx tsx scripts/import-hero-art.ts            prüfen und src/lib/gems/hero/art.generated.ts schreiben
//   npx tsx scripts/import-hero-art.ts --check    nur prüfen, nichts schreiben
//
// Liest art/helden/<teil>.svg (Teile-Liste: ART_SLOTS in src/lib/gems/hero/art.ts, Vorgabe:
// docs/gems-helden-geruest.md). Unbekannte Dateinamen und fehlerhafte Zeichnungen brechen ab, damit
// nichts halb Übernommenes in der App landet. Teile ohne Datei zeichnet weiter der Code.

import fs from "node:fs";
import path from "node:path";
import { ART_SLOTS, ART_VIEWBOX, type ArtNode } from "../src/lib/gems/hero/art";
import { svgToArt } from "../src/lib/gems/hero/art-import";

const ART_DIR = path.join(process.cwd(), "art", "helden");
const OUT = path.join(process.cwd(), "src", "lib", "gems", "hero", "art.generated.ts");
const checkOnly = process.argv.includes("--check");

const files = fs.existsSync(ART_DIR) ? fs.readdirSync(ART_DIR).filter((f) => f.toLowerCase().endsWith(".svg")).sort() : [];
const art: Record<string, ArtNode[]> = {};
const problems: string[] = [];

for (const file of files) {
  const key = file.slice(0, -4).toLowerCase();
  const slot = ART_SLOTS.find((s) => s.key === key);
  if (!slot) {
    problems.push(`${file}: unbekanntes Teil — gültige Namen siehe ART_SLOTS (z. B. frisur-locken-vorn.svg).`);
    continue;
  }
  const result = svgToArt(fs.readFileSync(path.join(ART_DIR, file), "utf8"), ART_VIEWBOX[slot.viewBox]);
  for (const w of result.warnings) console.warn(`  Hinweis ${file}: ${w}`);
  if (result.errors.length > 0) problems.push(...result.errors.map((e) => `${file}: ${e}`));
  else art[key] = result.nodes;
}

if (problems.length > 0) {
  console.error(`\n${problems.length} Problem(e) — nichts übernommen:\n` + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}

const covered = Object.keys(art).length;
console.log(`${covered} von ${ART_SLOTS.length} Teilen als Zeichnung geliefert${covered ? ": " + Object.keys(art).join(", ") : ""}.`);
if (checkOnly) process.exit(0);

const header = `// Automatisch erzeugt von scripts/import-hero-art.ts aus art/helden/*.svg — nicht von Hand ändern.\n`;
const body =
  covered === 0
    ? `// Noch keine Zeichnungen geliefert: alle Teile kommen aus parts.tsx.\n\nimport type { ArtNode } from "./art";\n\nexport const HERO_ART: Record<string, ArtNode[]> = {};\n`
    : `\nimport type { ArtNode } from "./art";\n\nexport const HERO_ART: Record<string, ArtNode[]> = ${JSON.stringify(art)};\n`;
fs.writeFileSync(OUT, header + body);
console.log(`Geschrieben: ${path.relative(process.cwd(), OUT)}`);
