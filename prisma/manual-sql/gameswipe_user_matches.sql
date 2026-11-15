-- GameSwipe-Matches zwischen Usern statt pro Squad
-- Ausführen im Supabase SQL-Editor VOR dem nächsten Production-Deploy.
--
-- GameMatch hat bisher pro Squad gespeichert, dass die Mitglieder benachrichtigt wurden
-- (squadId, size). Jetzt merkt sich die Tabelle pro User und Spiel, dass der User schon über ein
-- Match benachrichtigt wurde (userId, gameId). Die alten Zeilen sind nur Benachrichtigungs-Marker
-- und können weg; die neue Tabelle legt `prisma db push` beim Deploy an.

DROP TABLE IF EXISTS "GameMatch";
