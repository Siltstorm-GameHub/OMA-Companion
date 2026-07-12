"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, AlertTriangle } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

export default function ResetAllBalancesButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  async function handleReset() {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/reset-all-balances", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Fehler"); return; }
      toast.success(`✅ Alle Münzen & Punkte zurückgesetzt — ${data.deletedTransactions} Transaktionen gelöscht`);
      setDone(true);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        ✅ Alle Balances wurden auf 0 zurückgesetzt
      </div>
    );
  }

  return (
    <div className="glass card-shine rounded-2xl p-4 border border-red-500/15">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Alle Münzen & Punkte zurücksetzen</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            Setzt <strong className="text-gray-400">user.points</strong> und <strong className="text-gray-400">user.rankPoints</strong> aller User auf 0
            und löscht alle Transaktionen. Danach können einzelne User manuell über „Verlauf" angepasst werden.
          </p>

          <button
            onClick={() => setOpen(true)}
            className="mt-3 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/15 text-red-400 border border-red-500/20 hover:border-red-500/30 transition-colors font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" /> Alle auf 0 zurücksetzen
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Alle Balances zurücksetzen"
        description={"Setzt Münzen und Rang-Punkte aller User auf 0 und löscht alle Transaktionen.\n\nNicht rückgängig zu machen."}
        confirmLabel="Ja, jetzt zurücksetzen"
        variant="danger"
        typedConfirmText="ZURÜCKSETZEN"
        loading={loading}
        onConfirm={handleReset}
      />
    </div>
  );
}
