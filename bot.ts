// Standalone Bot-Prozess – separat von Next.js starten
// Lädt tsconfig-paths damit @/ Imports funktionieren
import { register } from "tsconfig-paths";
import { compilerOptions } from "./tsconfig.json";

register({
  baseUrl: "./",
  paths: compilerOptions.paths ?? {},
});

import "./src/bot/index";
