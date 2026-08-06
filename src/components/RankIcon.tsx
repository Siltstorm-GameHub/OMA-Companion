import { getRank, getRankFullLabel, RANK_RING } from "@/lib/ranks";
import { rankMedal } from "@/lib/rank-art";

interface RankIconProps {
  rankPoints: number;
  size?: "xs" | "sm" | "md" | "lg";
  /** Stufenpunkte (I/II/III) unter der Medaille. Für Inline-Ersatz von Text
   *  (z.B. "{rank.emoji} Krawall-Rentner") auf false setzen — eine zweite
   *  Zeile mit Punkten sprengt dort die Textzeile. */
  showPips?: boolean;
}

const SIZE_PX = { xs: 16, sm: 20, md: 26, lg: 36 } as const;

const PIP_COUNT = { I: 1, II: 2, III: 3 } as const;

/**
 * Rang-Medaille: eigenes Motiv im Ring der Rang-Farbe, mit Emoji-Fallback.
 *
 * Ersetzt zwei vorher unabhängige Darstellungen desselben Rangs — ein
 * Hexagon mit Lucide-Icon hier, das rohe RANKS[].emoji andernorts —, die
 * nie miteinander abgeglichen waren, also für denselben Rang unterschiedliche
 * Icons zeigten. Jetzt gibt es nur noch diese eine Komponente.
 *
 * Die Ringfarbe kommt aus RANK_RING (lib/ranks.ts) — derselben Palette, die
 * auch RankRing für den Rahmen ums Profilbild nutzt. Beide bleiben dadurch
 * automatisch synchron.
 */
export default function RankIcon({ rankPoints, size = "md", showPips = true }: RankIconProps) {
  const rank  = getRank(rankPoints);
  const label = getRankFullLabel(rank);
  const px    = SIZE_PX[size];
  const ring  = RANK_RING[rank.tier] ?? RANK_RING[1];
  const medal = rankMedal(rank.tier);
  const activePips = PIP_COUNT[rank.tierLabel] ?? 1;
  const pipSz = Math.max(3, Math.round(px * 0.14));
  const glow  = `${ring.c3}8c`; // ~55% Alpha, wie zuvor beim Hexagon

  return (
    <span className="inline-flex flex-col items-center select-none" style={{ gap: 2 }} title={label}>
      <span
        className="relative shrink-0 rounded-full overflow-hidden"
        style={{
          width: px,
          height: px,
          border: `${Math.max(1.5, Math.round(px * 0.08))}px solid ${ring.c3}`,
          boxShadow: `0 0 ${Math.round(px * 0.22)}px ${glow}`,
          background: "#0d0d0f",
        }}
      >
        {medal ? (
          // eslint-disable-next-line @next/next/no-img-element -- winziges, statisches Asset in Listen mit vielen Einträgen; next/image lohnt hier nicht
          <img src={medal} alt="" className="w-full h-full object-cover" />
        ) : (
          <span
            className="absolute inset-0 flex items-center justify-center"
            style={{ fontSize: px * 0.6 }}
          >
            {rank.emoji}
          </span>
        )}
      </span>

      {showPips && (
        <span className="flex items-center" style={{ gap: pipSz * 0.6 }}>
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                width: pipSz,
                height: pipSz,
                borderRadius: "50%",
                background: ring.c2,
                opacity: i <= activePips ? 1 : 0.18,
                boxShadow: i <= activePips ? `0 0 ${pipSz}px ${glow}` : "none",
              }}
            />
          ))}
        </span>
      )}
    </span>
  );
}
