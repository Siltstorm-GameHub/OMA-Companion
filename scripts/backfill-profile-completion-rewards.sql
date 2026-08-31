-- ═══════════════════════════════════════════════════════════════════════════
-- Backfill: Profil-Vervollständigen-Belohnungen für bereits ausgefüllte Felder
-- Auszuführen im Supabase SQL-Editor: https://supabase.com/dashboard → SQL Editor
--
-- SQL-Äquivalent zu scripts/backfill-profile-completion-rewards.ts — für den Fall,
-- dass das Skript nicht per `npx tsx` gegen die DB gefahren werden kann.
--
-- Zahlt jedem bestehenden User 500 Münzen pro Profil-Feld nach, das er/sie schon VOR
-- Einführung des Features ausgefüllt hatte (Bio, Geburtstag, Banner, Twitch-Kanal,
-- Lieblingsspiele), und schreibt pro betroffenem User eine In-App-Benachrichtigung mit
-- Zusammenfassung, welche Felder gezählt haben.
--
-- Gefahrlos mehrfach ausführbar: Bevor pro User+Feld vergeben wird, wird geprüft, ob
-- bereits eine PointTransaction mit exakt diesem "reason" existiert (identische Prüfung
-- wie everAwarded() in src/lib/points.ts) — ein zweiter Lauf zahlt nichts doppelt aus
-- und verschickt auch keine zweite Benachrichtigung an bereits abgefertigte User.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  u                RECORD;
  item             RECORD;
  has_boost        BOOLEAN;
  final_amount     INT;
  reason_text      TEXT;
  already_awarded  BOOLEAN;
  newly_awarded    TEXT[];
  total_coins      INT;
  notif_enabled    BOOLEAN;
BEGIN
  FOR u IN
    SELECT "id", "bio", "birthday", "bannerUrl", "twitchLogin", "favoriteGamesJson",
           "birthdayBoostUntil", "notificationPrefs"
    FROM "User"
  LOOP
    newly_awarded := ARRAY[]::TEXT[];
    total_coins   := 0;
    has_boost     := u."birthdayBoostUntil" IS NOT NULL AND u."birthdayBoostUntil" > now();

    -- Ein Durchlauf pro Profil-Item: (key, ist gefüllt?, PointTransaction-reason ohne
    -- Präfix — muss exakt POINT_RULES[...].reason in src/lib/points.ts entsprechen,
    -- Checklisten-Label für die Benachrichtigung)
    FOR item IN
      SELECT * FROM (VALUES
        ('bio',           u."bio"               IS NOT NULL, 'Profil: Bio ausgefüllt',          'Bio'),
        ('birthday',      u."birthday"          IS NOT NULL, 'Profil: Geburtstag hinterlegt',   'Geburtstag'),
        ('banner',        u."bannerUrl"         IS NOT NULL, 'Profil: Banner hochgeladen',      'Profil-Banner'),
        ('twitch',        u."twitchLogin"       IS NOT NULL, 'Profil: Twitch-Kanal verknüpft',  'Twitch-Kanal'),
        ('favoriteGames', u."favoriteGamesJson" IS NOT NULL, 'Profil: Lieblingsspiele gewählt', 'Lieblingsspiele')
      ) AS t(key, is_filled, base_reason, label)
    LOOP
      IF NOT item.is_filled THEN
        CONTINUE;
      END IF;

      SELECT EXISTS (
        SELECT 1 FROM "PointTransaction"
        WHERE "userId" = u."id"
          AND "reason" IN ('[Münzen] ' || item.base_reason, '[Münzen] ' || item.base_reason || ' 🎂×2')
      ) INTO already_awarded;

      IF already_awarded THEN
        CONTINUE;
      END IF;

      final_amount := CASE WHEN has_boost THEN 500 * 2 ELSE 500 END;
      reason_text   := '[Münzen] ' || item.base_reason || CASE WHEN has_boost THEN ' 🎂×2' ELSE '' END;

      INSERT INTO "PointTransaction" ("id", "userId", "amount", "reason", "createdAt")
      VALUES (gen_random_uuid()::text, u."id", final_amount, reason_text, now());

      UPDATE "User" SET "points" = "points" + final_amount WHERE "id" = u."id";

      newly_awarded := array_append(newly_awarded, item.label);
      total_coins   := total_coins + final_amount;
    END LOOP;

    -- Zusammenfassungs-Benachrichtigung, nur wenn mind. ein Item neu vergeben wurde
    -- und der User "points"/"coins"-Benachrichtigungen nicht deaktiviert hat.
    IF cardinality(newly_awarded) > 0 THEN
      notif_enabled := COALESCE((u."notificationPrefs")::jsonb ->> 'points', 'true') <> 'false';

      IF notif_enabled THEN
        INSERT INTO "inappnotification" ("id", "userid", "type", "title", "body", "url", "read", "createdat")
        VALUES (
          gen_random_uuid()::text,
          u."id",
          'coins',
          total_coins || ' Münzen nachträglich gutgeschrieben 🪙',
          'Dein Profil war schon vorher ausgefüllt bei: ' || array_to_string(newly_awarded, ', ') || '. Dafür gab''s ' || total_coins || ' Münzen.',
          '/profile',
          false,
          now()
        );
      END IF;
    END IF;
  END LOOP;
END $$ LANGUAGE plpgsql;
