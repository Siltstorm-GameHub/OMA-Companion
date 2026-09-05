import * as THREE from "three";

/**
 * Feste Kamera-Ansichten für die Desktop-Mancave-Szene (siehe
 * `CameraTransitionRig` in `MancaveScene3D.tsx`) — ersetzt das frühere freie
 * Umschauen (`LookAroundRig`) durch genau 4 kuratierte Blickwinkel, zwischen
 * denen der Nutzer per Pfeil-Buttons/Tasten/Swipe wechselt.
 *
 * Platzhalter-Zahlen (wie im Umbau-Plan vorgesehen) — abgeleitet aus den
 * bestehenden Positions-Konstanten in `MancaveScene3D.tsx` (Kommentare unten
 * je View verweisen darauf), aber noch nicht live im Browser nachjustiert.
 */
export interface CameraView {
  id:     "desk" | "wanderpokale" | "eventpokale" | "abzeichen";
  label:  string;
  eye:    THREE.Vector3;
  lookAt: THREE.Vector3;
  fov:    number;
}

export const CAMERA_VIEWS: CameraView[] = [
  {
    // ≈ bisherige EYE/LOOK_TARGET (MancaveScene3D.tsx: EYE=(0.2,1.38,-0.95),
    // FORWARD=(0.9598,-0.2806,0)) — engeres FOV als der bisherige Default
    // (75°), damit die 4 Monitor-Screens (MONITOR_SCREENS) mehr vom
    // sichtbaren Bereich füllen.
    id: "desk", label: "Schreibtisch",
    eye: new THREE.Vector3(0.2, 1.38, -0.95),
    lookAt: new THREE.Vector3(1.1598, 1.0994, -0.95),
    fov: 52,
  },
  {
    // Zentriert zwischen WANDERPOKAL_REGAL_POS (0.57,1.755,0.886) und
    // WANDERPOKAL_REGAL_2_POS (-0.62,1.755,0.886) — Kamera etwas von der
    // Regal-Wand zurückversetzt (Blickrichtung +Z, wie bei WINDOW_POS/
    // POSTER_POS, die an derselben Wand liegen), Slot-Höhen aus
    // WANDERPOKAL_SLOTS (~1.6-2.3) als Referenz für die Blickhöhe.
    id: "wanderpokale", label: "Wanderpokale",
    eye: new THREE.Vector3(-0.025, 1.45, -0.4),
    lookAt: new THREE.Vector3(-0.025, 1.9, 0.886),
    fov: 65,
  },
  {
    // Nah an EVENT_POKAL_CATEGORY_SLOTS (x≈-1.15 an der Westwand, z von
    // -1.278 bis 0.178, y≈1.65-1.9) — Kamera seitlich davor, Blickrichtung -X.
    id: "eventpokale", label: "Event-Pokale",
    eye: new THREE.Vector3(-0.2, 1.6, -0.55),
    lookAt: new THREE.Vector3(-1.15, 1.8, -0.55),
    fov: 60,
  },
  {
    // Niedrige, nahe Kamera Richtung ABZEICHEN_VITRINE_POS (-1.1,0,-0.95) /
    // abzeichenSlotPos (Höhe ~0.05-0.4 über der Vitrinen-Basis) — engeres FOV,
    // da die Vitrine deutlich kleiner ist als die Pokal-Regale.
    id: "abzeichen", label: "Abzeichen",
    eye: new THREE.Vector3(-0.4, 0.55, -0.95),
    lookAt: new THREE.Vector3(-1.1, 0.35, -0.95),
    fov: 45,
  },
];

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export const VIEW_TRANSITION_MS = 1200;
