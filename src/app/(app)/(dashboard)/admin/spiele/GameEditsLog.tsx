"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Undo2 } from "@/components/icons";
import { FIELD_LABELS, formatFieldValue, type FillableField } from "@/lib/games/edits";

export interface GameEditRow {
  id: string;
  field: string;
  newValue: unknown;
  reverted: boolean;
  createdAt: string;
  game: { slug: string; name: string };
  userName: string | null;
}

/** Ergänzungen von Mitgliedern (nur zuvor leere Angaben) — mit "Zurücksetzen". */
export default function GameEditsLog({ edits }: { edits: GameEditRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function revert(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/games/edits/${id}/revert`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
      toast.success("Zurückgesetzt");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold text-white">Ergänzungen von Mitgliedern</h2>
      <p className="text-xs text-gray-500">Mitglieder können nur leere Angaben füllen. Falsches einfach zurücksetzen.</p>
      {edits.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">Noch keine Ergänzungen.</p>
      ) : (
        <div className="surface rounded-2xl divide-y divide-white/[0.05] overflow-hidden">
          {edits.map(e => (
            <div key={e.id} className={`flex items-center gap-3 px-3 py-2.5 text-xs ${e.reverted ? "opacity-50" : ""}`}>
              <div className="flex-1 min-w-0">
                <p className="text-gray-200 truncate">
                  <Link href={`/spiele/${e.game.slug}`} className="font-semibold text-white hover:text-teal-300">{e.game.name}</Link>
                  {" · "}{FIELD_LABELS[e.field as FillableField] ?? e.field}: <span className="text-teal-200">{formatFieldValue(e.field, e.newValue)}</span>
                </p>
                <p className="text-[11px] text-gray-500">
                  {e.userName ?? "Unbekannt"} · {new Date(e.createdAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" })}
                  {e.reverted && " · zurückgesetzt"}
                </p>
              </div>
              {!e.reverted && (
                <Button size="sm" variant="ghost" onClick={() => revert(e.id)} loading={busy === e.id} icon={<Undo2 className="w-3.5 h-3.5" />}>
                  Zurücksetzen
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
