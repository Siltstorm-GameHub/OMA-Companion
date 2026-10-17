// ============================================
// OMA Gems — Helden-Bausteine als SVG (Cartoon mit Outline)
// ============================================
// Alle Teile sitzen auf einem gemeinsamen Gerüst: Zeichenfläche 220×240, Boden bei y=226,
// Kopfmitte (110|86) mit Radius 44, Schulter-, Hand- und Brustpunkte je Körperbau (RIGS). Waffen
// werden relativ zur Hand (Ursprung 0|0, Waffe zeigt nach oben) gezeichnet und je Pose gedreht.
// Farben kommen aus Paletten (look.ts), Konturen sind immer OUTLINE in 5 px. Ein Zeichner kann jedes
// Teil 1:1 ersetzen, solange Gerüst, Ebenen und Farbslots gleich bleiben — siehe
// docs/gems-helden-geruest.md. Reine Darstellung, keine Hooks.

import type { ReactNode } from "react";
import {
  HERO_HAIR_COLORS,
  HERO_SCHEMES,
  HERO_SKINS,
  type HeroLook,
} from "./look";

export const OUTLINE = "#1b1326";
const W = 5;
const line = { stroke: OUTLINE, strokeWidth: W, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
const thin = { stroke: OUTLINE, strokeWidth: 3.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

interface Palette {
  main: string;
  dark: string;
  light: string;
  metal: string;
  skin: string;
  skinShade: string;
  hair: string;
  hairShade: string;
}

type Build = "broad" | "slim" | "robe";
type Pt = [number, number];

/** Gerüst je Körperbau: Schultern, Hände je Pose, Brust-Emblem. */
const RIGS: Record<Build, { shoulderL: Pt; shoulderR: Pt; emblem: Pt; hands: Record<string, { L: Pt; R: Pt }> }> = {
  broad: {
    shoulderL: [66, 138],
    shoulderR: [154, 138],
    emblem: [110, 156],
    hands: { stehen: { L: [52, 168], R: [168, 168] }, angriff: { L: [50, 160], R: [176, 118] }, jubel: { L: [50, 102], R: [170, 102] } },
  },
  slim: {
    shoulderL: [80, 138],
    shoulderR: [140, 138],
    emblem: [110, 150],
    hands: { stehen: { L: [66, 170], R: [154, 170] }, angriff: { L: [64, 162], R: [166, 116] }, jubel: { L: [62, 104], R: [158, 104] } },
  },
  robe: {
    shoulderL: [76, 138],
    shoulderR: [144, 138],
    emblem: [110, 152],
    hands: { stehen: { L: [62, 172], R: [158, 170] }, angriff: { L: [60, 164], R: [166, 122] }, jubel: { L: [58, 104], R: [162, 104] } },
  },
};

/** Drehung der Waffe in Grad je Pose (0 = Waffe zeigt senkrecht nach oben). */
const WEAPON_ANGLE: Record<string, number> = { stehen: 18, angriff: 62, jubel: -8 };

function buildOf(base: string): Build {
  if (base.startsWith("tank")) return "broad";
  if (base.startsWith("dd")) return "slim";
  return "robe";
}

function paletteOf(look: HeroLook): Palette {
  const scheme = HERO_SCHEMES.find((s) => s.id === look.scheme) ?? HERO_SCHEMES[0];
  const skin = HERO_SKINS[look.skin] ?? HERO_SKINS[1];
  const hair = HERO_HAIR_COLORS[look.hairColor] ?? HERO_HAIR_COLORS[0];
  return { ...scheme, skin: skin.base, skinShade: skin.shade, hair: hair.base, hairShade: hair.shade };
}

// ---------- Körper ----------

function Legs({ build }: { build: Build }) {
  if (build === "robe") return null;
  const [x1, x2, w] = build === "broad" ? [82, 114, 24] : [86, 114, 20];
  return (
    <g>
      <rect x={x1} y={180} width={w} height={38} rx={8} fill="#334155" {...line} />
      <rect x={x2} y={180} width={w} height={38} rx={8} fill="#334155" {...line} />
    </g>
  );
}

function Torso({ build, p }: { build: Build; p: Palette }) {
  if (build === "broad") {
    return (
      <g>
        <path d="M64 130 Q110 104 156 130 L162 190 Q110 206 58 190 Z" fill={p.main} {...line} />
        <path d="M66 168 Q110 182 158 168 L160 188 Q110 202 60 188 Z" fill={p.dark} />
        <path d="M80 126 Q110 114 140 126" stroke={p.light} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.7} />
      </g>
    );
  }
  if (build === "slim") {
    return (
      <g>
        <path d="M78 132 Q110 114 142 132 L148 190 Q110 202 72 190 Z" fill={p.main} {...line} />
        <path d="M74 170 Q110 182 146 170 L148 188 Q110 200 72 188 Z" fill={p.dark} />
        <rect x={76} y={162} width={68} height={10} rx={4} fill="#1f2937" {...thin} />
      </g>
    );
  }
  return (
    <g>
      <path d="M66 132 Q110 112 154 132 L172 212 Q110 226 48 212 Z" fill={p.main} {...line} />
      <path d="M56 186 Q110 200 166 186 L172 212 Q110 226 48 212 Z" fill={p.dark} />
      <path d="M110 134 L110 200" stroke={p.dark} strokeWidth={4} />
    </g>
  );
}

function ShoulderPads({ build, p }: { build: Build; p: Palette }) {
  if (build !== "broad") return null;
  return (
    <g>
      <circle cx={64} cy={136} r={17} fill={p.metal} {...line} />
      <circle cx={156} cy={136} r={17} fill={p.metal} {...line} />
    </g>
  );
}

function Arm({ from, to, p }: { from: Pt; to: Pt; p: Palette }) {
  const d = `M${from[0]} ${from[1]} L${to[0]} ${to[1]}`;
  return (
    <g>
      <path d={d} stroke={OUTLINE} strokeWidth={16} strokeLinecap="round" />
      <path d={d} stroke={p.main} strokeWidth={8} strokeLinecap="round" />
      <circle cx={to[0]} cy={to[1]} r={8} fill={p.skin} {...thin} />
    </g>
  );
}

// ---------- Emblem ----------

function Emblem({ id, at }: { id: string; at: Pt }) {
  const [x, y] = at;
  switch (id) {
    case "stern":
      return (
        <path
          d={`M${x} ${y - 12} L${x + 4} ${y - 3} L${x + 13} ${y - 2} L${x + 6} ${y + 5} L${x + 8} ${y + 14} L${x} ${y + 9} L${x - 8} ${y + 14} L${x - 6} ${y + 5} L${x - 13} ${y - 2} L${x - 4} ${y - 3} Z`}
          fill="#fde68a"
          {...thin}
        />
      );
    case "krone":
      return <path d={`M${x - 14} ${y + 10} L${x - 14} ${y - 8} L${x - 7} ${y} L${x} ${y - 12} L${x + 7} ${y} L${x + 14} ${y - 8} L${x + 14} ${y + 10} Z`} fill="#fbbf24" {...thin} />;
    case "herz":
      return <path d={`M${x} ${y + 12} C${x - 18} ${y} ${x - 12} ${y - 14} ${x} ${y - 5} C${x + 12} ${y - 14} ${x + 18} ${y} ${x} ${y + 12} Z`} fill="#fb7185" {...thin} />;
    case "blitz":
      return <path d={`M${x + 3} ${y - 14} L${x - 9} ${y + 2} L${x - 1} ${y + 2} L${x - 4} ${y + 14} L${x + 9} ${y - 3} L${x + 1} ${y - 3} Z`} fill="#fde047" {...thin} />;
    default:
      return <path d={`M${x} ${y - 12} L${x + 13} ${y - 1} L${x} ${y + 16} L${x - 13} ${y - 1} Z`} fill="#f8fafc" {...thin} />;
  }
}

// ---------- Waffen (Ursprung = Hand, Waffe zeigt nach oben) ----------

function Sword() {
  return (
    <g>
      <path d="M-6 -8 L-6 -74 L0 -88 L6 -74 L6 -8 Z" fill="#e2e8f0" {...line} />
      <path d="M0 -14 L0 -74" stroke="#ffffff" strokeWidth={2} opacity={0.8} />
      <rect x={-16} y={-14} width={32} height={9} rx={3} fill="#fbbf24" {...thin} />
      <rect x={-4} y={-6} width={8} height={18} rx={3} fill="#7c2d12" {...thin} />
    </g>
  );
}

function Axe({ p }: { p: Palette }) {
  return (
    <g>
      <rect x={-4} y={-78} width={8} height={96} rx={4} fill="#92400e" {...thin} />
      <path d="M4 -76 Q40 -84 42 -50 Q30 -40 4 -46 Z" fill={p.metal} {...line} />
      <path d="M-4 -72 Q-18 -64 -16 -54 L-4 -52 Z" fill={p.metal} {...thin} />
    </g>
  );
}

function Shield({ p, emblem }: { p: Palette; emblem: string }) {
  return (
    <g>
      <path d="M-36 -44 Q0 -58 36 -44 L32 18 Q0 46 -32 18 Z" fill={p.dark} {...line} />
      <path d="M-24 -34 Q0 -44 24 -34 L22 10 Q0 30 -22 10 Z" fill={p.main} />
      <Emblem id={emblem} at={[0, -10]} />
    </g>
  );
}

function Bow() {
  return (
    <g>
      <path d="M2 -58 Q-30 0 2 58" stroke={OUTLINE} strokeWidth={11} fill="none" strokeLinecap="round" />
      <path d="M2 -58 Q-30 0 2 58" stroke="#a16207" strokeWidth={5} fill="none" strokeLinecap="round" />
      <path d="M2 -58 L2 58" stroke="#f1f5f9" strokeWidth={2} />
    </g>
  );
}

function Staff({ p }: { p: Palette }) {
  return (
    <g>
      <circle cx={0} cy={-92} r={26} fill={p.light} opacity={0.35} />
      <path d="M0 58 L0 -76" stroke={OUTLINE} strokeWidth={12} strokeLinecap="round" />
      <path d="M0 58 L0 -76" stroke="#92400e" strokeWidth={5} strokeLinecap="round" />
      <circle cx={0} cy={-92} r={16} fill={p.light} {...line} />
      <circle cx={-5} cy={-97} r={5} fill="#ffffff" />
    </g>
  );
}

function Lantern() {
  return (
    <g>
      <path d="M0 0 L0 10" stroke={OUTLINE} strokeWidth={4} />
      <circle cx={0} cy={34} r={26} fill="#fde68a" opacity={0.3} />
      <path d="M-12 10 L12 10 L16 22 L16 46 L-16 46 L-16 22 Z" fill="#78350f" {...thin} />
      <rect x={-10} y={22} width={20} height={20} rx={4} fill="#fde68a" {...thin} />
      <circle cx={0} cy={32} r={4} fill="#ffffff" />
    </g>
  );
}

// ---------- Kopf, Gesicht, Haare ----------

function Face({ id }: { id: string }) {
  const eyes = (ry = 8.5) => (
    <g>
      <ellipse cx={94} cy={98} rx={6.5} ry={ry} fill={OUTLINE} />
      <ellipse cx={126} cy={98} rx={6.5} ry={ry} fill={OUTLINE} />
      <circle cx={96.5} cy={94.5} r={2.4} fill="#ffffff" />
      <circle cx={128.5} cy={94.5} r={2.4} fill="#ffffff" />
    </g>
  );
  const blush = (
    <g>
      <circle cx={82} cy={110} r={6} fill="#fb7185" opacity={0.4} />
      <circle cx={138} cy={110} r={6} fill="#fb7185" opacity={0.4} />
    </g>
  );
  const stroke = { stroke: OUTLINE, strokeWidth: 4.5, fill: "none", strokeLinecap: "round" as const };
  switch (id) {
    case "entschlossen":
      return (
        <g>
          <path d="M86 81 L101 87" {...stroke} strokeWidth={5} />
          <path d="M134 81 L119 87" {...stroke} strokeWidth={5} />
          {eyes()}
          {blush}
          <path d="M100 115 Q110 120 120 115" {...stroke} />
        </g>
      );
    case "grinsen":
      return (
        <g>
          <path d="M86 84 L101 88" {...stroke} strokeWidth={5} />
          <path d="M120 82 Q127 77 134 80" {...stroke} strokeWidth={5} />
          {eyes(6.5)}
          <path d="M100 116 Q113 121 123 110" {...stroke} />
        </g>
      );
    case "ruhig":
      return (
        <g>
          <path d="M87 98 Q94 92 101 98" {...stroke} />
          <path d="M119 98 Q126 92 133 98" {...stroke} />
          {blush}
          <path d="M103 114 Q110 120 117 114" {...stroke} />
        </g>
      );
    case "frech":
      return (
        <g>
          <path d="M87 98 Q94 92 101 98" {...stroke} />
          <ellipse cx={126} cy={98} rx={6.5} ry={8.5} fill={OUTLINE} />
          <circle cx={128.5} cy={94.5} r={2.4} fill="#ffffff" />
          {blush}
          <path d="M99 112 Q110 123 121 112" {...stroke} />
          <path d="M108 118 Q112 126 117 118" fill="#fb7185" stroke={OUTLINE} strokeWidth={2.5} />
        </g>
      );
    case "staunend":
      return (
        <g>
          <path d="M86 80 Q93 75 100 79" {...stroke} />
          <path d="M120 79 Q127 75 134 80" {...stroke} />
          <circle cx={94} cy={98} r={7.5} fill={OUTLINE} />
          <circle cx={126} cy={98} r={7.5} fill={OUTLINE} />
          <circle cx={96.5} cy={95} r={2.6} fill="#ffffff" />
          <circle cx={128.5} cy={95} r={2.6} fill="#ffffff" />
          <ellipse cx={110} cy={117} rx={5} ry={6} fill={OUTLINE} />
        </g>
      );
    default:
      return (
        <g>
          <path d="M86 84 Q93 79 100 82" {...stroke} />
          <path d="M120 82 Q127 79 134 84" {...stroke} />
          {eyes()}
          {blush}
          <path d="M99 112 Q110 123 121 112" {...stroke} />
        </g>
      );
  }
}

function HairBack({ id, p }: { id: string; p: Palette }) {
  if (id === "lang") return <path d="M62 90 Q58 34 110 30 Q162 34 158 90 L164 150 Q140 140 110 142 Q80 140 56 150 Z" fill={p.hairShade} {...line} />;
  if (id === "zopf") return <path d="M146 58 Q182 62 180 104 Q174 130 158 136 Q166 106 150 84 Z" fill={p.hair} {...line} />;
  return null;
}

function HairFront({ id, p }: { id: string; p: Palette }) {
  switch (id) {
    case "stachelig":
      return <path d="M66 92 L56 54 L80 64 L82 32 L102 54 L112 22 L124 52 L144 32 L146 62 L168 52 L156 94 Q150 62 110 60 Q74 62 66 92 Z" fill={p.hair} {...line} />;
    case "pony":
      return <path d="M64 98 Q58 34 110 32 Q162 34 156 98 L148 98 Q150 72 136 66 L128 78 L118 68 L108 80 L98 68 L88 78 L80 68 Q70 76 72 98 Z" fill={p.hair} {...line} />;
    case "lang":
    case "kurz":
    case "zopf":
      return <path d="M68 86 Q66 40 110 38 Q154 40 152 86 Q142 64 126 68 Q112 56 98 68 Q80 64 68 86 Z" fill={p.hair} {...line} />;
    case "locken":
      return <path d="M66 90 A12 12 0 0 1 70 66 A14 14 0 0 1 86 48 A16 16 0 0 1 110 40 A16 16 0 0 1 134 48 A14 14 0 0 1 150 66 A12 12 0 0 1 154 90 Q140 68 110 66 Q80 68 66 90 Z" fill={p.hair} {...line} />;
    case "irokese":
      return <path d="M98 52 L102 18 L110 34 L116 14 L122 52 Q110 46 98 52 Z" fill={p.hair} {...line} />;
    default:
      return null;
  }
}

function HeadgearBack({ id, p }: { id: string; p: Palette }) {
  if (id !== "kapuze") return null;
  return <path d="M58 98 Q54 28 110 24 Q166 28 162 98 Q164 126 152 138 L68 138 Q56 126 58 98 Z" fill={p.dark} {...line} />;
}

function HeadgearFront({ id, p }: { id: string; p: Palette }) {
  switch (id) {
    case "helm":
      return (
        <g>
          <path d="M63 88 Q64 36 110 34 Q156 36 157 88 L146 88 Q141 60 110 58 Q79 60 74 88 Z" fill={p.metal} {...line} />
          <path d="M102 16 Q110 6 118 16 L118 40 L102 40 Z" fill={p.main} {...line} />
        </g>
      );
    case "kapuze":
      return (
        <g>
          <path d="M64 100 Q62 40 110 38 Q158 40 156 100" stroke={OUTLINE} strokeWidth={14} fill="none" strokeLinecap="round" />
          <path d="M64 100 Q62 40 110 38 Q158 40 156 100" stroke={p.main} strokeWidth={7} fill="none" strokeLinecap="round" />
        </g>
      );
    case "stirnband":
      return (
        <g>
          <path d="M150 74 L174 62 L170 78 L178 92 L150 86 Z" fill={p.main} {...thin} />
          <path d="M67 76 Q110 60 153 76 L153 87 Q110 71 67 87 Z" fill={p.main} {...thin} />
        </g>
      );
    case "muetze":
      return (
        <g>
          <path d="M66 82 Q64 30 110 28 Q156 30 154 82 Z" fill={p.main} {...line} />
          <path d="M62 80 Q110 70 158 80 L158 92 Q110 82 62 92 Z" fill={p.dark} {...line} />
          <circle cx={110} cy={26} r={10} fill={p.light} {...line} />
        </g>
      );
    default:
      return null;
  }
}

// ---------- Accessoires ----------

function AccessoryBack({ id, p }: { id: string; p: Palette }) {
  if (id !== "umhang") return null;
  return <path d="M66 128 Q110 112 154 128 L182 214 Q110 232 38 214 Z" fill={p.dark} {...line} />;
}

function AccessoryNeck({ id }: { id: string }) {
  if (id !== "schal") return null;
  return (
    <g>
      <path d="M74 124 Q110 140 146 124 L152 134 Q110 152 68 134 Z" fill="#fbbf24" {...thin} />
      <path d="M72 132 L54 160 L68 158 L62 174 L82 138 Z" fill="#f59e0b" {...thin} />
    </g>
  );
}

function AccessoryFace({ id, p }: { id: string; p: Palette }) {
  if (id === "brille") {
    return (
      <g>
        <circle cx={94} cy={98} r={12} fill={p.light} fillOpacity={0.25} stroke={OUTLINE} strokeWidth={4} />
        <circle cx={126} cy={98} r={12} fill={p.light} fillOpacity={0.25} stroke={OUTLINE} strokeWidth={4} />
        <path d="M106 97 L114 97" stroke={OUTLINE} strokeWidth={4} />
      </g>
    );
  }
  if (id === "headset") {
    return (
      <g>
        <path d="M62 94 Q60 38 110 36 Q160 38 158 94" stroke={OUTLINE} strokeWidth={10} fill="none" />
        <path d="M62 94 Q60 38 110 36 Q160 38 158 94" stroke={p.light} strokeWidth={4} fill="none" />
        <rect x={52} y={84} width={18} height={28} rx={7} fill={p.main} {...thin} />
        <rect x={150} y={84} width={18} height={28} rx={7} fill={p.main} {...thin} />
        <path d="M60 110 Q66 128 92 122" stroke={OUTLINE} strokeWidth={4} fill="none" strokeLinecap="round" />
        <circle cx={93} cy={122} r={4} fill={p.main} stroke={OUTLINE} strokeWidth={2.5} />
      </g>
    );
  }
  return null;
}

// ---------- Zusammensetzen ----------

function Weapon({ base, p, emblem }: { base: string; p: Palette; emblem: string }): { right: ReactNode; left: ReactNode } {
  switch (base) {
    case "tank-schild":
      return { right: null, left: <Shield p={p} emblem={emblem} /> };
    case "tank-axt":
      return { right: <Axe p={p} />, left: null };
    case "dd-klinge":
      return { right: <Sword />, left: null };
    case "dd-bogen":
      return { right: null, left: <Bow /> };
    case "support-laterne":
      return { right: <Lantern />, left: null };
    default:
      return { right: <Staff p={p} />, left: null };
  }
}

/** Die komplette Figur als SVG-Gruppe (ohne äußeres <svg>), Ebenen von hinten nach vorn. */
export function HeroParts({ look }: { look: HeroLook }) {
  const p = paletteOf(look);
  const build = buildOf(look.base);
  const rig = RIGS[build];
  const hands = rig.hands[look.pose] ?? rig.hands.stehen;
  const angle = WEAPON_ANGLE[look.pose] ?? WEAPON_ANGLE.stehen;
  const weapon = Weapon({ base: look.base, p, emblem: look.emblem });
  // Laterne hängt immer senkrecht nach unten, der Stab steht fast gerade.
  const rightAngle = look.base === "support-laterne" ? 0 : look.base === "support-stab" ? angle / 3 : angle;
  const showHairBack = look.headgear !== "kapuze";
  const showHairFront = look.headgear !== "helm" || look.hair === "lang" || look.hair === "zopf";

  return (
    <g>
      <ellipse cx={110} cy={226} rx={66} ry={9} fill="#000000" opacity={0.35} />
      <AccessoryBack id={look.accessory} p={p} />
      <HeadgearBack id={look.headgear} p={p} />
      {showHairBack && <HairBack id={look.hair} p={p} />}
      <Legs build={build} />
      <Torso build={build} p={p} />
      <Emblem id={look.emblem} at={rig.emblem} />
      <ShoulderPads build={build} p={p} />
      <Arm from={rig.shoulderL} to={hands.L} p={p} />
      <Arm from={rig.shoulderR} to={hands.R} p={p} />
      {weapon.right && <g transform={`translate(${hands.R[0]} ${hands.R[1]}) rotate(${rightAngle})`}>{weapon.right}</g>}
      {weapon.left && <g transform={`translate(${hands.L[0]} ${hands.L[1]}) rotate(${look.base === "dd-bogen" ? 0 : -6})`}>{weapon.left}</g>}
      <AccessoryNeck id={look.accessory} />
      <circle cx={110} cy={86} r={44} fill={p.skin} {...line} />
      <path d="M110 130 A44 44 0 0 0 152 98 Q140 120 110 124 Z" fill={p.skinShade} opacity={0.6} />
      <Face id={look.face} />
      {showHairFront && <HairFront id={look.hair} p={p} />}
      <HeadgearFront id={look.headgear} p={p} />
      <AccessoryFace id={look.accessory} p={p} />
    </g>
  );
}
