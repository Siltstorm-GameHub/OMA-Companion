/**
 * Reiner Side-Effect-Import: jede Job-Content-Phase registriert beim Laden
 * ihre Score-/Vote-Zähler-Funktionen (registerScoreResolver/registerOwnVoteCounter
 * in community-job-service.ts). Diese Datei muss von jedem Einstiegspunkt
 * importiert werden, der `computeWeeklyPayout`/`runWeeklyPayout` aufruft oder
 * einen Live-Score anzeigen will — sonst bleiben die Resolver leer (Score 0).
 */
import "./journalist-service";
import "./fotograf-service";
import "./marketing-manager-service";
import "./coach-service";
import "./visionaer-service";
