"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, EyeOff, Repeat } from "@/components/icons";
import { formatBerlinDate } from "@/lib/time";

type Creator = { id: string; name: string | null; username: string | null } | null;

type PendingEvent = { id: string; title: string; startAt: string; game: string | null; hidden: boolean; createdBy: Creator };
type PendingSeries = { id: string; name: string; hidden: boolean; createdBy: Creator; eventCount: number };

const creatorName = (c: Creator) => c?.username ?? c?.name ?? "Unbekannt";

/** Mod-Liste der Community-Events/-Reihen, die auf Freigabe warten. Sie sind in der App schon
 *  sichtbar — die Freigabe schaltet Discord-Ankündigung, Discord-Event und Push frei. */
export default function PendingApprovalsPanel({ events, series }: { events: PendingEvent[]; series: PendingSeries[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve(kind: "events" | "series", id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/${kind}/${id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Freigabe fehlgeschlagen");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  const rowCls = "flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05]";
  const btnCls = "flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 shrink-0";

  return (
    <div className="glass rounded-2xl p-4 border border-amber-500/20 space-y-2">
      <div>
        <h2 className="text-sm font-semibold text-amber-300">Community-Events warten auf Freigabe</h2>
        <p className="text-xs text-gray-500">
          Schon in der App sichtbar. Erst nach der Freigabe werden sie auf Discord angekündigt und per Push gemeldet.
        </p>
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}

      {series.map(s => (
        <div key={`s-${s.id}`} className={rowCls}>
          <Repeat className="w-4 h-4 text-teal-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <Link href={`/admin/series/${s.id}`} className="text-sm text-gray-200 font-medium truncate block hover:text-white">
              {s.name}
            </Link>
            <p className="text-[11px] text-gray-500">
              Eventreihe · {s.eventCount} Termine · von @{creatorName(s.createdBy)}
              {s.hidden && <> · <EyeOff className="inline w-3 h-3" /> ausgeblendet</>}
            </p>
          </div>
          <button type="button" className={btnCls} disabled={busy === s.id} onClick={() => approve("series", s.id)}>
            <Check className="w-3.5 h-3.5" /> Freigeben
          </button>
        </div>
      ))}

      {events.map(e => (
        <div key={`e-${e.id}`} className={rowCls}>
          <div className="flex-1 min-w-0">
            <Link href={`/admin/events/${e.id}`} className="text-sm text-gray-200 font-medium truncate block hover:text-white">
              {e.title}
            </Link>
            <p className="text-[11px] text-gray-500">
              {formatBerlinDate(new Date(e.startAt), { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              {e.game && <> · {e.game}</>} · von @{creatorName(e.createdBy)}
              {e.hidden && <> · <EyeOff className="inline w-3 h-3" /> ausgeblendet</>}
            </p>
          </div>
          <button type="button" className={btnCls} disabled={busy === e.id} onClick={() => approve("events", e.id)}>
            <Check className="w-3.5 h-3.5" /> Freigeben
          </button>
        </div>
      ))}
    </div>
  );
}
