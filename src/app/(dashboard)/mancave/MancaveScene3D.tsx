"use client";

/**
 * Echte interaktive 3D-Ego-Ansicht — lädt die tatsächliche Blender-Referenz-
 * szene (`3DAssetsRoom/LP_Ortographic_Gaming_Room.glb`, für den Browser als
 * `public/models/mancave_room.glb` mit Draco-Kompression exportiert, siehe
 * [[mancave-front-photos-project]] in memory) als EIN statisches Modell,
 * statt sie aus den generischen `public/models/*.glb`-Einzelteilen
 * (`FurniturePrimitive`) nachzubauen — ein früherer Versuch, sah aber nie
 * wie die echte Szene aus, weil das andere Assets mit anderem Stil sind.
 *
 * Konsequenz: die Szene zeigt größtenteils NICHT die individuellen Objekte
 * des Users, sondern die feste Referenz-Kulisse — außer den Slots, die schon
 * auf das neue Stufen-System (mancave-items.ts) umgestellt wurden: dafür
 * wurde das jeweilige Referenz-Mesh aus `mancave_room.glb` entfernt (siehe
 * Blender-Export-Notiz) und wird hier durch ein per Stufe austauschbares GLB
 * aus dem alten Möbel-Katalog (`public/models/*.glb`) ersetzt (siehe
 * SwappablePc als Pilot). Das ist ein bewusster Stilbruch (andere Assets als
 * die handgebaute Referenzszene) — Ziel ist erst die Swap-PIPELINE zu
 * validieren, echte stilgetreue Stufen-Modelle sind ein separater
 * Blender-Arbeitsblock für später. Den separaten "Gadgets"-Hotspot (Foto-
 * Liste der GAMING-ZIMMER-Items, altes System) gibt es nicht mehr — jedes
 * Mancave-Objekt soll stattdessen direkt als 3D-Objekt im Raum stehen
 * (`SwappableProp`/`ExtraProp`), nicht als zusätzliche Foto-Liste.
 *
 * Kamera-Position/-Blickrichtung sind 1:1 aus der Blender-Kamera (`DeskCam`)
 * übernommen, per Blender→glTF-Achsenkonvertierung (X→X, Z→Y, -Y→Z) — siehe
 * `EYE`/`FORWARD` unten. Kein KHR_lights_punctual im Export (Blenders
 * Area-Lights werden von glTF nicht unterstützt, nur Point/Spot/Directional)
 * — die Beleuchtung kommt komplett aus `RoomLighting` hier im Code.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, useGLTF, useTexture, Text } from "@react-three/drei";
import * as THREE from "three";
import RankedAvatar from "@/components/RankedAvatar";
import { MonitorScreenContent, TrophyPanel, ItemsPanel, JobsPanel, MailPanel, WanderpokalePanel, EventPokalePanel, type MancavePanel } from "./MancaveSharedUI";
import type { MancaveData } from "./mancave-data";

const ROOM_MODEL_URL = "/models/mancave_room.glb";
useGLTF.preload(ROOM_MODEL_URL);
useGLTF.preload("/models/mancave_wall_extension.glb");
useGLTF.preload("/models/mancave_ceiling.glb");

// ── Kamera: aus der Blender-Referenzkamera "DeskCam" übernommen ──────────
// Blender (Z-up): eye=(0.05,0.95,1.28), forward=(0.9598,0,-0.2806).
// glTF/three.js (Y-up): x→x, y→z_blender, z→-y_blender.
// Y (Höhe) auf User-Wunsch um 10cm angehoben (war 1.28) — wirkte zu tief/
// nah an der Tischkante. X (Tiefe) in zwei Schritten insgesamt 15cm Richtung
// Monitore verschoben (war 0.05, Monitore stehen bei X≈1.21) — Z/Blickrichtung
// unverändert.
const EYE = new THREE.Vector3(0.2, 1.38, -0.95);
const FORWARD = new THREE.Vector3(0.9598, -0.2806, 0);
const LOOK_TARGET = EYE.clone().add(FORWARD);

// Bildschirm-Mitte des Haupt-Monitors ("Cube.015") — bewusst NICHT auf die
// höhere, gemeinsame Mitte von Cube.015+Cube.002 verschoben (das wurde
// ausprobiert, vom User aber als schlechter beurteilt und zurückgesetzt) —
// diese niedrigere Position bleibt der bevorzugte Stand.
const SCREEN_POS = new THREE.Vector3(1.215, 1.091, -0.741);

/**
 * Interaktive Overlays auf ALLEN Monitor-Screens (nicht nur dem Haupt-
 * Monitor) — ab Monitor-Stufe 2/3/4 kommen weitere Screens dazu (2x2-Raster:
 * screen1 unten-rechts, screen2 unten-links, screen3 oben-rechts, screen4
 * oben-links), jeder bekommt sein eigenes <Html transform>-Overlay.
 *
 * ECHTE 3D-Verankerung (`<Html transform>`) statt Billboard: User-Wunsch
 * "dreht sich mit der Kamera mit" — beim Billboard-Modus (`<Html center>`,
 * fixe CSS-Pixelgröße) bleibt der Screen immer flach zur Kamera ausgerichtet
 * statt sich mit der 3D-Perspektive der Bildschirmfläche mitzudrehen.
 *
 * Größen-Bug beim ersten Versuch (Screen war ~40x zu klein, "Farbfleck"):
 * drei's Html.js multipliziert die Objekt-Skalierung intern zusätzlich mit
 * `(distanceFactor ?? 10) / 400` (siehe getObjectCSSMatrix + der `1 / ((distanceFactor
 * || 10) / 400)`-Aufruf in Html.js). Mit explizitem `distanceFactor={400}`
 * wird dieser Faktor zu 400/400=1 und hebt sich komplett auf — der `scale`-
 * Prop wirkt dann 1:1 als "Weltmeter pro CSS-Pixel", genau wie ursprünglich
 * angenommen.
 *
 * Alle vier Bildschirm-Flächen (Material "Pc screen3" in den jeweiligen
 * mancave_monitor_screenN.glb, NICHT das Mesh inkl. Rahmen) per Blender
 * bmesh vermessen (nur Faces mit diesem Material), Blender-Bbox (Z-up) in
 * gltf-Koordinaten umgerechnet: gltf.x=blender.x, gltf.y=blender.z,
 * gltf.z=-blender.y. Screen4 zusätzlich um die bekannten -0.02 (gltf-Y)
 * korrigiert, siehe MONITOR_SCREEN4_CFG-Kommentar.
 */
interface MonitorScreenGeom {
  center: THREE.Vector3; widthM: number; heightM: number;
  /** Euler [x,y,z] — NICHT bei allen Screens dieselbe reine Y-Rotation wie
   * bei screen1: screen2/4 sind zusätzlich nach innen gedreht (Yaw), screen3
   * zusätzlich nach unten geneigt (Pitch, keine Y-Komponente in seiner
   * Normalen). Jeweils aus dem echten, per Blender gemessenen Flächen-
   * Normalenvektor hergeleitet (rollfrei: lokale Rechts/Hoch/Vorwärts-Basis
   * aus Normale+Welt-Up konstruiert, NICHT die naive "kürzeste Rotation"
   * zwischen zwei Vektoren — die führt bei schräg stehenden Flächen zu einer
   * ungewollten Drehung UM die Normale, wodurch der Inhalt schräg gerendert
   * würde). Screen1/2/4 bestätigt roll-frei (Up bleibt exakt (0,1,0)).
   */
  rotation: [number, number, number];
}
const MONITOR_SCREENS: MonitorScreenGeom[] = [
  { center: new THREE.Vector3(1.2128, 1.0773,  -0.7413), widthM: 0.5256, heightM: 0.3146, rotation: [0, -1.5708, 0] }, // screen1, unten-rechts
  { center: new THREE.Vector3(1.1392, 1.07725, -1.2758), widthM: 0.5052, heightM: 0.3145, rotation: [0, -1.2905, 0] }, // screen2, unten-links
  { center: new THREE.Vector3(1.15295, 1.4001, -0.7413), widthM: 0.5256, heightM: 0.2920, rotation: [1.5708, -1.1892, 1.5708] }, // screen3, oben-rechts (geneigt)
  { center: new THREE.Vector3(1.1392, 1.41125, -1.2758), widthM: 0.5052, heightM: 0.3145, rotation: [0, -1.2905, 0] }, // screen4, oben-links
];
// Content wird bei fester CSS-Pixelbreite gezeichnet und über `scale` auf
// die echte Weltbreite der jeweiligen Bildschirmfläche herunterskaliert —
// dadurch bleibt die "Auflösung" (Schärfe) auf allen vier Screens gleich,
// obwohl sie leicht unterschiedlich groß sind.
const SCREEN_CONTENT_PX = 640;
// Profil-Plakat: saß ursprünglich über dem Monitor (überlappte damit), dann
// links vom Fenster bei X=-0.55 — das war relativ zur ALTEN Fensterposition
// (X=0.3) berechnet und wurde beim Verschieben des Fensters (jetzt X=0.7,
// wegen Überlappung mit Couch/Nanoleaf, siehe WINDOW_POS-Kommentar) nicht
// mitgezogen. X=-0.55 läge jetzt außerdem mitten im Nanoleaf-Wandcluster
// (X bis 0.1, per Blender-Messung). Stattdessen an die freie Ecke RECHTS vom
// Fenster gesetzt (X=1.2, zwischen Fenster-Kante bei 1.1 und der echten
// Wandkante bei 1.292) — dort weder Nanoleaf noch Regal noch Couch (deren
// Rückenlehne endet bei Höhe 0.774, deutlich unter Y=1.2).
const POSTER_POS = new THREE.Vector3(1.2, 1.2, 0.886);
// PC-Tower-Position ("Cube.017", inzwischen aus dem Room-Export entfernt,
// siehe SwappablePc) — Tischoberfläche unter dem Tower (Blender-Z-min der
// alten Cube.017-Bounding-Box).
const PC_POS = new THREE.Vector3(1.05, 0.816, -0.29);

/**
 * Neues Stufen-Ausbausystem: pro Slot lädt `SwappableProp` je nach Stufe
 * eines der bestehenden Katalog-GLBs aus dem alten Gaming-Zimmer nach — die
 * jeweilige Referenz-Geometrie wurde dafür aus `mancave_room.glb` entfernt
 * (siehe Blender-Export-Notizen bei den einzelnen `_TIER_MODELS`-Konstanten).
 * `fix` normalisiert jedes Modell auf "Ursprung am Boden-Mittelpunkt"
 * (gemessen per Node/three.js-Skript, siehe [[mancave-profile-project]] in
 * memory für die Mess-Methode) — die Modelle wurden nie für ein gemeinsames
 * Koordinatensystem gebaut, jedes hat einen eigenen, willkürlichen Ursprung.
 * `scale` gleicht grobe Größenunterschiede zwischen den Modellen einer
 * Stufenreihe aus. Bewusst NICHT versucht, die alte Referenz-Bounding-Box
 * exakt zu treffen — andere Modell-Silhouette, exaktes Nachbauen wäre nur Zufall.
 */
interface TierModelCfg {
  url: string; fix: [number, number, number]; scale: number;
  /** Yaw-Korrektur (Radiant), falls die "Vorderseite" des Modells nicht schon lokal +Z/-X entspricht. */
  rotationY?: number;
  /** Mesh-Namen, die nach dem Laden entfernt werden (z.B. eine mitgelieferte Boden-/Sockel-Fläche im Modell). */
  excludeMeshNames?: string[];
  /**
   * Objekt-Namen, deren Material auf ein normales, nicht-metallisches Weiß
   * zurückgesetzt wird. Notwendig für glTF-Primitives OHNE Material-Zuweisung
   * (`material: null` im Rohdatensatz) — glTF-Spec-Default dafür ist dann
   * voll-metallisch/voll-rau OHNE Environment-Map in dieser Szene, was quasi
   * schwarz und damit unsichtbar vor dem dunklen Hintergrund rendert (per
   * direktem Blick in die exportierte glTF-JSON bestätigt, nicht geraten).
   */
  fixMaterialNames?: string[];
  /**
   * MATERIAL-Namen (nicht Objekt-Namen — dasselbe Material kann auf mehreren
   * unterschiedlich benannten Meshes liegen), deren Metalness auf 0 gesetzt
   * wird, Farbe bleibt erhalten. Für Fälle wie `monitor_dreifach`s
   * "Wallpaper"-Material: dunkle Basisfarbe korrekt gesetzt, aber
   * metallicFactor/roughnessFactor im Rohdatensatz nicht gesetzt → glTF-
   * Spec-Default ist voll-metallisch — ohne Environment-Map in dieser Szene
   * brennen nahe Punktlichter das dann zu großflächigem Weiß aus (dieselbe
   * Ursache wie beim früheren Material.001-Specular-Blowout, hier aber am
   * Rohdatensatz bestätigt statt nur vermutet).
   */
  fixMetalnessForMaterials?: string[];
  /** Zusätzlicher Welt-Versatz NUR für diese Stufe, addiert auf die geteilte `position`-Prop des Slots. */
  offset?: [number, number, number];
  /**
   * Erzwingt `THREE.DoubleSide` auf ALLEN Materialien dieses Modells. Fix für
   * Meshes mit inkonsistenten/invertierten Normalen (z.B. gespiegelte
   * Geometrie ohne Normal-Korrektur) — sichtbar als scheinbar "halbierte"
   * Flächen, weil Three.js standardmäßig nur die Vorderseite (FrontSide)
   * rendert und in Blender ("Backface Culling" dort oft deaktiviert) das
   * gleiche Mesh komplett aussieht.
   */
  doubleSided?: boolean;
}

function SwappableProp({ tier, models, position }: { tier: number; models: Record<number, TierModelCfg>; position: THREE.Vector3 }) {
  const cfg = models[Math.min(4, Math.max(1, tier))];
  const { scene } = useGLTF(cfg.url);
  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    if (cfg.excludeMeshNames?.length) {
      const toRemove: THREE.Object3D[] = [];
      clone.traverse(obj => { if (cfg.excludeMeshNames!.includes(obj.name)) toRemove.push(obj); });
      for (const obj of toRemove) obj.removeFromParent();
    }
    if (cfg.fixMaterialNames?.length) {
      clone.traverse(obj => {
        if (obj instanceof THREE.Mesh && cfg.fixMaterialNames!.includes(obj.name)) {
          obj.material = new THREE.MeshStandardMaterial({ color: "#c7cdd6", metalness: 0, roughness: 0.6 });
        }
      });
    }
    if (cfg.fixMetalnessForMaterials?.length) {
      clone.traverse(obj => {
        if (!(obj instanceof THREE.Mesh)) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) {
          if (mat instanceof THREE.MeshStandardMaterial && cfg.fixMetalnessForMaterials!.includes(mat.name)) {
            mat.metalness = 0;
            mat.roughness = 0.6;
            mat.needsUpdate = true;
          }
        }
      });
    }
    if (cfg.doubleSided) {
      clone.traverse(obj => {
        if (!(obj instanceof THREE.Mesh)) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) {
          if (mat instanceof THREE.Material) {
            mat.side = THREE.DoubleSide;
            mat.needsUpdate = true;
          }
        }
      });
    }
    return clone;
  }, [scene, cfg]);
  const worldPos: [number, number, number] = [
    position.x + (cfg.offset?.[0] ?? 0),
    position.y + (cfg.offset?.[1] ?? 0),
    position.z + (cfg.offset?.[2] ?? 0),
  ];
  return (
    <group position={worldPos} rotation={[0, cfg.rotationY ?? 0, 0]}>
      <group scale={cfg.scale}>
        <primitive object={cloned} position={cfg.fix} />
      </group>
    </group>
  );
}

