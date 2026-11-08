import Link from "next/link";
import { BADGE_LEVEL_THRESHOLDS, BADGE_MAX_LEVEL, BADGE_WINDOW_WEEKS, levelTitle } from "@/lib/job-badges";
import { reputationColor } from "@/lib/job-ring";

/**
 * Ansehen (Bronze–Platin) erklärt. Sichtbar wird es als freischaltbarer Titel (Kosmetik-Shop).
 *  - eigenes Profil: Stufe, Punkte, Fortschritt bis zur nächsten Stufe + wie man Punkte sammelt
 *  - fremdes Profil: nur Stufe und Titel
 */
export default function ReputationCard({ level, points, isOwn }: { level: number; points: number; isOwn: boolean }) {
  const lvl = Math.min(BADGE_MAX_LEVEL, Math.max(1, level));
  const color = reputationColor(lvl);
  const title = levelTitle(lvl);

  if (!isOwn) {
    return (
      <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        <p className="text-sm text-gray-300">
          Ansehen: <span className="font-semibold" style={{ color }}>{title}</span>
          <span className="text-gray-500"> · Stufe {lvl}/{BADGE_MAX_LEVEL}</span>
        </p>
      </div>
    );
  }

  const nextMin = lvl < BADGE_MAX_LEVEL ? BADGE_LEVEL_THRESHOLDS[lvl] : null;
  const curMin = BADGE_LEVEL_THRESHOLDS[lvl - 1] ?? 0;
  const pct = nextMin == null ? 100 : Math.min(100, Math.max(0, ((points - curMin) / (nextMin - curMin)) * 100));

  return (
    <section className="glass card-shine rounded-2xl p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-white">
          Dein Ansehen: <span className="font-semibold" style={{ color }}>{title}</span>
          <span className="text-gray-500 text-xs"> · Stufe {lvl}/{BADGE_MAX_LEVEL} · {points} Punkte</span>
        </p>
        <span className="text-[11px] text-gray-400">
          {nextMin == null ? "Höchste Stufe erreicht 🎉" : <>Noch <span className="text-white font-medium">{nextMin - points}</span> Punkte bis {levelTitle(lvl + 1)}</>}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed">
        Punkte gibt es jede Woche für deine Gehaltsstufen in den Community-Jobs (alle Jobs zusammen, höchstens 3 pro Woche)
        und für Daumen auf deine Kommentare. Gezählt werden die letzten {BADGE_WINDOW_WEEKS} Wochen, die Stufe kann also auch wieder sinken.
        Ab Silber schaltest du einen Ansehens-Titel frei, den du im <Link href="/shop" className="text-amber-300 hover:text-amber-200">Shop</Link> unter
        „Titel“ anlegen kannst — er bleibt dir, auch wenn die Stufe später sinkt.{" "}
        <Link href="/profile?tab=community_jobs" className="text-teal-400 hover:text-teal-300">Zum Büro →</Link>
      </p>
    </section>
  );
}
