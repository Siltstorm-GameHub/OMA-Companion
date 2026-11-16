"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "@/components/icons";

/** Hinweis auf der Verwaltungsseite eines Community-Events/einer Community-Reihe, die noch auf die
 *  Mod-Freigabe wartet. Mods können direkt freigeben. */
export default function ApprovalBanner({ kind, id, canApprove, inheritedFromSeries = false }: {
  kind: "events" | "series";
  id: string;
  canApprove: boolean;
  /** Event wartet nur, weil seine Reihe noch nicht freigegeben ist */
  inheritedFromSeries?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/${kind}/${id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Freigabe fehlgeschlagen");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3 flex items-center gap-3 flex-wrap">
      <div className="flex-1 min-w-[220px]">
        <p className="text-sm font-semibold text-amber-300">Wartet auf Mod-Freigabe</p>
        <p className="text-xs text-amber-100/80">
          {inheritedFromSeries
            ? "Die Eventreihe dieses Termins ist noch nicht freigegeben."
            : kind === "series" ? "Diese Community-Reihe ist in der App sichtbar." : "Dieses Community-Event ist in der App sichtbar."}
          {" "}Discord-Ankündigung und Push folgen erst nach der Freigabe.
        </p>
        {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
      </div>
      {canApprove && !inheritedFromSeries && (
        <button type="button" onClick={approve} disabled={busy}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50">
          <Check className="w-3.5 h-3.5" /> {busy ? "Gibt frei…" : "Freigeben"}
        </button>
      )}
    </div>
  );
}