/**
 * PC-Turm (Stufen 1-4): pc_violett → pc_gaming → mancave_pc_reference →
 * pc_highend. User-Wunsch: "Cube.017" aus der Referenzszene (das
 * URSPRÜNGLICHE, handgebaute PC-Modell — genau das, was diesem Slot am
 * Anfang der Session entnommen wurde, um ihn austauschbar zu machen, siehe
 * PC_POS-Kommentar) ist der perfekte Computer für Stufe 3, und die bisherigen
 * Stufen 2/3 rutschen je eine Stufe runter (2→1, 3→2). Stufe 1 (`pc_billig`)
 * und Stufe 4 (`pc_highend`) bleiben inhaltlich, Stufe 4 behält ihre
 * Sockel-Flächen-Bereinigung (Mesh "Object_6_24"/Material "Material.106",
 * eine mitgelieferte Boden-Platte).
 *
 * `mancave_pc_reference.glb` ist wie Nanoleaf/Deskmat/Couchtisch direkt aus
 * der Referenzszene extrahiert — `location=(0,0,0)` in Blender bestätigt
 * (Weltposition steckt in den Vertex-Daten, nicht im Objekt-Transform).
 * Da `SwappableProp` aber IMMER `position` (hier `PC_POS`) auf die Gruppe
 * addiert, muss `fix` das exakt aufheben (`fix = -PC_POS`, scale=1), sonst
 * würde die schon korrekte Weltposition ein zweites Mal verschoben.
 */
// User-Wunsch (nach Einführung von pc_ultra als neue Stufe 4): alle Stufen
// um eins runter, die alte Stufe 1 (pc_tower_purple) komplett entfernt.
const PC_TIER_MODELS: Record<number, TierModelCfg> = {
  1: { url: "/models/pc_white_rgb.glb",    fix: [0, 0, 0], scale: 0.89, rotationY: Math.PI },
  2: { url: "/models/mancave_pc_reference.glb", fix: [-PC_POS.x, -PC_POS.y, -PC_POS.z], scale: 1 },
  3: {
    url: "/models/pc_highend.glb", fix: [-8.674, 0.721, 0.203], scale: 1.14,
    rotationY: -Math.PI / 2, excludeMeshNames: ["Object_6_24"],
  },
  // Neue Stufe 4: aus "3DAssetsRoom/custom_gaming_pc.glb" (427 Meshes,
  // "Object_59" — eine große flache Bodenplatte unter dem PC — laut Bbox-
  // Heuristik identifiziert und ausgeschlossen, User bestätigte das
  // unabhängig). Roh-Maße wieder viel zu groß (Höhe ~5.2 Einheiten) — scale
  // bringt sie auf ~0.55m. User: 90° im Uhrzeigersinn gedreht (negative
  // Y-Rotation).
  4: { url: "/models/pc_ultra.glb", fix: [-8.545, 2.841, -0.799], scale: 0.11, rotationY: -Math.PI / 2 },
};

/**
 * Monitor (Stufen 1-4): NACH mehreren gescheiterten Anläufen mit generischen
 * Katalog-Modellen (Weiß-Ausbrennen, falsche Rotation, Proportionen "passen
 * gar nicht") komplett auf die ECHTEN Referenz-Bildschirme der Szene
 * umgestellt, kumulativ statt getauscht — jede Stufe fügt einen weiteren
 * echten Bildschirm hinzu, keiner wird ersetzt:
 * - Stufe 1: "Cube.015" (unterer Teil des ursprünglichen Haupt-Bildschirms)
 * - Stufe 2: + "Cube.016" (separater zweiter Bildschirm)
 * - Stufe 3: + "Cube.002" (oberer Teil des Haupt-Bildschirms)
 * - Stufe 4: + eine in Blender duplizierte Kopie von "Cube.016", direkt um
 *   dessen eigene Höhe (0.354 Einheiten) nach oben versetzt ("Cube.016.dup_top",
 *   nur für den Export angelegt, danach wieder aus der Blend-Datei gelöscht —
 *   der Export selbst bleibt bestehen)
 * Ermöglicht später, Dashboard-Inhalte (Statistiken, Discord-Aktivität,
 * Lieblingsspiele) auf mehrere physische Bildschirme zu verteilen, sobald
 * mehr als einer da ist — architektonisch schon vorbereitet, da jedes
 * Html-Overlay unabhängig an einer 3D-Position verankert wird.
 */

// Echte Referenz-Bildschirme — "location=(0,0,0)" in Blender bestätigt
// (Weltposition steckt in den Vertex-Daten), daher position/fix beide [0,0,0].
const MONITOR_SCREEN1_CFG: ExtraCfg = { url: "/models/mancave_monitor_screen1.glb", fix: [0, 0, 0], scale: 1, position: new THREE.Vector3(0, 0, 0) };
const MONITOR_SCREEN2_CFG: ExtraCfg = { url: "/models/mancave_monitor_screen2.glb", fix: [0, 0, 0], scale: 1, position: new THREE.Vector3(0, 0, 0) };
const MONITOR_SCREEN3_CFG: ExtraCfg = { url: "/models/mancave_monitor_screen3.glb", fix: [0, 0, 0], scale: 1, position: new THREE.Vector3(0, 0, 0) };
// Duplikat von Cube.016, direkt darüber — Objekt-Transform trug den Versatz
// (nicht die Vertex-Daten wie bei den anderen drei), macht aber keinen
// Unterschied fürs Rendering: der glTF-Node-Transform wird beim Laden ganz
// normal mit angewendet, ebenfalls position/fix [0,0,0].
// User: Stufe-4-Monitor (das in Blender +0.354 nach oben versetzte Duplikat
// von Cube.016) hängt sichtbar leicht deplatziert — ein paar Zentimeter
// tiefer geschoben (position.y statt der bisherigen [0,0,0], da die echte
// Weltposition sonst komplett aus den Vertex-Daten kommt).
const MONITOR_SCREEN4_CFG: ExtraCfg = { url: "/models/mancave_monitor_screen4.glb", fix: [0, 0, 0], scale: 1, position: new THREE.Vector3(0, -0.02, 0) };

/**
 * Schreibtischstuhl (Stufen 1-4): der alte Katalog hat nur 3 Modelle
 * (stuhl_buero/stuhl_gaming/stuhl_racing, Lücke bei Stufe 2) — Stufe 1 und 2
 * sehen deshalb ABSICHTLICH gleich aus (dasselbe Modell, `chair_office.glb`),
 * bis es ein echtes Zwischenstufen-Asset gibt — vom User bestätigt beobachtet,
 * kein Bug. Alle drei GLBs sind bereits boden-verankert UND horizontal
 * zentriert (min.y≈0, center.x/z≈0, per Node/three.js-Messscript geprüft) —
 * `fix` braucht daher kaum Korrektur.
 *
 * `rotationY=Math.PI` (180°) für alle vier Stufen nach User-Feedback ergänzt
 * — vorher unrotiert (Annahme war, Fehlausrichtung falle hier kaum auf, da
 * die Kamera quasi im Stuhl sitzt; laut User war sie doch sichtbar falsch).
 */
// User-Wunsch (nach Einführung von chair_premium als neue Stufe 4): die
// bisherige Stufe 4 (chair_racing) auf Stufe 3, die bisherige Stufe 3
// (chair_gaming) auf Stufe 2 — Konfigurationen 1:1 mitgenommen, nur die
// Stufen-Zuordnung verschoben, keine Werte neu berechnet.
const STUHL_TIER_MODELS: Record<number, TierModelCfg> = {
  // User-Wunsch: durch den echten, einfachen Bürostuhl aus der
  // Referenzszene ersetzt ("Plane.002" Sitz/Lehne + "Cylinder.001" Fuß/
  // Säule, zusammen als "chair_simple_reference.glb" extrahiert — dabei
  // zusätzlich aus dem Haupt-Raum-Export ausgeschlossen, um Dopplung zu
  // vermeiden, mancave_room.glb neu exportiert). Direkt aus der Szene
  // extrahiert (Location war [0,0,0] bei Plane.002, Weltposition steckt in
  // den Vertex-Daten) — `fix = -STUHL_POS` hebt den von SwappableProp
  // addierten `position`-Prop auf, exakt wie bei mancave_pc_reference.glb.
  1: { url: "/models/chair_simple_reference.glb", fix: [-0.367, 0, 0.921], scale: 1 },
  // War Stufe 3: Rückenlehnen-Massepivot sitzt nah an EYE nach der 180°-
  // Drehung (siehe Git-Historie) — `offset` schiebt sie weiter weg, ohne
  // STUHL_POS anzufassen. User zusätzlich verkleinert + 90° im Uhrzeigersinn
  // (negative Y-Rotation) gedreht — macht netto π - π/2 = π/2.
  2: { url: "/models/chair_gaming.glb", fix: [0, -0.009, 0], scale: 0.85, rotationY: Math.PI / 2, offset: [-0.3, 0, 0.15] },
  // War Stufe 4: geometrisch vermessen (avgFaceNormal) — Rückenlehne zeigt
  // bereits unrotiert nach lokal +X ("weg vom Tisch"), daher ursprünglich
  // keine Drehung. User: 90° gegen den Uhrzeigersinn, danach nochmal
  // zusätzlich ~15° in dieselbe Richtung nachjustiert (macht netto π/2+π/12
  // = 7π/12). Sitzkissen ("Cube.043") und beide Rückenlehnen-Kissen wirkten
  // im Spiel "halbiert" — Ursache: inkonsistente/invertierte Normalen auf
  // diesen Meshes, Three.js rendert per Default nur die Vorderseite
  // (FrontSide), Blenders Viewport hatte "Backface Culling" dort aus und
  // zeigte die Kissen deshalb fälschlich komplett. `doubleSided` erzwingt
  // beidseitiges Rendering als Fix, ohne die Original-Datei neu exportieren
  // zu müssen.
  3: { url: "/models/chair_racing.glb", fix: [0, 0, 0], scale: 1, rotationY: 7 * Math.PI / 12, doubleSided: true },
  // Neue Stufe 4: hochwertigeres Modell aus
  // "3DAssetsRoom/GamingChair_CG_Trader.blend" (31 Objekte, per Collection
  // extrahiert, als "chair_premium.glb" exportiert). In Blender direkt
  // INNERHALB der echten Raumszene geprüft (Screenshot) — stand dort bereits
  // unrotiert korrekt zum Tisch hin ausgerichtet. User jetzt trotzdem
  // zusätzlich 90° gegen den Uhrzeigersinn gedreht.
  4: { url: "/models/chair_premium.glb", fix: [-0.045, -0.001, 0.033], scale: 1, rotationY: Math.PI / 2 },
};
// "Plane.002" (Material "chair", Rückenlehne) aus der Referenzszene entfernt
// — X/Z hier übernommen, Y auf Bodenhöhe (0) gesetzt (Boden-verankerte Modelle).
const STUHL_POS = new THREE.Vector3(0.367, 0, -0.921);

/**
 * Pokal-/Abzeichen-Möbel — vormals das Katalog-Upgrade "Pokalregal" (Stufen
 * 1-4, siehe Git-Historie für die alte SwappableProp-Variante). Auf
 * User-Wunsch entfernt: Wanderpokale/Event-Pokale/Abzeichen werden
 * UNABHÄNGIG vom Mancave-Ausbau erspielt (Events, Voice-Zeit, Turniere...),
 * ein Coin-Upgrade hätte sie in einem frischen Raum unsichtbar gemacht.
 * Jetzt drei fest verankerte, immer sichtbare Möbelstücke statt einem
 * tier-geschalteten Slot — je eins pro Trophäen-Gruppe:
 *
 *  - Wanderpokale (12 feste Scopes, siehe wanderpocal.ts, max. 1 Halter
 *    je Scope) -> "pokalregal.glb", das GRÖSSERE der beiden Regal-Modelle
 *    (fix/scale 1:1 von der früheren Stufe 3 übernommen, an ihrem bereits
 *    geprüften Wandplatz) — soll laut User hervorstechen/größer wirken als
 *    die Event-Pokale.
 *  - Event-Pokale (`Pokal`-Modell, unbegrenzte Stückzahl pro User, 6
 *    Kategorien) -> "event_pokal_regal.glb", NEU aus der Referenzszene
 *    extrahiert (siehe unten) statt dem alten flachen "regal_buecher.glb".
 *  - Abzeichen (25 feste System-Badges + admin-vergebene Custom-Badges,
 *    unbegrenzt) -> "vitrine_pokal.glb" (Glasvitrine, vormals Stufe 4).
 *
 * "event_pokal_regal.glb": Ursprünglich "Cube.020"+"Cube.021" — zwei
 * gestapelte, VORNE OFFENE Würfel-Regale (per Flächen-Normalen-Messung
 * bestätigt: 8 kleine Facetten pro Würfel bilden eine echte Nische, keine
 * geschlossene Box), nativ an der Wand VOR der Kamera montiert (neben den
 * Monitoren, Öffnung Richtung Raum). User-Wunsch: stattdessen an der Wand
 * HINTER der Kamera zeigen (mehr Fläche für die potenziell große Sammlung
 * an Event-Pokalen, aus dem Sichtfeld der Monitore raus). Dafür in Blender
 * dupliziert (Originale Cube.020/021 unangetastet), pro Würfel um 180° um
 * die eigene Bbox-Mitte gedreht (kehrt die Öffnungsrichtung von -X auf +X
 * um — nach der Messung bestätigt: die vormals bei -X liegenden Klein-
 * facetten sitzen danach bei +X) und gemeinsam an die gegenüberliegende
 * Wand (Blender-X von 1.398 auf -1.329, Blender-Y so verschoben, dass die
 * Mitte auf Blender-Y≈0.95 bzw. gltf-Z≈EYE.z=-0.95 liegt, "direkt hinter
 * der Kamera") verschoben, dann zu einem Objekt gejoint und exportiert.
 * Weltposition steckt komplett in den Vertex-Daten (wie Nanoleaf/LED-
 * Strips) — daher fix=[0,0,0], position=[0,0,0].
 */
// Beide Kreuz-Regale gleichmäßig über die komplette nutzbare Wandbreite
// verteilt (User-Wunsch), statt Regal 1 auf seiner alten Position zu lassen
// und Regal 2 nur danebenzuquetschen. Wandbreite per Vertex-Scan der
// Referenzszene gemessen (Raumschale-Eckpunkte nahe dieser Wand: X von
// -1.315 bis 1.265, Breite 2.58m) — bei zwei Regalen à 1.005m Breite ergibt
// das 3 gleich große Lücken (Rand/Mitte/Rand) von je 0.19m.
const WANDERPOKAL_REGAL_POS = new THREE.Vector3(0.57, 1.755, 0.886);
const WANDERPOKAL_REGAL_CFG: ExtraCfg = { url: "/models/pokalregal.glb", fix: [0, 0.217, 0.001], scale: 0.885, position: WANDERPOKAL_REGAL_POS };

// Zweites Kreuz-Regal (User-Wunsch: 6 Kategorie-Wanderpokale ins erste, 6
// Genre-Wanderpokale in dieses zweite) — dasselbe Modell, unrotiert auf
// derselben Wand wie Regal 1, links davon (siehe Kommentar oben zur
// gleichmäßigen Verteilung).
const WANDERPOKAL_REGAL_2_POS = new THREE.Vector3(-0.62, 1.755, 0.886);
const WANDERPOKAL_REGAL_2_CFG: ExtraCfg = { url: "/models/pokalregal.glb", fix: [0, 0.217, 0.001], scale: 0.885, position: WANDERPOKAL_REGAL_2_POS };

