-- Entfernt die Spalten der automatischen Gameserver-Status-Abfrage (AMP-Controller und
-- GameDig-Direktabfrage). Online/Offline wird jetzt nur noch per Schalter im Admin gesetzt
-- (Spalte "isActive", im Prisma-Schema als isOnline gemappt).
-- VOR dem nächsten Production-Deploy ausführen, sonst bricht prisma db push ab (Datenverlust-Schutz).
-- Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard → SQL Editor
-- Idempotent: mehrfaches Ausführen ist unproblematisch.

ALTER TABLE "gameserver" DROP COLUMN IF EXISTS "ampInstanceId";
ALTER TABLE "gameserver" DROP COLUMN IF EXISTS "queryType";
ALTER TABLE "gameserver" DROP COLUMN IF EXISTS "gamedigType";
ALTER TABLE "gameserver" DROP COLUMN IF EXISTS "queryPort";
ALTER TABLE "gameserver" DROP COLUMN IF EXISTS "queryTelnetPort";
ALTER TABLE "gameserver" DROP COLUMN IF EXISTS "queryTelnetPassword";
