"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Users, EyeOff } from "lucide-react";
import SeriesIcon from "@/components/SeriesIcon";
import { SERIES_ICONS } from "@/lib/series-icons";

type Squad = {
  id: string;
  name: string;
  game: string | null;
  icon: string | null;
  hidden: boolean;
  _count: { memberships: number };
};

const inputCls = "w-full rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors";

export default function SquadsListClient({ squads, isAdmin }: { squads: Squad[]; isAdmin: boolean }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [name, setName]         = useState("");
  const [game, setGame]         = useState("");
  const [icon, setIcon]         = useState("");

  async function create() {
    if (!name.trim()) return;
    setLoading(true);
    const res = await fetch("/api/admin/squads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), game: game.trim() || null, icon: icon || null }),
    });
    setLoading(false);
    if (res.ok) {
      const squad = await res.json();
      toast.success(`Squad "${squad.name}" erstellt`);
      router.push(`/admin/squads/${squad.id}`);
    } else {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error ?? "Fehler beim Erstellen");
    }
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        creating ? (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="z.B. Rocket League Team" className={inputCls} autoFocus />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Spiel (optional)</label>
                <input type="text" value={game} onChange={e => setGame(e.target.value)}
                  placeholder="z.B. Rocket League" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Icon</label>
              <div className="grid grid-cols-8 sm:grid-cols-12 gap-2">
                {SERIES_ICONS.map(i => {
                  const Icon = i.icon;
                  const selected = icon === i.value;
                  return (
                    <button key={i.value} type="button" title={i.label}
                      onClick={() => setIcon(selected ? "" : i.value)}
                      className="flex items-center justify-center rounded-xl p-2 border transition-all"
                      style={selected
                        ? { borderColor: `${i.color}99`, background: `${i.color}1a` }
                        : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
                      <Icon className="w-4 h-4" style={{ color: selected ? i.color : "#9ca3af" }} />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={create} disabled={loading || !name.trim()}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-600 transition-colors disabled:opacity-50">
                {loading ? "Wird erstellt…" : "Squad erstellen"}
              </button>
              <button onClick={() => setCreating(false)}
                className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-teal-300 border border-teal-500/30 bg-teal-500/5 hover:border-teal-500/50 hover:bg-teal-500/10 transition-colors">
            <Plus className="w-4 h-4" /> Neuer Squad
          </button>
        )
      )}

      {squads.length === 0 ? (
        <p className="text-sm text-gray-600 py-8 text-center">Noch keine Squads vorhanden.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {squads.map(s => (
            <Link key={s.id} href={`/admin/squads/${s.id}`}
              className={`rounded-xl p-4 border transition-colors ${
                s.hidden ? "border-white/[0.06] bg-white/[0.01] opacity-70" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <SeriesIcon name={s.icon} className="w-4 h-4 shrink-0" />
                <p className="text-sm font-semibold text-white truncate flex-1">{s.name}</p>
                {s.hidden && <EyeOff className="w-3.5 h-3.5 text-gray-600 shrink-0" />}
              </div>
              {s.game && <p className="text-xs text-gray-500 mb-1">{s.game}</p>}
              <p className="text-xs text-gray-600 flex items-center gap-1">
                <Users className="w-3 h-3" /> {s._count.memberships} Mitglieder
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
