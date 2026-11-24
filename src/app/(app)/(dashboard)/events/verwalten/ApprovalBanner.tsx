"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "@/components/icons";

/** Ablehnen mit Grund: Knopf, der ein kurzes Eingabefeld aufklappt. Auch in der Verwalten-Liste genutzt. */
export function RejectControl({ kind, id, compact = false, onDone }: {
  kind: "events" | "series"; id: string; compact?: boolean; onDone?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reject() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/${kind}/${id}/reject`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Ablehnen hat nicht geklappt");
      setOpen(false);
      onDone?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className={`shrink-0 inline-flex items-center gap-1.5 rounded-control border border-danger/30 text-danger hover:bg-danger-soft font-semibold transition-colors ${compact ? "min-h-9 px-3 text-xs" : "min-h-10 px-4 text-sm"}`}>
        <X className="w-3.5 h-3.5" /> Ablehnen
      </button>
    );
  }
  return (
    <div className="basis-full flex flex-col gap-2 rounded-control border border-danger/30 bg-danger-soft p-2.5">
      <label className="text-xs text-rose-200" htmlFor={`reject-${id}`}>Grund (sieht der Ersteller)</label>
      <textarea id={`reject-${id}`} value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} autoFocus
        placeholder="z.B. Termin überschneidet sich mit dem Clan-Abend"
        className="w-full rounded-control bg-surface-2 border border-line px-2.5 py-1.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-primary" />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted hover:text-fg px-2">Abbrechen</button>
        <button type="button" onClick={reject} disabled={busy || !reason.trim()}
          className="inline-flex items-center gap-1 rounded-control bg-rose-600 hover:bg-rose-500 px-3 py-1.5 text-xs font-semibold text-fg disabled:opacity-50 max-lg:min-h-10">
          {busy ? "Lehnt ab…" : "Ablehnen und Ersteller informieren"}
        </button>
      </div>
    </div>
  );
}

/** Hinweis auf der Verwaltungsseite eines Mitglieder-Events/einer Mitglieder-Reihe, die auf die
 *  Mod-Freigabe wartet oder abgelehnt wurde. Mods können freigeben/ablehnen, der Ersteller kann ein
 *  abgelehntes Event nach dem Überarbeiten erneut einreichen. */
export default function ApprovalBanner({ kind, id, canApprove, inheritedFromSeries = false, rejectedNote = null }: {
  kind: "events" | "series";
  id: string;
  canApprove: boolean;
  /** Event wartet nur, weil seine Reihe noch nicht freigegeben ist */
  inheritedFromSeries?: boolean;
  /** gesetzt = abgelehnt, mit diesem Grund */
  rejectedNote?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rejected = rejectedNote !== null;
  const noun = kind === "series" ? "Eventreihe" : "Event";

  async function post(action: "approve" | "resubmit") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/${kind}/${id}/${action}`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Das hat nicht geklappt");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (rejected) {
    return (
      <div className="mb-4 rounded-control border border-danger/30 bg-danger-soft px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <p className="text-sm font-semibold text-danger">Nicht freigegeben</p>
          <p className="text-xs text-rose-100/80">Grund: {rejectedNote || "kein Grund angegeben"}</p>
          <p className="text-xs text-muted mt-1">
            {inheritedFromSeries
              ? "Die Eventreihe dieses Termins wurde abgelehnt. Reich die Reihe erneut ein."
              : `Die ${noun} ist ausgeblendet. Überarbeite sie und reich sie danach erneut ein.`}
          </p>
          {error && <p className="text-xs text-danger mt-1">{error}</p>}
        </div>
        {!inheritedFromSeries && (
          <button type="button" onClick={() => post("resubmit")} disabled={busy}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-control bg-primary hover:bg-primary-hover text-primary-ink transition-colors disabled:opacity-50 max-lg:min-h-10">
            {busy ? "Reicht ein…" : "Erneut einreichen"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-control border border-warning/30 bg-warning-soft px-4 py-3 flex items-center gap-3 flex-wrap">
      <div className="flex-1 min-w-[220px]">
        <p className="text-sm font-semibold text-amber-300">Wartet auf Mod-Freigabe</p>
        <p className="text-xs text-amber-100/80">
          {inheritedFromSeries
            ? "Die Eventreihe dieses Termins ist noch nicht freigegeben."
            : `Die ${noun} ist in der App schon sichtbar.`}
          {" "}Discord-Ankündigung und Push folgen erst nach der Freigabe.
        </p>
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
      </div>
      {canApprove && !inheritedFromSeries && (
        <>
          <button type="button" onClick={() => post("approve")} disabled={busy}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-control bg-emerald-600 hover:bg-emerald-500 text-fg transition-colors disabled:opacity-50 max-lg:min-h-10">
            <Check className="w-3.5 h-3.5" /> {busy ? "Gibt frei…" : "Freigeben"}
          </button>
          <RejectControl kind={kind} id={id} />
        </>
      )}
    </div>
  );
}
