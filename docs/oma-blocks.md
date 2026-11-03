# OMA Blocks

Fallende-Blöcke-Puzzle im Games-Hub (`/gems?spiel=blocks`) mit Solo-Highscores und Echtzeit-Versus.

## Aufbau

| Teil | Ort |
|---|---|
| Spiel-Engine (deterministisch, nur Ganzzahlen) | `src/lib/blocks/engine.ts` |
| Replay-Prüfung (Server spielt Läufe nach) | `src/lib/blocks/replay.ts` |
| Highscores, Monatsabschluss, Versus-Siege | `src/lib/blocks/scores.ts` |
| Versus-Protokoll / Token-Signatur | `src/lib/blocks/protocol.ts`, `src/lib/blocks/mp-token.ts` |
| Browser (Canvas, Steuerung, Solo, Versus) | `src/components/blocks/*` |
| Seiten | `/gems/blocks` (Solo), `/gems/blocks/versus` (Versus, `?raum=CODE`) |
| API | `/api/blocks/runs`, `/api/blocks/runs/[id]`, `/api/blocks/mp-token`, `/api/blocks/match-result` |
| Cron (Monatsabschluss + Challenges, täglich) | `/api/cron/blocks-season` |
| Events: Live-Turnier / Community-Challenge | `src/lib/blocks/tournament.ts`, `src/lib/blocks/challenge.ts`, Seite `/gems/blocks/turnier/[eventId]` |
| Versus-Server (hängt am Discord-Bot auf Render) | `src/blocks-server/server.ts`, eingebunden in `src/bot/index.ts` |

## Highscores

- Beim Start vergibt der Server einen Seed (`BlocksRun`). Beim Game Over schickt der Browser nur Eingaben + Frame-Anzahl;
  der Server spielt den Lauf nach und wertet **sein eigenes** Ergebnis. Ein gefälschter Punktestand bringt nichts,
  ein Lauf kann außerdem nicht schneller als in Echtzeit gespielt worden sein.
- `BlocksBest` hält je Spieler den Bestwert pro Monat (`season = "YYYY-MM"`, Berliner Zeit) und All-Time (`season = "all"`).
- Monatlicher Reset: Ab dem 1. zählt automatisch die neue Monatszeile, gelöscht wird nichts. Der Cron friert danach den
  Endstand des Vormonats in `BlocksSeason` ein (Anzeige „Monatssieger“), zahlt Platz 1–3 ihre Belohnung aus und
  benachrichtigt sie.
- Belohnungen (Münzen und Rang-Punkte je Platz 1–3) stellt ein Admin unter **Admin → Tools → Minigames** ein
  (`src/lib/blocks/rewards-config.ts`, gespeichert in `BotConfig`). Die Auszahlung erscheint als `PointTransaction`
  mit dem Grund „OMA Blocks: Platz X im <Monat>“.

## Steuerung auf Handys

- **Gamepad** unter dem Feld (Einstellung „Touch-Buttons“: automatisch/immer/nie), mit Vibration (abschaltbar).
- **Wischgesten** direkt auf dem Feld (`src/components/blocks/TouchControls.tsx`, abschaltbar): ziehen = Teil zellgenau
  verschieben, nach unten ziehen = Soft Drop, nach unten wischen = Hard Drop, nach oben wischen = Hold, tippen links/rechts
  = drehen ↺/↻, tippen auf die Hold-Box = Hold. Gesten laufen über dieselben Eingaben wie Tasten — Replays bleiben gültig.
  Die Wisch-Empfindlichkeit (Stufe 1–5) steuert Zugweg pro Zelle und Mindesttempo für Wischer.
- **Vollbild:** Während einer Runde legt sich das Spiel auf Handys über die ganze App (`FullscreenShell.tsx`). Auf Android
  wird zusätzlich echtes Browser-Vollbild angefordert (einmal pro Runde — wer es verlässt, bleibt draußen); iPhones
  unterstützen das nicht, dort bleibt es beim Overlay. In Versus stehen die Gegner dann als schmale Leiste über dem Feld.

## Events

Im Event-Assistenten als Spiel „OMA Blocks“ wählen, dann die Art festlegen. Im Event-Editor (Admin) lassen sich die Werte später ändern — die Art bleibt fest, ein Turnier
ist nur vor dem Start änderbar, eine Challenge bis zur Abrechnung.

**Live-Turnier (Gruppen + Finale)** — `BlocksTournament`
- Spieler melden sich ganz normal am Event an (optional mit Check-in).
- Zur Startzeit drückt die Turnierleitung auf der Event-Seite „Turnier starten“: Alle angemeldeten bzw. eingecheckten
  Spieler werden zufällig auf Gruppen à max. 8 verteilt. Bei bis zu 8 Spielern geht es direkt ins Finale.
- Die Spieler kommen über „Zum Turnier-Raum“ auf `/gems/blocks/turnier/[eventId]`. Die App stellt dort ein signiertes
  Ticket aus (Gruppe, Rundenzahl, Teilnehmer), mit dem der Versus-Server den Raum baut — er braucht weiter keine Datenbank.