const EVENT_POKAL_REGAL_CFG: ExtraCfg = { url: "/models/event_pokal_regal.glb", fix: [0, 0, 0], scale: 1, position: new THREE.Vector3(0, 0, 0) };

// Vitrine (Abzeichen): erste Platzierung (unter dem Wanderpokal-Regal) per
// Bbox-Abgleich mit der wieder geladenen Referenzszene verworfen — dort
// steht die Couch (Cube.008 + Kissen/Griffe), die Vitrine hätte
// hindurchgeclippt. Stattdessen an dieselbe Wand wie das Event-Pokal-Regal
// gestellt (Blender-X=-1.329="MC_Wall_West", also bündig an der Wand),
// auf Höhe des Event-Pokal-Regals darüber (Blender-Y≈0.95 bzw. gltf-Z≈
// EYE.z=-0.95) — dort per Bbox-Scan bestätigt komplett frei (nur Wand,
// Boden, Teppich). Reale Maße frisch aus dem exportierten glTF nachgemessen
// (Frame-Objekt, Blender Z-up): Breite 0.508m, Tiefe 0.888m, Höhe 0.683m,
// bereits boden-verankert (min.z=0) und in X/Y zentriert — bei fix=[0,0,0]
// wandert daher `scale`*0.229 in X und `scale`*0.4 in Z vom Anker nach
// beiden Seiten. Alle 6 "Glass"-Teile sind Seitenscheiben + 2 interne
// Fachböden (keine "Vorderseite" nötig, die Vitrine ist rundum
// durchsichtig) — Rotation bleibt deshalb unkritisch.
const ABZEICHEN_VITRINE_POS = new THREE.Vector3(-1.1, 0, -0.95);
const ABZEICHEN_VITRINE_CFG: ExtraCfg = { url: "/models/vitrine_pokal.glb", fix: [0, 0, 0], scale: 0.9, position: ABZEICHEN_VITRINE_POS };

/**
 * Abzeichen-Pins in der Vitrine — echte Innen-Maße nachgemessen (nicht nur
 * die äußere Frame-Bbox): 2 dünne Glas-Fachböden ("Glass1" bei lokal Z≈0.66,
 * "Glass2" bei Z≈0.35, beide NICHT randvoll über die volle Breite — eher
 * dekorative Zwischenböden als tragende Fächer). Ergibt 2 sinnvoll nutzbare
 * Ebenen (Boden bis Glass2, Glass2 bis Glass1; der Rest bis zum Deckel ist
 * mit nur 0.02m zu knapp). Pro Ebene ein 3×2-Raster (3 Spalten Breite, 2
 * Reihen Tiefe) = 12 Plätze — mit 3 statt 4 Spalten bewusst mehr Abstand
 * zwischen den Pins gelassen, sonst würden sich die Namens-Labels
 * (`AbzeichenPin`) zwischen benachbarten Spalten überlappen. Reale Maße
 * unbestätigt bzgl. Lesbarkeit im Spiel — wie üblich nach Live-Check ggf.
 * nachjustieren.
 */
const ABZEICHEN_GRID_COLS_X = [-0.15, 0, 0.15]; // lokal, Breite
const ABZEICHEN_GRID_ROWS_Z = [-0.22, 0.22]; // lokal, Tiefe
const ABZEICHEN_TIERS_Y = [0.05, 0.39]; // lokal, Boden-Ebene / Ebene auf Glass2
const ABZEICHEN_MAX_VISIBLE = ABZEICHEN_GRID_COLS_X.length * ABZEICHEN_GRID_ROWS_Z.length * ABZEICHEN_TIERS_Y.length;

function abzeichenSlotPos(index: number): THREE.Vector3 | null {
  const perTier = ABZEICHEN_GRID_COLS_X.length * ABZEICHEN_GRID_ROWS_Z.length;
  const tier = Math.floor(index / perTier);
  if (tier >= ABZEICHEN_TIERS_Y.length) return null;
  const withinTier = index % perTier;
  const col = withinTier % ABZEICHEN_GRID_COLS_X.length;
  const row = Math.floor(withinTier / ABZEICHEN_GRID_COLS_X.length);
  return new THREE.Vector3(
    ABZEICHEN_VITRINE_POS.x + 0.9 * ABZEICHEN_GRID_COLS_X[col],
    ABZEICHEN_VITRINE_POS.y + 0.9 * ABZEICHEN_TIERS_Y[tier],
    ABZEICHEN_VITRINE_POS.z + 0.9 * ABZEICHEN_GRID_ROWS_Z[row],
  );
}

// Dieselbe Farbpalette wie die geprüfte Vorschau (siehe Chat) — deterministisch
// per Badge-Key gewählt (kein Kategorie-Feld in MancaveBadge verfügbar),
// damit ein Abzeichen bei jedem Neuladen dieselbe Farbe behält.
const ABZEICHEN_COLORS = ["#f04444", "#ed4a99", "#2dd4bf", "#3b82f6", "#22c55e", "#a855f7", "#fbbf24", "#e5e7eb"];
function abzeichenColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return ABZEICHEN_COLORS[hash % ABZEICHEN_COLORS.length];
}

function AbzeichenPin({ badgeKey, name, position }: { badgeKey: string; name: string; position: THREE.Vector3 }) {
  const color = useMemo(() => abzeichenColor(badgeKey), [badgeKey]);
  return (
    <group position={position}>
      {/* detail=0 (nicht 1!) ist die eckige Basis-Ikosaeder-Form mit nur 20
          Facetten, genau wie in der per Blender geprüften Vorschau
          (subdivisions=1 dort entspricht three.js' detail=0) — detail=1
          unterteilt einmal zusätzlich und wirkt dadurch rund/glatt statt
          facettiert (User-Feedback: "Edelsteine sehen nicht toll aus").
          Roughness hoch + wenig Emission, sonst verschluckt ein greller
          Glanzpunkt in der Mitte die Facettenkanten komplett. */}
      <mesh scale={[0.045, 0.025, 0.045]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.1} emissive={color} emissiveIntensity={0.12} flatShading />
      </mesh>
      {/* 1.3cm Schriftgröße war im Raum praktisch unlesbar (~1.7m
          Kameraabstand zur Vitrine) — deutlich vergrößert. */}
      <Text position={[0, -0.045, 0]} fontSize={0.022} color="#fde68a" anchorX="center" anchorY="top"
        maxWidth={0.14} textAlign="center" outlineWidth={0.0018} outlineColor="#050810">
        {name}
      </Text>
    </group>
  );
}

/**
 * Einzelne Pokal-Modelle auf den beiden Regalen — nur was der User TATSÄCHLICH
 * besitzt wird gerendert (User-Wunsch: leere Sockel bleiben leer, keine
 * generischen Platzhalter für unbesetzte Wanderpokal-Scopes).
 *
 * WANDERPOKAL_MODELS: pro Scope-Value ein Modell + individueller fix/scale
 * (jedes Quell-Asset hat einen komplett anderen nativen Maßstab, per
 * Blender-Messscript auf eine einheitliche reale Ziel-Höhe von ~0.18m
 * umgerechnet). "racing" -> Rocket-League-Cup, "community" -> T20-Pokal
 * (User-Wunsch, thematisch bewusst beliebig), alle anderen 10 Scopes teilen
 * sich vorerst den dezimierten Gold-Pokal (824k -> 41k Polys) als
 * Platzhalter, bis es mehr eigene Modelle gibt.
 *
 * WANDERPOKAL_SLOTS: Erster Versuch nahm fälschlich 4 durchgehende, flache
 * Ablage-Bretter an (Flächen-Scan fand vier Höhen-Bänder, aber ohne nach
 * X zu clustern) — tatsächlich ist "pokalregal.glb" ein WÜRFEL-FACH-REGAL
 * in Kreuzform mit genau 7 einzelnen, geschlossenen Fächern (per Ortho-
 * Ansicht ausgezählt und live bestätigt: 1 oben, 4 in der Mitte, 2 unten),
 * nicht 12 freie Plätze auf offenen Brettern — daher hatte ein Pokal über
 * dem Regal geschwebt (Slot lag in Wirklichkeit auf halber Höhe ZWISCHEN
 * zwei Fach-Ebenen) und ein anderer im Fach überlappt.
 *
 * Jeder der 7 Fach-Mittelpunkte wurde per Flächen-Scan einzeln vermessen
 * (Boden-Fläche je Fach, nicht mehr pauschal pro Zeile) und mit derselben
 * Formel wie beim Regal selbst in Weltkoordinaten umgerechnet: world =
 * WANDERPOKAL_REGAL_POS + 0.885 * (regal-fix + lokale Fach-Koordinate).
 *
 * User-Wunsch statt "7 reichen nicht für 12": ZWEI Kreuz-Regale — eins nur
 * für die 6 Kategorie-Scopes (WANDERPOKAL_REGAL_CFG, unveränderte Position),
 * eins nur für die 6 Genre-Scopes (WANDERPOKAL_REGAL_2_CFG, um 90° gedreht
 * an der Westwand). Jedes Regal nutzt 6 seiner 7 Fächer, je 1 bleibt leer.
 * Slot-Koordinaten fürs zweite Regal: dieselben lokalen Fach-Offsets wie
 * beim ersten, aber nach der 90°-Drehung wird aus dem X-Offset (Spalte)
 * ein Z-Offset (Regal 2 hängt an der Wand, deren Normale in X-Richtung
 * zeigt statt in Z-Richtung) — der Tiefen-Offset (~0, war Welt-Z beim
 * ersten Regal) wird zum neuen, praktisch konstanten X-Offset.
 */
const WANDERPOKAL_MODELS: Record<string, { url: string; fix: [number, number, number]; scale: number }> = {
  racing:    { url: "/models/wanderpokal_rennlegende.glb",    fix: [0, 0, 0], scale: 0.6294 },
  community: { url: "/models/wanderpokal_communitystar.glb",  fix: [0.0062, -6.371, 0.0656], scale: 0.0471 },
};
const WANDERPOKAL_MODEL_DEFAULT = { url: "/models/wanderpokal_generic.glb", fix: [0, 0, 0] as [number, number, number], scale: 0.01637 };

const WANDERPOKAL_SLOTS: Record<string, THREE.Vector3> = {
  // ── Regal 1 (Kategorie-Wanderpokale, Zentrum X=0.57) ──────────────────
  // Reihe 1 (oben, 1 Fach, Welt-Y≈2.327)
  special:          new THREE.Vector3(0.696, 2.327, 0.887),
  // Reihe 2 (Mitte, 4 Fächer, Welt-Y≈1.832)
  competitive:      new THREE.Vector3(0.193, 1.832, 0.887),
  fun:              new THREE.Vector3(0.444, 1.832, 0.887),
  casual:           new THREE.Vector3(0.696, 1.832, 0.887),
  training:         new THREE.Vector3(0.947, 1.832, 0.887),
  // Reihe 3 (unten, 2 Fächer, Welt-Y≈1.595) — 1 Fach bleibt leer
  community_event:  new THREE.Vector3(0.444, 1.595, 0.887),

  // ── Regal 2 (Genre-Wanderpokale, Zentrum X=-0.62) ─────────────────────
  // Reihe 1 (oben, 1 Fach, Welt-Y≈2.327)
  community:  new THREE.Vector3(-0.494, 2.327, 0.887),
  // Reihe 2 (Mitte, 4 Fächer, Welt-Y≈1.832)
  racing:     new THREE.Vector3(-0.997, 1.832, 0.887),
  arcade:     new THREE.Vector3(-0.746, 1.832, 0.887),
  beat_em_up: new THREE.Vector3(-0.494, 1.832, 0.887),
  sport:      new THREE.Vector3(-0.243, 1.832, 0.887),
  // Reihe 3 (unten, 2 Fächer, Welt-Y≈1.595) — 1 Fach bleibt leer
  shooter:    new THREE.Vector3(-0.746, 1.595, 0.887),
};

