"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Star, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Coach-Bewertung: da die Profil-Hero-Section (geplanter Ort laut Plan) noch
 * nicht existiert, ist das Community-Board — für alle sichtbar, unabhängig
 * vom eigenen Job-Status — der pragmatischste Ort für die Ad-hoc-Bewertung.
 */

interface Coach { userId: string; username: string | null }

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data as T;
}

export default function CoachRatingSection() {
  const [coaches, setCoaches] = useState<Coach[] | null>(null);

  useEffect(() => {
    api<{ catalog: { key: string; holders: Coach[] }[] }>("/api/community-jobs")
      .then(d => setCoaches(d.catalog.find(j => j.key === "coach")?.holders ?? []))
      .catch(() => setCoaches([]));
  }, []);

  if (!coaches || coaches.length === 0) return null;

  return (
    <div className="glass card-shine rounded-2xl p-4 space-y-3">
      <h2 className="text-xs font-semibold text-white flex items-center gap-1.5">
        <GraduationCap className="w-3.5 h-3.5 text-teal-400" /> Coaches bewerten
      </h2>
      <div className="flex flex-wrap gap-2">
        {coaches.map(c => <CoachChip key={c.userId} coach={c} />)}
      </div>
    </div>
  );
}

function CoachChip({ coach }: { coach: Coach }) {
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api("/api/community-jobs/coach/ratings", { method: "POST", body: JSON.stringify({ coachId: coach.userId, stars, reason }) });
      toast.success("Bewertung abgegeben");
      setOpen(false);
      setReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bewertung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs bg-white/[0.03] border border-white/10 rounded-full px-3 py-1.5 text-gray-300 hover:text-white hover:border-teal-500/30 transition-colors">
        {coach.username ?? "?"} <Star className="w-3 h-3 text-amber-400" />
      </button>
    );
  }

  return (
    <div className="w-full space-y-2 bg-white/[0.03] rounded-lg p-3">
      <p className="text-xs text-white">{coach.username ?? "?"} bewerten</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => setStars(n)}>
            <Star className={`w-4 h-4 ${n <= stars ? "text-amber-400 fill-amber-400" : "text-gray-700"}`} />
          </button>
        ))}
      </div>
      <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Begründung (privat, nur Coach + Admin sehen sie)" rows={2}
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40 resize-none" />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
        <Button size="sm" loading={busy} disabled={!reason.trim()} onClick={submit}>Absenden</Button>
      </div>
    </div>
  );
}
