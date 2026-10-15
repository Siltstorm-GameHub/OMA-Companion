"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Search, ShieldAlert, X } from "@/components/icons";
import type { OverlayClip } from "@/components/overlay/types";

type Restriction = "blocked" | "channel" | "game" | null;
type AdminClip = OverlayClip & { restriction: Restriction };
type MatureGame = { gameId: string; name: string; source: string };
type Data = { clips: AdminClip[]; labelledChannels: { login: string; labels: string[] }[]; matureGames: MatureGame[] };

const RESTRICTION_LABEL: Record<Exclude<Restriction, null>, string> = {
  blocked: "Ausgeschlossen",
  channel: "Kanal gekennzeichnet",
  game: "Spiel ab 18",
};

/**
 * Moderation des Community-Clip-Loops (Intro-/Clip-/Outro-Szenen der OBS-Overlays): alle Clips
 * der teilnehmenden Kanäle. Clips lassen sich einzeln ausschließen, Spiele als "ab 18" sperren —
 * deren Clips zeigt Twitch im Player nur hinter einem Alters-Hinweis.
 */
export default function OverlayClipsAdmin() {
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [onlyRestricted, setOnlyRestricted] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/overlay-clips", { cache: "no-store" }).catch(() => null);
    const json = res?.ok ? await res.json() : { clips: [], labelledChannels: [], matureGames: [] };
    setData(json);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/overlay-clips", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : { clips: [], labelledChannels: [], matureGames: [] }))
      .then((json: Data) => { if (!cancelled) setData(json); })
      .catch(() => { if (!cancelled) setData({ clips: [], labelledChannels: [], matureGames: [] }); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.clips ?? []).filter(c =>
      (!onlyRestricted || c.restriction)
      && (!q || c.title.toLowerCase().includes(q) || c.channelLogin.includes(q) || (c.game ?? "").toLowerCase().includes(q)));
  }, [data, query, onlyRestricted]);

  const channels = useMemo(() => new Set((data?.clips ?? []).map(c => c.channelLogin)).size, [data]);

  async function put(body: Record<string, unknown>, key: string) {
    setBusy(key);
    try {
      const res = await fetch("/api/admin/overlay-clips", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error ?? "Fehlgeschlagen"); return; }
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Overlay-Clips</h1>
        <p className="text-sm text-gray-500 mt-1">
          Clips im Community-Clip-Loop der OBS-Overlays (Intro, Clip-Pause, Outro). Es laufen Clips aller Mitglieder,
          die sich nicht abgemeldet haben. Ausgeschlossene Clips laufen bei niemandem mehr.
        </p>
      </div>

      {data === null ? (
        <p className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Lade Clips von Twitch …</p>
      ) : (
        <>
          {/* ── Alters-Hinweis ── */}
          <div className="glass rounded-2xl p-4 space-y-3">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <ShieldAlert className="w-3.5 h-3.5" /> Spiele ab 18
            </h2>
            <p className="text-xs text-gray-500">
              Clips dieser Spiele zeigt Twitch nur hinter einem Alters-Hinweis – im Stream wäre nur der Hinweis zu sehen,
              deshalb laufen sie nicht. Spiele werden automatisch erkannt, sobald ein Community-Kanal sie streamt; über
              „Spiel sperren“ an einem Clip kannst du sie auch selbst eintragen.
            </p>
            {data.matureGames.length === 0 ? (
              <p className="text-xs text-gray-500">Noch keine Spiele gesperrt.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.matureGames.map(g => (
                  <span key={g.gameId} className="flex items-center gap-1.5 text-xs pl-2.5 pr-1 py-1 rounded-lg border border-rose-500/30 bg-rose-500/5 text-rose-200">
                    {g.name}
                    <span className="text-[10px] text-rose-200/50">{g.source === "admin" ? "manuell" : "automatisch"}</span>
                    <button
                      onClick={() => put({ gameId: g.gameId, mature: false }, `game-${g.gameId}`)}
                      disabled={busy === `game-${g.gameId}`}
                      title="Sperre aufheben"
                      className="p-0.5 rounded hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {data.labelledChannels.length > 0 && (
              <p className="text-xs text-gray-500">
                Ausgelassen wegen Inhaltskennzeichnung des Kanals:{" "}
                <span className="text-gray-300">{data.labelledChannels.map(c => c.login).join(", ")}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Titel, Kanal oder Spiel" className="input-glass" style={{ paddingLeft: 36 }} />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input type="checkbox" checked={onlyRestricted} onChange={e => setOnlyRestricted(e.target.checked)} className="accent-teal-400" />
              nur nicht laufende
            </label>
          </div>
          <p className="text-xs text-gray-500">
            {data.clips.length} Clips von {channels} {channels === 1 ? "Kanal" : "Kanälen"} · {data.clips.filter(c => !c.restriction).length} laufen im Loop
          </p>

          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500">Keine Clips gefunden.</p>
          ) : (
            <ul className="space-y-1.5">
              {filtered.map(c => (
                <li key={c.id} className={`flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-xl border px-2.5 py-2 ${c.restriction ? "border-rose-500/20 bg-rose-500/5" : "border-white/[0.08]"}`}>
                  {c.thumbnailUrl
                    // eslint-disable-next-line @next/next/no-img-element -- Twitch-Vorschaubild, externe Quelle
                    ? <img src={c.thumbnailUrl} alt="" className="w-24 aspect-video rounded-md object-cover shrink-0 bg-black/40" />
                    : <span className="w-24 aspect-video rounded-md shrink-0 bg-black/40" />}
                  <a href={`https://clips.twitch.tv/${c.id}`} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 hover:text-teal-300">
                    <span className="block text-sm text-gray-200 truncate">{c.title}</span>
                    <span className="block text-[11px] text-gray-500">
                      {c.channel} · {c.views.toLocaleString("de-DE")} Aufrufe · {c.durationSec} s{c.game ? ` · ${c.game}` : ""}
                    </span>
                    {c.restriction && <span className="block text-[11px] text-rose-300">{RESTRICTION_LABEL[c.restriction]}</span>}
                  </a>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {c.gameId && c.restriction !== "game" && (
                      <button
                        onClick={() => put({ gameId: c.gameId, gameName: c.game, mature: true }, `game-${c.gameId}`)}
                        disabled={busy === `game-${c.gameId}`}
                        title="Alle Clips dieses Spiels aus dem Loop nehmen (Alters-Hinweis bei Twitch)"
                        className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-white/[0.08] text-gray-400 hover:text-rose-300 hover:border-rose-400/40 disabled:opacity-50"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" /> Spiel sperren
                      </button>
                    )}
                    <button
                      onClick={() => put({ clipId: c.id, blocked: c.restriction !== "blocked" }, c.id)}
                      disabled={busy === c.id}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${
                        c.restriction === "blocked" ? "border-rose-400/40 text-rose-300 hover:text-teal-300 hover:border-teal-500/40" : "border-teal-500/30 text-teal-300 hover:border-rose-400/40 hover:text-rose-300"
                      }`}
                    >
                      {busy === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : c.restriction === "blocked" ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {c.restriction === "blocked" ? "Ausgeschlossen" : "Ausschließen"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
