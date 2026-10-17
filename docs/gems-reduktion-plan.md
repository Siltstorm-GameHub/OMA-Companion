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

**1. Abschalten, ohne zu löschen** — erledigt (Commit e5c46ef0)
- Navigation: OMA Quest raus, Battle Cards → OMA Gems
- Hub: Reiter auf *Spielen* (Kampagne + Turnier), *Sammlung* (Karten, Lineup) und *Shop* reduzieren
- Helden-Gate im Layout entfernen, dafür ein neues einfaches Onboarding (siehe offene Punkte)
- Routen von Quest, Duels, Challenges und Queue per Redirect auf `/battle-cards`
- Crons aus `vercel.json` nehmen, Quest-Hooks aus Events und Bot entfernen

Zusätzlich in Phase 1: Die Monats-Quest `BATTLE_CARD_DUEL` zählt jetzt beendete Kampagnen- und
Turnierkämpfe. Das Profil-Widget für Herausforderungen ist entfernt. Die Weiterleitungen sind
vorerst temporär (307), in Phase 2 auf permanent umstellen.

**2. Code entfernen** — erledigt
- Ordner und Dateien laut Liste oben gelöscht; Typecheck und Tests grün
- `live-battle.ts` auf Kampagne und Turnier eingedampft; Kämpfe aus abgeschalteten Modi lassen sich
  nicht mehr öffnen (Weiterleitung auf `/gems`)
- Community-Karten werden ohne OMA Quest erzeugt (`season/community-card-stats.ts`: zufällige
  Klasse, Basiswerte ±10 %)
- Sounds und Kartenhintergründe aus OMA Quest übernommen (`public/battle-cards/sfx`, `public/battle-cards/tex`,
  `game-sfx.ts`, `card-backdrops.ts`)
- Taktikkarten aus den Packs entfernt (Premium = 5 Karten, Standard = 1 Karte)
- Rangliste nach Kampagnen-Sternen (`leaderboard.ts`, Hub-Reiter *Spielen* + `/gems/leaderboard`)
- Admin: Saison-1-/Elo-Reset, Ranglisten-Saison, Taktikkarten, Titel, Saison-Events und Re-Roll-Preis
  entfernt; übrig bleibt der manuelle Lauf für die Aktivitäts-Stufen
- Weiterleitungen permanent (308)

**3. Gems glätten** — erledigt
- Karten haben keine Stufen mehr: Spielerkarten kämpfen mit Basiswerten (Stufe 1), Stufen gibt es nur
  noch für Monster. Upgrade-System komplett entfernt (Logik, API, Admin-Panel, Kachel-Badges, Overlay)
- Neue Duplikate werden beim Pack-Öffnen sofort zu Münzen (25 Standard / 50 Community,
  `DUPLICATE_COIN_VALUE` in `card-coins.ts`)
- Umstellung der Bestandsdaten (Stufen/Duplikate → Münzen): `prisma/manual-sql/convert_card_levels_*.sql`
- Engine (`interactive.ts`) kennt nur noch das Brett: kein Auto-Kampf, kein Zug-Timeout, keine
  manuelle Aktions-/Zielwahl mehr. Dabei behoben: Ein Ultimate der gerade wartenden Einheit
  verbrauchte bisher deren Brett-Zug, ohne ausgelöst zu werden
- Taktikkarten-Reste aus Engine und `/api/internal/grant-tactic-cards-to-all` entfernt
- Balancing-Simulation: `scripts/simulate-campaign-balance.ts` (ohne DB, automatischer Spieler)

Kampagnen-Kurve geglättet: Ohne Karten-Stufen waren Level 1–10 trivial und 11/12 eine Wand
(≈ 40 %). Die `statMultiplier` sind jetzt per Simulation kalibriert (`--calibrate`): Der Bot
gewinnt Level 1–5 immer, danach fällt die Siegquote gleichmäßig von 90 % (erster Boss) auf
≈ 64 % (Endboss).

