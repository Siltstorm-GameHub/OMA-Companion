// Gleicht beim Build das DB-Schema mit prisma/schema.prisma ab — aber nur dort,
// wo das gewollt ist, und nie mit Datenverlust.
//
//  - Läuft nur im Vercel-Production-Build (VERCEL_ENV=production) oder lokal
//    mit DB_PUSH=1. Preview-Builds von Branches verändern so nicht mehr die
//    Produktions-DB.
//  - Ohne --accept-data-loss: Würde eine Änderung Spalten/Tabellen mit Daten
//    löschen, bricht der Build ab, statt die Daten stillschweigend zu
//    verwerfen. Solche Änderungen vorher per SQL (prisma/manual-sql) einspielen.
import { spawnSync } from "node:child_process";

const isProdBuild = process.env.VERCEL_ENV === "production";
const forced = process.env.DB_PUSH === "1";

if (!isProdBuild && !forced) {
  console.log(`[db-push] übersprungen (VERCEL_ENV=${process.env.VERCEL_ENV ?? "–"}, DB_PUSH nicht gesetzt)`);
  process.exit(0);
}

console.log("[db-push] prisma db push (ohne --accept-data-loss) …");
const res = spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], { stdio: "inherit", shell: true });
if (res.status !== 0) {
  console.error(
    "\n[db-push] Abgebrochen. Häufigster Grund: Die Schema-Änderung würde Daten löschen.\n" +
    "Die betroffenen Spalten/Tabellen erst bewusst per SQL entfernen bzw. migrieren\n" +
    "(siehe prisma/manual-sql), dann erneut deployen.",
  );
}
process.exit(res.status ?? 1);
