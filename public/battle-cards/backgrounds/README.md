# Kapitel-Hintergründe — Kampagne

Breite Banner-Hintergründe für den Kopfbereich der Kampagnen-Karte
(`CampaignMap.tsx`, siehe `CAMPAIGN_CHAPTER_BACKGROUND` in
`src/lib/battle-cards/campaign-levels.ts`). Fehlt eine Datei (noch), fällt
die UI automatisch auf einen einfachen Verlaufshintergrund zurück
(`onError`-Pattern, wie bei den Monster-Bildern) — kein Blocker.

## Format

- JPG oder PNG, Querformat (16:9 empfohlen), mind. 1600px breit.
- Motiv darf ruhig dunkel/detailreich sein — Titel/Text werden per
  Verlaufs-Overlay im UI darübergelegt, für Lesbarkeit ist also keine
  eigene Textfreifläche im Bild nötig.
- Dateiname exakt wie unten (Kleinschreibung, Bindestriche).

## Benötigte Dateien

| Datei | Kapitel | Kurzbeschreibung |
|---|---|---|
| `kapitel-1-server-neustart.png` | Kapitel 1: Server-Neustart | Dunkler Serverraum bei Nacht, rote Alarmlichter, lila/cyan Neon-Glitch-Artefakte, ein geisterhafter Lade-Kreis in der Ferne — passend zur Story "der Community-Server ist abgestürzt". |