**3b. Endlos-Turm** — erledigt
- Nach Level 12 folgen Endlos-Stufen 13, 14, … (`endless-levels.ts`), deterministisch aus der
  Stufennummer erzeugt (alle Spieler haben dieselben Gegner), ID `endless-<n>`
- Teams mit fester Rollen-Aufteilung (Tank, 2× Schaden, Support, ab Stufe 16 zweiter Tank), jedes
  Monster auf dieselbe Stärke normiert, jede 5. Stufe ein Boss
- Schwierigkeit: Basis 1,15, +4 % je Stufe. Bot-Siegquote ≈ 100 % (13) → 70 % (20) → 35 % (25) →
  0 % ab ≈ 34 (`simulate-campaign-balance.ts --endless`)
- Fortschritt, Sterne und Münzen wie in der Kampagne; Freischaltung der Reihe nach
- Rangliste: höchste geschaffte Stufe, dann Sterne, dann wer früher dort war
- Kampagnen-Karte: Abschnitt „Endlos-Turm“ mit den letzten 3 geschafften, der nächsten und 2
  gesperrten Vorschau-Stufen

**4. Datenbank aufräumen** — erledigt (Umstellung und Lösch-SQL am 2026-10-17 in der Produktion ausgeführt)
- `prisma/schema.prisma` bereinigt: alle `Dnd*`-Modelle, `DuelDeck`, `TacticCard`, `UserTacticCard`,
  `BattleChallenge`, `BattleQueueEntry`, `UserTutorialProgress`; an `Card` alle `dnd*`-/Hero-/Reise-Felder
  und `cardUnlocks`; an `UserCard` `level`/`duplicates`; an `User` `elo*` und die Sieges-Serie
- Passendes SQL: `prisma/manual-sql/drop_oma_quest_duels_levels.sql` (eine Transaktion, idempotent,
  bricht ab, falls das Umstellungs-Skript noch nicht gelaufen ist). Gegen `prisma migrate diff`
  geprüft: entfernt exakt dieselben Objekte wie das Schema
- Bleibt bewusst: Enum-Werte `GEMS_PVP_CHEST`/`QUEST_MILESTONE`/`TUTORIAL` (alte Packs) und
  `LiveBattle.playerBId` (Alt-Kämpfe)

Reihenfolge — der Production-Build bricht ab, solange die DB noch Daten in den entfernten
Spalten hat (`scripts/db-push.mjs` läuft ohne `--accept-data-loss`):
1. Sicherung: `pg_dump` der Produktions-DB
2. Umstellung im Supabase SQL-Editor: `prisma/manual-sql/convert_card_levels_1_preview.sql`
   (Vorschau), dann `convert_card_levels_2_apply.sql`
3. `drop_oma_quest_duels_levels.sql` im Supabase SQL-Editor ausführen
4. Phase 4 committen und deployen

Danach entfernt (nicht mehr gebraucht): TypeScript-Umstellungs-Skript, Erstattungslogik in
`card-coins.ts` und tote Exporte aus den Spiel-Modulen (Sounds, Saison-/Elo-Setter, Taktik-Reste).

**5. Design an den Rest der App angleichen** — erledigt
Entschieden: Kampf bleibt Vollbild (nur Farben/Schrift/Bausteine angeglichen), Spielgrafik
(Brett-Steine, Monster, Arena-/Kapitel-Hintergründe, Effekte) bleibt.
- 5a Rahmen: `/gems` läuft wie jede andere Seite (Header, Ticker, Standard-Aurora, Partner-Footer);
  `gems/layout.tsx` (`.moba-skin`, Metamorphous) und `BattleCardsLogo` entfernt, Seitenüberschrift
  im Stil der Rangliste. Nur im Live-Kampf wird die untere Navigation ausgeblendet.
- 5b Hub, Sammlung, Shop, Kampagnen-Karte, Rangliste: `glass`-Panels, Reiter über
  `components/admin/Tabs`, `Button` statt Bild-/Hex-Buttons, `@/components/icons` statt `MobaIcon`
