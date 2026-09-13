-- Entfernt die Mancave-Ausbau-Tabelle komplett — das gesamte Mancave-Feature
-- (/mancave-3D-Seite, Jobbörse-Reiter, Ausbau-Stufen) wurde entfernt, nur die
-- 3D-Wanderpokal-/Event-Pokal-Anzeige auf der normalen Profilseite bleibt
-- (die braucht diese Tabelle nicht, siehe src/lib/wanderpokal-status.ts).
-- Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard → SQL Editor
-- Idempotent: mehrfaches Ausführen ist unproblematisch.

DROP TABLE IF EXISTS "MancaveItem";
