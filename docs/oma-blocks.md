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
| Cron (Monatsabschluss, täglich) | `/api/cron/blocks-season` |
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
- Alle bekommen pro Runde denselben Seed (gleiche Teile-Reihenfolge). Das Tempo steigt alle 30 Sekunden.
- Angriffe: Double 1, Triple 2, Quad 4, T-Spin Single/Double/Triple 2/4/6, Back-to-Back +1, Combo-Bonus, Perfect Clear +10.
  Eigene Angriffe verrechnen zuerst wartende Garbage. Der Server prüft jeden Angriff gegen diese Tabelle und wählt ein
  zufälliges lebendes Ziel und die Lücken-Spalte.
- Wer zuletzt übrig ist, gewinnt. Runden mit mindestens 2 Spielern werden gespeichert (Versus-Rangliste im Monat).
- Versus-Ergebnisse zählen nicht für die Solo-Highscores.