- 5c Karten: Rahmen-PNG entfernt, Rahmen per CSS; Pixel-Figuren, Klassenfarben, Community-Kennzeichnung bleiben
- 5d Kampf: Zurück/Ton/Runde als Glas-Bausteine in Teal, Verlassen-Dialog über `Modal` + `Button`
- 5e Entfernt: `battle-cards-moba.css`, `MobaIcon`, `moba-icons.ts`, `MobaConfirmDialog`, Russo One /
  `.font-battle`, Aurora-Variante, Sonderfälle in `DashboardChrome`/`FloatingPill`, MOBA-Grafiken und
  ungenutzte Effekt-/Sound-Dateien

Nebenbei behoben (dringend): Seit Phase 1 leitete `/battle-cards/:path*` auch die Spielgrafiken und
Sounds unter `public/battle-cards` auf `/gems/...` um — in Production fehlten alle Bilder. Assets liegen
jetzt unter `public/gems-assets`; die Weiterleitungen in `next.config.ts` unterscheiden Seiten
(→ `/gems`) und Dateien (→ `/gems-assets`), auch für bereits im Browser gespeicherte 308-Ziele.

**6. Interne Namen auf gems** — erledigt
Für Spieler unsichtbar, aber der Code heißt jetzt wie das Spiel:
- `src/lib/battle-cards` → `src/lib/gems`, `src/components/battle-cards` → `src/components/gems`
- API `/api/battle-cards/*` → `/api/gems/*`, `/api/admin/battle-cards/*` → `/api/admin/gems/*`
- Admin-Seite `/admin/battle-cards` → `/admin/gems` (Menüpunkt „OMA Gems“)
- Cron `/api/cron/battle-cards-gems-tournament` → `/api/cron/gems-tournament` (`vercel.json`)
- `prisma/battle-cards-seed-data.ts` → `prisma/gems-seed-data.ts`, `BattleCardsTabs` → `GemsTabs`
- Übergang: `/api/battle-cards/*` und `/api/admin/battle-cards/*` leiten vorübergehend (307) auf die
  neuen Pfade, damit offene Tabs mit altem JS weiterlaufen — nach ein paar Tagen entfernen.
  `/admin/battle-cards` leitet dauerhaft um.

Bleibt bewusst: Prisma-Modelle und Tabellen (`BattleCard`, `UserCard` …) — Umbenennen hieße
Daten migrieren, ohne Nutzen. Ebenso der localStorage-Schlüssel der Brett-Legende und das Nav-Icon
`public/icons/nav/battle-cards.png`.

**7. Handygame-Schleife: kurz reinschauen, ein paar Stufen versuchen** — erledigt
Ziel: Jeder kurze Besuch bringt in unter drei Minuten ein Ergebnis, und es gibt immer einen
Grund, morgen wiederzukommen. Kein Energie-System, keine Kartenstufen, kein Verpassens-Druck.

Münzbudget: rund 1000 Münzen pro Woche. Umsetzung als **Tageslimit von 150 Münzen** aus OMA Gems
(höchstens 1050 pro Woche). Danach zählt Fortschritt weiter, bringt aber keine Münzen mehr.
| Quelle | Münzen |
|---|---|
| Erster Sieg des Tages | 20 + 5 je Serientag (Serie 1–7 → 25–55) |
| Neuer Stern im Kapitel (Level 1–12) | 20 je Stern (vorher 100), außerhalb des Limits (einmalig max. 720) |
| Neue Endlos-Stufe | 10, je 10 Stufen über 13 hinaus +2 |
| Tages-Herausforderung gewonnen (einmal am Tag) | 40 |
| Turmwächter erstmals besiegt (Stufe 20, 30, …) | ein Standard-Pack, außerhalb des Limits |

Serie: zählt Tage mit mindestens einem Sieg, höchstens 7. Ein verpasster Tag zieht einen
Serientag ab, statt auf null zurückzusetzen.

- 7a Kern: „Weiter“-Karte oben im Spielen-Reiter (laufenden Kampf fortsetzen oder nächste Stufe
  mit einem Tipp starten), Ergebnisbildschirm mit „Nochmal“ und „Nächste Stufe“, bei Niederlage die
  Rest-Lebenspunkte der Gegner und ein passender Tipp
