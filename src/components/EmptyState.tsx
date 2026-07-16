import Link from "next/link";

interface EmptyStateProps {
  type: "events" | "quests" | "feed" | "tournaments" | "leaderboard" | "gameserver" | "generic";
  title: string;
  description: string;
  action?: { label: string; href: string };
}

// ── SVG Illustrations ─────────────────────────────────────────────────────

function IllustrationEvents() {
  return (
    <svg viewBox="0 0 120 100" className="w-28 h-24" fill="none">
      {/* Calendar body */}
      <rect x="15" y="20" width="90" height="70" rx="10" fill="rgba(59,130,246,0.1)" stroke="rgba(59,130,246,0.3)" strokeWidth="1.5"/>
      {/* Calendar header */}
      <rect x="15" y="20" width="90" height="22" rx="10" fill="rgba(59,130,246,0.2)"/>
      <rect x="15" y="32" width="90" height="10" fill="rgba(59,130,246,0.2)"/>
      {/* Rings */}
      <rect x="38" y="13" width="6" height="14" rx="3" fill="rgba(59,130,246,0.5)"/>
      <rect x="76" y="13" width="6" height="14" rx="3" fill="rgba(59,130,246,0.5)"/>
      {/* Grid dots */}
      {[0,1,2,3,4,5].map(i => (
        <circle key={i} cx={32 + (i % 3) * 20} cy={58 + Math.floor(i / 3) * 18} r="4"
          fill={i === 1 ? "rgba(244,63,94,0.6)" : "rgba(255,255,255,0.08)"} />
      ))}
      {/* Star */}
      <circle cx="60" cy="58" r="5" fill="rgba(244,63,94,0.5)"/>
      {/* Floating sparkles */}
      <circle cx="100" cy="15" r="3" fill="rgba(244,63,94,0.4)"/>
      <circle cx="20" cy="95" r="2" fill="rgba(20,184,166,0.4)"/>
      <circle cx="108" cy="78" r="2" fill="rgba(59,130,246,0.4)"/>
    </svg>
  );
}

function IllustrationQuests() {
  return (
    <svg viewBox="0 0 120 100" className="w-28 h-24" fill="none">
      {/* Scroll */}
      <rect x="25" y="15" width="70" height="70" rx="8" fill="rgba(20,184,166,0.1)" stroke="rgba(20,184,166,0.3)" strokeWidth="1.5"/>
      <rect x="15" y="15" width="15" height="70" rx="8" fill="rgba(20,184,166,0.15)" stroke="rgba(20,184,166,0.2)" strokeWidth="1.5"/>
      <rect x="90" y="15" width="15" height="70" rx="8" fill="rgba(20,184,166,0.15)" stroke="rgba(20,184,166,0.2)" strokeWidth="1.5"/>
      {/* Lines */}
      <line x1="35" y1="35" x2="85" y2="35" stroke="rgba(255,255,255,0.12)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="35" y1="48" x2="75" y2="48" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="35" y1="61" x2="80" y2="61" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeLinecap="round"/>
      {/* Check */}
      <circle cx="30" cy="35" r="5" fill="rgba(16,185,129,0.2)" stroke="rgba(16,185,129,0.4)" strokeWidth="1"/>
      <path d="M27 35l2 2 4-4" stroke="rgba(16,185,129,0.8)" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Star top */}
      <circle cx="97" cy="12" r="4" fill="rgba(251,191,36,0.5)"/>
      <circle cx="22" cy="92" r="3" fill="rgba(244,63,94,0.3)"/>
    </svg>
  );
}

function IllustrationFeed() {
  return (
    <svg viewBox="0 0 120 100" className="w-28 h-24" fill="none">
      {/* Signal waves */}
      {[0,1,2].map(i => (
        <path key={i}
          d={`M${32 - i*12},${50} Q${60},${50 - 20 - i*12} ${88 + i*12},${50}`}
          stroke={`rgba(244,63,94,${0.5 - i*0.13})`}
          strokeWidth={2 - i*0.4}
          strokeLinecap="round"
          fill="none"
        />
      ))}
      {/* Center dot */}
      <circle cx="60" cy="50" r="6" fill="rgba(244,63,94,0.6)" />
      <circle cx="60" cy="50" r="3" fill="rgba(244,63,94,0.9)" />
      {/* Activity lines */}
      <rect x="20" y="68" width="20" height="4" rx="2" fill="rgba(255,255,255,0.08)"/>
      <rect x="46" y="68" width="30" height="4" rx="2" fill="rgba(255,255,255,0.06)"/>
      <rect x="82" y="68" width="18" height="4" rx="2" fill="rgba(255,255,255,0.08)"/>
      <rect x="20" y="78" width="35" height="4" rx="2" fill="rgba(255,255,255,0.05)"/>
      {/* Sparkles */}
      <circle cx="15" cy="30" r="3" fill="rgba(20,184,166,0.4)"/>
      <circle cx="105" cy="25" r="2" fill="rgba(59,130,246,0.4)"/>
      <circle cx="108" cy="80" r="3" fill="rgba(251,191,36,0.3)"/>
    </svg>
  );
}