function WanderpokalTrophy({ scopeValue, position }: { scopeValue: string; position: THREE.Vector3 }) {
  const cfg = WANDERPOKAL_MODELS[scopeValue] ?? WANDERPOKAL_MODEL_DEFAULT;
  const { scene } = useGLTF(cfg.url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return (
    <group position={position}>
      <group scale={cfg.scale}>
        <primitive object={cloned} position={cfg.fix} />
      </group>
    </group>
  );
}
for (const scope of Object.keys(WANDERPOKAL_SLOTS)) useGLTF.preload(WANDERPOKAL_MODELS[scope]?.url ?? WANDERPOKAL_MODEL_DEFAULT.url);

/**
 * Event-Pokale: 6 Kategorie-Modelle (je ein individuell eingefärbter
 * Edelstein am Sockel, siehe event_pokal_*.glb), pro Kategorie bis zu 3
 * Stück sichtbar gestapelt (User-Wunsch), Rest nur als "+N"-Zahl.
 *
 * Slot-Achsen abgeleitet aus den beiden ECHTEN, offenen Fächern von
 * "event_pokal_regal.glb" (per Vertex-Scan vermessen, zwei sauber
 * getrennte 0.368m-Würfel-Nischen): World-X = Tiefe (hintere Wand bei
 * -1.329 -> Öffnung bei -0.961) = Stapel-Achse, World-Z = Wandlänge =
 * Kategorie-Achse, World-Y = welche Nische (untere/obere).
 *
 * Zweites Würfelregal (User-Wunsch) — ein bisher ungenutztes, zweites
 * Cube.020/021-Paar, das noch STATISCH im Referenzszenen-Export
 * (`mancave_room.glb`) hing (an der Wand hinter den Monitoren, ohne jede
 * Funktion) — mit derselben Spiegel-Technik wie das erste an dieselbe Wand
 * verschoben, um MEHR Stellfläche für dieselben 6 Kategorien zu bieten
 * statt neue Kategorien abzudecken — pro Kategorie jetzt 2 Fächer (Regal 1
 * + Regal 2) x 3 Stapel-Plätze = 6 statt 3 sichtbar.
 *
 * Danach auf User-Wunsch nochmal angepasst: Regal 2 näher an Regal 1
 * herangerückt (Welt-Z von 0.3 auf -0.15, per Bbox-Scan als noch
 * kollisionsfrei bestätigt) UND die diagonale Staffel-Richtung der beiden
 * Würfel gespiegelt, damit Regal 2 wie ein Spiegelbild von Regal 1 wirkt
 * (obere Nische lehnt jetzt zu Regal 1 hin) statt in dieselbe Richtung wie
 * Regal 1 zu staffeln. WICHTIG: nur die lokale Tiefen-Achse (Blender-Y,
 * entlang der Wand) gespiegelt, NICHT die Öffnungs-Achse (Blender-X) — ein
 * reiner Achsen-Mirror kehrt sonst die Flächen-Normalen um (Mesh wirkt von
 * innen nach außen), deshalb nach dem Spiegeln explizit die Normalen
 * neu ausgerichtet (`bpy.ops.mesh.flip_normals`). Die einzelnen Pokal-
 * Modelle selbst bekommen dabei KEINE Rotation (User-Wunsch: "ohne die
 * Slots zu drehen") — sie werden ohnehin unabhängig vom Regal an festen
 * Weltpositionen gerendert, nie an die Regal-Transform gekoppelt.
 */
const EVENT_POKAL_REGAL_2_CFG: ExtraCfg = { url: "/models/event_pokal_regal_2.glb", fix: [0, 0, 0], scale: 1, position: new THREE.Vector3(0, 0, 0) };
const EVENT_POKAL_SCALE = 0.0373;
const EVENT_POKAL_FIX: [number, number, number] = [0, 0, 0];
const EVENT_POKAL_STACK_X = [-1.289, -1.145, -1.001]; // hinten -> vorne, pro Fach
/**
 * WICHTIG: die beiden Würfel pro Regal sind NICHT einfach "gleiche Fläche,
 * andere Höhe" — in der Referenzszene stehen sie WIRKLICH diagonal versetzt
 * (0.368m sowohl in der Höhe ALS AUCH in der Tiefe entlang der Wand). Ein
 * früherer "Fix" hatte diesen Versatz versehentlich entfernt (beide Würfel
 * auf dieselbe Grundfläche projiziert) — sah dadurch wie ein einzelner
 * hoher Kasten mit Zwischenboden aus statt wie zwei gestaffelte Nischen
 * (User-Feedback: "seltsam ineinander verschoben"). Jetzt: Würfel-Paar
 * VOR der Spiegelung/Verschiebung gejoint (nicht einzeln transformiert),
 * damit ihr natürlicher Versatz automatisch erhalten bleibt — jede Nische
 * hat daher ihr EIGENES Welt-Z-Zentrum, nicht ein gemeinsames pro Regal.
 */
const EVENT_POKAL_CATEGORY_SLOTS: Record<string, { z: number; y: number }[]> = {
  competitive:      [{ z: -1.278, y: 1.652 }, { z: -0.110, y: 1.652 }], // Regal 1 untere Nische, Regal 2 untere Nische
  fun:              [{ z: -1.134, y: 1.652 }, { z:  0.034, y: 1.652 }],
  casual:           [{ z: -0.990, y: 1.652 }, { z:  0.178, y: 1.652 }],
  training:         [{ z: -0.910, y: 1.903 }, { z: -0.478, y: 1.903 }], // Regal 1 obere Nische, Regal 2 obere Nische
  community_event:  [{ z: -0.766, y: 1.903 }, { z: -0.334, y: 1.903 }],
  special:          [{ z: -0.622, y: 1.903 }, { z: -0.190, y: 1.903 }],
};
const EVENT_POKAL_MAX_VISIBLE = EVENT_POKAL_STACK_X.length * 2;

function EventPokalStack({ category, count }: { category: string; count: number }) {
  const slots = EVENT_POKAL_CATEGORY_SLOTS[category];
  const url = `/models/event_pokal_${category}.glb`;
  const { scene } = useGLTF(url);
  const visible = Math.min(count, EVENT_POKAL_MAX_VISIBLE);
  // Jede sichtbare Kopie braucht ein eigenes Object3D (kann nicht dieselbe
  // Instanz an mehreren Positionen im Szenengraph teilen) — ein einzelnes
  // useMemo für alle statt eins pro map()-Durchlauf (Hooks dürfen nicht
  // bedingt/in Callbacks aufgerufen werden).
  const clones = useMemo(
    () => Array.from({ length: EVENT_POKAL_MAX_VISIBLE }, () => scene.clone(true)),
    [scene],
  );
  if (!slots || count === 0) return null;
  const positions = slots.flatMap(slot => EVENT_POKAL_STACK_X.map(x => [x, slot.y, slot.z] as const));
  const last = positions[visible - 1];
  return (
    <>
      {positions.slice(0, visible).map((pos, i) => (
        <group key={i} position={[pos[0], pos[1], pos[2]]}>
          <group scale={EVENT_POKAL_SCALE}>
            <primitive object={clones[i]} position={EVENT_POKAL_FIX} />
          </group>
        </group>
      ))}
      {count > visible && (
        <Html position={[last[0] + 0.06, last[1] + 0.05, last[2]]} center>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold text-amber-200"
            style={{ background: "rgba(4,10,9,0.8)", border: "1px solid rgba(245,158,11,0.4)" }}>
            +{count - visible}
          </span>
        </Html>
      )}
    </>
  );
}
for (const cat of Object.keys(EVENT_POKAL_CATEGORY_SLOTS)) useGLTF.preload(`/models/event_pokal_${cat}.glb`);

/**
 * Unsichtbare Klick-/Hover-Fläche für die Pokal-Möbel (Regale + Vitrine) —
 * User-Wunsch: keine permanent sichtbaren Buttons mehr, stattdessen ein
 * auffälliger Hover-Effekt (halbtransparente Glow-Box über dem echten
 * Möbel) plus ein Schriftzug, der der Maus folgt (nicht 3D-verankert im
 * Raum, sondern echtes 2D-Tooltip über `clientX`/`clientY`, siehe
 * `onHoverChange` in MancaveScene3D — ein <Html center>-Label würde nur an
 * EINER festen Stelle im Raum kleben, nicht mit dem Cursor mitwandern).
 * Die Box selbst ist die Klick-/Hover-Zielfläche (deutlich einfacher &
 * zuverlässiger zu treffen als die echte, verschachtelte Fach-Geometrie).
 */
// Radial-Gradient-Textur fürs Glow-Sprite, einmalig per Canvas erzeugt und
// gecacht (statt pro Hotspot neu zu bauen) — RoundedBox-Stapel vorher hatten
// trotz Verrundung an den GEOMETRIE-Kanten einen harten Opazitäts-Sprung
// (User-Feedback: "noch zu kantig"), weil die Fläche selbst gleichmäßig
// eingefärbt war. Ein kamera-zugewandtes Sprite mit echtem Radialverlauf
// (weiß -> amber -> transparent) gibt einen wirklich weichen Rand, ganz
// ohne Postprocessing-Bloom-Setup. `document` nur lazy beim ersten Hover
// anfassen, nicht auf Modulebene — läuft sonst beim SSR-Rendern der
// Client-Komponente ins Leere (kein `document` auf dem Server).
let glowTexture: THREE.Texture | null = null;
function getGlowTexture(): THREE.Texture | null {
  if (glowTexture) return glowTexture;
  if (typeof document === "undefined") return null;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.3, "rgba(251,191,36,0.85)");
  gradient.addColorStop(0.65, "rgba(245,158,11,0.32)");
  gradient.addColorStop(1, "rgba(245,158,11,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  glowTexture = new THREE.CanvasTexture(canvas);
  return glowTexture;
}

/** Sanft pulsierendes, kamera-zugewandtes Glow-Sprite (weicher Radialverlauf). */
function GlowSprite({ size }: { size: [number, number, number] }) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const tex = useMemo(() => getGlowTexture(), []);
  // `sprite.scale` ist ein Weltmeter-Maß, keine relative Größe — der erste
  // Versuch (Max aller 3 Seiten * 1.35) machte den Glow bei der Vitrine
  // (0.9m Tiefe im Hitbox-Maß) über 1.2m breit, sichtbar riesig gegenüber
  // der ~0.5m großen Vitrine (User-Feedback: "Hover-Effekt nicht gelungen").
  // Jetzt nur Breite/Höhe gemittelt (Tiefe fließt bewusst nicht ein — die
  // Hitbox ist oft tiefer als das sichtbare Möbel breit/hoch ist) und
  // deutlich kleinerer Faktor, damit der Glow ungefähr die Silhouette des
  // Möbels trifft statt sie zu verschlucken.
  const baseScale = ((size[0] + size[1]) / 2) * 0.6;
  useFrame(({ clock }) => {
    if (!spriteRef.current) return;
    const wave = Math.sin(clock.elapsedTime * 2.2);
    const s = baseScale * (1 + 0.09 * wave);
    spriteRef.current.scale.set(s, s, 1);
    const mat = spriteRef.current.material as THREE.SpriteMaterial;
    mat.opacity = 0.62 + 0.18 * wave;
  });
  if (!tex) return null;
  return (
    <sprite ref={spriteRef} scale={[baseScale, baseScale, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
}

function ShelfHotspot({ label, center, size, onOpen, onHoverChange }: {
  label: string; center: [number, number, number]; size: [number, number, number];
  onOpen: () => void; onHoverChange: (label: string | null, clientX: number, clientY: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <group position={center}>
      {/* Unsichtbare Box als eigentliche Klick-/Hover-Zielfläche, komplett
          getrennt vom rein visuellen Glow-Sprite unten. */}
      <mesh
        onPointerOver={e => { e.stopPropagation(); setHovered(true); onHoverChange(label, e.clientX, e.clientY); }}
        onPointerMove={e => { e.stopPropagation(); onHoverChange(label, e.clientX, e.clientY); }}
        onPointerOut={e => { e.stopPropagation(); setHovered(false); onHoverChange(null, e.clientX, e.clientY); }}
        onClick={e => { e.stopPropagation(); onOpen(); }}>
        <boxGeometry args={size} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {hovered && <GlowSprite size={size} />}
    </group>
  );
}

/**
 * Zusatzobjekte (Stufe 0-4, siehe mancave-items.ts EXTRA_ITEMS + "teppich"-
 * artige Fälle): anders als die Slots oben haben diese noch keine echten
 * Stufen-Modelle — EIN Modell erscheint einfach, sobald Stufe > 0 (statt
 * Stufe 0 = "nicht besessen" = unsichtbar). Zwei Untergruppen:
 *
 * (a) `nanoleaf` und `deskmat` waren ORIGINAL Teil der Referenzszene
 * (die 21 "Circle.*"-Nanoleaf-Panels bzw. "Plane.001", der Mousepad) — beide
 * per Blender MCP in eigene kleine GLBs exportiert (`mancave_nanoleaf.glb`,
 * `mancave_deskmat.glb`) und aus dem Haupt-Export entfernt, damit sie sich
 * unabhängig ein-/ausblenden lassen. WICHTIG: beide Objekte hatten in Blender
 * `location=(0,0,0)` — ihre tatsächliche Weltposition steckt bereits in den
 * Vertex-Daten selbst (geprüft, nicht angenommen) — sie werden daher OHNE
 * zusätzlichen `position`-Offset gerendert (position=[0,0,0] entspricht
 * "genau da, wo sie ursprünglich in der Referenzszene standen").
 *
 * (b) `headset`, `webcam`, `couchtisch` existieren NICHT in der
 * Referenzszene und haben auch keine passenden Katalog-Assets für
 * "couchtisch" (im alten Katalog gab es dieses Möbelstück gar nicht) — hier
 * wird auf bestehende Gaming-Zimmer-GLBs zurückgegriffen (webcam/headset
 * passen thematisch, "tisch_lang.glb"/Konsolentisch als bester verfügbarer
 * Ersatz für einen Couchtisch, stark herunterskaliert). Positionen sind
 * VERMUTUNGEN ohne Bounding-Box-Abgleich mit der Szene — deutlich
 * unsicherer als alles andere in dieser Datei, ausdrücklich als
 * Platzhalter markiert, bis eine Sichtprüfung stattgefunden hat.
 */
interface ExtraCfg {
  url: string; fix: [number, number, number]; scale: number; position: THREE.Vector3;
  rotationY?: number;
  /** Für "flach hinlegen" o.ä. — X/Z-Achsen-Rotation, selten gebraucht (die meisten Assets stehen aufrecht). */
  rotationX?: number; rotationZ?: number;
}

function ExtraProp({ tier, cfg }: { tier: number; cfg: ExtraCfg }) {
  const { scene } = useGLTF(cfg.url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  if (tier <= 0) return null;
  return (
    <group position={cfg.position} rotation={[cfg.rotationX ?? 0, cfg.rotationY ?? 0, cfg.rotationZ ?? 0]}>
      <group scale={cfg.scale}>
        <primitive object={cloned} position={cfg.fix} />
      </group>
    </group>
  );
}

/**
 * Katalogpunkt "Beleuchtung" (vormals nur "Nanoleaf-Beleuchtung", jetzt
 * umbenannt — deckt jetzt 4 kumulative Stufen ab, jede fügt ein zusätzliches
 * Leuchtmittel hinzu, nichts wird beim Hochstufen entfernt):
 * Stufe 1: "Blitz"-Neonschild (Referenzszene: "NurbsPath", stand vorher IMMER
 *   im Raum — jetzt aus mancave_room.glb ausgeschlossen und tier-gesteuert).
 * Stufe 2: Nanoleaf-Dreieckspanels über dem Monitor ("Circle" – "Circle.008").
 * Stufe 3: Nanoleaf-Panels ("Circle.011"–"Circle.022"). Ursprünglich an der
 *   Wand hinter Fenster/Poster — überlappte nach Einführung des Kreuz-Regals
 *   (Kategorie-Wanderpokale) mit dessen linker Fach-Spalte. Per Parent-
 *   Clear-Technik (wie beim Event-Pokal-Regal) an "MC_Wall_North" verschoben
 *   (die Wand hinter dem Monitor-Setup, gegenüber der ursprünglichen Wand) —
 *   180°-Spiegelung nötig, da beide Wände parallel, aber die Panel-
 *   Vorderseite von der jeweils EIGENEN Wand weg zeigen muss. X-Position auf
 *   der neuen Wand per Bbox-Scan als frei bestätigt (links vom Schreibtisch-
 *   Stuhl/Monitor-Cluster, die einzigen Objekte in diesem Höhenbereich).
 * Stufe 4: LED-Lightstrips, die vorher standardmäßig im Raum standen
 *   ("Cube.022"–"Cube.025", "Cube.027"–"Cube.033" — "Cube.026" bewusst
 *   ausgenommen, bleibt fest im Raum-Mesh). Alle vier direkt aus der
 *   Referenzszene extrahiert, Weltposition steckt bereits in den
 *   Vertex-Daten (wie Nanoleaf/Deskmat/Couchtisch) — daher fix=[0,0,0].
 */
const BLITZ_CFG: ExtraCfg = { url: "/models/blitz.glb", fix: [0, 0, 0], scale: 1, position: new THREE.Vector3(0, 0, 0) };
const NANOLEAF_MONITOR_CFG: ExtraCfg = { url: "/models/nanoleaf_monitor.glb", fix: [0, 0, 0], scale: 1, position: new THREE.Vector3(0, 0, 0) };
const NANOLEAF_WALL_CFG: ExtraCfg = { url: "/models/nanoleaf_wall.glb", fix: [0, 0, 0], scale: 1, position: new THREE.Vector3(0, 0, 0) };
const LED_STRIPS_CFG: ExtraCfg = { url: "/models/led_lightstrips.glb", fix: [0, 0, 0], scale: 1, position: new THREE.Vector3(0, 0, 0) };
// Weltpositions-Anker für die zugehörigen echten Lichtquellen — NICHT die
// Bbox-Mitte des ganzen Objekts (kann bei dünnen Wandpanels mitten in der
// Wand oder am Montage-Rand liegen), sondern die tatsächliche leuchtende
// Vorderfläche (Blender-Bbox der Vorderseite, in gltf-Koordinaten
// umgerechnet: gltf.x=blender.x, gltf.y=blender.z, gltf.z=-blender.y),
// zusätzlich ~3cm Richtung Raum vorgezogen, damit das Licht nicht in der
// Wandgeometrie selbst sitzt. Farben ebenfalls direkt aus den echten
// Blender-Material-Emissionswerten übernommen (Principled-BSDF "Emission
// Color", linear->sRGB umgerechnet), nicht geschätzt:
// - Blitz ("NurbsPath", Material "RGB3"): Emission (0.384, 0, 1) -> #a700ff
// - Nanoleaf (beide Gruppen, Materialien "RGB"/"RGB2"/"RGB3" im Wechsel
//   pro Panel): Mittelwert der drei Emissionsfarben -> #7714ff
const BLITZ_LIGHT_POS = new THREE.Vector3(1.225, 1.141, 0.454);
const NANOLEAF_MONITOR_LIGHT_POS = new THREE.Vector3(1.2255, 1.795, -0.772);
const NANOLEAF_WALL_LIGHT_POS = new THREE.Vector3(-0.7, 1.419, -1.614);
const LED_STRIPS_LIGHT_POS = new THREE.Vector3(0.083, 1.178, -0.333);
const DESKMAT_CFG: ExtraCfg = { url: "/models/mancave_deskmat.glb", fix: [0, 0, 0], scale: 1, position: new THREE.Vector3(0, 0, 0) };
// Webcam: die 180°-Drehung aus der letzten Runde war falsch (User-Screenshot
// bestätigt weiterhin verkehrt) — diesmal per avgFaceNormal-Messscript
// (wie beim Monitor/Stuhl) statt geraten: die kleine "Blue"-Linse (das mit
// Abstand kleinste, farblich abgesetzte Mesh — eindeutig die Linse) zeigt
// UNROTIERT nach lokal +Z. Objektiv soll zum Nutzer zeigen (Richtung EYE),
// von der Webcam-Position aus grob -X — rotationY=-90° dreht lokal +Z genau
// dahin (rotationY(θ) bildet lokal (0,0,1) auf Welt (sinθ,0,cosθ) ab; bei
// θ=-90°: (-1,0,0)). Position zusätzlich abgesenkt — die alte Höhe (1.38)
// saß laut Screenshot deutlich über der echten Bildschirm-Oberkante
// (mancave_monitor_screen1.glb: Y bis 1.244, aus der Roh-glTF gemessen).
const WEBCAM_CFG: ExtraCfg = { url: "/models/webcam.glb", fix: [0, 0, 0], scale: 1, position: new THREE.Vector3(1.215, 1.25, -0.7), rotationY: -Math.PI / 2 };
// Headset: flach auf den Tisch legen. Modell steht laut Messscript aufrecht
// (min.y=0, max.y=0.24, Fußabdruck ±0.106 in X/Z) — 90°-Drehung um Z legt es
// um. VORZEICHENFEHLER in `fix.y` aus der letzten Runde gefunden und
// korrigiert: nach der Rotationsmatrix für 90°-Z gilt world_x=-local_y,
// world_y=local_x (nicht wie ich zuerst annahm world_x=local_y). Mit
// fix.y=+0.12 lag der lokale Y-Bereich nach dem Verschieben bei [0.12,0.36]
// statt zentriert bei [-0.12,0.12] — das Headset landete dadurch komplett
// einseitig verschoben (rund 2× seines eigenen halben Fußabdrucks) statt
// mittig auf `position`, was die falsche Position in JEDER bisherigen Runde
// erklärt. fix.y=-0.12 zentriert den Bereich korrekt auf 0.
//
// Position: entlang der BLENDER-Y-Achse (= gltf Z, da gltf.z = -blender.y)
// aufgereiht. Mit Maus getauscht (jetzt hinten, Z=-1.3), 180°-Drehung
// (rotationY, oben auf die bestehende liegende rotationZ-Drehung) und etwas
// größer (scale 0.45→0.55).
//
// X-Korrektur (User: "vordere Tischkante" = die Kante, vor der der Stuhl
// steht, nicht das Z-Ende, das ich zuletzt verschoben hatte): per Blender-
// Geometrie bestätigt — STUHL_POS liegt viel näher an der X-min-Kante des
// Tisches (Abstand 0.27) als an beiden Z-Enden (Abstand ~0.7-0.79 zu
// beiden) — die "vordere Kante" ist X≈0.639, nicht eine Z-Grenze. Der
// vorherige Z-Shift war deshalb die falsche Achse; zurückgesetzt, X place
// stattdessen von 0.95 auf 0.78 gesenkt (näher an die Stuhl-Kante).
const HEADSET_CFG: ExtraCfg = { url: "/models/headset_gaming.glb", fix: [0.106, -0.12, 0], scale: 0.55, position: new THREE.Vector3(0.78, 0.818, -1.3), rotationY: Math.PI, rotationZ: Math.PI / 2 };

/**
 * Tastatur/Maus-Stufen: `tastatur`/`maus` sind Grundausstattung mit 4
 * kaufbaren Stufen im Katalog (mancave-items.ts), zeigten bisher aber NIE
 * etwas anderes als das feste Referenzszenen-Objekt ("Cylinder.002"/
 * "Cylinder", auf dem Tisch), egal welche Stufe gekauft wurde — reiner
 * Wirtschafts-Slot ohne visuelle Wirkung. Jetzt: Stufe 1 bleibt das feste
 * Szenen-Objekt (kostenlos, keine neue Geometrie nötig), ab Stufe 2 blendet
 * `RoomModel` es aus (siehe `tastaturTier`/`mausTier`-Props dort) und
 * `ExtraProp` mit `tier - 1` zeigt stattdessen das jeweils neue Modell —
 * einziges verfügbares Ersatz-Modell pro Slot, Stufe 2/3/4 teilen es sich
 * (dieselbe Lücken-Konvention wie bei Stuhl/Regal weiter oben).
 *
 * GEFUNDENER ROOT-BUG (User meldete: "ändert sich nicht" bei Tastatur,
 * "komplett unsichtbar" bei Maus, obwohl Stufe 2 im Ausbau-Panel bestätigt
 * war): meine `fix`/`scale`-Werte kamen bisher aus den ROHEN glTF-Accessor-
 * min/max — die ignorieren aber jeden Node-Transform (Translation/Rotation/
 * Skalierung), der im Root-Node des Assets selbst gesetzt ist. Per direktem
 * JSON-Dump von keyboard_mech.glb bestätigt: der Root-Node "Aluminium" trägt
 * Translation≈(-3.4,2.5,-1.9), eine ~104°-Rotation UND Scale=4.58 — alles
 * unsichtbar für die Roh-Accessor-Messung. Dasselbe (kleiner) bei
 * mouse_gaming.glb. Fix: per echtem GLTFLoader.parse() geladen (wie der
 * Browser es tut, inkl. `updateMatrixWorld`) und die TATSÄCHLICHE
 * transformierte Bounding Box gemessen — DAS ist die korrekte Referenz für
 * `fix`/`scale`, nicht die Roh-Accessor-Werte.
 *
 * keyboard_mech.glb war noch schlimmer als "nur" der Node-Transform: der
 * Root-Node "Aluminium" trug zusätzlich eine ~104°-Rotation, die das Modell
 * in der Szene sichtbar SCHIEF aussehen ließ (User-Screenshot: Tastatur lag
 * diagonal verdreht). Per Blender-Screenshot bestätigt: es ist geometrisch
 * eine ganz normale, flache Tastatur — nur mit einem beliebigen Gier-Winkel
 * aus der Ursprungsszene exportiert, kein "kaputtes" Modell. In Blender
 * bereinigt (Rotation/Skalierung/Position auf 0/1/0 gesetzt, `Apply
 * Transform` auf alle 18 Teilobjekte, sodass die Geometrie jetzt selbst
 * exakt achsenparallel und zentriert ist) und als eigene, saubere Datei neu
 * exportiert: "keyboard_mech_fixed.glb". Bbox danach (Blender, garantiert
 * ohne versteckten Node-Transform): X 0-1.683, Z(Höhe) -0.112 bis 0.067,
 * Y(Tiefe) -0.673 bis 0.001 → gltf X 0-1.683/Y -0.112-0.067/Z -0.001-0.673.
 * scale=0.24 bringt die Breite auf ~0.4 (realistische Tastaturbreite), Höhe
 * dann ~0.043 und Tiefe ~0.16 — beides jetzt plausible Tastatur-Maße (anders
 * als beim vorherigen, verdrehten Bbox-Messversuch, wo die Proportionen
 * (0.253 hoch, 1.793 tief) gar nicht zu einer Tastatur passten — genau das
 * Warnzeichen, das ich beim ersten Versuch übersehen hatte).
 */
// Position auf Tischmitte (X=0.95, Cube.001-Bbox 0.639-1.264) statt am linken
// Rand — lässt symmetrisch Platz für Headset links und Maus rechts (siehe
// deren Kommentare).
//
// rotationY: User-Feedback nach mehreren Screenshots — Datei/Rotation war
// (mehrfach verifiziert: frischer Blender-Reimport UND direkter Test mit
// genau dem GLTFLoader, den der Browser nutzt) tatsächlich exakt Identität,
// die "Verdrehung" lag also nicht an der Tastatur selbst, sondern daran, dass
// sie relativ zur (offenbar nicht global-achsenparallelen) Tischplatte falsch
// ausgerichtet war. User-Anweisung: 90° im Uhrzeigersinn drehen, damit sie
// richtig zum Nutzer hin auf dem Tisch liegt — in Three.js' Konvention ist
// "im Uhrzeigersinn von oben betrachtet" eine NEGATIVE Y-Rotation.
// Z zurückgesetzt auf -0.91 (falsche Achse letzte Runde, siehe HEADSET_CFG-
// Kommentar), X stattdessen von 0.95 auf 0.78 gesenkt — näher an die Kante,
// vor der der Stuhl steht.
const TASTATUR_UPGRADE_CFG: ExtraCfg = { url: "/models/keyboard_mech_fixed.glb", fix: [-0.8415, 0.112, -0.336], scale: 0.24, position: new THREE.Vector3(0.78, 0.818, -0.91), rotationY: -Math.PI / 2 };
// mouse_gaming.glb: nach korrekter (transformierter) Messung bereits winzig
// und fast perfekt zentriert (Bbox size≈0.12×0.039×0.082, min.y≈0,
// center.x/z≈0) — die vorherigen Roh-Maße (~2×1×2, "absurd groß") waren
// komplett falsch, dadurch war scale=0.045/0.07 draufmultipliziert eine
// mikroskopische, unsichtbare Größe (0.07×0.12=0.0084 Einheiten!). Root-Node-
// Rotation ist laut Blender Identität — aber wie bei der Tastatur ändert das
// nichts daran, dass sie relativ zur Tischplatte trotzdem falsch ausgerichtet
// war (User-Feedback: "falsch gedreht" für beide zusammen). Gleiche 90°-
// Uhrzeiger-Korrektur wie bei der Tastatur angewendet.
// Position mit Headset getauscht (jetzt vorne statt hinten, Z=-0.5), plus
// weitere +90° Rotation oben auf die bestehende -90° drauf (macht netto 0,
// also lokale Ausgangsausrichtung). X von 0.95 auf 0.78 gesenkt, gleiche
// Begründung wie bei Tastatur/Headset (Stuhl-Kante, nicht Z-Ende).
// +180° weitere Drehung (User-Wunsch), macht netto rotationY=π.
const MAUS_UPGRADE_CFG: ExtraCfg = { url: "/models/mouse_gaming.glb", fix: [0, 0, 0], scale: 0.85, position: new THREE.Vector3(0.78, 0.818, -0.5), rotationY: Math.PI };
// Couchtisch: User-Hinweis — "Cube.014" in der Referenzszene (Glasplatte,
// Materialien "Pc glass"+"Material", Größe 0.641×0.528×0.334, nahe der
// Couch) ist bereits ein passender Couchtisch, stilecht statt eines fremden
// Katalog-Ersatzmodells. Als eigenes kleines GLB extrahiert
// ("mancave_couchtisch.glb") und aus dem Haupt-Raum-Export entfernt, genau
// wie Nanoleaf/Deskmat — `location=(0,0,0)` in Blender bestätigt (Weltposition
// steckt in den Vertex-Daten selbst), daher position/fix beide [0,0,0].
const COUCHTISCH_CFG: ExtraCfg = { url: "/models/mancave_couchtisch.glb", fix: [0, 0, 0], scale: 1, position: new THREE.Vector3(0, 0, 0) };

/**
 * Neue Desk-Extras (Stream Deck / Mikrofon / Ringlicht) — bereits im Projekt
 * vorhandene, bisher ungenutzte Kataloggmodelle, ergänzen den Katalog um
 * komplett neue Slots statt bestehende zu befüllen. Wie Headset/Webcam/
 * Couchtisch/Deskmat: nur EIN Modell pro Slot (Stufe 1-4 wirtschaftlich,
 * aber optisch nur "an/aus", gleiche Konvention).
 *
 * Bbox aller drei per echtem GLTFLoader.parse() gemessen (nicht rohe
 * Accessor-Werte, siehe TASTATUR_UPGRADE_CFG-Kommentar für die Falle dabei).
 */
// streamdeck.glb: bereits plausible Weltmaß-Größe (0.245×0.112×0.253),
// scale=1. In Blender einzeln geprüft (Screenshot): liegt in seiner eigenen
// Datei bereits korrekt flach auf einer Fläche — braucht also, GENAU wie die
// Tastatur, dieselbe 90°-Korrektur zur (nicht achsenparallelen) Tischplatte
// dieser Szene, nicht weil das Modell selbst falsch ist. Auf dem Tisch,
// rechts von der Tastatur/Maus-Reihe (X≈0.78), gleiche Tiefe wie die Tastatur.
// User: "muss noch etwas weiter gedreht werden" — zusätzliche 45° in
// dieselbe Richtung drauf (macht netto -135°/-3π/4). Reines Erfahrungswert-
// Nachjustieren, da (anders als bei der Tastatur) kein exakter Soll-Winkel
// bekannt ist.
const STREAMDECK_CFG: ExtraCfg = { url: "/models/streamdeck.glb", fix: [0.1298, 0.2546, -0.0884], scale: 1, position: new THREE.Vector3(1.0, 0.818, -0.9), rotationY: -3 * Math.PI / 4 };
// ringlicht.glb: User-Wunsch (dritter Anlauf) — auf dem Tisch hinter den 4
// Monitoren, so dass der Ring oben über sie hinausschaut, statt bodenstehend
// (was weder "riesig vor der Kamera" noch "winzig am Boden" gut aussah).
// Monitor-Stapel-Bbox direkt vermessen (Cube.015/Cube.016/Cube.002, die 3
// unteren der 4 kumulativen Bildschirme): Top bei Blender-Z≈1.558, der 4.
// Bildschirm (Duplikat von Cube.016, +0.354 versetzt) schiebt das auf
// ~1.9 gltf-Y. Fußpunkt jetzt auf der Tischfläche (Y=0.818) statt am Boden,
// scale auf 0.75 erhöht (Ringlicht-Oberkante dann bei 0.818+0.75×1.6≈2.0,
// klar über dem Monitor-Stapel, noch unter der Decke bei 2.6), Position
// hinter den Monitoren (deren Z-Bereich bis -1.54 reicht, also Z=-1.55).
// User (4. Anlauf): Ständer kreuzte den linken Monitor (stand zu weit LINKS
// im Monitor-X-Bereich statt hinter der ganzen Gruppe) und der Ring war
// nicht zur Kamera ausgerichtet. X auf die Monitor-Mitte (~1.22) zentriert,
// Z ans Ende der Tischfläche geschoben (-1.6, nahe der Tischkante bei
// -1.636) für maximalen "hinter den Monitoren"-Effekt. rotationY ergänzt —
// dieselbe -90°-Korrektur, die Tastatur/Stream Deck/Mikrofon auf diesem
// (nicht achsenparallelen) Tisch schon brauchten, jetzt auch hier versucht.
const RINGLICHT_CFG: ExtraCfg = { url: "/models/ringlicht.glb", fix: [0, 0, -0.0194], scale: 0.75, position: new THREE.Vector3(1.17, 0.818, -1.53), rotationY: Math.PI / 2 };
// Weltposition des echten Leucht-Rings (NICHT die Bbox-Mitte des ganzen
// Modells inkl. Stativ/Sockel): per Three.js-Objektgraph exakt nachgebaut
// (gleiche Verschachtelung wie ExtraProp: outer-position -> outer-rotationY
// -> scale-group -> primitive-fix) und die Bbox NUR des Meshes mit dem
// leuchtenden Material ("Mat.1_1.001", KHR_materials_emissive_strength=10)
// vermessen — Mittelpunkt dieser Bbox in Weltkoordinaten. Farbe direkt aus
// dessen Emission Color (1, 0.89, 0.069) linear->sRGB umgerechnet.
const RINGLICHT_LIGHT_POS = new THREE.Vector3(1.196, 1.873, -1.514);

/**
 * PS5-Controller — aus der externen Datei "3DAssetsRoom/ps5.controller.blend"
 * extrahiert (Collection "Dualsense controller PS5", 11 Mesh-Teile + 1
 * Boden-Plane ausgeschlossen), als eigenes "ps5_controller.glb" exportiert.
 * Bereits realistische Weltmaß-Größe (Root-Objekt-Rotation/Skalierung war
 * Identität, kein Tastatur-Bug hier) — `fix` zentriert nur X/Z und hebt Y auf
 * die Unterseite.
 *
 * Position: User-Wunsch — auf dem Couchtisch statt auf dem Schreibtisch.
 * "Cube.014" (Couchtisch, siehe COUCHTISCH_CFG) direkt in Blender vermessen:
 * Oberseite bei Y=0.370, Mittelpunkt X=-0.7825/Z=-0.2155.
 */
const PS5_CONTROLLER_CFG: ExtraCfg = { url: "/models/ps5_controller.glb", fix: [0.01415, 0.0123, 0.06455], scale: 1, position: new THREE.Vector3(-0.7825, 0.37, -0.2155) };

for (const m of [
  ...Object.values(PC_TIER_MODELS),
  ...Object.values(STUHL_TIER_MODELS),
  BLITZ_CFG, NANOLEAF_MONITOR_CFG, NANOLEAF_WALL_CFG, LED_STRIPS_CFG,
  DESKMAT_CFG, WEBCAM_CFG, HEADSET_CFG, COUCHTISCH_CFG, TASTATUR_UPGRADE_CFG, MAUS_UPGRADE_CFG,
  STREAMDECK_CFG, RINGLICHT_CFG, PS5_CONTROLLER_CFG,
  WANDERPOKAL_REGAL_CFG, EVENT_POKAL_REGAL_CFG, ABZEICHEN_VITRINE_CFG,
  MONITOR_SCREEN1_CFG, MONITOR_SCREEN2_CFG, MONITOR_SCREEN3_CFG, MONITOR_SCREEN4_CFG,
]) useGLTF.preload(m.url);
// Nanoleaf-Dreieck-Panels über dem Schreibtisch (Mittelpunkt aller 21
// "Circle.*"-Meshes, nachgemessen) — Anker für den Pokale-Hotspot.
const SHELF_POS = new THREE.Vector3(0.19, 1.56, -0.11);
// Teppich-Fläche der Referenzszene ("Plane", Material "Carpet") — Boden-
// Mittelpunkt, aus Blender übernommen (Zentrum [-0.347,0.669,0.05], Größe
// [1.755,1.755,0]) und umgerechnet; y auf 0 gesetzt (Bodenhöhe), der Radius
// entspricht der halben gemessenen Kantenlänge.
const RUG_POS = new THREE.Vector3(-0.347, 0, -0.669);
const RUG_RADIUS = 0.88;

/**
 * Ersetzt die Referenz-Teppichfläche durch den echten runden OMA-Logo-
 * Teppich (User-Wunsch) — gleiche visuelle Bauweise wie `LogoRug` im echten
 * Gaming-Zimmer (`FurniturePrimitive.tsx`: flacher Zylinder + Logo-Kreis
 * obendrauf), hier direkt nachgebaut statt `FurniturePrimitive` zu
 * importieren (das ist an das Grid-Koordinatensystem des alten Zimmers
 * gekoppelt, hier reicht die reine Geometrie).
 */
function LogoRugStatic() {
  const logo = useTexture("/brand/logo-512.png");
  return (
    // rotationY=+Math.PI/2: 90° gegen den Uhrzeigersinn von oben betrachtet
    // (three.js rechtshändige Rotation um +Y = Gegenuhrzeigersinn aus der
    // Vogelperspektive) — User-Wunsch, nur für das Logo-Bild sichtbar
    // relevant (der Zylinder selbst ist rotationssymmetrisch).
    <group position={RUG_POS} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0.035, 0]} receiveShadow>
        <cylinderGeometry args={[RUG_RADIUS, RUG_RADIUS, 0.03, 48]} />
        <meshStandardMaterial color="#3ee6c4" emissive="#3ee6c4" emissiveIntensity={0.1} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.053, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[RUG_RADIUS * 0.6, 48]} />
        <meshStandardMaterial map={logo} transparent roughness={0.75} />
      </mesh>
    </group>
  );
}

/**
 * Boden/Wand-Fotomaterial je Zimmerstufe (`surfaceTier`, aus
 * `computeSurfaceTier` in mancave-items.ts — Durchschnitt aller Objekt-
 * Stufen). Die Referenzszene hatte Boden+Wand+Decke bisher als EIN Mesh
 * ("Cube", der Raumschale) mit EINEM Material — per Blender MCP nach
 * Flächennormalen in drei eigene Materialien aufgeteilt (`MC_Floor`,
 * `MC_Wall`, `MC_Ceiling`, unverändert am Mesh selbst, nur neue Material-
 * Zuweisung pro Fläche), damit sich Boden und Wand hier zur Laufzeit
 * unabhängig per Textur-Austausch umschalten lassen, ohne 4×4 Raum-
 * Varianten aus Blender exportieren zu müssen. Die Decke bleibt bewusst
 * unverändert (kein separates Deckenbild angefordert).
 *
 * Die vier Foto-Texturen pro Fläche (siehe public/mancave-textures/) sind
 * KI-generiert (Canva `generate-design`, desktop_wallpaper), nicht
 * garantiert nahtlos kachelbar — deshalb ohne RepeatWrapping-Vervielfachung
 * eingesetzt (das vorhandene UV-Mapping der Szene entscheidet, wie oft es
 * sich wiederholt; ungeprüft, ob das nahtlos wirkt oder sichtbare Kacheln zeigt).
 */
const FLOOR_TEXTURES = ["/mancave-textures/floor_tier1.jpg", "/mancave-textures/floor_tier2.jpg", "/mancave-textures/floor_tier3.jpg", "/mancave-textures/floor_tier4.jpg"];
const WALL_TEXTURES = ["/mancave-textures/wall_tier1.jpg", "/mancave-textures/wall_tier2.jpg", "/mancave-textures/wall_tier3.jpg", "/mancave-textures/wall_tier4.jpg"];
for (const url of [...FLOOR_TEXTURES, ...WALL_TEXTURES]) useTexture.preload(url);

/**
 * Schreibtisch-Politur je Stufe — bewusst NUR Material/Farbe, KEIN
 * Modell-Tausch (User-Entscheidung: Tisch ist der Anker, an dem PC/Monitor/
 * Stuhl/Ausbau-Hotspot alle relativ positioniert sind — ein echter Tausch
 * würde jede Position neu kalibrieren). Behält die vorhandene Rauheits-
 * Textur ("MC_Desk", Kopie von "Material.001" samt der früheren Politur-
 * Textur) bei — nur `color` ändert sich.
 *
 * Stufe 4 hatte ursprünglich einen leichten Teal-Emissive-Akzent
 * (emissiveIntensity 0.12) — das rendert laut User komplett satt teal statt
 * eines dezenten Glanzes (vermutlich verstärkt emissive+Bloom/Tonemapping in
 * dieser Szene deutlich stärker als erwartet). Entfernt, um die Fehlerklasse
 * ganz auszuschließen — stattdessen deutlich kräftigere, klar unterscheidbare
 * Grundfarben je Stufe (User wollte ohnehin auffälligere Unterschiede).
 */
const DESK_TIER_STYLES = [
  { color: "#3a2a1f" },
  { color: "#8a6a4a" },
  { color: "#5a1a1a" },
  { color: "#2a2d33" }, // User: Stufe 4 etwas heller — war #0a0a0d (fast schwarz)
];

function RoomModel({ surfaceTier, deskTier, tastaturTier, mausTier }: { surfaceTier: number; deskTier: number; tastaturTier: number; mausTier: number }) {
  const { scene } = useGLTF(ROOM_MODEL_URL);
  const idx = Math.min(4, Math.max(1, surfaceTier)) - 1;
  const deskIdx = Math.min(4, Math.max(1, deskTier)) - 1;
  const floorTex = useTexture(FLOOR_TEXTURES[idx]);
  const wallTex = useTexture(WALL_TEXTURES[idx]);
  /* eslint-disable react-hooks/immutability -- geladene Three.js-Textur/Material-
     Objekte direkt zu konfigurieren (colorSpace, map, needsUpdate) ist normales
     three.js-API-Verhalten, keine React-Hook-Wert-Mutation. */
  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    floorTex.colorSpace = THREE.SRGBColorSpace;
    wallTex.colorSpace = THREE.SRGBColorSpace;
    const deskStyle = DESK_TIER_STYLES[deskIdx];
    clone.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (!(mat instanceof THREE.MeshStandardMaterial)) continue;
        // .color bleibt aus der Blender-Vorlage ("Material.001") ein sehr
        // dunkler Grauton (#3c3c3f, ~24% Helligkeit) — der stammt aus einer
        // früheren, komplett anderen Politur-Session (Specular-Blowout-Fix)
        // und multipliziert sich mit JEDER Textur, die hier hineinkommt.
        // Per Laufzeit-Debug bestätigt: das Foto WURDE korrekt zugewiesen,
        // sah aber bei jeder Stufe fast schwarz aus — genau der gemeldete
        // "hier ändert sich nichts"-Bug. Farbe auf Weiß zurücksetzen, damit
        // die Foto-Textur ungedimmt durchkommt.
        if (mat.name === "MC_Floor") { mat.map = floorTex; mat.color.set(0xffffff); mat.needsUpdate = true; }
        if (mat.name === "MC_Wall") { mat.map = wallTex; mat.color.set(0xffffff); mat.needsUpdate = true; }
        if (mat.name === "MC_Desk") {
          mat.color.set(deskStyle.color);
          mat.emissive.set(0x000000);
          mat.emissiveIntensity = 0;
          mat.needsUpdate = true;
        }
      }
    });
    // Feste Tastatur/Maus aus der Referenzszene ("Cylinder.002"/"Cylinder",
    // per Raycast auf der Tischfläche identifiziert) ausblenden, sobald der
    // jeweilige Katalog-Slot auf Stufe 2+ hochgestuft wurde — dann übernimmt
    // das echte Tausch-Modell (TASTATUR_UPGRADE_CFG/MAUS_UPGRADE_CFG) an
    // derselben Stelle. Per Name statt Entfernen aus dem Export, damit Stufe 1
    // (Grundausstattung, kein Kauf nötig) weiter die vorhandene Geometrie nutzt.
    //
    // GEFUNDENER BUG (User-Screenshot: alte Tastatur blieb trotz "Stufe 2"
    // sichtbar): three.js' GLTFLoader sanitisiert Node-Namen beim Laden über
    // `PropertyBinding.sanitizeNodeName` (wegen der Animation-Pfad-Syntax,
    // die Punkte als Trenner nutzt) — reservierte Zeichen sind `[ ] . : /`
    // (siehe node_modules/three/src/animation/PropertyBinding.js,
    // `_RESERVED_CHARS_RE`). "Cylinder.002" aus dem glTF-JSON wird beim Laden
    // dadurch zu "Cylinder002" (Punkt entfernt) — meine Suche nach dem
    // Original-Namen mit Punkt fand deshalb NIE etwas, `if (kb)` schluckte
    // das Fehlschlagen still, ohne Fehler. "Cylinder" (kein Punkt) war davon
    // nicht betroffen, daher hat das Maus-Verstecken nie das gleiche Symptom
    // gezeigt.
    if (tastaturTier >= 2) {
      const kb = clone.getObjectByName("Cylinder002");
      if (kb) kb.visible = false;
    }
    if (mausTier >= 2) {
      const mouse = clone.getObjectByName("Cylinder");
      if (mouse) mouse.visible = false;
    }
    return clone;
  }, [scene, floorTex, wallTex, deskIdx, tastaturTier, mausTier]);
  /* eslint-enable react-hooks/immutability */
  return <primitive object={cloned} />;
}