- 7b Turm: jede 10. Endlos-Stufe ist ein Turmwächter mit eigener Fähigkeit (Panzerung, Raserei,
  Anführer, Zorn — reihum). Der Wächter ist die Community-Karte der Woche. Dazu ein
  Wochen-Modifikator (je Kalenderwoche eine Regel, gilt für Endlos-Turm und Tages-Herausforderung)
- 7c Tages-Herausforderung: eine feste Stufe pro Tag, für alle gleich, beliebig viele Versuche,
  Bestenliste nach Punkten (Sieg, Rest-Leben, wenige Runden)
- 7d Ranglisten: Gesamt (höchste Stufe), „Diese Woche“ (neu geschaffte Stufen seit Montag) und
  „Heute“ (Tages-Herausforderung). Im Hub: wer direkt vor dir liegt und wie weit
- Daten: neue Tabellen `GemsDailyStats` (Münzen, Tagesbonus, Herausforderung je Tag) und
  `GemsPlayer` (Serie); neue Pack-Quelle `GEMS_TOWER_GUARDIAN`. Nur Ergänzungen, `db push` ohne Datenverlust
- Später (nicht Teil von Phase 7): Discord-Bot-Meldungen, Push-Benachrichtigungen, PWA

Umgesetzt in: `lib/gems/daily-rules.ts` (Zahlen, Serie, Tageslimit), `daily.ts` (Gutschrift),
`tower-rules.ts` (Wächter, Wochen-Modifikator, Tipps), `weekly-guardian.ts`, `play-status.ts`,
`GemsPlayCard`, `GemsResultScreen`, Ranglisten-Seite mit Gesamt/Woche/Heute, Route
`POST /api/gems/daily-challenge`. Die Tages-Herausforderung öffnet nach Level 6.
Balance (Simulator, automatischer Spieler): Wächter-Stufe 20 liegt bei rund 50 % Siegquote, die
Stufen davor bei 70–95 % — eine spürbare Hürde, keine Wand.

**8. Spielerlebnis nach Playtest** — erledigt
Befunde aus einem Testdurchlauf als neuer Spieler (Handy): Level 1–2 in 1–2 Zügen vorbei, ab Level 3
töteten schnelle Gegner zwei Helden, bevor man ziehen konnte; Tageslimit nach drei Minuten erreicht;
keine Einführung; schwache Ultimates; überlappende Plaketten; langer Hub.
- Engine: In Runde 1 zieht immer der Spieler zuerst (`playerFirstInOpeningRound`). Mindestschaden
  5 % des Angriffs. Spieler-Ultimates treffen zusätzlich mit 10 % der maximalen Leben des Ziels.
- Kapitel neu kalibriert (`scripts/simulate-campaign-balance.ts --calibrate`): Angriff, Leben und
  Verteidigung getrennt (`attackMultiplier`, `defenseMultiplier`). Ein Gegnertreffer nimmt anfangs
  12 % der Leben eines Helden, steigt sanft an und ist erst ab Level 8 hart. Kämpfe dauern 3–10 Züge.
  Siegquote des Bots: 100 % bis Level 6, danach fallend auf etwa 70 %.
- Endlos-Turm: Leben/Verteidigung und Angriff getrennt (`ENDLESS_BASE_MULTIPLIER` 1,4,
  `ENDLESS_ATTACK_BASE_MULTIPLIER` 1,2). Ab Stufe 22 ernst, um Stufe 34 die Grenze für den Bot.
- Startpaket: 1 Tank, 2 Damage Dealer, 2 Supports (`STARTER_CLASS_MIX`).
- Kapitel-Sterne zählen nicht ins Tageslimit.
- Kampf: geführte Hinweise in Level 1–2 (Zug-Vorschlag sofort, dann Angriffs-Zähler, Spalten-Zielen,
  Ultimate), Stufenname oben, Gegner direkt über dem Brett und größer bei bis zu drei Gegnern, nur
  noch eine Plakette je Heldenkarte.
