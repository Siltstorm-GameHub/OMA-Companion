"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clapperboard, Eye, EyeOff, Loader2 } from "@/components/icons";
import type { OverlayClip } from "@/components/overlay/types";

type MyClip = OverlayClip & { blocked: boolean };

/**
 * Zustimmung zum Community-Clip-Loop und Ausschluss einzelner eigener Clips (z.B. mit Musik).
 * Speichert sofort — unabhängig vom Speichern-Knopf der übrigen Overlay-Einstellungen.
 */
export default function MyClipsPanel() {
  const [optIn, setOptIn] = useState<boolean | null>(null);
  const [clips, setClips] = useState<MyClip[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile/overlay/clips", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then((data: { optIn: boolean; clips: MyClip[] } | null) => {
        if (cancelled || !data) return;
        setOptIn(data.optIn);
        setClips(data.clips);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  async function update(body: { optIn?: boolean; clipId?: string; blocked?: boolean }, key: string) {
    setBusy(key);
    try {
      const res = await fetch("/api/profile/overlay/clips", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? "Speichern fehlgeschlagen"); return; }
      setOptIn(data.optIn);
      setClips(data.clips);
      if ("optIn" in body) {
        toast.success(body.optIn ? "Deine Clips laufen jetzt im Community-Clip-Loop" : "Deine Clips laufen nicht mehr im Community-Clip-Loop");
      }
    } finally {
      setBusy(null);
    }
  }

  const visible = showAll ? clips : clips.slice(0, 8);

  return (
    <div className="glass rounded-2xl p-5 mb-4 space-y-3">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Deine Clips im Community-Loop</h2>
      {optIn === null ? (
        <p className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Lade …</p>
      ) : (
        <>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={optIn}
              disabled={busy === "optIn"}
              onChange={e => update({ optIn: e.target.checked }, "optIn")}
              className="accent-teal-400 mt-1"
            />
            <span>
              <span className="flex items-center gap-1.5 text-sm text-gray-200 font-medium">
                <Clapperboard className="w-3.5 h-3.5 text-teal-300" /> Meine Clips dürfen im Community-Clip-Loop laufen
                {busy === "optIn" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              </span>
              <span className="block text-xs text-gray-500">
                Dann zeigen die Intro-, Clip- und Outro-Szenen anderer Streamer auch Clips deines Twitch-Kanals –
                gute Werbung für deinen Kanal. Abspielen läuft über den offiziellen Twitch-Player, Aufrufe zählen bei dir.
              </span>
            </span>
          </label>

          {optIn && (
            clips.length === 0 ? (
              <p className="text-xs text-gray-500">Auf deinem Kanal gibt es in den letzten 90 Tagen noch keine Clips.</p>
            ) : (
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  Einzelne Clips ausschließen – z.B. wenn darin Musik läuft oder du ihn nicht zeigen möchtest:
                </p>
                <ul className="space-y-1.5">
                  {visible.map(c => (
                    <li key={c.id} className={`flex items-center gap-3 rounded-xl border px-2.5 py-2 ${c.blocked ? "border-white/[0.05] opacity-60" : "border-white/[0.08]"}`}>
                      {c.thumbnailUrl
                        // eslint-disable-next-line @next/next/no-img-element -- Twitch-Vorschaubild, externe Quelle
                        ? <img src={c.thumbnailUrl} alt="" className="w-20 aspect-video rounded-md object-cover shrink-0 bg-black/40" />
                        : <span className="w-20 aspect-video rounded-md shrink-0 bg-black/40" />}
                      <a href={`https://clips.twitch.tv/${c.id}`} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 hover:text-teal-300">
                        <span className="block text-sm text-gray-200 truncate">{c.title}</span>
                        <span className="block text-[11px] text-gray-500">{c.views.toLocaleString("de-DE")} Aufrufe · {c.durationSec} s{c.game ? ` · ${c.game}` : ""}</span>
                      </a>
                      <button
                        onClick={() => update({ clipId: c.id, blocked: !c.blocked }, c.id)}
                        disabled={busy === c.id}
                        className={`shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${
                          c.blocked ? "border-white/[0.08] text-gray-400 hover:text-teal-300" : "border-teal-500/30 text-teal-300 hover:border-rose-400/40 hover:text-rose-300"
                        }`}
                      >
                        {busy === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : c.blocked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {c.blocked ? "Ausgeschlossen" : "Läuft im Loop"}
                      </button>
                    </li>
                  ))}
                </ul>
                {clips.length > 8 && (
                  <button onClick={() => setShowAll(v => !v)} className="mt-2 text-xs text-teal-300 hover:underline">
                    {showAll ? "Weniger anzeigen" : `Alle ${clips.length} Clips anzeigen`}
                  </button>
                )}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
