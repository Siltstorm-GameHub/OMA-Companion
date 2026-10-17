# OMA Gems — Gerüst-Vorgabe für Helden-Zeichnungen

Diese Vorgabe richtet sich an Zeichnerinnen und Zeichner, die die Helden von OMA Gems neu gestalten.
Die App setzt jeden Helden aus einzelnen Teilen zusammen und färbt sie selbst ein. Solange jedes Teil
die Regeln unten einhält, ersetzt eine neue Zeichnung das bisherige Teil ohne Code-Änderung.

Referenz: die aktuellen Teile in `src/lib/gems/hero/parts.tsx`, der Stil im Canvas
„OMA Gems Helden-Stile“ (Stil A, Cartoon mit Outline).

## Stil

- Cartoon mit kräftiger dunkler Kontur: Farbe `#1b1326`, 5 px bei 220 px Bildbreite (Waffengriffe,
  Gesichtslinien und kleine Teile 3,5 px).
- Große Köpfe (Kopf etwa 40 % der Figurenhöhe), kurze Körper, freundliche Gesichter.
- Flache Farben mit genau einer Schattenstufe, optional ein heller Glanzstrich. Keine Verläufe, keine
  Texturen — Farbe kommt aus den Farbslots (unten), damit Kosmetik umfärben kann.
- Vorderansicht, Figur steht mittig auf dem Boden. Klasse muss an der Silhouette erkennbar sein:
  Tank breit mit Schild oder Axt, Damage Dealer schlank mit Klinge oder Bogen, Support mit Robe und
  Stab oder Laterne.
- Jede Figur trägt OMA-Ausrüstung mit einem Emblem auf der Brust (gemeinsames Erkennungszeichen).

## Zeichenfläche und Ankerpunkte

- Zeichenfläche 220 × 240 (Einheiten = SVG-Koordinaten), Ursprung oben links.
- Boden bei y = 226; Bodenschatten: Ellipse Mitte (110 | 226), 66 × 9, Schwarz 35 %.
- Kopf: Kreis Mitte (110 | 86), Radius 44. Augen bei (94 | 98) und (126 | 98), Mund um (110 | 114).

Körperbauten (Schulter links / rechts, Brust-Emblem):

| Körperbau | Grundfiguren | Schulter L | Schulter R | Emblem |
|---|---|---|---|---|
| breit | tank-schild, tank-axt | (66, 138) | (154, 138) | (110, 156) |
| schlank | dd-klinge, dd-bogen | (80, 138) | (140, 138) | (110, 150) |
| Robe | support-stab, support-laterne | (76, 138) | (144, 138) | (110, 152) |

Hände je Pose (Arm = Linie von der Schulter zur Hand, Hand = Kreis Radius 8):

| Körperbau | Pose | Hand L | Hand R |
|---|---|---|---|
| breit | stehen / angriff / jubel | (52,168) / (50,160) / (50,102) | (168,168) / (176,118) / (170,102) |
| schlank | stehen / angriff / jubel | (66,170) / (64,162) / (62,104) | (154,170) / (166,116) / (158,104) |
| Robe | stehen / angriff / jubel | (62,172) / (60,164) / (58,104) | (158,170) / (166,122) / (162,104) |

Waffen werden in eigenen Koordinaten gezeichnet: Ursprung (0 | 0) = Mitte der Hand, die Waffe zeigt
senkrecht nach oben (negative y). Die App dreht sie je Pose (stehen 18°, angriff 62°, jubel −8°;
Laterne hängt immer senkrecht, Stab dreht nur ein Drittel). Schild und Bogen sitzen in der linken
Hand, alles andere in der rechten.

## Ebenen (von hinten nach vorn)

1. Bodenschatten
2. Accessoire hinten (Umhang)
3. Kopfbedeckung hinten (Kapuze)
4. Haare hinten (lang, Zopf) — entfällt bei Kapuze
5. Beine (nicht bei Robe)
6. Körper mit Schattenstufe
7. Brust-Emblem
8. Schulterpolster (nur breit)
9. Arme und Hände
10. Waffe rechte Hand, Waffe linke Hand
11. Accessoire am Hals (Schal)
12. Kopf mit Schattenstufe
13. Gesicht (Augen, Brauen, Mund, Wangen)
14. Haare vorn — entfällt unter dem Helm außer bei langen Haaren und Zopf
15. Kopfbedeckung vorn (Helm, Kapuzenrand, Stirnband, Mütze)
16. Accessoire im Gesicht (Brille, Headset)

## Farbslots

Teile verwenden nur diese Slots (die App setzt die Farben ein), plus feste Neutraltöne
(Hose `#334155`, Holz `#92400e`, Klinge `#e2e8f0`, Gold `#fbbf24`):

| Slot | Bedeutung | Beispiel OMA-Türkis |
|---|---|---|
| `main` | Hauptfarbe der Ausrüstung | `#14b8a6` |
| `dark` | Schattenstufe der Ausrüstung | `#0f766e` |
| `light` | Glanz, Leuchten | `#5eead4` |
| `metal` | Rüstteile, Helm, Polster | `#94a3b8` |
| `skin` / `skinShade` | Haut und Hautschatten | `#f1c7a3` / `#dfab82` |
| `hair` / `hairShade` | Haare und Haarschatten | `#7a4a24` / `#5a3417` |

Farbschemata, Hauttöne und Haarfarben stehen in `src/lib/gems/hero/look.ts`.

## Teile-Katalog

| Slot | Teile |
|---|---|
| Grundfigur | tank-schild, tank-axt, dd-klinge, dd-bogen, support-stab, support-laterne |
| Gesicht | froehlich, entschlossen, grinsen, ruhig, frech, staunend |
| Frisur | kurz, stachelig, pony, lang, zopf, locken, irokese, glatze |
| Kopfbedeckung | keine, helm, kapuze, stirnband, muetze |
| Accessoire | keins, umhang, brille, schal, headset |
| Emblem | juwel, stern, krone, herz, blitz (Größe etwa 28 × 28 um den Emblem-Punkt) |
| Pose | stehen, angriff, jubel (nur Arme und Waffenwinkel ändern sich) |

## Lieferformat

- Je Teil eine SVG-Datei mit `viewBox="0 0 220 240"` (Waffen: `viewBox` um den Ursprung, z. B.
  `-60 -110 120 180`), nur Pfade und Grundformen, keine eingebetteten Bilder, keine Schriften,
  keine Filter.
- Farbslots als Platzhalterfarben einreichen und in einer Liste benennen, oder mit
  `fill="var(--main)"` usw. — wir übertragen sie in den Code.
- Dateinamen: `<slot>-<id>.svg`, z. B. `frisur-locken.svg`, `waffe-dd-klinge.svg`,
  `koerper-breit.svg`; Teile mit Vorder- und Rückseite als `-vorn` / `-hinten`.
- Prüfbild: jede Figur einmal in klein (80 px breit) ansehen — Gesicht und Klasse müssen auch auf
  der Handy-Karte erkennbar bleiben.
