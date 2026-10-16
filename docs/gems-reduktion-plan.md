# Plan: OMA Battle Cards → nur noch OMA Gems

Stand 2026-10-16. Archiv des vollständigen Stands: Ordner `OMA Battle Cards` (Snapshot + Git-Bundle)
und lokaler Git-Tag `battle-cards-full-v1`.

## Entscheidungen

| Thema | Entscheidung |
|---|---|
| Kampfmechanik | Aktuelle Engine bleibt (Match-3-Brett + Rage/Skills/Passives/Initiative) |
| Inhalte | PvE-Stufenleiter (bestehende Kampagne) + Event-Turniere |
| Sammlung | Community- und Standard-Karten + Packs bleiben, **ohne** Level/Duplikate/Upgrades, Taktikkarten, Synergien |
| Held | Komplett weg (kein Helden-Setup, keine Rasse/Klasse/Würfeln, keine Quest-Werte) |

## Was bleibt

- **Brett und Kampf:** `battle-engine/board-match3.ts` (+ Test), `interactive.ts`, `engine.ts` und die
  Helfer-Module, `BoardMatch3.tsx`, `LiveBattleView.tsx` (Gems-Teile)
- **Kampagne:** `campaign.ts`, `campaign-levels.ts`, `campaign-monsters.ts`, `monster-content.ts`, `CampaignMap.tsx`
- **Turniere:** `gems-tournament.ts`, `gems-monster-catalog.ts`, `puzzle-monsters.ts`, Cron `battle-cards-gems-tournament`,
  Turnier-Teil im Event-Wizard und in `api/events`
- **Karten:** `Card`/`UserCard`/`CardPack`, `packs.ts`, `PackOpener`, Sammlung, Lineup (5 Karten),
  Saison-Pipeline `lib/season/` (erzeugt die Community-Karten samt Klasse)
- **Shop:** Pack-Kauf, Glücksrad
- **Karten-Grafik:** `lib/te-character` + `components/te-character/TeCharacter.tsx` + `public/te/`.
  Wichtig: Die Standard-Karten *sind* Pixel-Figuren aus diesem System (`standard-avatars.ts`). Der
  Renderer bleibt also, nur Editor und Freischaltungen fallen weg.

## Was entfällt

- **OMA Quest komplett:** `lib/dnd`, `components/dnd`, `api/dnd`, `lib/te-map`, `components/te-map`,
  Seiten `oma-quest/*`, `oma-quest-game.css`, `public/oq`, `public/dnd`, Cron `dnd-travel-sweep`,
  Admin-Teile (dnd-titles, season-events, Coin-Shop-Titel), Quest-Hooks in Event-Anmeldung,
  Umfrage-Abstimmung und `bot/activity.ts`, `QUEST_MILESTONE`-Packs
- **OMA Duels:** `duels-live.ts`, `duel-live-battle.ts`, `duel-deck.ts`, `DuelLiveView`, `DuelDeckEditor`,
  Taktikkarten (Modelle, Admin, Seeds), `api/battle-cards/duel*`
- **PvP und Ranglisten-Rahmen:** Gems-PvP, Herausforderungen, Matchmaking-Queue, Elo, Win-Streak,
  Ranked-Saison, Rang-Badges, Rang-Aufstieg-Overlay, Profil-Widget, Crons `battle-cards-season` und
  `battle-cards-challenge-cleanup`
- **Weitere Modi:** Auto-Kampf-PvE (`npc-battle`), freies Puzzle-PvE (`npc-puzzle-battle`), Test-Matchups
- **Held:** `hero-setup.ts`, `HeroSetup.tsx`, `HeldPanel`, `starter-pick.ts`, `StarterPickFlow`, `card-unlocks.ts`,
  `MyCardEditor`, `TeCharacterEditor`, `BattleFigure`, Held-neu-würfeln im Shop
- **Progression:** Level 1–5, Duplikate, `upgrade-*`, `synergy.ts`, Tutorial

## Phasen

**1. Abschalten, ohne zu löschen** (schnell, leicht rückgängig zu machen) — umgesetzt auf Branch `gems-phase-1`
- Navigation: OMA Quest raus, Battle Cards → OMA Gems
- Hub: Reiter auf *Spielen* (Kampagne + Turnier), *Sammlung* (Karten, Lineup) und *Shop* reduzieren
- Helden-Gate im Layout entfernen, dafür ein neues einfaches Onboarding (siehe offene Punkte)
- Routen von Quest, Duels, Challenges und Queue per Redirect auf `/battle-cards`
- Crons aus `vercel.json` nehmen, Quest-Hooks aus Events und Bot entfernen

