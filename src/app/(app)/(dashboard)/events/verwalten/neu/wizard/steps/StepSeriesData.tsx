"use client";
import ImageUploadField from "@/components/ImageUploadField";
import DiscordChannelSelect from "@/components/DiscordChannelSelect";
import { EVENT_COVER_PRESETS } from "@/lib/event-cover-presets";
import GameNameInput from "@/components/GameNameInput";
import OmaOriginalToggle from "@/components/OmaOriginalToggle";
import { isBlocksGame } from "@/lib/oma-original";
import { PLATFORMS, inputCls, inputStyle, labelCls } from "../shared";
import type { EventWizard } from "../useEventWizard";

// ── Step 1 (Series): Reihen-Grunddaten ───────────────────────────────────────
export default function StepSeriesData({ w }: { w: EventWizard }) {
  const { squads, forceSquad, seriesName, setSeriesName, seriesDesc, setSeriesDesc, variousGames, setVariousGames, fixedGame, setFixedGame, setFixedGenre, fixedPlatforms, setFixedPlatforms, seriesDiscordId, setSeriesDiscordId, seriesHidden, setSeriesHidden, seriesRegistrationLocked, setSeriesRegistrationLocked, seriesSquadId, setSeriesSquadId } = w;
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

      <ImageUploadField
        value={w.seriesCoverUrl}
        onChange={w.setSeriesCoverUrl}
        kind="event-cover"
        presetsOnly={w.isCommunity}
        presets={EVENT_COVER_PRESETS}
        label="Reihen-Bild (optional)"
        hint={w.isCommunity ? "Gilt für alle Termine der Reihe, die kein eigenes Bild haben. Wähle eine Vorlage." : "Gilt für alle Termine der Reihe, die kein eigenes Bild haben. Vorlage wählen, hochladen oder URL einfügen. Empfohlen: 1200×630."}
        previewAspect="1200/630"
      />

      <div>
        <label className={labelCls}>Spiel</label>
        <div className="flex gap-2 mb-2">
          {([false, true] as const).map(v => (
            <button key={String(v)} type="button"
              onClick={() => { setVariousGames(v); if (v) { setFixedGame(""); setFixedGenre(null); } }}
              className={`flex-1 rounded-control px-3 py-2 text-xs font-medium border transition-all ${
                variousGames === v
                  ? "border-primary/60 bg-primary/10 text-primary-fg"
                  : "border-line-strong bg-line text-muted hover:border-line-strong"
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
          <p className="text-xs text-subtle px-1">
            Jedes Event kann ein eigenes Spiel und Format haben. Format-Vorlage für die Reihe entfällt.
          </p>
        )}
      </div>


      <div>
        <label className={labelCls}>Plattform</label>
        <div className="flex gap-2 flex-wrap">
          {PLATFORMS.map(p => {
            const active = fixedPlatforms.includes(p.value);
            return (
              <button key={p.value} type="button"
                onClick={() => setFixedPlatforms(prev => active ? prev.filter(x => x !== p.value) : [...prev, p.value])}
                className={`flex items-center gap-1.5 rounded-control px-3 py-2 text-xs border transition-all ${
                  active ? "border-primary/60 bg-primary/10 text-primary-fg" : "border-line-strong bg-line text-muted hover:border-line-strong"
                }`}>
                <span>{p.icon}</span> {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {!w.isCommunity && (
        <div>
          <label className={labelCls}>Discord-Textkanal (optional)</label>
          <DiscordChannelSelect value={seriesDiscordId} onChange={setSeriesDiscordId} emptyLabel="Standard (News-Kanal)" />
        </div>
      )}

      {!w.isCommunity && (
        <OmaOriginalToggle kind="series" checked={w.seriesOmaOriginal} onChange={w.setSeriesOmaOriginal}
          blocksGame={!w.variousGames && isBlocksGame(w.fixedGame)} />
      )}

      <div className="rounded-control p-4 border border-line bg-surface-2">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={seriesHidden} onChange={e => setSeriesHidden(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded accent-primary shrink-0" />
          <div>
            <p className="text-sm text-fg">Unsichtbar erstellen</p>
            <p className="text-xs text-subtle mt-0.5">
              Die Reihe wird angelegt, aber noch nicht veröffentlicht. Sichtbarkeit kann jederzeit in den Reihen-Einstellungen geändert werden.
            </p>
          </div>
        </label>
      </div>

      <div className="rounded-control p-4 border border-line bg-surface-2">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={seriesRegistrationLocked} onChange={e => setSeriesRegistrationLocked(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded accent-primary shrink-0" />
          <div>
            <p className="text-sm text-fg">Selbst-Anmeldung deaktivieren</p>
            <p className="text-xs text-subtle mt-0.5">
              User können sich für kein Event dieser Reihe selbst anmelden — nur Admins/Moderatoren
              tragen Teilnehmer ein. Gilt automatisch auch für später generierte Termine der Reihe.
              Praktisch für Team-interne Reihen (z.B. Trainingsserien).
            </p>
          </div>
        </label>
      </div>

      {squads.length > 0 && (
        <div className="rounded-control p-4 border border-line bg-surface-2">
          <label className={labelCls}>{forceSquad ? "Squad" : "Nur für Squad (optional)"}</label>
          <select value={seriesSquadId} onChange={e => setSeriesSquadId(e.target.value)}
            className={inputCls} style={inputStyle}>
            {!forceSquad && <option value="">– Für alle offen –</option>}
            {squads.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <p className="text-xs text-subtle mt-1.5">
            Gilt für alle Events der Reihe (auch später generierte) — bleiben für alle sichtbar,
            aber nur Mitglieder dieses Squads können sich als Spieler anmelden.
          </p>
        </div>
      )}
    </div>
  );
}
