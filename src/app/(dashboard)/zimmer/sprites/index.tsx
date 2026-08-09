"use client";

/**
 * Handgebaute Möbel-Grafiken der Bühne.
 *
 * Jedes Sprite zeichnet in seine eigene Box von 0,0 bis w,h (SVG-Einheiten,
 * bereits mit CELL multipliziert). Farben kommen AUSSCHLIESSLICH aus den
 * --room-* Custom Properties in globals.css — nur so funktioniert der
 * Theme-Wechsel. Leuchtende Teile (Bildschirme, Neon, LEDs) behalten bewusst
 * ihre Farbe in beiden Themes, weil sie selbst die Lichtquelle sind.
 *
 * Wer echte Pixelart hat, setzt einfach `imageUrl` am Katalog-Eintrag in
 * src/lib/room-items.ts — dann wird das Bild statt des Sprites gerendert.
 */

export interface SpriteProps { w: number; h: number }
type Sprite = (p: SpriteProps) => React.ReactElement;

const OUT = "var(--room-outline)";
const WOOD = "var(--room-wood)";
const WOOD_HI = "var(--room-wood-hi)";
const METAL = "var(--room-metal)";
const METAL_HI = "var(--room-metal-hi)";
const PLASTIC = "var(--room-plastic)";
const PLASTIC_HI = "var(--room-plastic-hi)";
const FABRIC = "var(--room-fabric)";
const SCREEN = "var(--room-screen)";
const ON = "var(--room-screen-on)";
const SHADE = "var(--room-shade)";

/**
 * Positionen der Vitrinen-Fächer, damit RoomStage die Sammlung einsetzen kann.
 * Koordinaten liegen im lokalen 240×576-Koordinatenraum des eigenständigen
 * Vitrinen-Panels (VitrinePanel in RoomStage.tsx — losgelöst vom 64px-Raster,
 * Höhe = volle Raumhöhe) und sind auf die vier Glasböden im Canva-Bild
 * public/room-items/vitrine.png abgestimmt — bei einem Bildwechsel neu
 * vermessen. Jeder Slot reserviert unter dem Icon Platz für `plaqueY` — die
 * kleine gravierte Namensplakette (siehe PlaqueLabel in RoomStage.tsx).
 */
export const VITRINE_SLOTS = {
  trophies: [
    { x: 22, y: 86, s: 40, plaqueY: 133 }, { x: 72, y: 86, s: 40, plaqueY: 133 },
    { x: 122, y: 86, s: 40, plaqueY: 133 }, { x: 173, y: 86, s: 40, plaqueY: 133 },
  ],
  collectibles: [
    { x: 32, y: 198, s: 50, plaqueY: 256 }, { x: 97, y: 198, s: 50, plaqueY: 256 }, { x: 162, y: 198, s: 50, plaqueY: 256 },
    { x: 32, y: 313, s: 50, plaqueY: 371 }, { x: 97, y: 313, s: 50, plaqueY: 371 }, { x: 162, y: 313, s: 50, plaqueY: 371 },
  ],
  badges: [
    { x: 22, y: 439, s: 32, plaqueY: 482 }, { x: 61, y: 439, s: 32, plaqueY: 482 }, { x: 101, y: 439, s: 32, plaqueY: 482 },
    { x: 140, y: 439, s: 32, plaqueY: 482 }, { x: 180, y: 439, s: 32, plaqueY: 482 },
  ],
} as const;

// ── Wand ─────────────────────────────────────────────────────────────────────

const PosterRetro: Sprite = ({ w, h }) => (
  <g>
    <rect x={4} y={4} width={w - 8} height={h - 8} fill={SCREEN} stroke={OUT} strokeWidth={2} />
    <rect x={10} y={10} width={w - 20} height={(h - 20) * 0.6} fill="var(--room-neon-violet)" opacity={0.85} />
    {/* Pixelfigur */}
    <g fill="var(--room-neon-amber)">
      <rect x={w / 2 - 18} y={26} width={36} height={10} />
      <rect x={w / 2 - 26} y={36} width={52} height={10} />
      <rect x={w / 2 - 18} y={46} width={10} height={10} />
      <rect x={w / 2 + 8} y={46} width={10} height={10} />
    </g>
    <rect x={14} y={h - 40} width={w - 28} height={5} fill={ON} opacity={0.8} />
    <rect x={14} y={h - 28} width={(w - 28) * 0.6} height={5} fill={ON} opacity={0.45} />
  </g>
);

const RegalHolz: Sprite = ({ w, h }) => (
  <g>
    <rect x={0} y={h - 18} width={w} height={12} fill={WOOD} stroke={OUT} strokeWidth={1.5} />
    <rect x={0} y={h - 18} width={w} height={4} fill={WOOD_HI} />
    {/* Krimskrams */}
    <rect x={16} y={h - 44} width={16} height={26} fill={PLASTIC_HI} />
    <rect x={38} y={h - 38} width={12} height={20} fill="var(--room-neon-teal)" opacity={0.7} />
    <rect x={w - 54} y={h - 40} width={20} height={22} fill={PLASTIC} />
    <circle cx={w - 22} cy={h - 28} r={9} fill="var(--room-neon-amber)" opacity={0.7} />
    <rect x={6} y={h - 6} width={8} height={6} fill={METAL} />
    <rect x={w - 14} y={h - 6} width={8} height={6} fill={METAL} />
  </g>
);