- Runden starten automatisch: 5 s nachdem alle da sind, sonst spätestens 90 s nachdem der zweite Spieler da ist.
  Wer zu spät kommt, spielt ab der nächsten Runde mit. Punkte je Runde: 10/7/5/3/2/1 (Gleichstand: Siege, dann
  Durchschnittsplatz). Gezählt werden je Gruppe nur die ersten N Runden.
- Sind alle Gruppen fertig, steigen die Besten jeder Gruppe ins Finale auf (max. 8 insgesamt) und wechseln automatisch
  in den Finalraum. Nach dem Finale steht die Endrangliste in `Event.finalRankingJson`; der Admin schließt das Event
  wie gewohnt ab (Belohnungen aus dem Schritt „Belohnungen“, Pokale usw.).
- Hängt eine Gruppe (Spieler fehlen), kann die Turnierleitung die Phase mit dem aktuellen Stand beenden.
- Startet der Bot neu, fängt ein Turnier-Raum bei den Runden an, die die App schon gewertet hat.

**Community-Challenge (gemeinsames Ziel)** — `BlocksChallenge`
- Zwischen Start und Ende zählen alle gewerteten Solo-Läufe auf ein gemeinsames Ziel (Linien oder Punkte), ohne
  Anmeldung. Versus-Runden zählen nicht (sie werden nicht nachgespielt).
- Fortschritt auf der Event-Seite und im Blocks-Bereich des Games-Hubs.
- Nach dem Ende rechnet der Cron (bzw. der nächste Seitenaufruf) ab: Ziel erreicht → jeder mit Mindestbeitrag bekommt
  die Belohnung (Münzen/Rang-Punkte), alle Beitragenden werden benachrichtigt. Squad-Captains sind auf 50 Münzen begrenzt.

## Versus-Server einrichten (Render, im Bot-Prozess)

Vercel kann keine dauerhaften WebSocket-Verbindungen halten. Der Versus-Server hängt sich deshalb an den HTTP-Server
des Discord-Bots auf Render (gleicher Port wie der Health-Check, Pfad `/blocks`) — kein zusätzlicher Dienst, keine
zusätzlichen Render-Stunden. Ohne `BLOCKS_MP_SECRET` startet der Bot ganz normal, nur ohne Versus.

1. **Secret erzeugen:** `openssl rand -base64 32`
2. **Render** → Bot-Dienst → *Environment*:
   - `BLOCKS_MP_SECRET` = das Secret
   - `APP_URL` = `https://<eure-app-domain>` (dorthin meldet der Server die Versus-Ergebnisse)
   - `ALLOWED_ORIGINS` = `https://<eure-app-domain>` (optional, mehrere kommagetrennt)
   - Speichern → Render startet den Bot neu. Im Log steht dann „OMA Blocks Versus-Server bereit (Pfad /blocks)“.
3. **Vercel** → *Settings → Environment Variables* (Production), danach neu deployen:
   - `BLOCKS_MP_SECRET` = dasselbe Secret
   - `NEXT_PUBLIC_BLOCKS_MP_URL` = `wss://<bot-dienst>.onrender.com/blocks`
     (die Render-Adresse des Bots, `https://` durch `wss://` ersetzen; fehlt `/blocks`, wird es automatisch ergänzt)

Hinweise:
- Startet der Bot neu (Deploy, Absturz), brechen laufende Versus-Runden ab; die Spieler verbinden sich neu.
- Der Health-Check des Bots zeigt unter `blocks` die offenen Räume und verbundenen Spieler.

Lokal ohne Bot: `BLOCKS_MP_SECRET=dev APP_URL=http://localhost:3000 npm run blocks:dev` und in `.env.local`
`BLOCKS_MP_SECRET=dev`, `NEXT_PUBLIC_BLOCKS_MP_URL=ws://localhost:8080/blocks`.

## Versus-Regeln

- Räume für 2–8 Spieler: „Schnelles Spiel“ (öffentlich) oder privater Raum mit Code/Einladungslink. Der Host startet.
- Öffentliche Räume erscheinen für alle, die noch in keinem Raum sind, unter „Offene Räume“ (Server-Nachricht `rooms`)
  und lassen sich direkt betreten. Läuft dort gerade eine Runde, schaut man zu und spielt ab der nächsten mit.
- Alle bekommen pro Runde denselben Seed (gleiche Teile-Reihenfolge). Das Tempo steigt alle 30 Sekunden.
- Angriffe: Double 1, Triple 2, Quad 4, T-Spin Single/Double/Triple 2/4/6, Back-to-Back +1, Combo-Bonus, Perfect Clear +10.
  Eigene Angriffe verrechnen zuerst wartende Garbage. Der Server prüft jeden Angriff gegen diese Tabelle und wählt ein
  zufälliges lebendes Ziel und die Lücken-Spalte.
- Wer zuletzt übrig ist, gewinnt. Runden mit mindestens 2 Spielern werden gespeichert (Versus-Rangliste im Monat).
- Versus-Ergebnisse zählen nicht für die Solo-Highscores.
