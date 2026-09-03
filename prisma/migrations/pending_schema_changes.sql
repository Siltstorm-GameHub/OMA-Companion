-- Ausstehende Schema-Änderungen
-- Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard → SQL Editor

-- ═══════════════════════════════════════════════════════════════
-- EventPoll: nachträglicher Ausschluss von Kandidaten
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "EventPoll" ADD COLUMN IF NOT EXISTS "excludedUserIds" TEXT;

-- ═══════════════════════════════════════════════════════════════
-- LUL Flexibles Voting & Punktesystem (neue Saisons via Wizard)
-- ═══════════════════════════════════════════════════════════════

-- LulSeason: konfigurierbares Punktesystem
ALTER TABLE "LulSeason" ADD COLUMN IF NOT EXISTS "pointsConfig" TEXT;

-- LulLegacyEntry: flexible Poll-Statistiken für neue Saisons
ALTER TABLE "LulLegacyEntry" ADD COLUMN IF NOT EXISTS "pollStatsJson" TEXT;

-- LulEntry: gewonnene Umfragen via statKey (neue flexible Saisons)
ALTER TABLE "LulEntry" ADD COLUMN IF NOT EXISTS "pollWinsJson" TEXT;

-- LulSpieltag: status "umfrage" (zwischen active und finished) — kein ALTER nötig, TEXT-Feld

-- LulPoll: konfigurierbare In-App-Umfrage pro Spieltag
CREATE TABLE IF NOT EXISTS "LulPoll" (
  "id"              TEXT         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "spieltagId"      TEXT         NOT NULL,
  "statKey"         TEXT         NOT NULL,
  "label"           TEXT         NOT NULL,
  "question"        TEXT         NOT NULL,
  "type"            TEXT         NOT NULL,
  "endsAt"          TIMESTAMP(3) NOT NULL,
  "excludedUserIds" TEXT,
  "status"          TEXT         NOT NULL DEFAULT 'open',
  "winnerIds"       TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LulPoll_spieltagId_fkey" FOREIGN KEY ("spieltagId") REFERENCES "LulSpieltag"("id") ON DELETE CASCADE
);

-- LulPollVote: eine Stimme pro User pro Umfrage (UPSERT erlaubt, DELETE nicht)
CREATE TABLE IF NOT EXISTS "LulPollVote" (
  "id"        TEXT         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "pollId"    TEXT         NOT NULL,
  "voterId"   TEXT         NOT NULL,
  "targetId"  TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LulPollVote_pollId_fkey"   FOREIGN KEY ("pollId")   REFERENCES "LulPoll"("id") ON DELETE CASCADE,
  CONSTRAINT "LulPollVote_voterId_fkey"  FOREIGN KEY ("voterId")  REFERENCES "User"("id"),
  CONSTRAINT "LulPollVote_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id"),
  CONSTRAINT "LulPollVote_pollId_voterId_key" UNIQUE ("pollId", "voterId")
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS "LulPoll_spieltagId_idx" ON "LulPoll"("spieltagId");
CREATE INDEX IF NOT EXISTS "LulPollVote_pollId_idx" ON "LulPollVote"("pollId");

-- ═══════════════════════════════════════════════════════════════
-- LUL-Saisons als normale EventSeries behandeln (neues System)
-- ═══════════════════════════════════════════════════════════════

-- LulSeason: Link zur EventSeries (wenn gesetzt → neue Saison, sichtbar als normale Eventreihe)
ALTER TABLE "LulSeason" ADD COLUMN IF NOT EXISTS "seriesId" TEXT UNIQUE;
DO $$ BEGIN
  ALTER TABLE "LulSeason" ADD CONSTRAINT "LulSeason_seriesId_fkey"
    FOREIGN KEY ("seriesId") REFERENCES "EventSeries"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- LulSpieltag: Link zum regulären Event (wenn gesetzt → Spieltag ist als normales Event sichtbar)
ALTER TABLE "LulSpieltag" ADD COLUMN IF NOT EXISTS "eventId" TEXT UNIQUE;
DO $$ BEGIN
  ALTER TABLE "LulSpieltag" ADD CONSTRAINT "LulSpieltag_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════

-- 1. User: Gruß / Bio
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" TEXT;

-- 2./3. CollectibleItem-Spalten (active/salePrice/saleUntil) entfallen — die Tabelle
-- wird weiter unten im Zuge der Pokale-Einführung komplett entfernt (siehe Ende der Datei).

-- 4. EventSeries: statFields
ALTER TABLE "EventSeries" ADD COLUMN IF NOT EXISTS "statFields" TEXT;

-- 4c. EventSeries: platform (mirrors Event.platform, benötigt von Eventreihe-Bearbeiten UI)
ALTER TABLE "EventSeries" ADD COLUMN IF NOT EXISTS "platform" TEXT;

