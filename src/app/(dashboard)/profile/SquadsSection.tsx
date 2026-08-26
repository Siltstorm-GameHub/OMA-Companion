import Link from "next/link";
import { Shield, Crown } from "lucide-react";
import SeriesIcon from "@/components/SeriesIcon";

export type ProfileSquad = { id: string; name: string; icon: string | null; role: string };

export default function SquadsSection({ squads }: { squads: ProfileSquad[] }) {
  if (squads.length === 0) return null;

  return (
    <section>
      <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mb-3">
        <Shield className="w-3.5 h-3.5" /> Squads
      </h2>
      <div className="glass card-shine rounded-2xl p-4 flex flex-wrap gap-2">
        {squads.map(s => (
          <Link key={s.id} href={`/squads/${s.id}`}
            className="flex items-center gap-1.5 rounded-full pl-2 pr-3 py-1.5 border border-white/[0.08] bg-white/[0.02] hover:border-white/20 transition-colors">
            <SeriesIcon name={s.icon} className="w-4 h-4 shrink-0" />
            <span className="text-xs font-medium text-white">{s.name}</span>
            {s.role === "captain" && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
          </Link>
        ))}
      </div>
    </section>
  );
}
