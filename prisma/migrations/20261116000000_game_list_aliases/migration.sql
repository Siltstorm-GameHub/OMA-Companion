-- Spieleliste V3: andere Schreibweisen eines Spiels (für den Abgleich mit Events, Gameservern, Profilen).
-- Rein additiv — kann jederzeit (auch mehrfach) ausgeführt werden.

ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[];