const Pokalregal: Sprite = ({ w, h }) => (
  <g>
    <rect x={0} y={h - 18} width={w} height={12} fill={WOOD} stroke={OUT} strokeWidth={1.5} />
    <rect x={0} y={h - 18} width={w} height={4} fill="var(--room-neon-amber)" opacity={0.55} />
    {[0, 1, 2].map(i => {
      const cx = 30 + i * ((w - 60) / 2);
      return (
        <g key={i} fill="var(--room-neon-amber)">
          <path d={`M ${cx - 10} ${h - 46} h 20 v 8 a 10 10 0 0 1 -20 0 z`} />
          <rect x={cx - 2} y={h - 32} width={4} height={8} />
          <rect x={cx - 9} y={h - 24} width={18} height={6} rx={1} />
        </g>
      );
    })}
  </g>
);

const LedStripe: Sprite = ({ w, h }) => (
  <g>
    <rect x={0} y={h / 2 - 6} width={w} height={12} rx={5} fill={PLASTIC} stroke={OUT} strokeWidth={1.5} />
    <g className="room-neon">
      {Array.from({ length: Math.floor(w / 22) }).map((_, i) => (
        <rect
          key={i} x={8 + i * 22} y={h / 2 - 3} width={12} height={6} rx={2}
          fill={[ "var(--room-neon-violet)", "var(--room-neon-teal)", "var(--room-neon-rose)", "var(--room-neon-amber)" ][i % 4]}
        />
      ))}
      <rect x={0} y={h / 2 - 8} width={w} height={16} rx={7} fill="var(--room-neon-violet)" opacity={0.18} />
    </g>
  </g>
);

const Nanoleaf: Sprite = ({ w, h }) => {
  const hex = (cx: number, cy: number, r: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 180) * (60 * i - 30);
      return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    }).join(" ");
  const cells: [number, number, string][] = [
    [w * 0.28, h * 0.30, "var(--room-neon-violet)"],
    [w * 0.62, h * 0.24, "var(--room-neon-teal)"],
    [w * 0.44, h * 0.58, "var(--room-neon-rose)"],
    [w * 0.76, h * 0.62, "var(--room-neon-amber)"],
  ];
  return (
    <g className="room-neon">
      {cells.map(([cx, cy, color], i) => (
        <polygon key={i} points={hex(cx, cy, Math.min(w, h) * 0.20)}
          fill={color} opacity={0.85} stroke={OUT} strokeWidth={1.5} />
      ))}
    </g>
  );
};

const NeonSchild: Sprite = ({ w, h }) => (
  <g>
    <rect x={4} y={h * 0.18} width={w - 8} height={h * 0.64} rx={6}
      fill={SCREEN} opacity={0.55} stroke={OUT} strokeWidth={1.5} />
    <text
      x={w / 2} y={h / 2} className="room-neon"
      textAnchor="middle" dominantBaseline="central"
      fontSize={h * 0.42} fontWeight="900" letterSpacing={3}
      fill="var(--room-neon-rose)"
      style={{ filter: "drop-shadow(0 0 6px var(--room-neon-rose))" }}
    >
      ZOCKEN
    </text>
  </g>
);

const LedWand: Sprite = ({ w, h }) => {
  const cols = 8, rows = 4;
  const cw = w / cols, ch = h / rows;
  const palette = ["var(--room-neon-violet)", "var(--room-neon-teal)", "var(--room-neon-rose)", "var(--room-neon-amber)"];
  return (
    <g>
      <rect x={0} y={0} width={w} height={h} rx={4} fill={SCREEN} stroke={OUT} strokeWidth={2} />
      <g className="room-neon">
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => (
            <rect
              key={`${r}-${c}`} x={c * cw + 3} y={r * ch + 3} width={cw - 6} height={ch - 6} rx={2}
              fill={palette[(r + c) % palette.length]}
              opacity={0.25 + ((r * cols + c) % 5) * 0.15}
            />
          ))
        )}
      </g>
    </g>
  );
};

const Whiteboard: Sprite = ({ w, h }) => (
  <g>
    <rect x={2} y={2} width={w - 4} height={h - 4} rx={3} fill="#f2f4f2" stroke={METAL} strokeWidth={4} />
    <g stroke="var(--room-neon-rose)" strokeWidth={3} fill="none" strokeLinecap="round">
      <path d={`M ${w * 0.15} ${h * 0.65} L ${w * 0.38} ${h * 0.3} L ${w * 0.6} ${h * 0.55}`} />
      <path d={`M ${w * 0.6} ${h * 0.55} l -8 -3 m 8 3 l -3 -8`} />
    </g>
    <g fill="#1e6b62">
      <circle cx={w * 0.72} cy={h * 0.34} r={5} />
      <circle cx={w * 0.82} cy={h * 0.52} r={5} />
      <circle cx={w * 0.68} cy={h * 0.62} r={5} />
    </g>
    <rect x={w * 0.12} y={h - 14} width={w * 0.3} height={5} rx={2} fill={METAL_HI} />
  </g>
);