// Die Referenzszene war ein offenes Eck-Diorama: von den 4 Wänden existierten
// in Blender nur 2 als echte Geometrie ("Cube", per bmesh-Flächen-Scan
// bestätigt: Wandfläche nur bei X=1.292 und Y=-0.978, an X=-1.329/Y=1.644 nur
// hauchdünne Kanten-Fragmente). Zwei Versuche, das zur Laufzeit mit einer
// prozeduralen Box zu kaschieren, scheiterten sichtbar (zu nah = blockiert
// die Kamera, zu weit + unbeleuchtet = schwarzer Keil im Bild) — sauberer
// Fix stattdessen direkt in Blender: zwei neue, exakt an die vorhandene
// Bounding Box anschließende Wandflächen ("MC_Wall_West" bei X=-1.329,
// "MC_Wall_North" bei Y=1.644, per bpy.ops.export_scene.gltf(use_selection)
// separat exportiert) schließen den Raum jetzt bündig — per Raycast aus der
// Kameraposition in alle 4 Richtungen bestätigt (kein offener Blick mehr).
function WallExtensions({ surfaceTier }: { surfaceTier: number }) {
  const { scene } = useGLTF("/models/mancave_wall_extension.glb");
  const idx = Math.min(4, Math.max(1, surfaceTier)) - 1;
  const wallTex = useTexture(WALL_TEXTURES[idx]);
  /* eslint-disable react-hooks/immutability -- s.o., Textur-colorSpace/Material
     direkt setzen ist normales three.js-API-Verhalten. */
  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    wallTex.colorSpace = THREE.SRGBColorSpace;
    clone.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (mat instanceof THREE.MeshStandardMaterial && mat.name === "MC_Wall") {
          mat.map = wallTex;
          mat.color.set(0xffffff);
          mat.needsUpdate = true;
        }
      }
    });
    return clone;
  }, [scene, wallTex]);
  /* eslint-enable react-hooks/immutability */
  return <primitive object={cloned} />;
}

