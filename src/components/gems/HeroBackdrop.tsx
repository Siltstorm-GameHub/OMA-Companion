// ============================================
// OMA Gems — Kartenhintergründe im Cartoon-Stil (ersetzen die Pixel-Szenen)
// ============================================
// Flache Szenen mit derselben dunklen Outline wie die Helden (parts.tsx). Die Fläche ist 3:4 wie eine
// Karte und wird per „slice“ auf jede Rahmengröße zugeschnitten; der Horizont liegt so tief, dass
// der Held davor steht. Welche Szene eine Karte zeigt, steht im Look (look.backdrop).

import { useId } from "react";
import { OUTLINE } from "@/lib/gems/hero/parts";

const S = { stroke: OUTLINE, strokeWidth: 3, strokeLinejoin: "round" as const };

const cloud = (x: number, y: number, s = 1) => (
  <path
    {...S}
    fill="#ffffff"
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M0 0 q0 -16 18 -16 q6 -14 24 -10 q12 -10 26 2 q18 0 18 14 q0 10 -12 10 h-62 q-12 0 -12 -10z"
  />
);

const pine = (x: number, y: number, h: number, fill: string, key?: number) => (
  <g key={key}>
    <rect {...S} x={x - h * 0.06} y={y - h * 0.18} width={h * 0.12} height={h * 0.2} fill="#7a4a24" />
    <path {...S} fill={fill} d={`M${x} ${y - h} L${x + h * 0.32} ${y - h * 0.15} L${x - h * 0.32} ${y - h * 0.15}Z`} />
  </g>
);

