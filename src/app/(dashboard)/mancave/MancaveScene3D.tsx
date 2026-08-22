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
import { Html, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import RankedAvatar from "@/components/RankedAvatar";
import { MonitorScreenContent, TrophyPanel, ItemsPanel, type MancavePanel } from "./MancaveSharedUI";
import type { MancaveData } from "./mancave-data";

const ROOM_MODEL_URL = "/models/mancave_room.glb";
useGLTF.preload(ROOM_MODEL_URL);

// ── Kamera: 1:1 aus der Blender-Referenzkamera "DeskCam" übernommen ──────
// Blender (Z-up): eye=(0.05,0.95,1.28), forward=(0.9598,0,-0.2806).
// glTF/three.js (Y-up): x→x, y→z_blender, z→-y_blender.
const EYE = new THREE.Vector3(0.05, 1.28, -0.95);
const FORWARD = new THREE.Vector3(0.9598, -0.2806, 0);
const LOOK_TARGET = EYE.clone().add(FORWARD);

// Bildschirm-Mitte des Haupt-Monitors ("Cube.015") — bewusst NICHT auf die
// höhere, gemeinsame Mitte von Cube.015+Cube.002 verschoben (das wurde
// ausprobiert, vom User aber als schlechter beurteilt und zurückgesetzt) —
// diese niedrigere Position bleibt der bevorzugte Stand. Um 0.05 Richtung
// Kamera versetzt (entlang -FORWARD), sonst verdeckt die Bildschirm-Fläche
// selbst das Html-Overlay (Selbst-Okklusion).
const SCREEN_POS = new THREE.Vector3(1.215, 1.091, -0.741);
// Profil-Plakat über dem Monitor — gleiche X/Z wie der Screen, nur höher.
const POSTER_POS = new THREE.Vector3(1.215, 1.48, -0.741);
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
 * PC-Turm (Stufen 1-4): pc_billig → pc_violett → pc_gaming → pc_highend.
 * Stufe 3/4-Rotation nach User-Feedback korrigiert (nicht geometrisch
 * hergeleitet wie bei Monitor Stufe 1 — hier direkt als "um X Grad drehen"
 * gemeldet): Stufe 3 (pc_white_rgb) 180°. Stufe 4 (pc_highend) sollte 90°
 * werden, die erste Vorzeichen-Wahl (+90°) drehte in die falsche Richtung —
 * per User-Feedback um weitere 180° korrigiert, macht in Summe -90°
 * (+90°+180° ≡ -90° modulo 360°). Stufe 4 hatte außerdem eine mitgelieferte
 * Boden-/Sockel-Fläche direkt unter dem Gehäuse (Mesh "Object_6_24", Material
 * "Material.106", per Node/three.js-Messscript gefunden: eine dünne, flache
 * Platte, die fast genau die gesamte Grundfläche des Modells abdeckt) — als
 * `excludeMeshNames` entfernt, da sie laut User sichtbar störte.
 */
const PC_TIER_MODELS: Record<number, TierModelCfg> = {
  1: { url: "/models/pc_billig.glb",       fix: [-0.357, 0.011, -0.090], scale: 0.69 },
  2: { url: "/models/pc_tower_purple.glb", fix: [0, 0, 0],                scale: 0.77 },
  3: { url: "/models/pc_white_rgb.glb",    fix: [0, 0, 0],                scale: 0.89, rotationY: Math.PI },
  4: {
    url: "/models/pc_highend.glb", fix: [-8.674, 0.721, 0.203], scale: 1.14,
    rotationY: -Math.PI / 2, excludeMeshNames: ["Object_6_24"],
  },
};

/**
 * Monitor (Stufen 1-4): roehrenmonitor → monitor_flach → monitor_144(curved)
 * → monitor_dreifach(triple). Ersetzt "Cube.015"+"Cube.002" (der Haupt-
 * Screen) UND "Cube.016" (ein zweiter, kleinerer Screen-Kasten links auf dem
 * Tisch, der laut User ebenfalls entfernt werden sollte) aus der Referenzszene.
 *
 * `fix.y` ist jetzt einheitlich "-eigene min.y" (Boden-Anker auf lokalen
 * Ursprung 0) für ALLE vier Modelle — die eigentliche Tischhöhen-Anhebung
 * (0.816) steckt in `MONITOR_MODEL_POS.y`, genau wie beim PC-Turm. Wichtig:
 * diese Reihenfolge ist SKALIERUNGS-SICHER, weil sie auf 0 zielt (0*scale=0
 * bleibt immer 0) — ein früherer Versuch zielte direkt auf einen absoluten
 * Wert (0.816) INNERHALB der Skalierungs-Gruppe, was bei Stufe 4s neuer,
 * größerer Skalierung (siehe unten) zu falscher Höhe geführt hätte.
 *
 * `rotationY`: geometrisch hergeleitet (nicht geraten), per Node/three.js-
 * Skript — flächengewichteter Durchschnitts-Normalenvektor jedes Meshes
 * (Dreiecksfläche × Normale, aufsummiert, normalisiert):
 * - roehrenmonitor: "Screen.001"-Material, Normale (0,0,1) → lokal +Z → -90°
 * - monitor_flach_neu: "Mac"-Mesh (größte Fläche), Normale (0,-0.02,1.0) →
 *   ebenfalls lokal +Z → -90° (gleiche Konvention wie roehrenmonitor)
 * - monitor_curved: "tv"-Mesh, Normale (-0.612,0.04,-0.79) — keine reine
 *   Kardinalrichtung (gekrümmter Screen), Rotationswinkel algebraisch gelöst
 *   (R(θ)·(x,z)=(-1,0)) → θ≈0.912rad (≈52°) — laut User um weitere 180°
 *   danebengelegen, also +Math.PI ergänzt (≈4.05rad).
 * - monitor_triple: die drei "Wallpaper"-Screen-Meshes zeigen alle
 *   überwiegend +X (Mitte (1,0,0), Seiten leicht nach ∓Z gefächert) → 180°
 * `scale` bei Stufe 4 von 1 auf 1.4 erhöht (User: "viel zu klein").
 *
 * Stufe 2 (flach) nach der -90°-Drehung laut User "in den Schreibtisch
 * verschoben": das Modell ist kein flacher Screen, sondern Screen+Arm mit
 * ungewöhnlicher lokaler Tiefe (0.92 Einheiten, siehe Bounding-Box-Messung
 * oben in der Datei-Historie) — nach der Drehung liegt dieser Arm im
 * Welt-X statt Welt-Z, genau dort, wo der Tisch (Cube.001, X:[0.639,1.264])
 * sitzt. Nicht geometrisch neu vermessen (kein Screenshot verfügbar),
 * sondern pragmatisch entschärft: kleiner skaliert (verkürzt die Armreichweite)
 * und etwas höher angehoben (mehr Abstand zur Tischkante).
 *
 * Stufe 2 war danach laut User komplett UNSICHTBAR — Ursache gefunden (nicht
 * geraten): direkter Blick in die exportierte glTF-JSON zeigt, dass das
 * "Mac"-Mesh (Node "Mac", Mesh-Datenblock "Plane.025") KEIN Material
 * zugewiesen hat (`material: null` im Primitive). Der glTF-Spec-Default dafür
 * ist voll-metallisch + voll-rau OHNE eigene Basisfarbe — ohne Environment-Map
 * in dieser Szene rendert das nahezu schwarz vor dem dunklen Hintergrund,
 * de facto unsichtbar. Fix: `fixMaterialNames: ["Mac"]` ersetzt das Material
 * durch ein normales, nicht-metallisches Hellgrau (siehe `fixMaterialNames`
 * in `SwappableProp`).
 *
 * Stufe 4 (triple) — zwei Korrekturrunden lang versucht (Weiß-Ausbrennen
 * behoben, Skalierung mehrfach angepasst), laut User "passt von den
 * Proportionen her gar nicht" — sieht im Screenshot wie ein plumper
 * Würfel statt eines flachen Drei-Bildschirm-Arrays aus. Statt weiter blind
 * an einem Modell zu schrauben, dessen tatsächliche Silhouette sich ohne
 * Sichtprüfung nicht zuverlässig einschätzen lässt: auf `monitor_curved.glb`
 * umgestiegen (dasselbe, bereits für Stufe 3 bestätigt funktionierende
 * Modell), nur etwas größer skaliert — Stufe 3 und 4 sehen sich vorerst
 * ähnlich (gleiche Lücken-Konvention wie beim Stuhl/Regal), bis es ein
 * echtes, eigenständiges Triple-Monitor-Modell gibt, das sich zuverlässig
 * einpasst.
 */
const MONITOR_TIER_MODELS: Record<number, TierModelCfg> = {
  1: { url: "/models/roehrenmonitor.glb",    fix: [0, 0, 0],          scale: 1,    rotationY: -Math.PI / 2 },
  2: {
    url: "/models/monitor_flach_neu.glb", fix: [0, -0.415, -0.4], scale: 0.65,
    rotationY: -Math.PI / 2, fixMaterialNames: ["Mac"],
  },
  3: { url: "/models/monitor_curved.glb",    fix: [0, -0.850, 0],     scale: 1,    rotationY: 0.912 + Math.PI },
  4: { url: "/models/monitor_curved.glb",    fix: [0, -0.850, 0],     scale: 1.15, rotationY: 0.912 + Math.PI },
};
const MONITOR_MODEL_POS = new THREE.Vector3(1.215, 0.816, -0.741);

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
const STUHL_TIER_MODELS: Record<number, TierModelCfg> = {
  1: { url: "/models/chair_office.glb", fix: [0, -0.017, 0], scale: 1, rotationY: Math.PI },
  2: { url: "/models/chair_office.glb", fix: [0, -0.017, 0], scale: 1, rotationY: Math.PI },
  3: { url: "/models/chair_gaming.glb", fix: [0, -0.009, 0], scale: 1, rotationY: Math.PI },
  // Stufe 4 bewusst OHNE die 180°-Drehung der anderen Stufen: geometrisch
  // vermessen (avgFaceNormal, wie beim Monitor) — "Plane048", die mit Abstand
  // größte Fläche im Modell (Rückenlehne), zeigt bereits UNROTIERT nach lokal
  // +X, was hier "weg vom Tisch" entspricht. Die pauschale 180°-Drehung der
  // anderen 3 Stufen war für DIESES Modell falsch und drehte die Lehne genau
  // in die Sichtlinie zum Monitor — laut User bestätigt gemeldet.
  4: { url: "/models/chair_racing.glb", fix: [0, 0, 0],      scale: 1 },
};
// "Plane.002" (Material "chair", Rückenlehne) aus der Referenzszene entfernt
// — X/Z hier übernommen, Y auf Bodenhöhe (0) gesetzt (Boden-verankerte Modelle).
const STUHL_POS = new THREE.Vector3(0.367, 0, -0.921);

/**
 * Pokalregal (Stufen 1-4): alter Katalog hat nur 2 Modelle (regal_holz,
 * pokalregal ab Stufe 3) — dieselbe Lücken-Konvention wie beim Stuhl: Stufe 1+2
 * teilen sich regal_holz, Stufe 3+4 teilen sich pokalregal.
 *
 * Ersetzt "Cube.018"+"Cube.019" — zwei dünne, breite Bretter (Material
 * "Material.001", dieselbe Materialfamilie wie Tisch/Couch), an der
 * Wand mit dem kleinsten Y-Wert der Szene montiert (Blender-Y≈-0.886, praktisch
 * identisch mit der gemessenen Raumschale-Untergrenze) — per Bounding-Box-
 * Analyse als Wandregal identifiziert, nicht geraten. Position übernimmt
 * "Cube.019" (die niedrigere, besser erreichbare der beiden Bretter).
 *
 * ACHTUNG — deutlich unsicherer als PC/Monitor/Stuhl: Wandmontage statt
 * Boden-Aufstellung, die Blickrichtung der Wand (`+Y` in Blender, "-Z" in
 * gltf, Richtung Schreibtisch/Kamera) wurde hergeleitet, aber NICHT wie beim
 * Monitor durch eine Flächen-Normalen-Messung der Ersatz-Modelle bestätigt —
 * `rotationY` bleibt vorerst 0, echte Ausrichtung erst nach Sichtprüfung
 * korrigieren.
 */
const REGAL_TIER_MODELS: Record<number, TierModelCfg> = {
  1: { url: "/models/regal_buecher.glb", fix: [0, 0, -0.277], scale: 0.4 },
  2: { url: "/models/regal_buecher.glb", fix: [0, 0, -0.277], scale: 0.4 },
  3: { url: "/models/pokalregal.glb",    fix: [0, -0.004, 0.001], scale: 0.885 },
  4: { url: "/models/pokalregal.glb",    fix: [0, -0.004, 0.001], scale: 0.885 },
};
const REGAL_POS = new THREE.Vector3(0.207, 1.755, 0.886);

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
interface ExtraCfg { url: string; fix: [number, number, number]; scale: number; position: THREE.Vector3; rotationY?: number }

function ExtraProp({ tier, cfg }: { tier: number; cfg: ExtraCfg }) {
  const { scene } = useGLTF(cfg.url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  if (tier <= 0) return null;
  return (
    <group position={cfg.position} rotation={[0, cfg.rotationY ?? 0, 0]}>
      <group scale={cfg.scale}>
        <primitive object={cloned} position={cfg.fix} />
      </group>
    </group>
  );
}

const NANOLEAF_CFG: ExtraCfg = { url: "/models/mancave_nanoleaf.glb", fix: [0, 0, 0], scale: 1, position: new THREE.Vector3(0, 0, 0) };
const DESKMAT_CFG: ExtraCfg = { url: "/models/mancave_deskmat.glb", fix: [0, 0, 0], scale: 1, position: new THREE.Vector3(0, 0, 0) };
// Webcam oben auf dem Monitor — grobe Schätzung, nicht vermessen.
const WEBCAM_CFG: ExtraCfg = { url: "/models/webcam.glb", fix: [0, 0, 0], scale: 1, position: new THREE.Vector3(1.215, 1.38, -0.7) };
// Headset am vorderen linken Tischrand — grobe Schätzung, nicht vermessen.
const HEADSET_CFG: ExtraCfg = { url: "/models/headset_gaming.glb", fix: [0, 0, 0], scale: 1, position: new THREE.Vector3(0.85, 0.82, -0.15) };
// Couchtisch: User-Hinweis — "Cube.014" in der Referenzszene (Glasplatte,
// Materialien "Pc glass"+"Material", Größe 0.641×0.528×0.334, nahe der
// Couch) ist bereits ein passender Couchtisch, stilecht statt eines fremden
// Katalog-Ersatzmodells. Als eigenes kleines GLB extrahiert
// ("mancave_couchtisch.glb") und aus dem Haupt-Raum-Export entfernt, genau
// wie Nanoleaf/Deskmat — `location=(0,0,0)` in Blender bestätigt (Weltposition
// steckt in den Vertex-Daten selbst), daher position/fix beide [0,0,0].
const COUCHTISCH_CFG: ExtraCfg = { url: "/models/mancave_couchtisch.glb", fix: [0, 0, 0], scale: 1, position: new THREE.Vector3(0, 0, 0) };

for (const m of [
  ...Object.values(PC_TIER_MODELS), ...Object.values(MONITOR_TIER_MODELS),
  ...Object.values(STUHL_TIER_MODELS), ...Object.values(REGAL_TIER_MODELS),
  NANOLEAF_CFG, DESKMAT_CFG, WEBCAM_CFG, HEADSET_CFG, COUCHTISCH_CFG,
]) useGLTF.preload(m.url);
// Nanoleaf-Dreieck-Panels über dem Schreibtisch (Mittelpunkt aller 21
// "Circle.*"-Meshes, nachgemessen) — Anker für den Pokale-Hotspot.
const SHELF_POS = new THREE.Vector3(0.19, 1.56, -0.11);
// Linke vordere Tischkante — Anker für den Ausbau-Hotspot (Stufen-Upgrades,
// siehe mancave-items.ts). Bewusst nach links/vorne verschoben (war vorher
// (0.95,0.86,-0.55), nur ~0.28 Einheiten von PC_POS/PC_LABEL_POS entfernt —
// wirkte zusammen mit dem Gadgets-Hotspot gedrängt); jetzt klarer getrennt
// von der PC-Ecke rechts.
const DESK_FRONT_POS = new THREE.Vector3(0.7, 0.86, -0.18);

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
  { color: "#0a0a0d" },
];

function RoomModel({ surfaceTier, deskTier }: { surfaceTier: number; deskTier: number }) {
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
    return clone;
  }, [scene, floorTex, wallTex, deskIdx]);
  /* eslint-enable react-hooks/immutability */
  return <primitive object={cloned} />;
}

