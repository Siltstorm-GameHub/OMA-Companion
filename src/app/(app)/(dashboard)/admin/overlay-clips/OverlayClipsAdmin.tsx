"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Search } from "@/components/icons";
import type { OverlayClip } from "@/components/overlay/types";

type AdminClip = OverlayClip & { blocked: boolean };

/**
 * Moderation des Community-Clip-Loops (Intro-/Clip-/Outro-Szenen der OBS-Overlays): alle Clips
 * der zustimmenden Kanäle, einzelne lassen sich ausschließen. Eine Sperre durch die Moderation
 * kann der Kanalinhaber nicht selbst aufheben.
 */
export default function OverlayClipsAdmin() {
  const [clips, setClips] = useState<AdminClip[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [onlyBlocked, setOnlyBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/overlay-clips", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : { clips: [] }))
      .then((data: { clips: AdminClip[] }) => { if (!cancelled) setClips(data.clips); })
      .catch(() => { if (!cancelled) setClips([]); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (clips ?? []).filter(c =>
      (!onlyBlocked || c.blocked)
      && (!q || c.title.toLowerCase().includes(q) || c.channelLogin.includes(q) || (c.game ?? "").toLowerCase().includes(q)));
  }, [clips, query, onlyBlocked]);

  const channels = useMemo(() => new Set((clips ?? []).map(c => c.channelLogin)).size, [clips]);

  async function toggle(clip: AdminClip) {
    setBusy(clip.id);
    try {
      const res = await fetch("/api/admin/overlay-clips", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clipId: clip.id, blocked: !clip.blocked }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? "Fehlgeschlagen"); return; }
      setClips(cs => cs?.map(c => (c.id === clip.id ? { ...c, blocked: !clip.blocked } : c)) ?? cs);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Overlay-Clips</h1>
        <p className="text-sm text-gray-500 mt-1">
          Clips im Community-Clip-Loop der OBS-Overlays (Intro, Clip-Pause, Outro). Es erscheinen nur Kanäle, deren
          Inhaber im Profil zugestimmt haben. Ausgeschlossene Clips laufen bei niemandem mehr.
        </p>
      </div>

      {clips === null ? (
        <p className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Lade Clips von Twitch …</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Titel, Kanal oder Spiel" className="input-glass" style={{ paddingLeft: 36 }} />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input type="checkbox" checked={onlyBlocked} onChange={e => setOnlyBlocked(e.target.checked)} className="accent-teal-400" />
              nur ausgeschlossene
            </label>
          </div>
          <p className="text-xs text-gray-500">
            {clips.length} Clips von {channels} {channels === 1 ? "Kanal" : "Kanälen"} · {clips.filter(c => c.blocked).length} ausgeschlossen
          </p>

          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500">Keine Clips gefunden.</p>
          ) : (
            <ul className="space-y-1.5">
              {filtered.map(c => (
                <li key={c.id} className={`flex items-center gap-3 rounded-xl border px-2.5 py-2 ${c.blocked ? "border-rose-500/20 bg-rose-500/5" : "border-white/[0.08]"}`}>
                  {c.thumbnailUrl
                    // eslint-disable-next-line @next/next/no-img-element -- Twitch-Vorschaubild, externe Quelle
                    ? <img src={c.thumbnailUrl} alt="" className="w-24 aspect-video rounded-md object-cover shrink-0 bg-black/40" />
                    : <span className="w-24 aspect-video rounded-md shrink-0 bg-black/40" />}
                  <a href={`https://clips.twitch.tv/${c.id}`} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 hover:text-teal-300">
                    <span className="block text-sm text-gray-200 truncate">{c.title}</span>
                    <span className="block text-[11px] text-gray-500">
                      {c.channel} · {c.views.toLocaleString("de-DE")} Aufrufe · {c.durationSec} s{c.game ? ` · ${c.game}` : ""}
                    </span>
                  </a>
                  <button
                    onClick={() => toggle(c)}
                    disabled={busy === c.id}
                    className={`shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${
                      c.blocked ? "border-rose-400/40 text-rose-300 hover:text-teal-300 hover:border-teal-500/40" : "border-teal-500/30 text-teal-300 hover:border-rose-400/40 hover:text-rose-300"
                    }`}
                  >
                    {busy === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : c.blocked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {c.blocked ? "Ausgeschlossen" : "Läuft im Loop"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