// Decke fehlte komplett (Raycast nach oben traf vorher nichts) — schaute man
// hoch, sah man ins Nichts. Genau wie die Wände: einfache, an die Bounding
// Box angeschlossene Fläche, direkt in Blender erzeugt und separat
// exportiert. Kein Stufen-Textur-Wechsel nötig (Decke bleibt optisch
// neutral/dunkel über alle Stufen) — Material ist bereits fest im Export.
function Ceiling() {
  const { scene } = useGLTF("/models/mancave_ceiling.glb");
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} />;
}

// Fenster-Öffnung: ursprünglich nur ein "Trick" (Foto-Ebene flach vor die
// massive, echte Wand gestellt — die Wand hatte nie ein echtes Loch, siehe
// Git-Historie dieser Datei für die alten Kommentare zu diesem Umweg). Jetzt
// stattdessen ein ECHTES rechteckiges Loch direkt in "Cube" geschnitten
// (Blender Boolean-Modifier, per Raycast vor/nach bestätigt: Fensterbereich
// offen, Umgebung weiterhin massiv) und `mancave_room.glb` neu exportiert.
//
// Position/Größe zusätzlich verschoben (User-Screenshot: alte Position bei
// Z=1.5 überlappte Couch-Rückenlehne UND Nanoleaf-Wandcluster) — per
// Blender-Bounding-Box-Messung freie Zone gefunden: Couch-Rückenlehne endet
// bei Welt-Y=0.774, Nanoleaf-Cluster beginnt ab X>0.1 bei Welt-Y=1.144,
// Regal-Unterkante liegt bei 1.575 → Fenster jetzt bei X=0.7 (rechts vom
// Nanoleaf-Cluster) und Höhe 0.9-1.5 (über der Couch, unter dem Regal).
const WINDOW_POS = new THREE.Vector3(0.7, 1.2, 0.886);
const WINDOW_W = 0.8, WINDOW_H = 0.6;
// Ausblicksfläche (Foto-Backdrop) kann jetzt, da ein echtes Loch existiert,
// wieder weit hinten sitzen (echte Tiefe/Perspektive an den Fensterrändern
// beim Umschauen) statt flach vor der Wand kleben zu müssen.
const WINDOW_VIEW_DISTANCE = 3.4;
const WINDOW_VIEW_TEXTURES = ["/mancave-textures/window_view_tier1.jpg", "/mancave-textures/window_view_tier2.jpg", "/mancave-textures/window_view_tier3.jpg", "/mancave-textures/window_view_tier4.jpg"];
for (const url of WINDOW_VIEW_TEXTURES) useTexture.preload(url);