// ── Boden: Möbel ─────────────────────────────────────────────────────────────

const SchreibtischAlt: Sprite = ({ w, h }) => (
  <g>
    <rect x={0} y={0} width={w} height={14} fill={WOOD} stroke={OUT} strokeWidth={1.5} />
    <rect x={0} y={0} width={w} height={4} fill={WOOD_HI} />
    <rect x={8} y={14} width={10} height={h - 14} fill={WOOD} />
    <rect x={w - 18} y={14} width={10} height={h - 20} fill={WOOD} />
    {/* Der berühmte Bierdeckel unter dem kurzen Bein */}
    <rect x={w - 20} y={h - 6} width={14} height={6} rx={1} fill="#b9925f" stroke={OUT} strokeWidth={1} />
    <rect x={22} y={h - 30} width={w - 48} height={4} fill={SHADE} />
  </g>
);

const SchreibtischEck: Sprite = ({ w, h }) => (
  <g>
    <rect x={0} y={0} width={w} height={16} rx={2} fill={PLASTIC} stroke={OUT} strokeWidth={1.5} />
    <rect x={0} y={0} width={w} height={4} fill={PLASTIC_HI} />
    <rect x={0} y={16} width={w} height={3} fill={ON} opacity={0.5} />
    <rect x={10} y={19} width={12} height={h - 19} fill={METAL} />
    <rect x={w - 22} y={19} width={12} height={h - 19} fill={METAL} />
    <rect x={22} y={h - 16} width={w - 44} height={8} rx={2} fill={METAL} opacity={0.6} />
    {/* Kabelkanal */}
    <rect x={w * 0.35} y={26} width={w * 0.3} height={6} rx={3} fill={SHADE} />
  </g>
);

const StuhlBuero: Sprite = ({ w, h }) => (
  <g>
    <rect x={w * 0.18} y={0} width={w * 0.64} height={h * 0.42} rx={5} fill={FABRIC} stroke={OUT} strokeWidth={1.5} />
    <rect x={w * 0.1} y={h * 0.44} width={w * 0.8} height={h * 0.12} rx={4} fill={FABRIC} stroke={OUT} strokeWidth={1.5} />
    <rect x={w * 0.45} y={h * 0.56} width={w * 0.1} height={h * 0.24} fill={METAL} />
    <path d={`M ${w * 0.14} ${h} L ${w * 0.5} ${h * 0.8} L ${w * 0.86} ${h} Z`} fill={METAL} stroke={OUT} strokeWidth={1.5} />
  </g>
);

const StuhlGaming: Sprite = ({ w, h }) => (
  <g>
    <rect x={w * 0.12} y={0} width={w * 0.76} height={h * 0.5} rx={7} fill={SCREEN} stroke="var(--room-neon-rose)" strokeWidth={2.5} />
    <rect x={w * 0.28} y={h * 0.06} width={w * 0.44} height={h * 0.36} rx={4} fill={FABRIC} />
    <rect x={w * 0.06} y={h * 0.52} width={w * 0.88} height={h * 0.13} rx={5} fill={SCREEN} stroke="var(--room-neon-rose)" strokeWidth={2} />
    <rect x={w * 0.45} y={h * 0.65} width={w * 0.1} height={h * 0.18} fill={METAL} />
    <g className="room-neon">
      <ellipse cx={w * 0.5} cy={h * 0.9} rx={w * 0.42} ry={h * 0.05} fill="var(--room-neon-rose)" opacity={0.35} />
    </g>
    <path d={`M ${w * 0.1} ${h} L ${w * 0.5} ${h * 0.83} L ${w * 0.9} ${h} Z`} fill={METAL} stroke={OUT} strokeWidth={1.5} />
  </g>
);

const PcBillig: Sprite = ({ w, h }) => (
  <g>
    <rect x={w * 0.1} y={h * 0.06} width={w * 0.8} height={h * 0.9} rx={2} fill="#c9c4b4" stroke={OUT} strokeWidth={1.5} />
    <rect x={w * 0.18} y={h * 0.14} width={w * 0.64} height={h * 0.08} rx={1} fill="#a8a396" />
    <rect x={w * 0.18} y={h * 0.26} width={w * 0.64} height={h * 0.06} rx={1} fill="#a8a396" />
    <circle cx={w * 0.5} cy={h * 0.46} r={w * 0.14} fill="#8e8a7e" />
    <circle cx={w * 0.5} cy={h * 0.46} r={w * 0.05} fill="#6f6c62" />
    <circle className="room-led" cx={w * 0.5} cy={h * 0.68} r={3.5} fill="var(--room-neon-amber)" />
    <rect x={w * 0.28} y={h * 0.78} width={w * 0.44} height={4} rx={2} fill="#8e8a7e" />
  </g>
);

