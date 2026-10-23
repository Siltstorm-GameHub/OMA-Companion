"use client";
import { GENRES } from "@/lib/app-icons";
import AppIcon from "@/components/AppIcon";
import GameNameInput from "@/components/GameNameInput";
import { PLATFORMS, inputCls, inputStyle, labelCls } from "../shared";
import type { EventWizard } from "../useEventWizard";

// ── Step 1 (Series): Reihen-Grunddaten ───────────────────────────────────────
export default function StepSeriesData({ w }: { w: EventWizard }) {
  const { squads, forceSquad, seriesName, setSeriesName, seriesDesc, setSeriesDesc, variousGames, setVariousGames, fixedGame, setFixedGame, fixedGenre, setFixedGenre, fixedPlatforms, setFixedPlatforms, seriesDiscordId, setSeriesDiscordId, seriesHidden, setSeriesHidden, seriesRegistrationLocked, setSeriesRegistrationLocked, seriesSquadId, setSeriesSquadId } = w;
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Name der Reihe *</label>
        <input type="text" required value={seriesName} onChange={e => setSeriesName(e.target.value)}
          placeholder="z.B. Friday Fights" className={inputCls} style={inputStyle} />
      </div>

      <div>
        <label className={labelCls}>Beschreibung (optional)</label>
        <textarea value={seriesDesc} onChange={e => setSeriesDesc(e.target.value)}
          rows={2} placeholder="Kurze Beschreibung der Reihe"
          className={`${inputCls} resize-none`} style={inputStyle} />
      </div>

      <div>
        <label className={labelCls}>Spiel</label>
        <div className="flex gap-2 mb-2">
          {([false, true] as const).map(v => (
            <button key={String(v)} type="button"
              onClick={() => { setVariousGames(v); if (v) { setFixedGame(""); setFixedGenre(null); } }}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium border transition-all ${
                variousGames === v
                  ? "border-teal-500/60 bg-teal-500/10 text-teal-300"
                  : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
              }`}>
              {v ? "🎲 Verschiedene Spiele" : "🎮 Festes Spiel"}
            </button>
          ))}
        </div>
        {!variousGames && (
          <GameNameInput value={fixedGame} onChange={setFixedGame}
            placeholder="z.B. Rocket League" className={inputCls} style={inputStyle} />
        )}
        {variousGames && (
          <p className="text-[11px] text-gray-500 px-1">
            Jedes Event kann ein eigenes Spiel und Format haben. Format-Vorlage für die Reihe entfällt.
          </p>
        )}
      </div>

      {!variousGames && fixedGame && (
        <div>
          <label className={labelCls}>Genre</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {GENRES.map(g => (
              <button key={g.value} type="button" onClick={() => setFixedGenre(fixedGenre === g.value ? null : g.value)}
                className={`flex flex-col items-center gap-1.5 rounded-xl p-2 border transition-all ${
                  fixedGenre === g.value ? "border-teal-500/60 bg-teal-500/10" : "border-white/8 bg-white/3 hover:border-white/15"
                }`}>
                <AppIcon kind="genre" name={g.value} size={32} />
                <span className={`text-[10px] font-medium leading-tight text-center ${fixedGenre === g.value ? "text-teal-300" : "text-gray-500"}`}>{g.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className={labelCls}>Plattform</label>
        <div className="flex gap-2 flex-wrap">
          {PLATFORMS.map(p => {
            const active = fixedPlatforms.includes(p.value);
            return (
              <button key={p.value} type="button"
                onClick={() => setFixedPlatforms(prev => active ? prev.filter(x => x !== p.value) : [...prev, p.value])}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs border transition-all ${
                  active ? "border-teal-500/60 bg-teal-500/10 text-teal-300" : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
                }`}>
                <span>{p.icon}</span> {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className={labelCls}>Discord-Textkanal ID (optional)</label>
        <input type="text" value={seriesDiscordId} onChange={e => setSeriesDiscordId(e.target.value)}
          placeholder="Leer = Standardkanal" className={inputCls} style={inputStyle} />
      </div>

      <div className="rounded-xl p-4 border border-white/8 bg-white/2">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={seriesHidden} onChange={e => setSeriesHidden(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded accent-violet-500 shrink-0" />
          <div>
            <p className="text-sm text-gray-200">Unsichtbar erstellen</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Die Reihe wird angelegt, aber noch nicht veröffentlicht. Sichtbarkeit kann jederzeit in den Reihen-Einstellungen geändert werden.
            </p>
          </div>
        </label>
      </div>

      <div className="rounded-xl p-4 border border-white/8 bg-white/2">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={seriesRegistrationLocked} onChange={e => setSeriesRegistrationLocked(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded accent-violet-500 shrink-0" />
          <div>
            <p className="text-sm text-gray-200">Selbst-Anmeldung deaktivieren</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              User können sich für kein Event dieser Reihe selbst anmelden — nur Admins/Moderatoren
              tragen Teilnehmer ein. Gilt automatisch auch für später generierte Termine der Reihe.
              Praktisch für Team-interne Reihen (z.B. Trainingsserien).
            </p>
          </div>
        </label>
      </div>

      {squads.length > 0 && (
        <div className="rounded-xl p-4 border border-white/8 bg-white/2">
          <label className={labelCls}>{forceSquad ? "Squad" : "Nur für Squad (optional)"}</label>
          <select value={seriesSquadId} onChange={e => setSeriesSquadId(e.target.value)}
            className={inputCls} style={inputStyle}>
            {!forceSquad && <option value="">– Für alle offen –</option>}
            {squads.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <p className="text-[11px] text-gray-500 mt-1.5">
            Gilt für alle Events der Reihe (auch später generierte) — bleiben für alle sichtbar,
            aber nur Mitglieder dieses Squads können sich als Spieler anmelden.
          </p>
        </div>
      )}
    </div>
  );
}
