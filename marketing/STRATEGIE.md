# OMA-App – Marketing-Strategie (Entwurf v1)

Stand: 2026-09-26 · Basis: Code-Inventar (Routen, Login-Seite, PRODUCT.md, Erinnerungen)

## 1. Ausgangslage

- **Produkt:** "Old Masters Ally" (OMA-App) – Companion-Web-App der Discord-Community "Old Masters". Deutsch, dunkel, Teal-Akzent (#14b8a6), Space Grotesk.
- **Zugang:** Login nur per Discord, Nicht-Mitglieder landen auf `/auth/not-member`. Das ist für Werbung wichtig: Neue müssen zuerst dem Discord beitreten.
- **Konsequenz:** Der Funnel für Außenstehende ist **Social → Discord-Einladung → App**, nicht Social → App. Die App selbst ist das Bindungsversprechen *nach* dem Beitritt.

## 2. Feature-Inventar (aus dem Code)

| Bereich | Was es ist | Werbe-Wow |
|---|---|---|
| Events & Serien | Discord-Events synchronisiert, Anmeldung, Serien/Seasons mit Tabelle | "Nie wieder ein Event verpassen" |
| Turniere | Single/Double Elim, Round Robin, Liga, FFA/Coop, Live-Bracket, Umfragen, Clip-Einreichung | Echte Turniere ohne Excel |
| OBS-Overlay | Live-Score/Bracket für Streamer per Browser-Source (~1 s) | Profi-Stream-Look für die eigene Community |
| Punkte, Ränge, Rangliste | Punkte-Ökonomie, Ränge, Leaderboards, Rückblick | Fortschritt sichtbar |
| Quests | Monatliche Challenges (Voice, Chat, Events) | Belohnung fürs Dabeisein |
| Community-Jobs | Aufgaben übernehmen, Punkte verdienen, Auszahlungen | Mitmachen wird belohnt |
| Battle Cards | Kartensammeln, Pack-Shop, Held erstellen, Klassen, Lineup, Battles live, Duelle (Duel-Deck), Ranked-Season | Sammel-/Kampfspiel *in* der Community |
| OMA Quest | Hex-Weltkarte, Locations, NPCs, Quests, Welten-Editor für Community-Mitglieder | Eigene Abenteuer bauen |
| Minigames & Glücksrad | Tägliche Spiele, Münzen-Preise, Karten-Packs | Täglicher Grund zurückzukommen |
| Clips | Clip-Galerie, Clip des Monats/Jahres | Eigene Highlights im Rampenlicht |
| Community-Board | Ideen, Reports, Alben, Roadmap | Mitbestimmen |
| Squads | Teams mit eigener Seite | Zugehörigkeit |
| Profil & Badges | Profil, Vergleich, Badges, Rückblick | Identität und Stolz |
| Spenden & Server | Donations, Server-Liste/Bewerbungen | Community trägt die Infrastruktur |

## 3. Zwei Zielgruppen, zwei Botschaften

### A) Außenstehende (Gamer-Freunde, Discord-Umfeld)
**Kernversprechen:** "Eine Gaming-Community, die sich wie ein Spiel anfühlt – Turniere, Karten, Quests und ein Ranking, alles an einem Ort."
- Hook: Spaß & Wettbewerb, nicht "Companion-App".
- Beweis: kurze Clips (Battle Cards, Bracket, Overlay, OMA Quest-Karte).
- CTA: **Discord-Einladung** (nicht Login-Link).

### B) Bestehende Mitglieder (Feature-Aktivierung)
**Kernversprechen:** "Du nutzt 20 % der App. Hol dir den Rest."
- Nicht alles auf einmal: ein Feature pro Woche.
- Belohnung koppeln: Punkte/Münzen für "erste Nutzung" (z. B. erstes Pack, erste Quest, erster Clip).
- CTA: Direktlink in das jeweilige Feature.

## 4. Kanäle & Formate

**Extern (A):** TikTok/Reels/Shorts (15–30 s), Post-Grafiken, Discord-Server-Listen, Streamer-Kooperationen (Overlay als Aufhänger), Freunde-werben-Mechanik.
**Intern (B):** Discord-Ankündigungen (Bot existiert: `daily-message`, Notifications), In-App-Onboarding-Checkliste, Feature-Spotlight auf dem Dashboard, Community-Board-Roadmap als "Neu"-Kanal.

## 5. 6-Wochen-Fahrplan

| Woche | Extern (A) | Intern (B) |
|---|---|---|
| 1 | Brand-Basis: Logo, Farben, Clip-Vorlagen; Discord-Einladungsseite prüfen | Feature-Check-Liste ("Was hast du schon probiert?") |
| 2 | Clip 1: **Battle Cards** (Pack öffnen, Held, Duell) | Spotlight Battle Cards + erstes-Pack-Bonus |
| 3 | Clip 2: **Turnier + OBS-Overlay live** | Spotlight Turniere/Clips einreichen |
| 4 | Clip 3: **OMA Quest** Weltkarte + Welten-Editor | Spotlight OMA Quest, Aufruf: baut eigene Locations |
| 5 | Clip 4: **Rangliste/Quests/Jobs** ("So verdienst du Punkte") | Spotlight Quests & Community-Jobs |
| 6 | Zusammenschnitt "Ein Monat OMA" + Einladungsaktion | Rückblick-Seite teilen, Feedback über Community-Board |

## 6. Messen

- Extern: Discord-Beitritte pro Woche, Klicks auf Einladungslink (UTM-Parameter je Kanal).
- Intern: Anteil aktiver Nutzer pro Feature (Events, Quests, Battle Cards, OMA Quest), Ziel: Feature-Breite pro Nutzer steigern.
- Datengrundlage im Projekt: Vercel Analytics/Events sowie DB-Abfragen (Aktivität, Punkte).

## 7. Offene Fragen an dich

1. Öffentlicher Discord-Einladungslink vorhanden, und darf die Seite für Gäste (ohne Login) ein Vorschau-Bereich haben?
2. Auf welchen Plattformen habt ihr schon Accounts (TikTok, Instagram, YouTube, X)?
3. Sollen Mitglieder für "erste Feature-Nutzung" wirklich Münzen bekommen (Kosten in der Punkte-Ökonomie)?
4. Tonalität: locker-duzend wie in der App, oder mit mehr Humor/Meme-Stil für Social?
5. Gibt es Screenshots/Clips, die ihr nicht zeigen wollt (Namen, Discord-Inhalte)?

## 8. Nächste Bausteine (nach deiner Freigabe)

1. Öffentliche Landingpage `/willkommen` (ohne Login, Feature-Überblick + Discord-Button)
2. Feature-Onboarding-Checkliste im Dashboard (für Mitglieder)
3. Social-Skripte und Post-Texte je Clip
4. Grafiken/Videos aus dem Brandkit (`brandkit/`)
