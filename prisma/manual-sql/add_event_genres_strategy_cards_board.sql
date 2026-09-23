-- Erweitert das Enum "EventGenre" um Strategie, Kartenspiel und Brettspiel.
-- Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard → SQL Editor
-- Idempotent: mehrfaches Ausführen ist unproblematisch.
-- Hinweis: Jede Zeile einzeln ausführen oder das Script als Ganzes laufen lassen;
-- ALTER TYPE ... ADD VALUE darf nicht innerhalb eines BEGIN/COMMIT-Blocks stehen.

ALTER TYPE "EventGenre" ADD VALUE IF NOT EXISTS 'strategy';
ALTER TYPE "EventGenre" ADD VALUE IF NOT EXISTS 'card_game';
ALTER TYPE "EventGenre" ADD VALUE IF NOT EXISTS 'board_game';
