-- Spieler-Meldung: wer kommt bei Gleichstand im K.O.-Spiel weiter (Elfmeterschießen)
ALTER TABLE "MatchResultSubmission" ADD COLUMN "advancerId" TEXT;