-- 4b. EventSeries: seriesStatConfig + legacyStandings
ALTER TABLE "EventSeries" ADD COLUMN IF NOT EXISTS "seriesStatConfig" TEXT;
ALTER TABLE "EventSeries" ADD COLUMN IF NOT EXISTS "legacyStandings" TEXT;

-- 4d. EventSeries: eigenes Icon (Wiedererkennungswert statt generischem Repeat-Icon)
ALTER TABLE "EventSeries" ADD COLUMN IF NOT EXISTS "icon" TEXT;

-- 5. Geplante Discord-Umfragen
CREATE TABLE IF NOT EXISTS "PollJob" (
  "id"          TEXT      NOT NULL PRIMARY KEY,
  "type"        TEXT      NOT NULL,
  "refId"       TEXT      NOT NULL,
  "channelId"   TEXT      NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "duration"    INTEGER   NOT NULL DEFAULT 168,
  "question"    TEXT,
  "status"      TEXT      NOT NULL DEFAULT 'pending',
  "messageId"   TEXT,
  "errorMsg"    TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt"      TIMESTAMP(3)
);

-- ═══════════════════════════════════════════════════════════════
-- Umfragen im Admin-Bereich "Mitteilungen" (DailyPoll)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "DailyPoll" (
  "id"            TEXT         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title"         TEXT         NOT NULL,
  "question"      TEXT         NOT NULL,
  "startDate"     TIMESTAMP(3) NOT NULL,
  "endDate"       TIMESTAMP(3) NOT NULL,
  "isActive"      BOOLEAN      NOT NULL DEFAULT true,
  "allowMultiple" BOOLEAN      NOT NULL DEFAULT false,
  "allowFreeText" BOOLEAN      NOT NULL DEFAULT false,
  "rewardCoins"   INTEGER      NOT NULL DEFAULT 0,
  "createdBy"     TEXT         NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DailyPoll_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id")
);

CREATE TABLE IF NOT EXISTS "DailyPollOption" (
  "id"         TEXT    NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "pollId"     TEXT    NOT NULL,
  "label"      TEXT    NOT NULL,
  "gameName"   TEXT,
  "steamAppId" INTEGER,
  "order"      INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "DailyPollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "DailyPoll"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "DailyPollVote" (
  "id"        TEXT         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "pollId"    TEXT         NOT NULL,
  "userId"    TEXT         NOT NULL,
  "optionIds" TEXT,
  "freeText"  TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyPollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "DailyPoll"("id") ON DELETE CASCADE,
  CONSTRAINT "DailyPollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "DailyPollVote_pollId_userId_key" UNIQUE ("pollId", "userId")
);

-- ═══════════════════════════════════════════════════════════════
-- DailyPoll: Freitext-Spielsuche mit Mehrfachvorschlägen
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "DailyPoll" ADD COLUMN IF NOT EXISTS "freeTextGameMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DailyPollVote" ADD COLUMN IF NOT EXISTS "freeTextGames" TEXT;

-- ═══════════════════════════════════════════════════════════════
-- Admin "Nutzer & Rollen": letzter Login-Zeitpunkt
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

-- ═══════════════════════════════════════════════════════════════
-- Event / EventSeries: Regelwerk (wird Usern über dem Punktesystem angezeigt)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "rules" TEXT;
ALTER TABLE "EventSeries" ADD COLUMN IF NOT EXISTS "rules" TEXT;

