"use client";
import { GENRES } from "@/lib/app-icons";
import AppIcon from "@/components/AppIcon";
import GameNameInput from "@/components/GameNameInput";
import { GEMS_MONSTER_CATALOG, GEMS_MONSTER_TEAM_MAX } from "@/lib/gems/gems-monster-catalog";
import { getClassConfig } from "@/components/gems/BattleCardView";
import { inputCls, inputStyle, labelCls } from "../shared";
import type { EventWizard } from "../useEventWizard";

// ── Step 1 (Event): Grunddaten ────────────────────────────────────────────────
export default function StepEventData({ w }: { w: EventWizard }) {
  const { series, squads, forceSquad, setEventType, title, setTitle, startAt, setStartAt, endAt, setEndAt, game, setGame, genre, setGenre, maxPlayers, setMaxPlayers, description, setDescription, discordChannelId, setDiscordChannelId, seriesMode, setSeriesMode, selectedSeriesId, setSelectedSeriesId, newSeriesName, setNewSeriesName, newSeriesDesc, setNewSeriesDesc, publishMode, setPublishMode, publishAt, setPublishAt, startInPast, eventRegistrationLocked, setEventRegistrationLocked, eventSquadId, setEventSquadId, gemsDifficulty, setGemsDifficulty, gemsMaxAttempts, setGemsMaxAttempts, gemsMonsterIds, setGemsMonsterIds, gemsMonsterPick, setGemsMonsterPick, isGemsTournament, eventDataProblem } = w;
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Titel *</label>
        <input type="text" required value={title} onChange={e => setTitle(e.target.value)}
          placeholder="z.B. OMA Turnier Night" className={inputCls} style={inputStyle} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Datum & Uhrzeit (Start) *</label>
          <input type="datetime-local" required value={startAt} onChange={e => setStartAt(e.target.value)}
            className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className={labelCls}>{isGemsTournament ? "Ende (Turnierschluss) *" : "Ende (optional)"}</label>
          <input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)}
            className={inputCls} style={inputStyle} />
        </div>
      </div>
      {startInPast && (
        <p className="text-xs text-amber-400 -mt-2">
          ⚠️ Der Start liegt in der Vergangenheit — die Selbst-Anmeldung ist dann sofort geschlossen und eine
          Ankündigung käme zu spät. Bitte Datum prüfen.
        </p>
      )}

      <div>
        <label className={labelCls}>Max. Spieler</label>
        <input type="number" min="2" value={maxPlayers} onChange={e => setMaxPlayers(e.target.value)}
          placeholder="unbegrenzt" className={inputCls} style={inputStyle} />
      </div>

      <div>
        <label className={labelCls}>Spiel</label>
        <GameNameInput value={game} onChange={(v) => { setGame(v); if (v === "OMA Gems") setEventType("tournament"); }}
          placeholder="z.B. Rocket League, R6 Siege …" className={inputCls} style={inputStyle} />
      </div>

      {isGemsTournament && (
        <div className="rounded-xl p-3 space-y-3" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)" }}>
          <p className="text-xs font-semibold text-violet-300">OMA Gems Turnier-Einstellungen</p>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Alle User treten im Zeitraum zwischen Start und Ende gegen dasselbe feste Gegner-Team an — ihr bester
            Score zählt fürs Ranking. Auf der Battle-Cards-Seite erscheint dafür automatisch ein Banner mit
            Countdown. Platzierungsbelohnungen werden weiter unten im Schritt Belohnungen festgelegt. Das
            Turnier-Ende wird über das „Ende&quot;-Feld oben festgelegt.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Schwierigkeit</label>
              <select value={gemsDifficulty} onChange={e => setGemsDifficulty(e.target.value as "EASY" | "MEDIUM" | "HARD")}
                className={inputCls} style={inputStyle}>
                <option value="EASY">Einfach</option>
                <option value="MEDIUM">Mittel</option>
                <option value="HARD">Schwer</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Max. Versuche pro User</label>
              <input type="number" min="1" value={gemsMaxAttempts} onChange={e => setGemsMaxAttempts(e.target.value)}
                className={inputCls} style={inputStyle} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Boss-Team ({gemsMonsterIds.length}/{GEMS_MONSTER_TEAM_MAX})</label>
            <p className="text-[11px] text-gray-500 mb-2">
              Leer lassen für eine zufällige Auswahl passend zur Schwierigkeit. Sonst gezielt bis zu{" "}
              {GEMS_MONSTER_TEAM_MAX} Gegner wählen (auch mehrfach) — die Schwierigkeit oben bestimmt weiterhin
              deren Stufe.
            </p>
            <div className="flex items-center gap-2">
              <select value={gemsMonsterPick} onChange={e => setGemsMonsterPick(e.target.value)}
                className={inputCls} style={inputStyle}>
                {GEMS_MONSTER_CATALOG.map(m => (
                  <option key={m.cardId} value={m.cardId}>
                    {m.name} · {getClassConfig(m.class).label}
                  </option>
                ))}
              </select>
              <button type="button"
                disabled={gemsMonsterIds.length >= GEMS_MONSTER_TEAM_MAX}
                onClick={() => setGemsMonsterIds(prev => [...prev, gemsMonsterPick])}
                className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold text-violet-300 bg-violet-500/10 border border-violet-500/30 hover:bg-violet-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                + Hinzufügen
              </button>
            </div>
            {gemsMonsterIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {gemsMonsterIds.map((cardId, i) => {
                  const template = GEMS_MONSTER_CATALOG.find(m => m.cardId === cardId);
                  return (
                    <span key={`${cardId}-${i}`}
                      className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11px] bg-white/5 border border-white/10 text-gray-300">
                      {template?.name ?? cardId}
                      <button type="button" onClick={() => setGemsMonsterIds(prev => prev.filter((_, ii) => ii !== i))}
                        className="w-4 h-4 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {game && (
        <div>
          <label className={labelCls}>Genre</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {GENRES.map(g => (
              <button key={g.value} type="button" onClick={() => setGenre(genre === g.value ? null : g.value)}
                className={`flex flex-col items-center gap-1.5 rounded-xl p-2 border transition-all ${
                  genre === g.value ? "border-teal-500/60 bg-teal-500/10" : "border-white/8 bg-white/3 hover:border-white/15"
                }`}>
                <AppIcon kind="genre" name={g.value} size={32} />
                <span className={`text-[10px] font-medium leading-tight text-center ${genre === g.value ? "text-teal-300" : "text-gray-500"}`}>{g.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className={labelCls}>Beschreibung (optional)</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          rows={2} placeholder="Wird in Discord angezeigt"
          className={`${inputCls} resize-none`} style={inputStyle} />
      </div>

      <div>
        <label className={labelCls}>Discord-Textkanal ID (optional)</label>
        <input type="text" value={discordChannelId} onChange={e => setDiscordChannelId(e.target.value)}
          placeholder="Leer = Standardkanal" className={inputCls} style={inputStyle} />
      </div>

      <div className="rounded-xl p-4 border border-white/8 bg-white/2 space-y-2">
        <p className="text-sm text-gray-200">Veröffentlichung</p>
        {([
          ["now", "Sofort veröffentlichen", "Event ist direkt sichtbar und wird auf Discord und per Push angekündigt."],
          ["hidden", "Unsichtbar erstellen", "Noch nicht veröffentlicht — erst beim Sichtbarschalten in den Event-Einstellungen angekündigt."],
          ["scheduled", "Zu einem Zeitpunkt veröffentlichen", "Bleibt bis dahin unsichtbar und wird dann automatisch sichtbar geschaltet und angekündigt."],
        ] as const).map(([value, label, hint]) => (
          <label key={value} className="flex items-start gap-3 cursor-pointer select-none">
            <input type="radio" name="publishMode" checked={publishMode === value} onChange={() => setPublishMode(value)}
              className="w-4 h-4 mt-0.5 accent-violet-500 shrink-0" />
            <div>
              <p className="text-sm text-gray-300">{label}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{hint}</p>
            </div>
          </label>
        ))}
        {publishMode === "scheduled" && (
          <input type="datetime-local" value={publishAt} onChange={e => setPublishAt(e.target.value)}
            className={inputCls} style={inputStyle} />
        )}
      </div>

      <div className="rounded-xl p-4 border border-white/8 bg-white/2">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={eventRegistrationLocked} onChange={e => setEventRegistrationLocked(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded accent-violet-500 shrink-0" />
          <div>
            <p className="text-sm text-gray-200">Selbst-Anmeldung deaktivieren</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              User können sich nicht selbst anmelden — nur Admins/Moderatoren tragen Teilnehmer im
              Tab „Teilnehmer" ein. Praktisch für Team-interne Events (z.B. Trainingsreihen).
            </p>
          </div>
        </label>
      </div>

      {squads.length > 0 && (
        <div className="rounded-xl p-4 border border-white/8 bg-white/2">
          <label className={labelCls}>{forceSquad ? "Squad" : "Nur für Squad (optional)"}</label>
          <select value={eventSquadId} onChange={e => setEventSquadId(e.target.value)}
            className={inputCls} style={inputStyle}>
            {!forceSquad && <option value="">– Für alle offen –</option>}
            {squads.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <p className="text-[11px] text-gray-500 mt-1.5">
            Event bleibt für alle sichtbar, aber nur Mitglieder dieses Squads können sich als
            Spieler anmelden (Zuschauer-Anmeldung bleibt offen).
          </p>
        </div>
      )}

      <div className="rounded-xl p-3 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(20,184,166,0.10)" }}>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Eventreihe</p>
        <div className="flex gap-2 flex-wrap">
          {(["none", "existing", "new"] as const).map(m => (
            <button key={m} type="button" onClick={() => setSeriesMode(m)}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={seriesMode === m
                ? { background: "rgba(20,184,166,0.18)", border: "1px solid rgba(20,184,166,0.35)", color: "#2dd4bf" }
                : { background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280" }}>
              {m === "none" ? "Einzelevent" : m === "existing" ? "Bestehende Reihe" : "Neue Reihe"}
            </button>
          ))}
        </div>
        {seriesMode === "existing" && (
          <select value={selectedSeriesId} onChange={e => setSelectedSeriesId(e.target.value)}
            className={inputCls} style={inputStyle}>
            <option value="">– Reihe auswählen –</option>
            {series.map(s => <option key={s.id} value={s.id}>{s.name} ({s._count.events} Events)</option>)}
          </select>
        )}
        {seriesMode === "new" && (
          <div className="space-y-2">
            <input type="text" value={newSeriesName} onChange={e => setNewSeriesName(e.target.value)}
              placeholder="Name der Reihe" className={inputCls} style={inputStyle} />
            <input type="text" value={newSeriesDesc} onChange={e => setNewSeriesDesc(e.target.value)}
              placeholder="Kurze Beschreibung (optional)" className={inputCls} style={inputStyle} />
          </div>
        )}
      </div>

      {eventDataProblem() && (title || startAt) && (
        <p className="text-xs text-amber-400">{eventDataProblem()}</p>
      )}
    </div>
  );
}
