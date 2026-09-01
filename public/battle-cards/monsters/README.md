# Monster-Artwork — Edelstein-Kampf

Freistehende Gegner-Figuren für den Match-3-Kampfmodus (Empires-&-Puzzles-Stil:
eine Figur pro Gegner über dem Spielfeld, keine Kartenausschnitte). Sobald eine
Datei mit dem passenden Dateinamen hier abgelegt wird, zieht der Code sie
automatisch — kein weiterer Code-Change nötig (siehe `monsterImagePath()` in
`src/lib/battle-cards/monster-content.ts`). Fehlt eine Datei (noch), fällt die
UI automatisch auf ein generisches Klassen-Icon zurück, es gibt also keinen
Blocker: Dateien können nach und nach ergänzt werden.

## Format

- **PNG mit transparentem Hintergrund**, freigestellte Figur (kein Rahmen, keine
  Karten-Optik, kein eigener Hintergrund).
- Ganzkörper- oder Halbkörper-Figur im Stil von Empires & Puzzles: comichaft,
  leicht überzeichnet, klar erkennbare Silhouette.
- Empfohlene Auflösung: mind. 512×512px (hochkant/quadratisch), gerne größer —
  wird im UI stark verkleinert dargestellt.
- Dateiname exakt wie unten (Kleinschreibung, Bindestriche).

## Benötigte Dateien

### Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

| Datei | Monster | Kurzbeschreibung |
|---|---|---|
| `sockenmonster.png` | Sockenmonster | Tank aus verlorenen Einzelsocken, wollig/filzig |
| `bratwurstboss.png` | Bratwurstboss | Tank, gegrillte Bratwurst mit Senf-Deko |
| `karsten-kaktus.png` | Karsten Kaktus | Damage Dealer, stacheliger Kaktus mit frechem Grinsen |
| `frittatus.png` | Frittatus | Damage Dealer, fliegende Pommes/Fett-Dämon |
| `oma-gisela.png` | Oma Gisela | Support, herzliche Rentnerin mit Kuchen/Keksen |
| `formularfresser.png` | Formularfresser | Support, bürokratischer Papierkram-Golem |

### Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor

| Datei | Monster | Kurzbeschreibung |
|---|---|---|
| `tutorial-slime.png` | Tutorial-Slime | Tank, winziger schwacher Schleim, Level-1-Anfänger |
| `session-timeout-zombie.png` | Session-Timeout-Zombie | Tank, träger Zombie mit WLAN-Symbol/Ladekreis |
| `serverabsturz-kraken.png` | Serverabsturz-Kraken | Tank (Mini-Boss), Kraken aus Kabeln/Servern |
| `rage-quit-controller.png` | Rage-Quit-Controller | Damage Dealer, wütender fliegender Controller mit Rissen |
| `lag-spike.png` | Lag-Spike | Damage Dealer, glitchige/zerrissene Erscheinung |
| `loot-goblin.png` | Loot-Goblin | Damage Dealer, hastiger Goblin mit vollem Beutesack |
| `griefer-imp.png` | Griefer-Imp | Damage Dealer, kleiner fieser grinsender Kobold |
| `pay2win-truhe.png` | Pay2Win-Truhe | Support, glitzernde Schatztruhe mit Dollarzeichen |
| `afk-farmer.png` | AFK-Farmer | Support, dösende Figur mit Auto-Klicker-Gadget |
| `season-pass-drache.png` | Season-Pass-Drache | Endboss, prächtiger Drache mit "legendärem" Glitzer-Skin |

## Bezugsquellen

Siehe Recherche-Notiz in der Konversation/PR-Beschreibung für konkrete
Vorschläge (freie Creature-Icon-Sets, KI-Bildgenerierung mit festem
Stil-Prompt). Lizenz vor Verwendung prüfen — bei CC-BY-Sets die Attribution
z.B. hier in dieser README ergänzen.