-- ═══════════════════════════════════════════════════════════════
-- Gaming-Zimmer + Idle-Jobs
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "Room" (
  "userId"       TEXT         NOT NULL PRIMARY KEY,
  "wallpaperKey" TEXT         NOT NULL DEFAULT 'tapete_raufaser',
  "floorKey"     TEXT         NOT NULL DEFAULT 'boden_linoleum',
  "doorSign"     TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Room_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "RoomItem" (
  "id"        TEXT         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"    TEXT         NOT NULL,
  "itemKey"   TEXT         NOT NULL,
  "zone"      TEXT         NOT NULL,
  "x"         INTEGER      NOT NULL,
  "y"         INTEGER      NOT NULL,
  "flipped"   BOOLEAN      NOT NULL DEFAULT false,
  "placed"    BOOLEAN      NOT NULL DEFAULT true,
  "starter"   BOOLEAN      NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoomItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "RoomItem_userId_placed_idx" ON "RoomItem"("userId", "placed");

CREATE TABLE IF NOT EXISTS "UserJob" (
  "userId"          TEXT         NOT NULL PRIMARY KEY,
  "jobKey"          TEXT,
  "hiredAt"         TIMESTAMP(3),
  "accrualFrom"     TIMESTAMP(3),
  "lastClaimAt"     TIMESTAMP(3),
  "totalEarned"     INTEGER      NOT NULL DEFAULT 0,
  "hireLockedUntil" TIMESTAMP(3),
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════════
-- Pokale: lösen das Collectibles-System ab
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "Pokal" (
  "id"        TEXT          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"    TEXT          NOT NULL,
  "title"     TEXT          NOT NULL,
  "category"  "EventCategory" NOT NULL,
  "isSeries"  BOOLEAN       NOT NULL DEFAULT false,
  "eventId"   TEXT,
  "seriesId"  TEXT,
  "awardedAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Pokal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Pokal_userId_eventId_key" ON "Pokal"("userId", "eventId");
CREATE UNIQUE INDEX IF NOT EXISTS "Pokal_userId_seriesId_key" ON "Pokal"("userId", "seriesId");
CREATE INDEX IF NOT EXISTS "Pokal_userId_idx" ON "Pokal"("userId");

-- Collectibles-System entfernen (löst durch das neue Pokal-System ab)
ALTER TABLE "User" DROP COLUMN IF EXISTS "showcaseJson";
DROP TABLE IF EXISTS "UserCollectible";
DROP TABLE IF EXISTS "CollectibleItem";
DROP TABLE IF EXISTS "CollectibleCollection";

-- ═══════════════════════════════════════════════════════════════
-- Vitrine: frei belegbare Fächer statt reinem Auto-Fill
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "vitrineSlotsJson" TEXT;

-- ═══════════════════════════════════════════════════════════════
-- Battle-Cards-Matchmaking ("Zufallsgegner suchen")
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "BattleQueueEntry" (
  "id"                 TEXT         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"             TEXT         NOT NULL UNIQUE,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "matchedChallengeId" TEXT,
  CONSTRAINT "BattleQueueEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Neue Notification-Regel für Battle-Card-Stufenaufstiege (entspricht dem Eintrag in
-- scripts/seed-notification-rules.ts — hier als reines SQL-Äquivalent, falls das Skript
-- nicht separat gegen Supabase ausgeführt wird). ON CONFLICT DO NOTHING = idempotent,
-- lässt eine bereits existierende/manuell angepasste Zeile unangetastet.
INSERT INTO "NotificationRule" (
  "key", "label", "description", "category",
  "pushEnabled", "inAppEnabled", "discordDmEnabled", "discordChanEnabled",
  "titleTemplate", "bodyTemplate", "urlTemplate",
  "updatedAt"
) VALUES (
  'battle_card_tier_up',
  'Battle-Card-Stufenaufstieg',
  'Wenn die Aktivitäts-Stufe der eigenen Community-Karte durch eine Saison-Neuberechnung steigt.',
  'battle_cards',
  true, true, false, false,
  '🃏 Stufenaufstieg: {tier}',
  'Deine Karte „{cardName}" hat die Aktivitäts-Stufe **{tier}** erreicht!',
  '/battle-cards/my-card',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- Shop: 3 Karten-Pack-Sorten (Standard/Premium/Community) statt nur einer
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE "CardPackKind" AS ENUM ('STANDARD', 'PREMIUM', 'COMMUNITY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "CardPack" ADD COLUMN IF NOT EXISTS "kind" "CardPackKind" NOT NULL DEFAULT 'STANDARD';

-- ═══════════════════════════════════════════════════════════════
-- Battle Cards: Sieges-Serie (Win-Streak) mit Münzen-Bonus
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "battleWinStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "battleBestWinStreak" INTEGER NOT NULL DEFAULT 0;

-- ═══════════════════════════════════════════════════════════════
-- Battle Cards: interaktive Zug-für-Zug-Kämpfe (LiveBattle)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "BattleChallenge" ADD COLUMN IF NOT EXISTS "liveBattleId" TEXT;
DO $$ BEGIN
  ALTER TABLE "BattleChallenge" ADD CONSTRAINT "BattleChallenge_liveBattleId_key" UNIQUE ("liveBattleId");
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "LiveBattle" (
  "id"             TEXT      NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "mode"           TEXT      NOT NULL,
  "playerAId"      TEXT      NOT NULL,
  "playerBId"      TEXT,
  "stateJson"      JSONB     NOT NULL,
  "status"         TEXT      NOT NULL DEFAULT 'active',
  "resultBattleId" TEXT,
  "createdAt"      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  ALTER TABLE "LiveBattle" ADD CONSTRAINT "LiveBattle_resultBattleId_key" UNIQUE ("resultBattleId");
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LiveBattle" ADD CONSTRAINT "LiveBattle_playerAId_fkey"
    FOREIGN KEY ("playerAId") REFERENCES "User"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LiveBattle" ADD CONSTRAINT "LiveBattle_playerBId_fkey"
    FOREIGN KEY ("playerBId") REFERENCES "User"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "LiveBattle_playerAId_idx" ON "LiveBattle"("playerAId");
CREATE INDEX IF NOT EXISTS "LiveBattle_playerBId_idx" ON "LiveBattle"("playerBId");

-- ═══════════════════════════════════════════════════════════════
-- Discord-Mitglieder-Sync: Ex-Mitglieder markieren statt löschen
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "leftServerAt" TIMESTAMP(3);