function Scene({ id }: { id: string }) {
  switch (id) {
    case "wald":
      return (
        <>
          {[20, 70, 125, 180, 235, 285].map((x, i) => pine(x, 262, 120 + (i % 2) * 30, "#2f8f5b", i))}
          <path {...S} fill="#5cb85c" d="M-10 268 Q150 250 310 270 V400 H-10Z" />
          {[40, 260].map((x, i) => pine(x, 318, 150, "#237a4b", i))}
          <path {...S} fill="#4aa34a" d="M-10 305 Q150 285 310 308 V400 H-10Z" />
        </>
      );
    case "berge":
      return (
        <>
          {cloud(40, 95, 0.8)}
          <path {...S} fill="#8b97c0" d="M-20 285 L85 150 L190 285Z" />
          <path {...S} fill="#7280ad" d="M100 285 L215 115 L330 285Z" />
          <path {...S} fill="#ffffff" d="M215 115 L242 155 L228 150 L215 164 L202 150 L188 155Z" />
          <path {...S} fill="#ffffff" d="M85 150 L106 177 L95 174 L85 184 L75 174 L64 177Z" />
          <path {...S} fill="#79b860" d="M-10 285 Q150 262 310 288 V400 H-10Z" />
        </>
      );
    case "kueste":
      return (
        <>
          <circle {...S} cx="80" cy="222" r="30" fill="#ffb347" />
          {cloud(190, 90, 0.9)}
          <rect {...S} x="-10" y="232" width="320" height="80" fill="#3aa0d8" />
          <path stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" d="M30 255 q10 -6 20 0 M150 248 q10 -6 20 0 M230 265 q10 -6 20 0 M90 275 q10 -6 20 0" />
          <path {...S} fill="#f2d38b" d="M-10 300 Q150 278 310 304 V400 H-10Z" />
        </>
      );
    case "wueste":
      return (
        <>
          <circle {...S} cx="215" cy="105" r="38" fill="#fff1b8" />
          <path {...S} fill="#e9a654" d="M-10 280 Q90 230 190 275 T320 262 V400 H-10Z" />
          <g>
            <rect {...S} x="232" y="210" width="18" height="75" rx="9" fill="#4f9d4a" />
            <rect {...S} x="214" y="232" width="14" height="30" rx="7" fill="#4f9d4a" />
            <rect {...S} x="254" y="222" width="14" height="28" rx="7" fill="#4f9d4a" />
          </g>
          <path {...S} fill="#d98c3c" d="M-10 310 Q120 282 310 312 V400 H-10Z" />
        </>
      );
    case "burg":
      return (
        <>
          <circle {...S} cx="60" cy="90" r="18" fill="#ffe0a3" />
          <path
            {...S}
            fill="#4a3a66"
            d="M70 270 V170 h12 v-12 h12 v12 h12 v-12 h12 v12 h12 V195 h44 V170 h12 v-12 h12 v12 h12 v-12 h12 v12 h12 V270Z"
          />
          <path {...S} fill="#3a2d52" d="M140 270 V232 q20 -20 40 0 V270Z" />
          <rect {...S} x="92" y="200" width="12" height="18" rx="6" fill="#ffd166" />
          <rect {...S} x="216" y="200" width="12" height="18" rx="6" fill="#ffd166" />
          <path {...S} fill="#ef4444" d="M106 158 V128 l22 8 l-22 8" />
          <path {...S} fill="#3f6b4a" d="M-10 272 Q150 252 310 274 V400 H-10Z" />
        </>
      );
    case "nacht":
      return (
        <>
          {[[30, 60], [90, 35], [150, 80], [260, 45], [220, 130], [40, 150], [120, 170], [280, 180]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 3 : 2} fill="#fff6d5" />
          ))}
          <path {...S} fill="#fff3c4" d="M205 66 a30 30 0 1 0 34 42 a24 24 0 1 1 -34 -42Z" />
          <path {...S} fill="#29436b" d="M-10 275 Q80 225 170 262 T320 250 V400 H-10Z" />
          <path {...S} fill="#1d3152" d="M-10 305 Q150 278 310 306 V400 H-10Z" />
        </>
      );
    case "vulkan":
      return (
        <>
          <circle cx="135" cy="95" r="18" fill="#6b5a5a" opacity="0.8" />
          <circle cx="160" cy="70" r="24" fill="#6b5a5a" opacity="0.7" />
          <circle cx="140" cy="40" r="20" fill="#6b5a5a" opacity="0.6" />
          <path {...S} fill="#4a3434" d="M20 290 L118 140 L182 140 L280 290Z" />
          <path {...S} fill="#ff7a1a" d="M118 140 Q150 128 182 140 L172 162 Q150 172 128 162Z" />
          <path {...S} fill="#ff9b2f" d="M160 165 q-6 30 6 50 q8 20 -2 45 l14 0 q10 -30 -2 -50 q-8 -18 -2 -45Z" />
          <path {...S} fill="#3b2a2a" d="M-10 292 Q150 270 310 294 V400 H-10Z" />
        </>
      );
    default: // wiese
      return (
        <>
          <circle {...S} cx="232" cy="78" r="26" fill="#ffd84d" />
          {cloud(30, 110)}
          {cloud(150, 150, 0.7)}
          <path {...S} fill="#7fd67a" d="M-10 272 Q70 215 160 255 T320 236 V400 H-10Z" />
          <path {...S} fill="#56b456" d="M-10 302 Q90 262 190 296 T320 292 V400 H-10Z" />
          {[[40, 330, "#f472b6"], [110, 350, "#fde047"], [230, 340, "#ffffff"], [270, 365, "#f472b6"]].map(([x, y, c], i) => (
            <circle key={i} {...S} strokeWidth={2} cx={x as number} cy={y as number} r="5" fill={c as string} />
          ))}
        </>
      );
  }
}

const SKY: Record<string, [string, string]> = {
  wiese: ["#6ec6f5", "#d4f0ff"],
  wald: ["#8fd3c7", "#e5f6ee"],
  berge: ["#9cc3ef", "#eaf2fb"],
  kueste: ["#7fd0f0", "#fff1d0"],
  wueste: ["#ffb36b", "#ffe6b0"],
  burg: ["#5b3f8f", "#e79c8a"],
  nacht: ["#0f1c44", "#2f4a8a"],
  vulkan: ["#3a1420", "#d9542b"],
};

/** Kartenhintergrund; liegt absolut hinter der Figur und füllt den Rahmen. */
export default function HeroBackdrop({ id, className }: { id: string; className?: string }) {
  const gradient = `hb-${useId().replace(/:/g, "")}`;
  const sky = SKY[id] ?? SKY.wiese;
  return (
    <svg
      aria-hidden
      viewBox="0 0 300 400"
      preserveAspectRatio="xMidYMax slice"
      className={className ?? "absolute inset-0 w-full h-full pointer-events-none"}
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="0.7" stopColor={sky[1]} />
        </linearGradient>
      </defs>
      <rect width="300" height="400" fill={`url(#${gradient})`} />
      <Scene id={id in SKY ? id : "wiese"} />
    </svg>
  );
}
