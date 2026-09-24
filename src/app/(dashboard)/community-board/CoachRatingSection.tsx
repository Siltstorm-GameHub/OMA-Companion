"use client";
import JobBadge from "@/components/community-jobs/JobBadge";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LifeBuoy } from "@/components/icons";
import { Star, GraduationCap, Search } from "@/components/icons";
import { Button } from "@/components/ui/Button";

/**
 * Coaches im Community-Board: Suche nach Spezialgebiet/Name, "Hilfe anfragen" (jederzeit,
 * unabhängig davon, ob der Coach gerade als verfügbar markiert ist) und Bewertung. Da die
 * Profil-Hero-Section (geplanter Ort laut Plan) noch nicht existiert, ist das Community-Board
 * — für alle sichtbar, unabhängig vom eigenen Job-Status — der pragmatischste Ort dafür.
 */

interface Coach { userId: string; username: string | null; availableUntil?: string | null; specialties?: string[] }
interface RateableSession { id: string; title: string; startAt: string; coach: { id: string; username: string | null; name: string | null } }

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data as T;
}

const TEXTAREA = "w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40 resize-none";

export default function CoachRatingSection() {
  const [coaches, setCoaches] = useState<Coach[] | null>(null);
  const [rateable, setRateable] = useState<RateableSession[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api<{ catalog: { key: string; holders: Coach[] }[] }>("/api/community-jobs")
      .then(d => setCoaches(d.catalog.find(j => j.key === "coach")?.holders ?? []))
      .catch(() => setCoaches([]));
    // Vergangene Trainings, an denen ich teilgenommen und die ich noch nicht bewertet habe.
    api<{ rateable: RateableSession[] }>("/api/community-jobs/coach/training-sessions")
      .then(d => setRateable(d.rateable ?? []))
      .catch(() => {});
  }, []);

  if (!coaches || (coaches.length === 0 && rateable.length === 0)) return null;

  const q = query.trim().toLowerCase();
  const visible = coaches
    .filter(c => !q || (c.username ?? "").toLowerCase().includes(q) || (c.specialties ?? []).some(t => t.toLowerCase().includes(q)))
    // Gerade verfügbare Coaches zuerst.
    .sort((a, b) => Number(!!b.availableUntil) - Number(!!a.availableUntil));

  return (
    <div className="glass card-shine rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xs font-semibold text-white flex items-center gap-1.5">
          <GraduationCap className="w-3.5 h-3.5 text-teal-400" /> Coaches
        </h2>
        {coaches.length > 1 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-600 absolute left-2 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Coach für Spiel/Sprache suchen…" aria-label="Coach suchen"
              className="w-56 bg-white/[0.04] border border-white/10 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40" />
          </div>
        )}
      </div>

      {rateable.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-gray-500">Du warst bei diesen Trainings dabei — wie war es?</p>
          <div className="flex flex-wrap gap-2">
            {rateable.map(t => (
              <TrainingRatingChip key={t.id} coachId={t.coach.id} trainingSessionId={t.id}
                label={`${t.title} · ${t.coach.username ?? t.coach.name ?? "?"}`}
                onRated={() => setRateable(list => list.filter(x => x.id !== t.id))} />
            ))}
          </div>
        </div>
      )}

      {coaches.length > 0 && (
        <div className="space-y-2">
          {visible.length === 0 && <p className="text-xs text-gray-600">Kein Coach passt zu „{query}“.</p>}
          {visible.map(c => <CoachCard key={c.userId} coach={c} />)}
        </div>
      )}
    </div>
  );
}

function RatingForm({ coachId, trainingSessionId, onDone, onCancel }: {
  coachId: string; trainingSessionId?: string; onDone: () => void; onCancel: () => void;
}) {
  const [stars, setStars] = useState(5);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api("/api/community-jobs/coach/ratings", { method: "POST", body: JSON.stringify({ coachId, stars, reason, trainingSessionId }) });
      toast.success("Bewertung abgegeben");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bewertung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => setStars(n)} aria-label={`${n} Sterne`}>
            <Star className={`w-4 h-4 ${n <= stars ? "text-amber-400 fill-amber-400" : "text-gray-700"}`} />
          </button>
        ))}
      </div>
      <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Begründung (privat, nur Coach + Admin sehen sie)" rows={2} className={TEXTAREA} />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>Abbrechen</Button>
        <Button size="sm" loading={busy} disabled={!reason.trim()} onClick={submit}>Absenden</Button>
      </div>
    </div>
  );
}

/** Bewertung eines konkreten Trainings (nur Teilnehmer, einmalig). */
function TrainingRatingChip({ coachId, trainingSessionId, label, onRated }: {
  coachId: string; trainingSessionId: string; label: string; onRated: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs bg-white/[0.03] border border-white/10 rounded-full px-3 py-1.5 text-gray-300 hover:text-white hover:border-teal-500/30 transition-colors">
        {label} <Star className="w-3 h-3 text-amber-400" />
      </button>
    );
  }
  return (
    <div className="w-full bg-white/[0.03] rounded-lg p-3 space-y-2">
      <p className="text-xs text-white">{label} bewerten</p>
      <RatingForm coachId={coachId} trainingSessionId={trainingSessionId} onDone={onRated} onCancel={() => setOpen(false)} />
    </div>
  );
}

function CoachCard({ coach }: { coach: Coach }) {
  const [mode, setMode] = useState<"rate" | "help" | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const name = coach.username ?? "?";

  async function sendHelp() {
    setBusy(true);
    try {
      await api("/api/community-jobs/coach/help-requests", { method: "POST", body: JSON.stringify({ coachId: coach.userId, message }) });
      toast.success("Anfrage gesendet — der Coach wird benachrichtigt");
      setMessage("");
      setMode(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Anfrage fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-white flex items-center gap-1.5">
            {coach.availableUntil && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse" title="Gerade verfügbar" />}
            {name}<JobBadge userId={coach.userId} />
            {coach.availableUntil && <span className="text-[10px] text-emerald-400">verfügbar</span>}
          </p>
          {coach.specialties && coach.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {coach.specialties.map(t => (
                <button key={t} onClick={() => undefined} tabIndex={-1}
                  className="text-[10px] text-teal-200 bg-teal-500/10 border border-teal-500/20 rounded-full px-2 py-0.5 cursor-default">{t}</button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant={mode === "help" ? "primary" : "outline"} icon={<LifeBuoy className="w-3.5 h-3.5" />} onClick={() => setMode(mode === "help" ? null : "help")}>
            Hilfe anfragen
          </Button>
          <Button size="sm" variant={mode === "rate" ? "primary" : "ghost"} icon={<Star className="w-3.5 h-3.5" />} onClick={() => setMode(mode === "rate" ? null : "rate")}>
            Bewerten
          </Button>
        </div>
      </div>

      {mode === "help" && (
        <div className="space-y-2">
          <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={500} rows={3}
            placeholder={`Wobei brauchst du Hilfe? ${name} bekommt eine Benachrichtigung — auch wenn er/sie gerade nicht als verfügbar markiert ist.`} className={TEXTAREA} />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-gray-600">{message.length}/500 · höchstens 3 Anfragen pro Tag</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setMode(null)}>Abbrechen</Button>
              <Button size="sm" loading={busy} disabled={!message.trim()} onClick={sendHelp}>Senden</Button>
            </div>
          </div>
        </div>
      )}
      {mode === "rate" && <RatingForm coachId={coach.userId} onDone={() => setMode(null)} onCancel={() => setMode(null)} />}
    </div>
  );
}