Zusätzlich in Phase 1: Die Monats-Quest `BATTLE_CARD_DUEL` zählt jetzt beendete Kampagnen- und
Turnierkämpfe. Das Profil-Widget für Herausforderungen ist entfernt. Die Weiterleitungen sind
vorerst temporär (307), in Phase 2 auf permanent umstellen.

**2. Code entfernen**
- Ordner und Dateien laut Liste oben löschen, Build und Tests grün bekommen
- `live-battle.ts` auf Kampagne und Turnier eindampfen; die anderen `startLive*`-Pfade und
  den Nicht-Brett-Zweig in `interactive.ts` entfernen

**3. Gems glätten**
- Level fix auf 1: `LEVEL_STAT_MULTIPLIER` und Upgrade-UI raus, Kartenwerte direkt aus `Card`
- Synergien aus `team-builder.ts` raus
- Kampagnen-Balancing einmal gegen Level-1-Teams prüfen (die Kampagne war auf
  aufgewertete Karten ausgelegt)

**4. Datenbank aufräumen** (erst nach einem `pg_dump`)
- Tabellen: `Dnd*`, `DuelDeck`, `TacticCard`, `UserTacticCard`, `BattleChallenge`, `BattleQueueEntry`,
  `UserTutorialProgress`
- `Card`: alle `dnd*`-/Hero-Felder, `cardUnlocks`; `UserCard`: `level`, `duplicates`
- `User`: `elo*`, `battleWinStreak`, `battleBestWinStreak`
- Enum `CardPackSource`: `GEMS_PVP_CHEST`, `QUEST_MILESTONE`, `TUTORIAL`

## Geklärte Punkte

1. **Einstieg: Auto-Startpaket.** Beim ersten Besuch bekommt jeder Spieler ohne Karten automatisch
   5 Standardkarten (je Klasse mindestens eine), direkt als Lineup gesetzt. Besitzt er eine
   Community-Karte (eigene Discord-Verknüpfung), kommt sie zusätzlich dazu und ersetzt eine
   Standardkarte im Lineup. Kein Formular, sofort spielbar. Idempotent, also beim zweiten Aufruf
   keine neuen Karten. Gehört in Phase 1 als Ersatz für das Helden-Gate.
2. **Rangliste: Kampagnen-Sterne.** Gesamtrangliste = Summe der Sterne aus `UserCampaignProgress`,
   Gleichstand nach dem Zeitpunkt, an dem der Stand erreicht wurde. Ersetzt die drei
   Elo-Ranglisten (`leaderboard.ts`, `LeaderboardTabs`). Die Turnier-Bestenlisten bleiben pro Event
   bestehen. Gehört in Phase 2.
3. **Bestand: Duplikate → Münzen.** Ein einmaliges Skript (`scripts/`, mit Trockenlauf) schreibt
   jedem Spieler gut:
   - für jede Karte über Stufe 1 die tatsächlich bezahlten Upgrade-Kosten
     (effektive Tabelle aus `upgrade-admin-config.ts` inkl. Admin-Override)
   - für jede überzählige Kopie (`duplicates − 1`) einen Festbetrag
     (Vorschlag: 25 Münzen Standard, 50 Community; vor dem Lauf festlegen)

   Jede Gutschrift wird als `PointTransaction` gebucht („OMA Gems: Umstellung Karten-Level“) und
   per In-App-Benachrichtigung gemeldet. Danach stehen alle `UserCard` auf Level 1 / 1 Kopie. Das
   Skript läuft in Phase 3, bevor die Level-Logik fällt. Die Spalten verschwinden erst in Phase 4.
4. **Name: OMA Gems unter `/gems`.** Seiten von `(dashboard)/battle-cards` nach `(dashboard)/gems`
   verschieben. `/battle-cards/:path*` und `/oma-quest/:path*` leiten dauerhaft auf `/gems` um,
   ebenso die bestehenden `/shop`- und `/dnd`-Redirects in `next.config.ts`. Dazu Navigation
   (`BottomNav`, `ink-nav`, `MobileTopBar`), Titel/Metadaten, Logo-Komponente, Login-Callback-URLs,
   Links in Benachrichtigungen und im Bot anpassen. Die API-Routen (`/api/battle-cards/*`) bleiben
   vorerst und werden nur reduziert. Gehört in Phase 1.
