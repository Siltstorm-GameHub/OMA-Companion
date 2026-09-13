-- Entfernt die Gaming-Zimmer-Tabellen komplett — das Zimmer-Feature (Kauf,
-- Editor, Admin-Panel) war schon vorher entfernt, seine einzige verbliebene
-- Nutzung war das Mancave-"Gadgets"-Panel, das jetzt ebenfalls weg ist
-- (siehe Mancave-Entfernung). src/lib/room.ts, room-layout.ts, room-items.ts
-- und room-grid.ts sind ebenfalls gelöscht.
-- Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard → SQL Editor
-- Idempotent: mehrfaches Ausführen ist unproblematisch.

DROP TABLE IF EXISTS "RoomItem";
DROP TABLE IF EXISTS "Room";