// Fenster-Öffnung: die Referenzszene ist KEINE geschlossene Box, sondern ein
// offenes Eck-Diorama (nur 2 echte Wände, der Rest ist absichtlich offen und
// wird vom Nebel kaschiert, siehe [[mancave-profile-project]] in memory) —
// deshalb kein Loch geschnitten, sondern eine bereits offene Stelle an der
// -Y-Wand (derselben Wand wie das Regal) genutzt.
// Ursprüngliche Position (Z=1.5, Höhe 1.1) überlappte laut User + Screenshot
// mit dem Regal (Wandbretter "Cube.018"/"Cube.019" sitzen auf derselben Wand
// bei Blender-Z≈1.755-2.105) — per erneuter Bounding-Box-Analyse tiefer
// verschoben (Blender-Z-Band 0.75-1.55, bestätigt frei, deutlich unter dem
// Regal) und etwas niedriger gemacht, damit es sicher in dieses Band passt.
const WINDOW_POS = new THREE.Vector3(0.3, 1.15, 0.886);
const WINDOW_W = 0.9, WINDOW_H = 0.75;
// Ausblick-Ebene: war ursprünglich 4.2 Einheiten hinter dem Fenster (für
// echte Tiefe/3D-Effekt beim Umschauen, da die Kamera nur rotiert, nie die
// Position wechselt) — blieb aber laut User trotz mehrerer Fixversuche
// (DoubleSide, Neupositionierung) unsichtbar, und Live-Verifikation war
// wegen eines Sandbox-Cache-Problems nicht möglich. Vorübergehend DEUTLICH
// näher an den Rahmen herangeholt (fast bündig), um zuerst grundsätzliche
// Sichtbarkeit sicherzustellen — der Tiefeneffekt kommt zurück, sobald das
// bestätigt ist.
const WINDOW_VIEW_DISTANCE = 0.15;
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
    // Größe jetzt an der Fensteröffnung (WINDOW_W/H) orientiert statt an der
    // (jetzt sehr kleinen) Entfernung — bei WINDOW_VIEW_DISTANCE=0.15 hätte
    // die alte distanzbasierte Formel eine winzige, viel zu kleine Fläche ergeben.
    <mesh position={[WINDOW_POS.x, WINDOW_POS.y, WINDOW_POS.z + WINDOW_VIEW_DISTANCE]}>
      <planeGeometry args={[WINDOW_W * 1.05, WINDOW_H * 1.05]} />
      <meshBasicMaterial map={tex} toneMapped={false} fog={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

/**
 * Fensterrahmen: rein prozedural (kein Foto nötig), 4 Riegel um die Öffnung
 * herum, Stil/Farbe wechselt mit der Zimmerstufe — Stufe 1 dünner rostiger
 * Metallrahmen, Stufe 4 breiter dunkler Rahmen mit leicht leuchtender
 * Teal-Kante (passend zum restlichen Neon-Akzent-Look der Szene).
 */
const WINDOW_FRAME_STYLES = [
  { color: "#6b5a4a", thickness: 0.02, emissive: "#000000", emissiveIntensity: 0 },
  { color: "#c9c4ba", thickness: 0.025, emissive: "#000000", emissiveIntensity: 0 },
  { color: "#2a2e36", thickness: 0.03, emissive: "#0d3b36", emissiveIntensity: 0.15 },
  { color: "#15181f", thickness: 0.035, emissive: "#2dd4bf", emissiveIntensity: 0.35 },
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

/**
 * Freies Umschauen per Drag — Kamera bleibt am festen Sitzplatz, nur die
 * Blickrichtung dreht sich, unbegrenzt in alle Richtungen.
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
function LookAroundRig() {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0);
  const initialized = useRef(false);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

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
    camera.rotation.order = "YXZ";
    initialized.current = true;
  }, [camera]);

  useFrame(() => {
    if (!initialized.current) return;
    camera.position.copy(EYE);
    camera.rotation.set(pitch.current, yaw.current, 0);
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
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.style.touchAction = prevTouchAction;
    };
  }, [gl]);
  /* eslint-enable react-hooks/immutability */

  return null;
}

export default function MancaveScene3D({ data }: { data: MancaveData }) {
  const [panel, setPanel] = useState<MancavePanel>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasAffordableUpgrade = data.items.some(i => i.nextCost !== null && i.nextCost <= data.totalPoints);
  const deskTier = data.items.find(i => i.key === "schreibtisch")?.tier ?? 1;
  const pcTier = data.items.find(i => i.key === "computer")?.tier ?? 1;
  const monitorTier = data.items.find(i => i.key === "monitor")?.tier ?? 1;
  const stuhlTier = data.items.find(i => i.key === "stuhl")?.tier ?? 1;
  const regalTier = data.items.find(i => i.key === "regal")?.tier ?? 1;
  const nanoleafTier = data.items.find(i => i.key === "nanoleaf")?.tier ?? 0;
  const deskmatTier = data.items.find(i => i.key === "deskmat")?.tier ?? 0;
  const webcamTier = data.items.find(i => i.key === "webcam")?.tier ?? 0;
  const headsetTier = data.items.find(i => i.key === "headset")?.tier ?? 0;
  const couchtischTier = data.items.find(i => i.key === "couchtisch")?.tier ?? 0;

  return (
    <div ref={containerRef}
      // touch-action:none absichtlich NICHT hier (siehe LookAroundRig-
      // Kommentar) — landet stattdessen gezielt nur auf dem Canvas, damit
      // Touch-Scrollen in den Popups (Ausbau/Pokale) funktioniert.
      className="relative w-full overflow-hidden rounded-3xl border border-white/[0.06] select-none"
      style={{ aspectRatio: "16 / 9", background: "#050810", cursor: "grab" }}>
      <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true }}>
        <color attach="background" args={["#050810"]} />
        <fog attach="fog" args={["#050810", 5, 11]} />
        <RoomLighting />
        <LookAroundRig />
        <Suspense fallback={null}>
          <RoomModel surfaceTier={data.surfaceTier} deskTier={deskTier} />
          <WindowFrame surfaceTier={data.surfaceTier} />
          <WindowView surfaceTier={data.surfaceTier} />
          <LogoRugStatic />
          <SwappableProp tier={pcTier} models={PC_TIER_MODELS} position={PC_POS} />
          <SwappableProp tier={monitorTier} models={MONITOR_TIER_MODELS} position={MONITOR_MODEL_POS} />
          <SwappableProp tier={stuhlTier} models={STUHL_TIER_MODELS} position={STUHL_POS} />
          <SwappableProp tier={regalTier} models={REGAL_TIER_MODELS} position={REGAL_POS} />
          <ExtraProp tier={nanoleafTier} cfg={NANOLEAF_CFG} />
          <ExtraProp tier={deskmatTier} cfg={DESKMAT_CFG} />
          <ExtraProp tier={webcamTier} cfg={WEBCAM_CFG} />
          <ExtraProp tier={headsetTier} cfg={HEADSET_CFG} />
          <ExtraProp tier={couchtischTier} cfg={COUCHTISCH_CFG} />

          {/* Live-Dashboard direkt auf dem Monitor-Screen — 3D-verankert, immer sichtbar */}
          <Html center position={SCREEN_POS} style={{ pointerEvents: "auto" }}>
            <div className="w-[150px] h-[84px] rounded-[3px] overflow-hidden shadow-[0_0_18px_rgba(45,212,191,0.35)]">
              <MonitorScreenContent data={data} />
            </div>
          </Html>

          {/* Profil-Plakat über dem Monitor: Avatar mit Rangrahmen + Community-Claim. */}
          <Html center position={POSTER_POS}>
            <div className="w-[92px] aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 p-2"
              style={{ background: "rgba(4,10,9,0.75)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(3px)" }}>
              <RankedAvatar rankPoints={data.rankPoints} src={data.avatarUrl} alt={data.displayName} size={48} rounded="xl" />
              <span className="text-[8px] font-semibold text-gray-300 text-center leading-tight">Old Masters Ally</span>
            </div>
          </Html>

          {/* Pokale & Abzeichen */}
          <Html position={SHELF_POS} center>
            <button onClick={() => setPanel("trophy")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full whitespace-nowrap"
              style={{ background: "rgba(4,10,9,0.7)", border: "1px solid rgba(245,158,11,0.3)", backdropFilter: "blur(3px)" }}>
              <span className="text-[10px] font-semibold text-amber-300">🏆 Pokale &amp; Abzeichen</span>
            </button>
          </Html>

          {/* Ausbau (neues Stufen-Upgrade-System) — pulsiert, wenn sich ein
              Upgrade gerade leisten lässt, damit es auffällt. */}
          <Html position={DESK_FRONT_POS} center>
            <button onClick={() => setPanel("items")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full whitespace-nowrap ${hasAffordableUpgrade ? "animate-pulse" : ""}`}
              style={{ background: "rgba(4,10,9,0.7)", border: "1px solid rgba(94,234,212,0.35)", backdropFilter: "blur(3px)" }}>
              <span className="text-[10px] font-semibold text-teal-300">🛠️ Ausbau</span>
            </button>
          </Html>

        </Suspense>
      </Canvas>

      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full pointer-events-none"
        style={{ background: "rgba(4,10,9,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <span className="text-[9px] text-gray-400">Klicken &amp; ziehen zum Umschauen</span>
      </div>

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
          </div>
        </div>
      )}
    </div>
  );
}