const PcGaming: Sprite = ({ w, h }) => (
  <g>
    <rect x={w * 0.1} y={h * 0.04} width={w * 0.8} height={h * 0.92} rx={4} fill={SCREEN} stroke={OUT} strokeWidth={1.5} />
    {/* Glasseitenteil mit RGB */}
    <rect x={w * 0.2} y={h * 0.12} width={w * 0.6} height={h * 0.74} rx={3} fill="var(--room-neon-violet)" opacity={0.22} />
    <g className="room-neon">
      <rect x={w * 0.24} y={h * 0.18} width={w * 0.52} height={5} rx={2} fill="var(--room-neon-violet)" />
      <circle cx={w * 0.5} cy={h * 0.45} r={w * 0.17} fill="none" stroke="var(--room-neon-teal)" strokeWidth={3} />
      <circle cx={w * 0.5} cy={h * 0.7} r={w * 0.12} fill="none" stroke="var(--room-neon-violet)" strokeWidth={3} />
    </g>
    <circle className="room-led" cx={w * 0.5} cy={h * 0.9} r={3} fill={ON} />
  </g>
);

const PcHighend: Sprite = ({ w, h }) => (
  <g>
    <rect x={w * 0.06} y={h * 0.02} width={w * 0.88} height={h * 0.96} rx={5} fill={SCREEN} stroke={ON} strokeWidth={2} />
    <rect x={w * 0.14} y={h * 0.09} width={w * 0.72} height={h * 0.82} rx={3} fill="var(--room-neon-teal)" opacity={0.18} />
    <g className="room-neon">
      {/* Wasserkühlung */}
      <rect x={w * 0.2} y={h * 0.14} width={w * 0.6} height={h * 0.1} rx={3} fill="var(--room-neon-teal)" opacity={0.8} />
      <path d={`M ${w * 0.3} ${h * 0.26} q ${w * 0.2} ${h * 0.08} ${w * 0.4} 0`}
        fill="none" stroke="var(--room-neon-teal)" strokeWidth={3} />
      {[0.44, 0.62, 0.8].map((cy, i) => (
        <circle key={i} cx={w * 0.5} cy={h * cy} r={w * 0.15} fill="none"
          stroke={i === 1 ? "var(--room-neon-violet)" : "var(--room-neon-teal)"} strokeWidth={3} />
      ))}
    </g>
    <circle className="room-led" cx={w * 0.5} cy={h * 0.95} r={3} fill={ON} />
  </g>
);

// ── Boden: Bildschirme ───────────────────────────────────────────────────────

const Roehrenmonitor: Sprite = ({ w, h }) => (
  <g>
    {/* Tiefe Röhre hinten */}
    <rect x={w * 0.2} y={h * 0.14} width={w * 0.6} height={h * 0.52} rx={3} fill="#b8b3a3" />
    <rect x={w * 0.06} y={h * 0.08} width={w * 0.78} height={h * 0.64} rx={5} fill="#d2ccbb" stroke={OUT} strokeWidth={1.5} />
    <rect x={w * 0.13} y={h * 0.15} width={w * 0.64} height={h * 0.44} rx={4} fill={SCREEN} />
    {/* Bildinhalt */}
    <clipPath id="crt-clip">
      <rect x={w * 0.13} y={h * 0.15} width={w * 0.64} height={h * 0.44} rx={4} />
    </clipPath>
    <g clipPath="url(#crt-clip)">
      <rect x={w * 0.13} y={h * 0.15} width={w * 0.64} height={h * 0.44} fill={ON} opacity={0.16} />
      {[0.24, 0.34, 0.44].map((y, i) => (
        <rect key={i} x={w * 0.18} y={h * y} width={w * (0.5 - i * 0.12)} height={2.5} fill={ON} opacity={0.85} />
      ))}
      <rect className="room-scanline" x={w * 0.13} y={h * 0.1} width={w * 0.64} height={h * 0.06}
        fill={ON} opacity={0.28} />
    </g>
    <circle className="room-led" cx={w * 0.45} cy={h * 0.66} r={2.5} fill={ON} />
    <rect x={w * 0.3} y={h * 0.72} width={w * 0.32} height={h * 0.1} fill="#b8b3a3" />
    <rect x={w * 0.2} y={h * 0.82} width={w * 0.52} height={h * 0.08} rx={2} fill="#c6c0b0" stroke={OUT} strokeWidth={1.5} />
  </g>
);

