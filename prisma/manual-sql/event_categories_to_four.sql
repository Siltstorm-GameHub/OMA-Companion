-- Event-Kategorien auf 4 reduzieren (Kompetitiv, Training, Special, Fun): "casual" und "community_event"
-- werden bei Events und Eventreihen zu "fun". Die App zeigt Altwerte ohnehin schon als Fun an; dieses Skript
-- räumt nur die Daten auf, damit Filter, Statistiken und der Wanderpokal "Partylöwe" einheitlich zählen.
-- Pokale ("Pokal") und Wanderpokal-Inhaber ("WanderpocalHolder") bleiben bewusst unverändert — die
-- Titel "Freigeist" und "Community-Held" sind Geschichte und bleiben sichtbar.
-- Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard -> SQL Editor
-- Idempotent: nach dem ersten Lauf gibt es nichts mehr umzuschreiben.

UPDATE "Event"       SET "category" = 'fun' WHERE "category" IN ('casual', 'community_event');
UPDATE "EventSeries" SET "category" = 'fun' WHERE "category" IN ('casual', 'community_event');

ALTER TABLE "Event"       ALTER COLUMN "category" SET DEFAULT 'fun';
ALTER TABLE "EventSeries" ALTER COLUMN "category" SET DEFAULT 'fun';
