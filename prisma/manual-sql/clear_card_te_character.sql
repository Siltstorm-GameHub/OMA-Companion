-- ============================================
-- OMA Gems Phase 10d: Pixel-Figuren aus der Datenbank entfernen ("Card"."teCharacter")
-- ============================================
-- Seit Phase 10a zeichnet die App Helden im Cartoon-Stil aus "Card"."heroLook"; die Pixel-Figuren
-- in "Card"."teCharacter" liest kein Code mehr. Phase 10d streicht die Spalte aus
-- prisma/schema.prisma.
--
-- Warum nur leeren statt DROP COLUMN: Die laufende alte Version fragt die Spalte bei jeder
-- Karten-Abfrage mit ab. Ein DROP vor dem Deploy würde sie bis zum Umschalten auf die neue Version
-- lahmlegen. Eine Spalte, die nur NULL enthält, entfernt der Production-Build (scripts/db-push.mjs,
-- ohne --accept-data-loss) beim Deploy selbst — ohne Abbruch, weil dabei keine Daten verloren gehen.
--
-- REIHENFOLGE:
--   1. Optional Sicherung ziehen (die Pixel-Figuren werden nicht mehr gebraucht).
--   2. Dieses Skript im Supabase SQL-Editor ausführen (kompletter Block).
--   3. Phase 10d deployen — der Build entfernt die leere Spalte.
--
-- Idempotent: mehrfaches Ausführen ist unproblematisch, auch nach dem Deploy (dann ohne Wirkung).

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Card' AND column_name = 'teCharacter'
  ) THEN
    UPDATE "Card" SET "teCharacter" = NULL WHERE "teCharacter" IS NOT NULL;
  END IF;
END $$;

-- Admin-Overrides merkten sich die Pixel-Figur als überschriebenes Feld — Eintrag entfernen.
UPDATE "Card"
SET "overriddenFields" = array_remove("overriddenFields", 'teCharacter')
WHERE 'teCharacter' = ANY("overriddenFields");

COMMIT;

-- Kontrolle (soll 0 bzw. keine Zeile liefern):
--   SELECT count(*) FROM "Card" WHERE "teCharacter" IS NOT NULL;   -- nur vor dem Deploy
--   SELECT id FROM "Card" WHERE 'teCharacter' = ANY("overriddenFields");
