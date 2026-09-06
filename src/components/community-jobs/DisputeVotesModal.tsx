"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Flag, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

/**
 * Generisches Anfechtungs-Formular: listet einzelne Bewertungen zu einem
 * eigenen Beitrag auf, mit "Anfechten"-Button + Begründung je Stimme.
 * Wiederverwendbar für alle Vote-Typen (Report/Contribution/Asset/
 * MarketingPost/Idea/CoachRating), siehe job-dispute-service.ts.
 */

export type DisputeKind =
  | "jobReportVote" | "jobReportContributionVote" | "jobMediaAssetVote" | "marketingPostVote"
  | "coachRating" | "communityIdeaVote";

interface VoteEntry {
  id: string;
  createdAt: string;
  disputed: boolean;
  disputeResolution: string | null;
  voter: { id: string; username: string | null; name: string | null };
  reason?: string; // nur bei Coach/Idee (privater Bewertungstext)
  stars?: number;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data as T;
}

export default function DisputeVotesModal({
  open, onClose, kind, fetchUrl, listKey, voterField = "voter",
}: {
  open: boolean; onClose: () => void; kind: DisputeKind; fetchUrl: string;
  /** Schlüssel des Arrays in der Antwort, z.B. "votes" oder "ratings". */
  listKey: string;
  /** Feldname des Bewerters in der Antwort, z.B. "voter" oder "rater". */
  voterField?: "voter" | "rater";
}) {
  const [votes, setVotes] = useState<VoteEntry[] | null>(null);
  const [disputingId, setDisputingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await api<Record<string, unknown[]>>(fetchUrl);
      const raw = (data[listKey] as Record<string, unknown>[]) ?? [];
      setVotes(raw.map(v => ({
        id: v.id as string, createdAt: v.createdAt as string,
        disputed: v.disputed as boolean, disputeResolution: v.disputeResolution as string | null,
        voter: v[voterField] as VoteEntry["voter"],
        reason: v.reason as string | undefined, stars: v.stars as number | undefined,
      })));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Konnte Bewertungen nicht laden");
    }
  }

  useEffect(() => { if (open) load(); else { setVotes(null); setDisputingId(null); setReason(""); } }, [open, fetchUrl]);

  async function fileDispute(voteId: string) {
    setBusy(true);
    try {
      await api("/api/community-jobs/disputes", { method: "POST", body: JSON.stringify({ kind, voteId, reason }) });
      toast.success("Anfechtung eingereicht");
      setDisputingId(null);
      setReason("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Anfechtung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Bewertungen" size="md">
      {votes === null ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-teal-400 animate-spin" /></div>
      ) : votes.length === 0 ? (
        <p className="text-xs text-gray-600">Noch keine Bewertungen.</p>
      ) : (
        <div className="space-y-2">
          {votes.map(v => (
            <div key={v.id} className="bg-white/[0.03] rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-300">
                  {v.voter.username ?? v.voter.name}
                  {v.stars != null && <span className="text-amber-400"> · {v.stars}★</span>}
                </span>
                <span className="text-[10px] text-gray-600">{new Date(v.createdAt).toLocaleDateString("de-DE")}</span>
              </div>
              {v.reason && <p className="text-[11px] text-gray-500">{v.reason}</p>}
              {v.disputed ? (
                <Badge tone={v.disputeResolution === "OVERTURNED" ? "danger" : v.disputeResolution === "UPHELD" ? "success" : "warning"}>
                  {v.disputeResolution === "OVERTURNED" ? "Gestrichen" : v.disputeResolution === "UPHELD" ? "Bestätigt" : "Anfechtung offen"}
                </Badge>
              ) : disputingId === v.id ? (
                <div className="space-y-1.5">
                  <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Begründung für die Anfechtung" rows={2}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40 resize-none" />
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="ghost" onClick={() => setDisputingId(null)}>Abbrechen</Button>
                    <Button size="sm" loading={busy} disabled={!reason.trim()} onClick={() => fileDispute(v.id)}>Absenden</Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" icon={<Flag className="w-3 h-3" />} onClick={() => setDisputingId(v.id)}>Anfechten</Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