const MonitorFlach: Sprite = ({ w, h }) => (
  <g>
    <rect x={w * 0.06} y={h * 0.12} width={w * 0.88} height={h * 0.56} rx={3} fill={PLASTIC} stroke={OUT} strokeWidth={1.5} />
    <rect x={w * 0.1} y={h * 0.16} width={w * 0.8} height={h * 0.46} rx={2} fill={SCREEN} />
    <rect x={w * 0.1} y={h * 0.16} width={w * 0.8} height={h * 0.46} rx={2} fill={ON} opacity={0.13} />
    <rect x={w * 0.16} y={h * 0.24} width={w * 0.4} height={2.5} fill={ON} opacity={0.7} />
    <rect x={w * 0.16} y={h * 0.32} width={w * 0.55} height={2.5} fill={ON} opacity={0.45} />
    <rect x={w * 0.44} y={h * 0.68} width={w * 0.12} height={h * 0.16} fill={PLASTIC_HI} />
    <rect x={w * 0.26} y={h * 0.84} width={w * 0.48} height={h * 0.07} rx={2} fill={PLASTIC_HI} stroke={OUT} strokeWidth={1.2} />
  </g>
);

const Monitor144: Sprite = ({ w, h }) => (
  <g>
    <rect x={w * 0.03} y={h * 0.1} width={w * 0.94} height={h * 0.58} rx={3} fill={SCREEN} stroke="var(--room-neon-violet)" strokeWidth={2} />
    <rect x={w * 0.07} y={h * 0.14} width={w * 0.86} height={h * 0.48} rx={2} fill={SCREEN} />
    <rect x={w * 0.07} y={h * 0.14} width={w * 0.86} height={h * 0.48} rx={2} fill="var(--room-neon-violet)" opacity={0.2} />
    <rect x={w * 0.12} y={h * 0.22} width={w * 0.5} height={2.5} fill="var(--room-neon-violet)" opacity={0.9} />
    <rect x={w * 0.12} y={h * 0.3} width={w * 0.66} height={2.5} fill={ON} opacity={0.6} />
    <rect x={w * 0.12} y={h * 0.38} width={w * 0.38} height={2.5} fill={ON} opacity={0.4} />
    <text x={w * 0.5} y={h * 0.55} textAnchor="middle" fontSize={h * 0.1} fontWeight="700"
      fill="var(--room-neon-violet)" opacity={0.9}>144</text>
    <rect x={w * 0.44} y={h * 0.68} width={w * 0.12} height={h * 0.16} fill={METAL} />
    <path d={`M ${w * 0.24} ${h * 0.9} L ${w * 0.5} ${h * 0.82} L ${w * 0.76} ${h * 0.9} Z`} fill={METAL} stroke={OUT} strokeWidth={1.2} />
  </g>
);

// ── Boden: Peripherie ────────────────────────────────────────────────────────

const Steckdosenleiste: Sprite = ({ w, h }) => (
  <g>
    <rect x={4} y={h * 0.52} width={w - 8} height={h * 0.3} rx={4} fill="#e6e2d8" stroke={OUT} strokeWidth={1.5} />
    {Array.from({ length: 4 }).map((_, i) => (
      <rect key={i} x={14 + i * ((w - 36) / 4)} y={h * 0.58} width={14} height={h * 0.18} rx={2} fill="#9c988c" />
    ))}
    <rect x={w - 16} y={h * 0.56} width={9} height={h * 0.22} rx={2} fill="var(--room-neon-rose)" />
    <path d={`M 4 ${h * 0.66} q -8 6 -4 ${h * 0.3}`} fill="none" stroke={SCREEN} strokeWidth={3} />
  </g>
);

const Webcam: Sprite = ({ w, h }) => (
  <g>
    <rect x={w * 0.22} y={h * 0.62} width={w * 0.56} height={h * 0.14} rx={3} fill={PLASTIC} stroke={OUT} strokeWidth={1.2} />
    <rect x={w * 0.46} y={h * 0.46} width={w * 0.08} height={h * 0.18} fill={METAL} />
    <rect x={w * 0.24} y={h * 0.2} width={w * 0.52} height={h * 0.28} rx={7} fill={SCREEN} stroke={OUT} strokeWidth={1.5} />
    <circle cx={w * 0.5} cy={h * 0.34} r={w * 0.1} fill="#0f1a24" stroke={METAL_HI} strokeWidth={2} />
    <circle cx={w * 0.53} cy={h * 0.31} r={w * 0.03} fill={ON} opacity={0.8} />
    <circle className="room-led" cx={w * 0.68} cy={h * 0.28} r={2.5} fill="var(--room-neon-rose)" />
  </g>
);

const Headset: Sprite = ({ w, h }) => (
  <g>
    <path d={`M ${w * 0.22} ${h * 0.62} v ${-h * 0.16} a ${w * 0.28} ${h * 0.28} 0 0 1 ${w * 0.56} 0 v ${h * 0.16}`}
      fill="none" stroke={SCREEN} strokeWidth={7} strokeLinecap="round" />
    <rect x={w * 0.12} y={h * 0.5} width={w * 0.2} height={h * 0.3} rx={6} fill={FABRIC} stroke={OUT} strokeWidth={1.5} />
    <rect x={w * 0.68} y={h * 0.5} width={w * 0.2} height={h * 0.3} rx={6} fill={FABRIC} stroke={OUT} strokeWidth={1.5} />
    <g className="room-neon">
      <circle cx={w * 0.22} cy={h * 0.65} r={w * 0.05} fill={ON} />
      <circle cx={w * 0.78} cy={h * 0.65} r={w * 0.05} fill={ON} />
    </g>
    <path d={`M ${w * 0.3} ${h * 0.74} q ${w * 0.1} ${h * 0.14} ${w * 0.2} ${h * 0.08}`}
      fill="none" stroke={SCREEN} strokeWidth={4} strokeLinecap="round" />
  </g>
);

