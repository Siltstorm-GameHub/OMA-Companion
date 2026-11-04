-- Profil-Banner wurde nie in der Oberfläche genutzt — Feld entfernt.
ALTER TABLE "User" DROP COLUMN IF EXISTS "bannerUrl";
