# Datenbank-Schema

Maßgeblich ist `schema.prisma`. Die Produktions-DB (Supabase/Postgres) wird beim
Vercel-**Production**-Build per `scripts/db-push.mjs` (`prisma db push`) angeglichen.

- **Additive Änderungen** (neue Tabellen, Spalten mit Default, Indizes): einfach ins
  Schema schreiben, beim Deploy werden sie angelegt.
- **Destruktive Änderungen** (Spalte/Tabelle mit Daten entfernen, Typ ändern,
  Unique-Constraint auf bestehende Daten): Der Build bricht ab. Daten erst bewusst
  sichern/migrieren, die Änderung per SQL im Supabase-SQL-Editor ausführen und das
  Skript unter `manual-sql/` ablegen, dann erneut deployen.
- **Preview-Builds** fassen das Schema nicht an. Lokal nur mit `DB_PUSH=1 npm run build`.

`migrations/` und `pending_schema_changes.sql` sind historisch und bilden das aktuelle
Schema **nicht** vollständig ab — `prisma migrate deploy` darf darauf nicht ohne
vorheriges Baselining (`prisma migrate diff` + `prisma migrate resolve --applied`)
umgestellt werden.