const TastaturMech: Sprite = ({ w, h }) => (
  <g>
    <rect x={w * 0.06} y={h * 0.54} width={w * 0.88} height={h * 0.28} rx={3} fill={SCREEN} stroke={OUT} strokeWidth={1.5} />
    <g className="room-neon">
      {Array.from({ length: 3 }).map((_, r) =>
        Array.from({ length: 8 }).map((_, c) => (
          <rect key={`${r}-${c}`}
            x={w * 0.1 + c * (w * 0.8 / 8) + 1.5} y={h * 0.57 + r * (h * 0.22 / 3)}
            width={w * 0.8 / 8 - 3} height={h * 0.22 / 3 - 1.5} rx={1}
            fill={["var(--room-neon-violet)", "var(--room-neon-teal)", "var(--room-neon-rose)"][(r + c) % 3]}
            opacity={0.75}
          />
        ))
      )}
    </g>
  </g>
);

const Mikrofon: Sprite = ({ w, h }) => (
  <g>
    <rect x={w * 0.3} y={h * 0.8} width={w * 0.4} height={h * 0.1} rx={3} fill={METAL} stroke={OUT} strokeWidth={1.2} />
    <rect x={w * 0.46} y={h * 0.58} width={w * 0.08} height={h * 0.24} fill={METAL_HI} />
    <rect x={w * 0.32} y={h * 0.14} width={w * 0.36} height={h * 0.46} rx={w * 0.18} fill={SCREEN} stroke={METAL_HI} strokeWidth={2} />
    <g stroke={METAL_HI} strokeWidth={1.5} opacity={0.8}>
      {[0.22, 0.3, 0.38, 0.46].map((y, i) => (
        <line key={i} x1={w * 0.35} y1={h * y} x2={w * 0.65} y2={h * y} />
      ))}
    </g>
    <circle className="room-led" cx={w * 0.5} cy={h * 0.53} r={2.5} fill="var(--room-neon-rose)" />
  </g>
);

const Ringlicht: Sprite = ({ w, h }) => (
  <g>
    <rect x={w * 0.44} y={h * 0.42} width={w * 0.12} height={h * 0.5} fill={METAL} />
    <path d={`M ${w * 0.2} ${h} L ${w * 0.5} ${h * 0.9} L ${w * 0.8} ${h} Z`} fill={METAL} stroke={OUT} strokeWidth={1.2} />
    <circle cx={w * 0.5} cy={h * 0.26} r={w * 0.38} fill="none" stroke={PLASTIC} strokeWidth={w * 0.14} />
    <circle className="room-neon" cx={w * 0.5} cy={h * 0.26} r={w * 0.38}
      fill="none" stroke="#fff8e6" strokeWidth={w * 0.08} opacity={0.9}
      style={{ filter: "drop-shadow(0 0 5px rgba(255,248,230,0.85))" }} />
  </g>
);

const Capture: Sprite = ({ w, h }) => (
  <g>
    <rect x={w * 0.14} y={h * 0.5} width={w * 0.72} height={h * 0.32} rx={4} fill={SCREEN} stroke={OUT} strokeWidth={1.5} />
    <rect x={w * 0.2} y={h * 0.56} width={w * 0.6} height={h * 0.06} rx={2} fill="var(--room-neon-rose)" opacity={0.85} />
    {[0.3, 0.5, 0.7].map((x, i) => (
      <rect key={i} x={w * x - 4} y={h * 0.68} width={8} height={h * 0.08} rx={1} fill={METAL_HI} />
    ))}
    <circle className="room-led" cx={w * 0.78} cy={h * 0.72} r={2.5} fill={ON} />
  </g>
);

const Streamdeck: Sprite = ({ w, h }) => (
  <g>
    <rect x={w * 0.14} y={h * 0.42} width={w * 0.72} height={h * 0.42} rx={4} fill={SCREEN} stroke={OUT} strokeWidth={1.5} />
    <g className="room-neon">
      {Array.from({ length: 3 }).map((_, r) =>
        Array.from({ length: 5 }).map((_, c) => (
          <rect key={`${r}-${c}`}
            x={w * 0.18 + c * (w * 0.64 / 5) + 1} y={h * 0.46 + r * (h * 0.34 / 3)}
            width={w * 0.64 / 5 - 2} height={h * 0.34 / 3 - 1.5} rx={1.5}
            fill={["var(--room-neon-violet)", "var(--room-neon-teal)", "var(--room-neon-amber)", "var(--room-neon-rose)"][(r * 5 + c) % 4]}
            opacity={0.8}
          />
        ))
      )}
    </g>
  </g>
);

// ── Boden: Konsolen ──────────────────────────────────────────────────────────

