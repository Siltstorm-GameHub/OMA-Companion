"use client";

// Spielwahl-Einstellungen einer Eventreihe (lib/game-vote): Ein/aus, wann die Abstimmung beginnt und endet,
// Kandidaten, Ausschluss der letzten Spiele, Münzen fürs Abstimmen. Dazu: Spielwahl für schon angelegte
// kommende Termine nachträglich starten.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { GAME_VOTE_LIMITS, TIGHT_CLOSE_HOURS, type GameVoteConfig } from "@/lib/game-vote/rules";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

export default function GameVoteSettings({ seriesId, initial, fixedGame, upcoming, squadName }: {
  seriesId: string;
  initial: GameVoteConfig;
  fixedGame: string | null;
  /** Kommende Termine ohne Spielwahl */
  upcoming: { id: string; title: string; startAt: string; game: string | null }[];
  squadName: string | null;
}) {
  const router = useRouter();
  const [cfg, setCfg] = useState<GameVoteConfig>(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof GameVoteConfig>(k: K, v: GameVoteConfig[K]) => setCfg(c => ({ ...c, [k]: v }));

  async function request(method: "PATCH" | "POST", body: unknown) {
    const res = await fetch(`/api/admin/event-series/${seriesId}/game-vote`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
    return data;
  }

  async function save() {
    setSaving(true);
    try {
      const data = await request("PATCH", cfg);
      setCfg(data.config);
      toast.success("Spielwahl-Einstellungen gespeichert");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  async function start(eventId: string) {
    setSaving(true);
    try {
      const data = await request("POST", { eventId });
      toast.success(data.shortened ? "Spielwahl gestartet — Zeitfenster wurde verkürzt, der Termin ist bald" : "Spielwahl gestartet");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Starten fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  const input = "w-20 bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-teal-500/40";
  const num = (k: keyof typeof GAME_VOTE_LIMITS) => (
    <input type="number" min={GAME_VOTE_LIMITS[k][0]} max={GAME_VOTE_LIMITS[k][1]} value={cfg[k]} className={input}
      onChange={e => set(k, Number(e.target.value))} />
  );

  return (
    <section className="glass rounded-2xl p-5 mt-5 space-y-4">
      <div>
        <h2 className="text-base font-bold text-white">🗳️ Spielwahl</h2>
        <p className="text-xs text-gray-400 mt-1 max-w-2xl">
          Mitglieder wählen das Spiel jedes Termins: Beim Anlegen des nächsten Termins entsteht ein Platzhalter ohne Spiel und eine
          Abstimmung mit Kandidaten aus der Spieleliste (nach Passt-Wert, Platz 2 und 3 der letzten Wahl sind wieder dabei). Wer
          abstimmt, ist automatisch als Mitspieler angemeldet. Nach der Wahl legt ein Mod die Regeln fest — erst dann kann ausgelost werden.
          {squadName && <> Abstimmen dürfen nur Mitglieder von {squadName}.</>}
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-white">
        <input type="checkbox" checked={cfg.enabled} onChange={e => set("enabled", e.target.checked)} />
        Spiel per Abstimmung wählen lassen
      </label>
      {cfg.enabled && fixedGame && (
        <p className="text-xs text-amber-200">Das feste Spiel „{fixedGame}“ wird für neue Termine ignoriert, solange die Spielwahl an ist.</p>
      )}

      {cfg.enabled && (
        <div className="grid gap-3 sm:grid-cols-2 text-xs text-gray-300">
          <div className="space-y-1.5">
            <p className="text-gray-500 uppercase tracking-wider text-[10px]">Beginn der Abstimmung</p>
            <label className="flex items-center gap-2">
              <input type="radio" checked={cfg.opensMode === "on_create"} onChange={() => set("opensMode", "on_create")} />
              Sobald der Termin angelegt ist
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={cfg.opensMode === "days_before"} onChange={() => set("opensMode", "days_before")} />
              {num("opensDaysBefore")} Tage vor Start
            </label>
          </div>
          <div className="space-y-1.5">
            <p className="text-gray-500 uppercase tracking-wider text-[10px]">Ende der Abstimmung</p>
            <label className="flex items-center gap-2">{num("closesHoursBefore")} Stunden vor Start</label>
            {cfg.closesHoursBefore < TIGHT_CLOSE_HOURS && (
              <p className="text-amber-200">Knapp: Es bleibt wenig Zeit für Regeln und zum Installieren oder Kaufen.</p>
            )}
          </div>
          <label className="flex items-center gap-2">{num("candidateCount")} Kandidaten je Wahl</label>
          <label className="flex items-center gap-2">Spiele der letzten {num("excludeLastN")} Termine ausschließen</label>
          <label className="flex items-center gap-2">{num("voteCoins")} Münzen fürs Abstimmen (0 = keine)</label>
        </div>
      )}
      <Button size="sm" onClick={save} disabled={saving}>Speichern</Button>

      {initial.enabled && upcoming.length > 0 && (
        <div className="border-t border-white/[0.06] pt-3 space-y-2">
          <p className="text-xs text-gray-400">Kommende Termine ohne Spielwahl:</p>
          {upcoming.map(e => (
            <div key={e.id} className="flex items-center gap-3 text-xs">
              <span className="flex-1 min-w-0 truncate text-white">{e.title} <span className="text-gray-500">· {fmt(e.startAt)}{e.game ? ` · ${e.game}` : ""}</span></span>
              <Button size="sm" variant="ghost" disabled={saving} onClick={() => start(e.id)}>Spielwahl starten</Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
