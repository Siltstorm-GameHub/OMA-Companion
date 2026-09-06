-- Entfernt die alte, passiv Münzen generierende Idle-Jobs-Mechanik komplett.
-- Ersetzt durch das aktive Community-Jobs-System (CommunityJobMember etc.),
-- das bereits eigene Tabellen hat und von dieser Migration nicht berührt wird.
-- Idempotent: mehrfaches Ausführen ist unproblematisch.

DROP TABLE IF EXISTS "UserJob";