const KonsoleRetro: Sprite = ({ w, h }) => (
  <g>
    <rect x={w * 0.1} y={h * 0.48} width={w * 0.8} height={h * 0.34} rx={3} fill="#cfc9b8" stroke={OUT} strokeWidth={1.5} />
    <rect x={w * 0.2} y={h * 0.3} width={w * 0.36} height={h * 0.2} rx={2} fill="#3b3222" stroke={OUT} strokeWidth={1.2} />
    <rect x={w * 0.18} y={h * 0.56} width={w * 0.3} height={h * 0.06} rx={1} fill="#a39d8d" />
    <circle className="room-led" cx={w * 0.72} cy={h * 0.6} r={3} fill="var(--room-neon-rose)" />
    <rect x={w * 0.6} y={h * 0.7} width={w * 0.22} height={h * 0.06} rx={2} fill="#a39d8d" />
  </g>
);

const KonsoleNeu: Sprite = ({ w, h }) => (
  <g>
    <rect x={w * 0.24} y={h * 0.16} width={w * 0.5} height={h * 0.68} rx={5} fill={SCREEN} stroke={OUT} strokeWidth={1.5} />
    <rect x={w * 0.3} y={h * 0.2} width={w * 0.1} height={h * 0.6} rx={3} fill={PLASTIC_HI} opacity={0.7} />
    <g className="room-neon">
      <rect x={w * 0.44} y={h * 0.24} width={3} height={h * 0.52} fill={ON} />
    </g>
    <ellipse cx={w * 0.5} cy={h * 0.86} rx={w * 0.26} ry={h * 0.05} fill={METAL} stroke={OUT} strokeWidth={1.2} />
  </g>
);

// ── Boden: Möbel & Deko ──────────────────────────────────────────────────────

const Vitrine: Sprite = ({ w, h }) => (
  <g>
    <rect x={2} y={2} width={w - 4} height={h - 4} rx={4} fill={WOOD} stroke={OUT} strokeWidth={2} />
    <rect x={8} y={8} width={w - 16} height={h - 16} rx={2} fill={SCREEN} opacity={0.55} />
    {/* Fachböden */}
    {[64, 120, 162].map((y, i) => (
      <rect key={i} x={8} y={y} width={w - 16} height={4} fill={WOOD_HI} />
    ))}
    {/* Glasspiegelung */}
    <path d={`M ${w * 0.12} ${h - 10} L ${w * 0.5} 10 L ${w * 0.66} 10 L ${w * 0.28} ${h - 10} Z`}
      fill="#ffffff" opacity={0.05} />
    <g className="room-neon">
      <rect x={10} y={10} width={w - 20} height={3} rx={1.5} fill="var(--room-neon-amber)" opacity={0.75} />
    </g>
  </g>
);

const Pflanze: Sprite = ({ w, h }) => (
  <g>
    <path d={`M ${w * 0.24} ${h * 0.66} h ${w * 0.52} l ${-w * 0.08} ${h * 0.34} h ${-w * 0.36} z`}
      fill="#8a5a3b" stroke={OUT} strokeWidth={1.2} />
    <rect x={w * 0.2} y={h * 0.62} width={w * 0.6} height={h * 0.08} rx={2} fill="#a06a45" />
    <g stroke="#4a7c59" strokeWidth={3.5} fill="none" strokeLinecap="round">
      <path d={`M ${w * 0.5} ${h * 0.62} L ${w * 0.5} ${h * 0.24}`} />
      <path d={`M ${w * 0.5} ${h * 0.44} q ${-w * 0.24} ${-h * 0.1} ${-w * 0.28} ${-h * 0.2}`} />
      <path d={`M ${w * 0.5} ${h * 0.36} q ${w * 0.22} ${-h * 0.08} ${w * 0.26} ${-h * 0.18}`} />
    </g>
    {/* Ein Blatt hat aufgegeben */}
    <path d={`M ${w * 0.5} ${h * 0.52} q ${w * 0.18} ${h * 0.04} ${w * 0.2} ${h * 0.12}`}
      stroke="#7a6a3a" strokeWidth={3} fill="none" strokeLinecap="round" />
  </g>
);

const Teppich: Sprite = ({ w, h }) => (
  <g>
    <rect x={2} y={h * 0.3} width={w - 4} height={h * 0.6} rx={4} fill="#6b3a4a" stroke={OUT} strokeWidth={1.2} />
    <rect x={10} y={h * 0.38} width={w - 20} height={h * 0.44} rx={2} fill="none" stroke="#8e5468" strokeWidth={2} />
    {/* Flecken mit Geschichte */}
    <ellipse cx={w * 0.3} cy={h * 0.58} rx={w * 0.06} ry={h * 0.14} fill="#4d2938" opacity={0.75} />
    <ellipse cx={w * 0.62} cy={h * 0.66} rx={w * 0.04} ry={h * 0.1} fill="#4d2938" opacity={0.6} />
    <ellipse cx={w * 0.78} cy={h * 0.5} rx={w * 0.03} ry={h * 0.08} fill="#4d2938" opacity={0.5} />
  </g>
);

