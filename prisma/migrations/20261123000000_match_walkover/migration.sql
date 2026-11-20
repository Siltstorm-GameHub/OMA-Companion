-- Kampflos entschiedene Matches (Gegner nicht angetreten)
ALTER TABLE "Match" ADD COLUMN "walkover" BOOLEAN NOT NULL DEFAULT false;