/** Ausblick: große Fläche weit hinter dem Fenster, texturiert mit dem KI-generierten Stufenbild. */
function WindowView({ surfaceTier }: { surfaceTier: number }) {
  const idx = Math.min(4, Math.max(1, surfaceTier)) - 1;
  const tex = useTexture(WINDOW_VIEW_TEXTURES[idx]);
  /* eslint-disable-next-line react-hooks/immutability -- Textur-colorSpace direkt
     setzen ist normales three.js-API-Verhalten, keine Hook-Wert-Mutation. */
  tex.colorSpace = THREE.SRGBColorSpace;
  return (
    // Weit hinten (WINDOW_VIEW_DISTANCE=3.4) durch das jetzt echte Loch
    // sichtbar — entsprechend groß, damit sie den sichtbaren Ausschnitt aus
    // jedem Blickwinkel innerhalb des Lochs füllt (kein Zuschneiden an den
    // Rändern beim seitlichen Umschauen).
    <mesh position={[WINDOW_POS.x, WINDOW_POS.y, WINDOW_POS.z + WINDOW_VIEW_DISTANCE]}>
      <planeGeometry args={[7, 4.5]} />
      <meshBasicMaterial map={tex} toneMapped={false} fog={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

/**
 * Vordergrund-Geometrie hinter dem (jetzt echten) Fensterloch: echter 3D-Boden
 * zwischen Rahmen und der weit entfernten Foto-Ebene (`WindowView`) — sorgt
 * für echte Tiefe/Perspektive statt nur einer flachen Fläche.
 *
 * Die ursprüngliche Version hatte zusätzlich 2 Gebäude-Boxen seitlich neben
 * der Fenster-Mitte (lokal X=-1.1/+1.3) — die füllten laut User-Screenshot
 * eine komplette Fensterscheibe mit einer flachen Farbfläche (die Boxen
 * waren größer/näher als gedacht und blockierten bei der tatsächlichen
 * Blickgeometrie mehr als beabsichtigt). Entfernt, statt weiter zu raten,
 * ohne live nachprüfen zu können, ob eine kleinere/andere Position wirklich
 * sauber aussieht — der Boden allein liefert schon echte Tiefe, ohne dieses
 * Risiko.
 *
 * WICHTIG: erzeugt keine echte Bewegungsparallaxe (die Kamera rotiert nur,
 * wechselt nie die Position — Parallaxe braucht Translation, siehe
 * `LookAroundRig`s PARALLAX_AMOUNT für den eigentlichen Parallaxe-Fix).
 */
function WindowExterior() {
  // MeshBasicMaterial statt Standard: RoomLightings Punktlichter sind nur für
  // die kleine echte Raumgröße kalibriert und reichen nicht bis hinter das
  // Fensterloch — unbeleuchtetes Standard-Material würde hier (wie zuvor bei
  // der Wand-Hülle) komplett schwarz rendern.
  return (
    <group position={WINDOW_POS}>
      {/* Straße/Gehweg, leicht unterhalb der Fensterhöhe, reicht bis zur Foto-Ebene.
          Bewusst schmal (1.6 statt vorher 4) — genau breit genug für den
          Blick durchs Loch, ohne seitlich in Fensterscheiben hineinzuragen. */}
      <mesh position={[0, -1.15, WINDOW_VIEW_DISTANCE / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.6, WINDOW_VIEW_DISTANCE]} />
        <meshBasicMaterial color="#55585d" fog={false} />
      </mesh>
    </group>
  );
}

/**
 * Fensterrahmen: rein prozedural (kein Foto nötig), 4 Riegel um die Öffnung
 * herum, Stil/Farbe wechselt mit der Zimmerstufe — Stufe 1 dünner rostiger
 * Metallrahmen, Stufe 4 breiter dunkler Rahmen mit leicht leuchtender
 * Teal-Kante (passend zum restlichen Neon-Akzent-Look der Szene).
 */
// Emissive bei Stufe 3/4 entfernt — User meldete: Stufe 4 rendert komplett
// satt teal statt einem dezenten Akzent. Exakt derselbe Bug-Typ wie beim
// Schreibtisch (DESK_TIER_STYLES-Kommentar): diese Szene verstärkt emissive
// Farben (Bloom/Tonemapping) weit über die eingestellte Intensity hinaus.
// Statt Emissive-Glanz jetzt kräftigere Grundfarben für den Stufen-Kontrast.
const WINDOW_FRAME_STYLES = [
  { color: "#6b5a4a", thickness: 0.02, emissive: "#000000", emissiveIntensity: 0 },
  { color: "#c9c4ba", thickness: 0.025, emissive: "#000000", emissiveIntensity: 0 },
  { color: "#2a2e36", thickness: 0.03, emissive: "#000000", emissiveIntensity: 0 },
  { color: "#0e3d38", thickness: 0.035, emissive: "#000000", emissiveIntensity: 0 },
];

function WindowFrame({ surfaceTier }: { surfaceTier: number }) {
  const style = WINDOW_FRAME_STYLES[Math.min(4, Math.max(1, surfaceTier)) - 1];
  const t = style.thickness;
  const mat = (
    <meshStandardMaterial
      color={style.color} roughness={0.5} metalness={0.4}
      emissive={style.emissive} emissiveIntensity={style.emissiveIntensity} toneMapped={false}
    />
  );
  return (
    <group position={WINDOW_POS}>
      <mesh position={[0, WINDOW_H / 2 + t / 2, 0]}><boxGeometry args={[WINDOW_W + t * 2, t, t]} />{mat}</mesh>
      <mesh position={[0, -WINDOW_H / 2 - t / 2, 0]}><boxGeometry args={[WINDOW_W + t * 2, t, t]} />{mat}</mesh>
      <mesh position={[WINDOW_W / 2 + t / 2, 0, 0]}><boxGeometry args={[t, WINDOW_H, t]} />{mat}</mesh>
      <mesh position={[-WINDOW_W / 2 - t / 2, 0, 0]}><boxGeometry args={[t, WINDOW_H, t]} />{mat}</mesh>
      {/* Mittelsprosse */}
      <mesh position={[0, 0, 0]}><boxGeometry args={[WINDOW_W, t * 0.7, t * 0.7]} />{mat}</mesh>
      <mesh position={[0, 0, 0]}><boxGeometry args={[t * 0.7, WINDOW_H, t * 0.7]} />{mat}</mesh>
    </group>
  );
}

function RoomLighting() {
  return (
    <>
      {/* Tisch/Couch/Raumschale ("Material.001") hatten trotz dunkler Grundfarbe
          (0.045) große weißflächige Specular-Highlights: bei Roughness=0.4
          reflektieren nahe Punktlichter auf einer flachen Fläche breit und hart,
          unabhängig von der dunklen Diffusfarbe (Fresnel-Reflexion ist bei
          Nicht-Metallen farbunabhängig). Fix: Rauheits-Textur auf Material.001
          (siehe Blender-Export) + hier zusätzlich etwas weniger und weiter
          entfernte Punktlichter, damit die Highlights nicht mehr ausbrennen. */}
      <ambientLight intensity={0.4} />
      <hemisphereLight args={["#5a7a90", "#141b26", 0.5]} />
      <directionalLight position={[EYE.x - 1, 3.2, EYE.z + 1]} intensity={0.85} color="#fff3df" />
      <pointLight position={[SCREEN_POS.x - 0.3, 1.9, SCREEN_POS.z]} intensity={0.7} color="#2dd4bf" distance={5} decay={2} />
      <pointLight position={[EYE.x, 2.3, EYE.z]} intensity={0.4} color="#ffffff" distance={4.5} decay={2} />
      <pointLight position={[SHELF_POS.x, SHELF_POS.y, SHELF_POS.z]} intensity={0.5} color="#a78bfa" distance={4} decay={2} />
    </>
  );
}

// Wie weit sich das Auge beim Umschauen aus der Sitzposition bewegen darf —
// simuliert ein leichtes Kopf-Neigen/-Drehen (wie eine echte Person, die im
// Stuhl sitzt und den Kopf wendet), NICHT freies Herumlaufen. sin() statt
// linear in yaw/pitch-Delta: bleibt bei jedem Drehwinkel bounded (auch nach
// mehreren vollen Umdrehungen), statt unbegrenzt mit dem Drehwinkel zu wachsen.
const PARALLAX_AMOUNT = 0.055;

/**
 * Freies Umschauen per Drag — Kamera bleibt am festen Sitzplatz, nur die
 * Blickrichtung dreht sich, unbegrenzt in alle Richtungen.
 *
 * Zusätzlich echte (wenn auch kleine) Bewegungsparallaxe: die Augenposition
 * verschiebt sich minimal (± PARALLAX_AMOUNT) mit der aktuellen Blickrichtung
 * relativ zur Ausgangsausrichtung — reine Rotation um einen fixen Punkt kann
 * NIE Parallaxe erzeugen (das bräuchte echte Translation der Kamera), diese
 * kleine gekoppelte Verschiebung schon: nahe Objekte (Monitor, PC) wandern
 * beim Umschauen jetzt sichtbar anders als ferne (Fenster-Ausblick).
 *
 * Die Pointer-Listener hängen bewusst am `<canvas>`-Element (`gl.domElement`),
 * NICHT am äußeren Container-Div: die Html-Hotspot-Buttons (Ausbau/Gadgets/
 * Pokale) werden von drei's `<Html>` als GESCHWISTER-Elemente des Canvas in
 * denselben Container gerendert. Lägen die Listener am Container, würde JEDER
 * Klick — auch auf einen Button — dort `pointerdown` auslösen und
 * `setPointerCapture` aufrufen; laut Pointer-Events-Spec wird dadurch auch
 * das synthetische `click`-Event auf das capture-haltende Element umgeleitet,
 * sodass der Button-`onClick` nie feuert (genau der Bug, der hier gemeldet
 * wurde — Ausbau/Gadgets/Pokale reagierten auf nichts). Am Canvas selbst
 * hängend bekommen die Buttons diese Events gar nicht erst ab.
 */
// Mausrad-Zoom: R3F/three.js Default-FOV ist 75° (kein `fov`-Prop gesetzt).
// Zoomen per FOV statt Kamera-Translation — bleibt konsistent mit dem
// "fixer Sitzplatz, nur Drehen"-Designprinzip hier (EYE bewegt sich nie,
// siehe PARALLAX_AMOUNT-Kommentar), und funktioniert unabhängig davon, wie
// nah/fern das gerade angeschaute Objekt ist (anders als ein Kamera-Dolly,
// der beim Reinzoomen in die Geometrie hineinfahren könnte).
const FOV_DEFAULT = 75;
const FOV_MIN = 25; // stärkster Zoom (z.B. um Text auf dem Monitor zu lesen)
const FOV_MAX = FOV_DEFAULT;

function LookAroundRig() {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0);
  const baseYaw = useRef(0);
  const basePitch = useRef(0);
  const initialized = useRef(false);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const fov = useRef(FOV_DEFAULT);
  const scratchRight = useRef(new THREE.Vector3());
  const scratchPos = useRef(new THREE.Vector3());

  /* eslint-disable react-hooks/immutability -- Three.js-Objekt (R3F `camera`),
     keine React-Hook-Semantik: direktes Mutieren pro Frame ist der von R3F
     selbst dokumentierte Weg, dieselbe Ausnahme wie in RoomStage3D.tsx. */
  useEffect(() => {
    camera.position.copy(EYE);
    camera.up.set(0, 1, 0);
    camera.lookAt(LOOK_TARGET);
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    yaw.current = euler.y;
    pitch.current = euler.x;
    baseYaw.current = euler.y;
    basePitch.current = euler.x;
    camera.rotation.order = "YXZ";
    initialized.current = true;
  }, [camera]);

  useFrame(() => {
    if (!initialized.current) return;
    if (camera instanceof THREE.PerspectiveCamera && camera.fov !== fov.current) {
      camera.fov = fov.current;
      camera.updateProjectionMatrix();
    }
    camera.rotation.set(pitch.current, yaw.current, 0);
    // Rechts-Vektor der AKTUELLEN Blickrichtung (nach dem obigen rotation.set
    // steht camera.quaternion schon auf dem neuen Stand — Object3D hält
    // rotation/quaternion automatisch synchron).
    const right = scratchRight.current.set(1, 0, 0).applyQuaternion(camera.quaternion);
    const yawOffset = Math.sin(yaw.current - baseYaw.current) * PARALLAX_AMOUNT;
    const pitchOffset = Math.sin(pitch.current - basePitch.current) * PARALLAX_AMOUNT * 0.6;
    const pos = scratchPos.current.copy(EYE).addScaledVector(right, yawOffset);
    pos.y -= pitchOffset;
    camera.position.copy(pos);
  });
  /* eslint-enable react-hooks/immutability */

  /* eslint-disable react-hooks/immutability -- gl.domElement ist das reale
     <canvas>-DOM-Element (kein React-verwalteter Zustand); sein .style direkt
     zu setzen ist normales DOM-API-Verhalten, keine Hook-Wert-Mutation. */
  useEffect(() => {
    const el = gl.domElement;
    // touch-action:none NUR hier am Canvas, nicht am äußeren Container (siehe
    // dessen Kommentar unten) — sonst schränkt die CSS-Spec-Regel "Kind-
    // touch-action ist die Schnittmenge mit allen Vorfahren" auch das
    // Scrollen im Ausbau/Gadgets/Pokale-Popup ein, das ja ein Nachfahre
    // desselben Containers ist (genau der gemeldete "nicht scrollbar"-Bug).
    const prevTouchAction = el.style.touchAction;
    el.style.touchAction = "none";
    const onDown = (e: PointerEvent) => { dragging.current = true; last.current = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - last.current.x, dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      yaw.current -= dx * 0.0045;
      pitch.current = Math.min(0.9, Math.max(-0.9, pitch.current - dy * 0.0045));
    };
    const onUp = () => { dragging.current = false; };
    // Mausrad zoomt rein/raus (FOV-basiert, siehe fov-Ref oben). passive:false
    // + preventDefault, sonst scrollt die Seite dahinter mit (Canvas ist kein
    // natives Scroll-Element, bekäme das Wheel-Event sonst nur zur Kenntnis).
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      fov.current = Math.min(FOV_MAX, Math.max(FOV_MIN, fov.current + e.deltaY * 0.04));
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      el.style.touchAction = prevTouchAction;
    };
  }, [gl]);
  /* eslint-enable react-hooks/immutability */

  return null;
}

export default function MancaveScene3D({ data }: { data: MancaveData }) {
  const [panel, setPanel] = useState<MancavePanel>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverTooltip, setHoverTooltip] = useState<{ label: string; x: number; y: number } | null>(null);
  const handleHover = (label: string | null, clientX: number, clientY: number) => {
    if (!label) { setHoverTooltip(null); return; }
    const rect = containerRef.current?.getBoundingClientRect();
    setHoverTooltip({ label, x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) });
  };

  const pokaleByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of data.pokale) counts[p.category] = (counts[p.category] ?? 0) + 1;
    return counts;
  }, [data.pokale]);

  const deskTier = data.items.find(i => i.key === "schreibtisch")?.tier ?? 1;
  const tastaturTier = data.items.find(i => i.key === "tastatur")?.tier ?? 1;
  const mausTier = data.items.find(i => i.key === "maus")?.tier ?? 1;
  const pcTier = data.items.find(i => i.key === "computer")?.tier ?? 1;
  const monitorTier = data.items.find(i => i.key === "monitor")?.tier ?? 1;
  const stuhlTier = data.items.find(i => i.key === "stuhl")?.tier ?? 1;
  const nanoleafTier = data.items.find(i => i.key === "nanoleaf")?.tier ?? 0;
  const deskmatTier = data.items.find(i => i.key === "deskmat")?.tier ?? 0;
  const couchtischTier = data.items.find(i => i.key === "couchtisch")?.tier ?? 0;
  // Streaming-Equipment: EIN Slot, 4 kumulative Stufen (Headset/Webcam/
  // Ringlicht/Stream Deck), siehe mancave-items.ts.
  const streamingTier = data.items.find(i => i.key === "streaming")?.tier ?? 0;
  const ps5ControllerTier = data.items.find(i => i.key === "ps5controller")?.tier ?? 0;

  return (
    <div ref={containerRef}
      // touch-action:none absichtlich NICHT hier (siehe LookAroundRig-
      // Kommentar) — landet stattdessen gezielt nur auf dem Canvas, damit
      // Touch-Scrollen in den Popups (Ausbau/Pokale) funktioniert.
      className="relative w-full h-full overflow-hidden select-none"
      style={{ background: "#050810", cursor: "grab" }}>
      <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true }}>
        <color attach="background" args={["#050810"]} />
        <fog attach="fog" args={["#050810", 5, 11]} />
        <RoomLighting />
        <LookAroundRig />
        <Suspense fallback={null}>
          <WallExtensions surfaceTier={data.surfaceTier} />
          <Ceiling />
          <RoomModel surfaceTier={data.surfaceTier} deskTier={deskTier} tastaturTier={tastaturTier} mausTier={mausTier} />
          <ExtraProp tier={tastaturTier - 1} cfg={TASTATUR_UPGRADE_CFG} />
          <ExtraProp tier={mausTier - 1} cfg={MAUS_UPGRADE_CFG} />
          <WindowFrame surfaceTier={data.surfaceTier} />
          <WindowView surfaceTier={data.surfaceTier} />
          <WindowExterior />
          <LogoRugStatic />
          <SwappableProp tier={pcTier} models={PC_TIER_MODELS} position={PC_POS} />
          {/* Kumulativ ab Stufe 1 die echten Referenz-Bildschirme (siehe
              Kommentar bei MONITOR_SCREEN1_CFG). */}
          <ExtraProp tier={1} cfg={MONITOR_SCREEN1_CFG} />
          <ExtraProp tier={monitorTier >= 2 ? 1 : 0} cfg={MONITOR_SCREEN2_CFG} />
          <ExtraProp tier={monitorTier >= 3 ? 1 : 0} cfg={MONITOR_SCREEN3_CFG} />
          <ExtraProp tier={monitorTier >= 4 ? 1 : 0} cfg={MONITOR_SCREEN4_CFG} />
          <SwappableProp tier={stuhlTier} models={STUHL_TIER_MODELS} position={STUHL_POS} />
          {/* Fest verankertes Pokal-/Abzeichen-Möbel, kein Katalog-Upgrade
              mehr (siehe Kommentar bei WANDERPOKAL_REGAL_CFG). */}
          <ExtraProp tier={1} cfg={WANDERPOKAL_REGAL_CFG} />
          <ExtraProp tier={1} cfg={WANDERPOKAL_REGAL_2_CFG} />
          <ExtraProp tier={1} cfg={EVENT_POKAL_REGAL_CFG} />
          <ExtraProp tier={1} cfg={EVENT_POKAL_REGAL_2_CFG} />
          <ExtraProp tier={1} cfg={ABZEICHEN_VITRINE_CFG} />
          {/* Nur was der User tatsächlich besitzt steht auf dem Regal — leere
              Scopes/Kategorien bleiben unbesetzt (User-Wunsch). */}
          {data.wanderpokale.map(w => {
            const slot = WANDERPOKAL_SLOTS[w.scopeValue];
            return slot ? <WanderpokalTrophy key={w.scopeValue} scopeValue={w.scopeValue} position={slot} /> : null;
          })}
          {Object.keys(EVENT_POKAL_CATEGORY_SLOTS).map(cat => (
            <EventPokalStack key={cat} category={cat} count={pokaleByCategory[cat] ?? 0} />
          ))}
          {data.badges.slice(0, ABZEICHEN_MAX_VISIBLE).map((b, i) => {
            const slot = abzeichenSlotPos(i);
            return slot ? <AbzeichenPin key={b.key} badgeKey={b.key} name={b.name} position={slot} /> : null;
          })}
          {data.badges.length > ABZEICHEN_MAX_VISIBLE && (
            <Html position={[ABZEICHEN_VITRINE_POS.x, ABZEICHEN_VITRINE_POS.y + 0.62, ABZEICHEN_VITRINE_POS.z]} center>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold text-amber-200"
                style={{ background: "rgba(4,10,9,0.8)", border: "1px solid rgba(245,158,11,0.4)" }}>
                +{data.badges.length - ABZEICHEN_MAX_VISIBLE}
              </span>
            </Html>
          )}
          {/* Hover-Zielflächen direkt an den Pokal-Möbeln — kein permanent
              sichtbarer Button mehr (User-Wunsch), stattdessen Glow-Effekt +
              mausfolgendes Tooltip (siehe ShelfHotspot/hoverTooltip). */}
          <ShelfHotspot label="Kategorie-Wanderpokale" onOpen={() => setPanel("wanderpokale-kategorie")} onHoverChange={handleHover}
            center={[WANDERPOKAL_REGAL_POS.x, 2.0, 0.85]} size={[1.15, 1.05, 0.35]} />
          <ShelfHotspot label="Genre-Wanderpokale" onOpen={() => setPanel("wanderpokale-genre")} onHoverChange={handleHover}
            center={[WANDERPOKAL_REGAL_2_POS.x, 2.0, 0.85]} size={[1.15, 1.05, 0.35]} />
          <ShelfHotspot label="Event-Pokale" onOpen={() => setPanel("eventpokale")} onHoverChange={handleHover}
            center={[-1.145, 1.94, -0.95]} size={[0.5, 0.75, 0.65]} />
          <ShelfHotspot label="Event-Pokale" onOpen={() => setPanel("eventpokale")} onHoverChange={handleHover}
            center={[-1.145, 1.94, -0.15]} size={[0.5, 0.75, 0.65]} />
          <ShelfHotspot label="Abzeichen" onOpen={() => setPanel("trophy")} onHoverChange={handleHover}
            center={[-1.1, 0.31, -0.95]} size={[0.5, 0.7, 0.9]} />
          <ExtraProp tier={nanoleafTier >= 1 ? 1 : 0} cfg={BLITZ_CFG} />
          <ExtraProp tier={nanoleafTier >= 2 ? 1 : 0} cfg={NANOLEAF_MONITOR_CFG} />
          <ExtraProp tier={nanoleafTier >= 3 ? 1 : 0} cfg={NANOLEAF_WALL_CFG} />
          <ExtraProp tier={nanoleafTier >= 4 ? 1 : 0} cfg={LED_STRIPS_CFG} />
          {nanoleafTier >= 1 && (
            <pointLight position={BLITZ_LIGHT_POS} intensity={0.35} color="#a700ff" distance={2.5} decay={2} />
          )}
          {nanoleafTier >= 2 && (
            <pointLight position={NANOLEAF_MONITOR_LIGHT_POS} intensity={0.55} color="#7714ff" distance={3.5} decay={2} />
          )}
          {nanoleafTier >= 3 && (
            <pointLight position={NANOLEAF_WALL_LIGHT_POS} intensity={0.5} color="#7714ff" distance={4} decay={2} />
          )}
          {nanoleafTier >= 4 && (
            <pointLight position={LED_STRIPS_LIGHT_POS} intensity={0.6} color="#e0e7ff" distance={6} decay={2} />
          )}
          <ExtraProp tier={deskmatTier} cfg={DESKMAT_CFG} />
          <ExtraProp tier={couchtischTier} cfg={COUCHTISCH_CFG} />
          {/* Streaming-Equipment, kumulativ: Headset(1) -> Webcam(2) ->
              Ringlicht(3) -> Stream Deck(4). */}
          <ExtraProp tier={streamingTier >= 1 ? 1 : 0} cfg={HEADSET_CFG} />
          <ExtraProp tier={streamingTier >= 2 ? 1 : 0} cfg={WEBCAM_CFG} />
          <ExtraProp tier={streamingTier >= 3 ? 1 : 0} cfg={RINGLICHT_CFG} />
          {streamingTier >= 3 && (
            <pointLight position={RINGLICHT_LIGHT_POS} intensity={0.6} color="#fff24a" distance={3} decay={2} />
          )}
          <ExtraProp tier={streamingTier >= 4 ? 1 : 0} cfg={STREAMDECK_CFG} />
          <ExtraProp tier={ps5ControllerTier} cfg={PS5_CONTROLLER_CFG} />

          {/* Interaktives Dashboard auf JEDEM freigeschalteten Monitor-Screen —
              echte 3D-Verankerung (<Html transform>, siehe MONITOR_SCREENS-
              Kommentar oben), dreht sich also korrekt mit der Kamera/
              Bildschirmfläche statt als flaches Billboard immer zur Kamera zu
              zeigen. Dock-Icons öffnen Statistik/Jobs/Ausbau/Postfach direkt
              am jeweiligen Rechner-Bildschirm (ersetzt den früheren separaten
              Ausbau-Hotspot auf dem Schreibtisch). Jeder Screen hat seinen
              eigenen, unabhängigen Panel-Zustand. */}
          {MONITOR_SCREENS.slice(0, Math.max(1, monitorTier)).map((screen, i) => (
            <Html key={i} transform distanceFactor={400} center occlude={false}
              position={screen.center} rotation={screen.rotation}
              scale={screen.widthM / SCREEN_CONTENT_PX}
              style={{ pointerEvents: "auto" }}>
              <div style={{ width: SCREEN_CONTENT_PX, height: SCREEN_CONTENT_PX / (screen.widthM / screen.heightM) }}
                className="overflow-hidden shadow-[0_0_40px_rgba(45,212,191,0.35)]">
                <MonitorScreenContent data={data} />
              </div>
            </Html>
          ))}

          {/* Profil-Plakat über dem Monitor: Avatar mit Rangrahmen + Community-Claim. */}
          <Html center position={POSTER_POS}>
            <div className="w-[92px] aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 p-2"
              style={{ background: "rgba(4,10,9,0.75)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(3px)" }}>
              <RankedAvatar rankPoints={data.rankPoints} src={data.avatarUrl} alt={data.displayName} size={48} rounded="xl" />
              <span className="text-[8px] font-semibold text-gray-300 text-center leading-tight">Old Masters Ally</span>
            </div>
          </Html>

        </Suspense>
      </Canvas>

      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full pointer-events-none"
        style={{ background: "rgba(4,10,9,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <span className="text-[9px] text-gray-400">Klicken &amp; ziehen zum Umschauen · Scrollen zum Zoomen</span>
      </div>

      {/* Mausfolgendes Tooltip für die Pokal-Möbel-Hotspots (siehe
          ShelfHotspot/handleHover) — echtes 2D-Overlay statt 3D-Html-Label,
          damit es wirklich der Cursorposition folgt statt an einer festen
          Raum-Stelle zu kleben. 16px Versatz, damit der Cursor selbst den
          Text nicht verdeckt. */}
      {hoverTooltip && (
        <div className="absolute pointer-events-none whitespace-nowrap px-2.5 py-1.5 rounded-full text-[11px] font-semibold text-amber-200"
          style={{
            left: hoverTooltip.x + 16, top: hoverTooltip.y + 16, zIndex: 2147483647,
            background: "rgba(4,10,9,0.85)", border: "1px solid rgba(245,158,11,0.4)", backdropFilter: "blur(3px)",
          }}>
          🏆 {hoverTooltip.label}
        </div>
      )}

      {panel && (
        // z-index MUSS als Inline-Style mit einer sehr hohen Zahl gesetzt
        // werden, nicht als Tailwind-Klasse (z-50 = z-index:50): drei's
        // <Html>-Hotspots setzen selbst ein inline z-index, berechnet aus dem
        // Kamera-Abstand (`zIndexRange`, Default bis zu 16.777.271, siehe
        // @react-three/drei/core/Html) — das schlägt jedes z-50 mühelos.
        // Genau DAS war der Grund, warum die Buttons/das Dashboard trotz
        // vorherigem z-50-Fix weiterhin über dem Popup lagen UND warum
        // Scrollen im Popup nicht ankam (Maus-/Touch-Events an der Stelle
        // gingen an die unsichtbar obenauf liegenden Html-Elemente, nicht an
        // das Popup darunter). 2147483647 (max. 32-Bit-Int) liegt sicher
        // über allem, was drei je vergibt.
        <div className="absolute inset-0 flex items-center justify-center p-6"
          style={{ background: "rgba(2,5,8,0.55)", backdropFilter: "blur(2px)", zIndex: 2147483647 }}
          onClick={() => setPanel(null)}>
          {/* min-h-0 ist Pflicht: als Flex-Kind von "items-center" hat dieses
              Div sonst ein implizites min-height:auto, das max-h+overflow-y-
              auto aushebelt (Inhalt läuft über statt zu scrollen) — der
              klassische Flexbox-Scroll-Bug.
              overflowY hier zusätzlich als INLINE Style: die "card-shine"-
              Klasse (globals.css, für den Hover-Glanzeffekt) setzt selbst
              `overflow: hidden` — gleiche Spezifität wie Tailwinds
              overflow-y-auto-Klasse, gewinnt aber durch spätere Position im
              kompilierten Stylesheet und hebelte das Scrollen komplett aus
              (der eigentliche Grund für den erneut gemeldeten Bug). Inline
              Styles schlagen jede klassenbasierte Regel unabhängig von der
              Cascade-Reihenfolge, daher hier der garantiert wirksame Fix. */}
          <div onClick={e => e.stopPropagation()}
            className="glass card-shine rounded-2xl p-5 w-full max-w-md max-h-[85%] min-h-0 relative animate-fade-in"
            style={{ overflowY: "auto" }}>
            <button onClick={() => setPanel(null)} aria-label="Schließen"
              className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors">
              ✕
            </button>
            {panel === "trophy" && <TrophyPanel data={data} />}
            {panel === "items" && <ItemsPanel data={data} />}
            {panel === "jobs" && <JobsPanel data={data} />}
            {panel === "mail" && <MailPanel data={data} onOpenPanel={setPanel} />}
            {panel === "wanderpokale-kategorie" && <WanderpokalePanel data={data} scopeType="category" />}
            {panel === "wanderpokale-genre" && <WanderpokalePanel data={data} scopeType="genre" />}
            {panel === "eventpokale" && <EventPokalePanel data={data} />}
          </div>
        </div>
      )}
    </div>
  );
}