const Kaffeemaschine: Sprite = ({ w, h }) => (
  <g>
    <rect x={w * 0.24} y={h * 0.22} width={w * 0.52} height={h * 0.4} rx={3} fill={SCREEN} stroke={OUT} strokeWidth={1.5} />
    <rect x={w * 0.3} y={h * 0.28} width={w * 0.4} height={h * 0.12} rx={2} fill="var(--room-neon-teal)" opacity={0.55} />
    <rect x={w * 0.2} y={h * 0.62} width={w * 0.6} height={h * 0.2} rx={2} fill={PLASTIC} stroke={OUT} strokeWidth={1.2} />
    <rect x={w * 0.36} y={h * 0.66} width={w * 0.28} height={h * 0.12} rx={2} fill="#6b3f22" />
    <circle className="room-led" cx={w * 0.7} cy={h * 0.55} r={2.5} fill="var(--room-neon-rose)" />
  </g>
);

const Rollator: Sprite = ({ w, h }) => (
  <g>
    <rect x={w * 0.18} y={h * 0.3} width={w * 0.64} height={h * 0.1} rx={4} fill={METAL_HI} stroke={OUT} strokeWidth={1.5} />
    <rect x={w * 0.24} y={h * 0.4} width={6} height={h * 0.36} fill={METAL} />
    <rect x={w * 0.7} y={h * 0.4} width={6} height={h * 0.36} fill={METAL} />
    <rect x={w * 0.28} y={h * 0.54} width={w * 0.44} height={h * 0.14} rx={3} fill={FABRIC} stroke={OUT} strokeWidth={1.2} />
    {/* Spoiler */}
    <rect x={w * 0.2} y={h * 0.22} width={w * 0.6} height={5} rx={2} fill="var(--room-neon-violet)" />
    <circle cx={w * 0.27} cy={h * 0.8} r={h * 0.09} fill={SCREEN} stroke={METAL_HI} strokeWidth={2} />
    <circle cx={w * 0.73} cy={h * 0.8} r={h * 0.09} fill={SCREEN} stroke={METAL_HI} strokeWidth={2} />
    {/* Unterbodenbeleuchtung */}
    <g className="room-neon">
      <ellipse cx={w * 0.5} cy={h * 0.92} rx={w * 0.34} ry={h * 0.05}
        fill="var(--room-neon-violet)" opacity={0.55}
        style={{ filter: "drop-shadow(0 0 6px var(--room-neon-violet))" }} />
    </g>
    {/* Getränkehalter */}
    <rect x={w * 0.78} y={h * 0.36} width={w * 0.12} height={h * 0.14} rx={2} fill={METAL} />
  </g>
);

// ── Rückfall ─────────────────────────────────────────────────────────────────

/**
 * Platzhalter für Items, deren Grafik noch fehlt. Damit lässt sich der Katalog
 * erweitern, ohne dass sofort ein Sprite existieren muss — der Raum bleibt
 * benutzbar, das Möbelstück ist als Kästchen sichtbar.
 */
const Fallback: Sprite = ({ w, h }) => (
  <g>
    <path
      d={`M 6 6 h ${w - 20} l 8 8 v ${h - 20} h ${-(w - 20)} l -8 -8 z`}
      fill={PLASTIC} stroke={OUT} strokeWidth={2}
    />
    <rect x={14} y={14} width={w - 28} height={4} rx={2} fill={ON} opacity={0.5} />
    <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * 0.16} fill="none" stroke={METAL_HI} strokeWidth={2} />
  </g>
);

export const SPRITES: Record<string, Sprite> = {
  // Wand
  poster_retro:     PosterRetro,
  regal_holz:       RegalHolz,
  pokalregal:       Pokalregal,
  led_stripe:       LedStripe,
  nanoleaf:         Nanoleaf,
  neon_schild:      NeonSchild,
  led_wand:         LedWand,
  whiteboard:       Whiteboard,
  // Boden
  schreibtisch_alt: SchreibtischAlt,
  schreibtisch_eck: SchreibtischEck,
  stuhl_buero:      StuhlBuero,
  stuhl_gaming:     StuhlGaming,
  pc_billig:        PcBillig,
  pc_gaming:        PcGaming,
  pc_highend:       PcHighend,
  roehrenmonitor:   Roehrenmonitor,
  monitor_flach:    MonitorFlach,
  monitor_144:      Monitor144,
  steckdosenleiste: Steckdosenleiste,
  webcam:           Webcam,
  headset:          Headset,
  tastatur_mech:    TastaturMech,
  mikrofon:         Mikrofon,
  ringlicht:        Ringlicht,
  capture:          Capture,
  streamdeck:       Streamdeck,
  konsole_retro:    KonsoleRetro,
  konsole_neu:      KonsoleNeu,
  vitrine:          Vitrine,
  pflanze:          Pflanze,
  teppich:          Teppich,
  kaffeemaschine:   Kaffeemaschine,
  rollator:         Rollator,
  __fallback:       Fallback,
};