- Hub: Tages-Herausforderung und Wochen-Regel erst ab Level 6, Turmwächter erst im Turm. Die
  Kapitel-Karte zeigt nur fünf Level um das aktuelle (alle per Knopf), nach dem Kapitel eine Zeile.

Offen aus dem Playtest: Wartezeit pro Zug (6–13 s Animation), Spezialstein antippen beendet den Zug
ohne Hinweis, wenig Sammelziel (13 Karten).

**9. Sammlung verbessern: Ränge, Relikte, Turm-Saisons** — erledigt
Problem: Die Teamstärke war nach dem Startpaket fest, der Turm wächst exponentiell — für alle gab es
eine feste Grenze. Stufen, Duplikate und Synergien bleiben bewusst draußen.
- A Karten-Ränge (`card-ranks.ts`): Siege in der Startaufstellung (`UserCard.winsInLineup`) heben
  eine Karte nach 5/15/35/70/120 Siegen auf Rang 1–5, je Rang +5 % Leben und Angriff. Simulator
  (`--rank=5`): Die Grenze des Bots rückt von etwa Stufe 34 auf 37, Stufe 22–31 werden deutlich leichter.
- B Relikte (`relics.ts`, `relic-store.ts`): Turmwächter 20–90 geben beim ersten Sieg überhaupt je ein
  festes Relikt (acht Stück). Zwei Plätze, Auswahl unter „Startaufstellung ändern“, wirken in jedem Kampf.
- C Turm-Saisons (`tower-season.ts`): Kalendermonat = Saison, der Turm beginnt jeden Monat bei Stufe 13
  (`GemsTowerClear` je Saison). Turm-Münzen und Wächter-Pack gibt es je Saison neu. Saison-Rangliste
  im Hub, zum Monatsende Packs für die Top 10 (Platz 1 Community, 2–3 Premium, 4–10 Standard) über
  `cron/gems-tower-season`. Die erste Saison (2026-10) übernimmt den bisherigen Turmstand aller Spieler.
- Ranglisten: Saison (Standard), Bestwert (alle Saisons), Diese Woche, Heute.
- Daten: `UserCard.winsInLineup`, neue Tabellen `UserRelic`, `GemsTowerClear`, `GemsTowerSeason`,
  Pack-Quelle `GEMS_TOWER_SEASON` — nur Ergänzungen, `db push` ohne Datenverlust.

**10. Neues Helden-Design: Cartoon-Stil mit Kosmetik** — erledigt (10e: Strecke für Zeichnungen steht, Zeichnungen selbst stehen aus)
Entscheidung: Stil A (Cartoon mit Outline, Muster im Canvas „OMA Gems Helden-Stile“) und Option 3
(feste Grundfiguren plus Kosmetik ohne Kampfvorteil). Ersetzt die Pixel-Figuren (Time Elements,
`lib/te-character`, 15 MB unter `public/te`). Monster bleiben, wie sie sind.

