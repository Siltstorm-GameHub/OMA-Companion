import Link from "next/link";
import { Target, ChevronRight } from "lucide-react";

export default function PredictionStreakCard({
  current,
  best,
  pendingCount,
}: {
  current: number;
  best: number;
  pendingCount: number;
}) {
  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-violet-500/70" /> Event-Sieger-Vorhersagen
        </h2>
        <Link href="/events" className="text-[11px] flex items-center gap-0.5 text-teal-500 hover:text-teal-300 transition-colors">
          Turniere <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="surface overflow-hidden px-3.5 py-3 flex items-center gap-4"
        style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.45)" }}>
        <div className="flex-1">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest">Aktuelle Serie</p>
          <p className="text-xl font-black tabular-nums text-violet-300">{current}</p>
        </div>
        <div className="flex-1">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest">Beste Serie</p>
          <p className="text-xl font-black tabular-nums text-gray-300">{best}</p>
        </div>
        <div className="flex-1 text-right">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest">Ausstehend</p>
          <p className="text-xl font-black tabular-nums text-amber-400">{pendingCount}</p>
        </div>
      </div>
    </div>
  );
}
