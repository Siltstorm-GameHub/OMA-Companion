-- Community-Lobby entfernt (ersetzt durch Event-Absprachen, siehe EventComment).
-- VOR dem Deploy ausführen, der das Model LobbyMessage aus schema.prisma entfernt — sonst bricht
-- `prisma db push` im Build ab, solange die Tabelle noch Nachrichten enthält.
DROP TABLE IF EXISTS "lobbymessage";
