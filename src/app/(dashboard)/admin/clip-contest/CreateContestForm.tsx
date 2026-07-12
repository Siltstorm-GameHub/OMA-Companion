"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, X, Sparkles } from "lucide-react";

function toDateInputValue(d: Date) {
  // Lokale Kalender-Bestandteile verwenden statt toISOString() (das nach UTC
  // konvertiert und dadurch in Zeitzonen östlich von UTC einen Tag/Monat zurückspringt).
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultPeriodStart() {
  const now = new Date();
  return toDateInputValue(new Date(now.getFullYear(), now.getMonth() - 1, 1));
}

function defaultPeriodEnd() {
  return toDateInputValue(new Date());
}

export default function CreateContestForm({
  defaultChannels,
  hasActiveContest,
}: {
  defaultChannels: string[];
  hasActiveContest: boolean;
}) {
  const router = useRouter();
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart());
  const [periodEnd, setPeriodEnd] = useState(defaultPeriodEnd());
  const [votingDurationDays, setVotingDurationDays] = useState("14");
  const [channels, setChannels] = useState<string[]>(defaultChannels);
  const [channelInput, setChannelInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function addChannel() {
    const login = channelInput.trim().toLowerCase();
    if (!login) return;
    if (!channels.includes(login)) setChannels((prev) => [...prev, login]);
    setChannelInput("");
  }

  function removeChannel(login: string) {
    setChannels((prev) => prev.filter((c) => c !== login));
  }

  async function submit() {
    const start = new Date(periodStart);
    const end = new Date(`${periodEnd}T23:59:59.999`);
    const duration = parseInt(votingDurationDays);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      toast.error("Ungültiger Zeitraum");
      return;
    }
    if (isNaN(duration) || duration <= 0) {
      toast.error("Ungültige Umfragedauer");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/admin/clip-contest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        votingDurationDays: duration,
        channels,
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      toast.error(data.error ?? "Fehler beim Erstellen");
      router.refresh(); // z.B. bei "läuft bereits" Fehler: Liste neu laden, damit die aktive Abstimmung sichtbar wird
      return;
    }

    toast.success(`Abstimmung gestartet mit ${data.nominationCount} Clips`);
    if (data.failedChannels?.length) {
      toast.warning(`Kanäle ohne Clips/Fehler: ${data.failedChannels.join(", ")}`);
    }
    router.refresh();
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-purple-400" />
        <h2 className="font-bold text-white">Neue Abstimmung starten</h2>
      </div>

      {hasActiveContest && (
        <p className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          Es läuft bereits eine Abstimmung. Diese muss erst enden, bevor eine neue gestartet werden kann.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Zeitraum von</label>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="w-full rounded-lg px-2 py-1.5 text-sm text-white bg-white/[0.05] border border-white/[0.1] outline-none focus:border-purple-500/40"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Zeitraum bis</label>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="w-full rounded-lg px-2 py-1.5 text-sm text-white bg-white/[0.05] border border-white/[0.1] outline-none focus:border-purple-500/40"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">Umfragedauer (Tage ab Start)</label>
        <input
          type="number"
          min={1}
          value={votingDurationDays}
          onChange={(e) => setVotingDurationDays(e.target.value)}
          className="w-28 rounded-lg px-2 py-1.5 text-sm text-white bg-white/[0.05] border border-white/[0.1] outline-none focus:border-purple-500/40"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">Twitch-Kanäle (Partner sind vorausgewählt)</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {channels.map((c) => (
            <span key={c} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[#9146ff]/15 border border-[#9146ff]/20 text-[#c9a5ff]">
              {c}
              <button onClick={() => removeChannel(c)} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {channels.length === 0 && <span className="text-xs text-gray-600">Keine Kanäle ausgewählt</span>}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={channelInput}
            onChange={(e) => setChannelInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChannel(); } }}
            placeholder="Twitch-Login hinzufügen…"
            className="flex-1 rounded-lg px-2 py-1.5 text-sm text-white bg-white/[0.05] border border-white/[0.1] outline-none focus:border-purple-500/40"
          />
          <button
            onClick={addChannel}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] border border-white/[0.1] text-gray-300 hover:bg-white/[0.1] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Hinzufügen
          </button>
        </div>
      </div>

      <button
        onClick={submit}
        disabled={submitting || hasActiveContest}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-purple-500/15 border border-purple-500/20 text-purple-300 hover:bg-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        Abstimmung starten
      </button>
    </div>
  );
}