function IllustrationTrophy() {
  return (
    <svg viewBox="0 0 120 100" className="w-28 h-24" fill="none">
      {/* Cup body */}
      <path d="M40 20 Q35 55 60 65 Q85 55 80 20Z" fill="rgba(251,191,36,0.15)" stroke="rgba(251,191,36,0.4)" strokeWidth="1.5"/>
      {/* Handles */}
      <path d="M40 28 Q22 28 22 45 Q22 55 40 52" stroke="rgba(251,191,36,0.3)" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M80 28 Q98 28 98 45 Q98 55 80 52" stroke="rgba(251,191,36,0.3)" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Stem */}
      <rect x="55" y="65" width="10" height="15" rx="2" fill="rgba(251,191,36,0.2)"/>
      <rect x="45" y="78" width="30" height="6" rx="3" fill="rgba(251,191,36,0.2)" stroke="rgba(251,191,36,0.3)" strokeWidth="1"/>
      {/* Star inside cup */}
      <path d="M60 32 L62.4 39h7.3l-5.9 4.3 2.3 7-6.1-4.4-6.1 4.4 2.3-7L50.3 39h7.3z" fill="rgba(251,191,36,0.5)"/>
      {/* Sparkles */}
      <circle cx="20" cy="20" r="3" fill="rgba(244,63,94,0.4)"/>
      <circle cx="100" cy="18" r="4" fill="rgba(244,63,94,0.3)"/>
      <circle cx="108" cy="75" r="2" fill="rgba(20,184,166,0.4)"/>
    </svg>
  );
}

function IllustrationGameserver() {
  return (
    <svg viewBox="0 0 120 100" className="w-28 h-24" fill="none">
      {/* Server-Rack Body */}
      <rect x="30" y="15" width="60" height="70" rx="8" fill="rgba(20,184,166,0.1)" stroke="rgba(20,184,166,0.3)" strokeWidth="1.5"/>
      {/* Rack-Einheiten */}
      <rect x="38" y="24" width="44" height="12" rx="3" fill="rgba(20,184,166,0.15)" stroke="rgba(20,184,166,0.2)" strokeWidth="1"/>
      <rect x="38" y="42" width="44" height="12" rx="3" fill="rgba(20,184,166,0.15)" stroke="rgba(20,184,166,0.2)" strokeWidth="1"/>
      <rect x="38" y="60" width="44" height="12" rx="3" fill="rgba(20,184,166,0.15)" stroke="rgba(20,184,166,0.2)" strokeWidth="1"/>
      {/* Status-LEDs */}
      <circle cx="45" cy="30" r="2.5" fill="rgba(255,255,255,0.15)"/>
      <circle cx="45" cy="48" r="2.5" fill="rgba(255,255,255,0.15)"/>
      <circle cx="45" cy="66" r="2.5" fill="rgba(20,184,166,0.6)"/>
      {/* Sparkles */}
      <circle cx="18" cy="20" r="3" fill="rgba(20,184,166,0.4)"/>
      <circle cx="102" cy="25" r="2" fill="rgba(59,130,246,0.4)"/>
      <circle cx="100" cy="80" r="3" fill="rgba(244,63,94,0.3)"/>
    </svg>
  );
}

function IllustrationGeneric() {
  return (
    <svg viewBox="0 0 120 100" className="w-28 h-24" fill="none">
      <circle cx="60" cy="45" r="28" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"/>
      <circle cx="60" cy="45" r="18" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
      <circle cx="60" cy="45" r="6" fill="rgba(244,63,94,0.3)"/>
      <circle cx="20" cy="20" r="3" fill="rgba(20,184,166,0.3)"/>
      <circle cx="100" cy="25" r="2" fill="rgba(59,130,246,0.3)"/>
      <circle cx="95" cy="75" r="3" fill="rgba(251,191,36,0.3)"/>
    </svg>
  );
}

const ILLUSTRATIONS = {
  events:      <IllustrationEvents />,
  quests:      <IllustrationQuests />,
  feed:        <IllustrationFeed />,
  tournaments: <IllustrationTrophy />,
  leaderboard: <IllustrationTrophy />,
  gameserver:  <IllustrationGameserver />,
  generic:     <IllustrationGeneric />,
};

export function EmptyState({ type, title, description, action }: EmptyStateProps) {
  return (
    <div className="glass card-shine rounded-2xl p-12 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      <div className="relative flex flex-col items-center">
        <div className="mb-5 opacity-90">
          {ILLUSTRATIONS[type]}
        </div>
        <p className="text-white font-semibold text-base mb-1.5">{title}</p>
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-5">{description}</p>
        {action && (
          <Link href={action.href}
            className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors shadow-[0_0_16px_rgba(244,63,94,0.2)] active:scale-[0.97]">
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}