Leitidee — was alle Helden verbindet:
- Ein Zeichenstil: dunkle Outline (#1b1326, 5 px), große Köpfe, flache Farben mit einer Schattenstufe,
  gemeinsames Gerüst (Zeichenfläche 220×240, gleiche Ankerpunkte für Kopf, Hände, Brust, Rücken).
- Klasse an der Silhouette erkennbar: Tank breit mit Schild, Damage Dealer schlank mit Klinge,
  Support mit Robe und Stab. Die Klassenfarbe bleibt Rahmen und Kartenton.
- Jeder Held trägt OMA-Ausrüstung mit Emblem auf der Brust — der gemeinsame Link der Community.

Wer gestaltet was:
- Die 9 Standard-Karten sind feste Charaktere: einmal fertig gestaltet, nicht veränderbar.
- Jedes Mitglied gestaltet seine eigene Community-Karte („Mein Held“). Der Look ist für alle sichtbar,
  die gesammelt haben — so wird die Karte zum Aushängeschild des Mitglieds.
- Rahmen nach Rang (Rang 5 = Goldrahmen) zeigt jede eigene Karte automatisch, nur in der eigenen Sammlung.

Slots für „Mein Held“ (frei = von Anfang an, sonst Freischaltung):
| Slot | Auswahl zum Start | Weitere |
|---|---|---|
| Grundfigur | je Klasse 2 Körperbauten (Klasse der Karte steht fest) | — |
| Gesicht und Ausdruck | 6 | — |
| Hautton | 6 | — |
| Frisur und Haarfarbe | 8 Frisuren, 8 Farben | weitere über Münzen |
| Farbschema der Ausrüstung | OMA-Türkis | Münzen, Wächter, Saison |
| Emblem | OMA-Juwel | Rang, Saison-Platz 1 |
| Kopfbedeckung | keine, 2 klassenpassende | Münzen, Wächter |
| Accessoire | keins | Headset, Umhang, Brille … |
| Pose auf der Karte | Stehen | Angriff, Jubel (Rang) |
| Titel unter dem Namen | keiner | Wächter, Saison, Ränge |

Freischaltungen (Vorschlag, Zahlen nach Playtest anpassen):
- Münzen (neuer Münz-Abfluss, bewusst hoch — Kosmetik ist ein Sparziel, kein Spontankauf): Frisuren und
  Haarfarben 300, Accessoires und Kopfbedeckungen 600–1200, Farbschemata 900, Posen 800. Bei rund 1000
  Münzen pro Woche also ein bis zwei Wochen pro größerem Teil.
- Karten-Rang: Rang 3 → Emblem „Stern“, Rang 5 → Pose „Jubel“ und Titel „Veteran/in“.
- Turmwächter (erster Sieg): Wächter 20 → Umhang, 30 → Farbschema „Glut“, 50 → Titel „Wächterbezwinger/in“.
- Turm-Saison: Top 10 → Farbschema „Saison-Gold“ (je Saison eigener Name), Platz 1 → Emblem „Krone“.
- Kosmetik gibt nie Kampfwerte. Bestehende Belohnungen (Packs, Relikte) bleiben.

Technik:
- `HeroFigure` (React, Inline-SVG): setzt Grundfigur und Teile auf dem gemeinsamen Gerüst zusammen;
  Farben über eine Palette (main/dark/light/metal), Teile als SVG-Bausteine in `lib/gems/hero/parts`.
  Animationen per CSS statt Sprite-Frames: Wippen (Leerlauf), Ausfall (Angriff), Schild hoch (Block),
  Umfallen/Grau (K.O.), Hüpfer (Sieg) — ersetzt `BattleFigure`.
- Daten: `Card.heroLook` (JSON, ersetzt `teCharacter`) mit `{ v: 2, base, face, skin, hair, hairColor,
  scheme, emblem, headgear, accessory, pose, title }`. Fehlt er, wird ein stabiler Standard-Look aus
  Karten-Id und Klasse erzeugt (wie heute `effectiveTeCharacter`). Standard-Karten: feste Looks im Code.
- Inventar: neue Tabelle `UserCosmetic { userId, itemId, acquiredAt }`; Katalog im Code
  (`lib/gems/cosmetics.ts`: id, Slot, Name, Freischaltung). Speichern prüft serverseitig, dass jedes
  gewählte Teil frei oder freigeschaltet ist und die Karte dem Mitglied gehört (`linkedDiscordId`).
- Freischaltungen hängen an bestehenden Stellen: Rangaufstieg (`recordLineupWin`), Wächter-Sieg
  (`settleGemsBattle`), Saisonabschluss (`finalizeDueTowerSeasons`), Kauf (neue Shop-Route).
- Nur Ergänzungen im Schema (`Card.heroLook`, `UserCosmetic`), `db push` ohne Datenverlust;
  `teCharacter` wird erst nach dem Umbau entfernt (manuelles SQL wie in Phase 4).

Umsetzung in Schritten (jeder Schritt einzeln deploybar):
- 10a Figuren-System (erledigt — `lib/gems/hero/look.ts`, `parts.tsx`, `components/gems/HeroFigure.tsx`,
  `Card.heroLook`, Gerüst-Vorgabe `docs/gems-helden-geruest.md`; alte Kämpfe zeigen abgeleitete Looks): `HeroFigure` mit Gerüst, 6 Grundfiguren, Gesichtern, Haaren, Paletten; feste
  Looks für die 9 Standard-Karten, Standard-Looks für alle Community-Karten; überall einbauen
  (Karten-Kachel, Kartenansicht, Aufstellung, Live-Kampf, Kampf-Replay, Ergebnis). Danach ist die App
  komplett im neuen Stil, nur noch ohne Editor.
- 10b „Mein Held“ (erledigt — `/gems/held`, `HeroEditor`, `POST /api/gems/hero-look`, Freischalt-Regeln in
  `lib/gems/hero/cosmetics.ts`; bis 10c sind nur freie Teile wählbar): Editor mit Live-Vorschau (wie das Kosmetik-Muster), nur für die eigene
  Community-Karte, API zum Speichern; Admin kann Looks weiter überschreiben.
- 10c Kosmetik-Katalog und Freischaltungen (erledigt — `UserCosmetic` für Gekauftes, erspielte Teile werden aus
  Rängen, Wächtern und Saison-Ranglisten abgeleitet, Kauf über `POST /api/gems/cosmetics/buy`, Editor mit
  Anprobieren und „Kaufen & speichern“, Shop-Bereich „Kosmetik“, Hinweis im Ergebnisbildschirm): Inventar, Shop-Bereich „Kosmetik“, Hinweise im
  Ergebnisbildschirm („Neu: Umhang freigeschaltet“), Kosmetik-Teile als Saison-/Wächter-Belohnung.
- 10d Aufräumen (erledigt — 8 Kartenhintergründe im Cartoon-Stil als neues Look-Teil `backdrop`
  (`components/gems/HeroBackdrop.tsx`; Wiese, Wald, Berge frei, Küste/Wüste/Burg/Nacht je 700 Münzen,
  Vulkan über Turmwächter 40), Pixel-System samt `standard-avatars.ts`, `public/te`,
  `public/gems-assets/bg` und `tex` entfernt; Spalte per `prisma/manual-sql/clear_card_te_character.sql`
  geleert, der Build entfernt sie dann ohne Datenverlust; alte gespeicherte Kämpfe zeigen weiter
  abgeleitete Looks): Kartenhintergründe im neuen Stil (statt Pixel-Szenen), `lib/te-character`,
  `TeCharacter`/`BattleFigure`, `public/te` und `teCharacter`-Spalte entfernen.
- 10e Profi-Zeichnungen (Strecke erledigt — gelieferte SVGs in `art/helden/`, Prüfung und Umwandlung per
  `scripts/import-hero-art.ts` nach `lib/gems/hero/art.generated.ts`, `parts.tsx`/`HeroBackdrop` nehmen
  je Teil die Zeichnung statt der Vektorgrafik und färben Farbslots aus dem Look; Admin-Prüfbogen
  `/admin/gems/helden`; Vorgabe mit Dateinamen und Platzhalterfarben in `docs/gems-helden-geruest.md`.
  Offen: die Zeichnungen selbst, von einem Zeichner): Profi-Zeichnungen. Die Teile in 10a zeichne ich als einfache Vektorgrafik (Qualität wie
  im Muster). Weil alle Teile auf demselben Gerüst sitzen, kann ein Zeichner sie später 1:1 ersetzen,
  ohne Code-Änderung — dafür gibt es eine Gerüst-Vorgabe (Maße, Ankerpunkte, Ebenen, Farbslots).

Entschieden:
1. Kosmetik gibt es nur für die eigene Community-Karte; Standard-Karten bleiben fest.
2. Münzpreise höher als zuerst vorgeschlagen (siehe Freischaltungen oben).
3. Profi-Zeichnungen (10e) sind eingeplant. Deshalb liefert 10a neben den eigenen Vektorteilen eine
   Gerüst-Vorgabe für den Zeichner (`docs/gems-helden-geruest.md`): Zeichenfläche, Ankerpunkte,
   Ebenen-Reihenfolge, Farbslots der Palette, Outline-Stärke, Dateiformat und Benennung der Teile.

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
