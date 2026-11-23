"use client";
import { MAX_CYCLES_AHEAD } from "@/lib/series-cycles-config";
import { GENRES } from "@/lib/app-icons";
import AppIcon from "@/components/AppIcon";
import { Hash } from "@/components/icons";
import { RefreshCw, Gamepad2, Swords, Monitor, Eye, EyeOff, Lock, Unlock } from "@/components/icons";
import ImageUploadField from "@/components/ImageUploadField";
import OmaOriginalToggle from "@/components/OmaOriginalToggle";
import { isBlocksGame } from "@/lib/oma-original";
import { EVENT_COVER_PRESETS } from "@/lib/event-cover-presets";
import GameNameInput from "@/components/GameNameInput";
import DiscordChannelSelect from "@/components/DiscordChannelSelect";
import { describeMonthlyModes } from "@/lib/recurrence";
import IconPicker from "@/components/IconPicker";
import { SERIES_FORMAT_OPTIONS } from "@/lib/tournament-formats";
import TournamentTemplateEditor from "@/components/TournamentTemplateEditor";
import { inputCls, PLATFORMS, Section, Field } from "./series-shared";
import type { SeriesDetail } from "./useSeriesDetail";

/** Reiter "Allgemein": Kategorie, Cover, Spiel und Format, Turniervorlage, Discord und Wiederholung.
 *  Das Community-Ziel hat einen eigenen Reiter (SeriesTabGoal). */
export default function SeriesTabGeneral({ ctx }: { ctx: SeriesDetail }) {
  const { series, isModerator, isArchived, isTournamentSeries, tournamentTemplate, setTournamentTemplate, icon, setIcon, coverImageUrl, setCoverImageUrl, category, setCategory, fixedGame, setFixedGame, fixedFormat, setFixedFormat, genre, setGenre, platforms, setPlatforms, discordChannelId, setDiscordChannelId, recurrenceType, setRecurrenceType, cycleConfig, setCycleConfig, recurrenceMonthlyMode, setRecurrenceMonthlyMode, omaOriginal, eventStatFields, latestStartAt, saveOmaOriginal, lockedNotice, setActiveSettingsTab,
    name, setName, description, setDescription, rules, setRules, hidden, hiddenBusy, toggleHidden, registrationLocked,
    registrationLockedBusy, toggleRegistrationLocked, squads, squadId, squadIdBusy, saveSquadId } = ctx;
  return (
    <>
          {/* Name, Beschreibung, Regeln — gespeichert über die Speicherleiste */}
          <Section title="Name und Regeln">
            <Field label="Name der Reihe">
              <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Reihen-Name" />
            </Field>
            <Field label="Beschreibung (optional)">
              <input value={description} onChange={e => setDescription(e.target.value)} className={inputCls} placeholder="Kurz, worum es geht" />
            </Field>
            <Field label="Regelwerk (optional)">
              <textarea value={rules} onChange={e => setRules(e.target.value)} rows={3} className={`${inputCls} resize-none`}
                placeholder="Wird den Spielern über dem Punktesystem angezeigt" />
            </Field>
          </Section>

          {/* Sofort wirksam (eigene Knöpfe, nicht über die Speicherleiste) */}
          <Section title="Sichtbarkeit und Anmeldung">
            <p className="text-xs text-gray-500 -mt-1">Diese Schalter gelten sofort für die Reihe und alle Termine.</p>
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" onClick={toggleHidden} disabled={hiddenBusy}
                className={`flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 transition-all disabled:opacity-50 ${
                  hidden ? "text-amber-400 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20" : "text-gray-300 border-line hover:border-line-strong"
                } max-lg:min-h-10`}>
                {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {hidden ? "Ausgeblendet · einblenden" : "Sichtbar · ausblenden"}
              </button>
              <button type="button" onClick={toggleRegistrationLocked} disabled={registrationLockedBusy}
                className={`flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 transition-all disabled:opacity-50 ${
                  registrationLocked ? "text-amber-400 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20" : "text-gray-300 border-line hover:border-line-strong"
                } max-lg:min-h-10`}>
                {registrationLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                {registrationLocked ? "Anmeldung gesperrt · freigeben" : "Selbst-Anmeldung offen · sperren"}
              </button>
              {squads.length > 0 && (
                <select value={squadId} disabled={squadIdBusy} onChange={e => saveSquadId(e.target.value)}
                  aria-label="Anmeldung auf ein Squad beschränken"
                  className="text-xs rounded-control px-2.5 py-1.5 border outline-none bg-surface-2 border-line text-gray-200 disabled:opacity-50">
                  <option value="">Für alle offen</option>
                  {squads.map(s => <option key={s.id} value={s.id}>Nur Squad: {s.name}</option>)}
                </select>
              )}
            </div>
          </Section>

          {/* Kategorie */}
          <Section title="Kategorie">
            <Field label="Kategorie">
              <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                <option value="">– Keine Kategorie –</option>
                <option value="competitive">🏆 Kompetitiv</option>
                <option value="fun">🎉 Fun</option>
                <option value="casual">🛋️ Casual</option>
                <option value="training">🎓 Training</option>
                <option value="community_event">🤝 Community</option>
                <option value="special">⭐ Special</option>
              </select>
            </Field>
            <Field label="Icon">
              <IconPicker value={icon} onChange={setIcon} />
            </Field>
          </Section>

          {/* Eigenes Reihen-Cover */}
          <Section title="Reihen-Cover">
            {isModerator && (
              <OmaOriginalToggle kind="series" checked={omaOriginal} onChange={saveOmaOriginal} blocksGame={isBlocksGame(series.fixedGame)} />
            )}
            <ImageUploadField
              value={coverImageUrl}
              onChange={setCoverImageUrl}
              kind="event-cover"
              presetsOnly={!isModerator}
              presets={EVENT_COVER_PRESETS}
              label="Eigenes Reihen-Bild"
              hint="Optional — eigenes Bild hochladen oder eine Vorlage wählen. Events der Reihe ohne eigenes Bild erben dieses. Ohne Reihen-Bild greift das Spiel-Cover, sonst das Standard-Motiv. Empfohlen: 1200×630."
              previewAspect="1200/630"
            />
          </Section>

          {/* Spiel & Format */}
          {lockedNotice}
          <fieldset disabled={isArchived} className="min-w-0 border-0 p-0 m-0">
          <Section title="Spiel & Format">
            <Field label={<><Gamepad2 className="w-3 h-3" /> Festes Spiel</>}>
              <GameNameInput value={fixedGame} onChange={setFixedGame} placeholder="Leer = verschiedene Spiele" className={inputCls} />
            </Field>
            <Field label={<><Swords className="w-3 h-3" /> Festes Turnierformat</>}>
              <select value={fixedFormat} onChange={e => setFixedFormat(e.target.value)} className={inputCls}>
                <option value="">– Kein festes Format –</option>
                {SERIES_FORMAT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </Field>
            <Field label="Genre">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {GENRES.map(g => (
                  <button key={g.value} type="button" onClick={() => setGenre(genre === g.value ? "" : g.value)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-2 border transition-all ${
                      genre === g.value ? "border-primary/60 bg-primary/10" : "border-line bg-surface-2 hover:border-line-strong"
                    }`}>
                    <AppIcon kind="genre" name={g.value} size={32} />
                    <span className={`text-xs font-medium leading-tight text-center ${genre === g.value ? "text-primary-fg" : "text-gray-500"}`}>{g.label}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label={<><Monitor className="w-3 h-3" /> Plattform</>}>
              <div className="flex gap-2 flex-wrap">
                {PLATFORMS.map(p => {
                  const active = platforms.includes(p.value);
                  return (
                    <button key={p.value} type="button"
                      onClick={() => setPlatforms(prev => active ? prev.filter(x => x !== p.value) : [...prev, p.value])}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs border transition-all ${
                        active ? "border-primary/60 bg-primary/10 text-primary-fg" : "border-line-strong bg-line text-gray-400 hover:border-line-strong"
                      }`}>
                      <span>{p.icon}</span> {p.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          </Section>
          </fieldset>

          {/* Turniervorlage für neue Termine */}
          {isTournamentSeries && (
            <Section title="Turniervorlage für neue Termine">
              <p className="text-xs text-gray-500">
                Jeder neu angelegte Termin der Reihe übernimmt diese Einstellungen — bestehende Termine bleiben unverändert.
                Eine neue Saison übernimmt die Vorlage automatisch.
              </p>
              <TournamentTemplateEditor format={fixedFormat} value={tournamentTemplate} onChange={setTournamentTemplate} statFields={eventStatFields} disabled={isArchived} hideGoal />
              <button type="button" onClick={() => setActiveSettingsTab("goal")} className="mt-2 text-xs font-semibold text-primary-fg hover:text-teal-200">
                🎯 Community-Ziel der Reihe einstellen →
              </button>
            </Section>
          )}

          {/* Discord & Wiederholung */}
          <Section title="Discord & Wiederholung">
            {/* Ankündigungskanal legen nur Mods fest (die API ignoriert ihn für Mitglieder) */}
            {isModerator && (
              <Field label={<><Hash className="w-3 h-3" /> Discord-Kanal</>}>
                <DiscordChannelSelect value={discordChannelId} onChange={setDiscordChannelId} emptyLabel="Standard (News-Kanal)" />
                <p className="text-xs text-gray-600 mt-1">Wird auf alle Events der Reihe angewendet</p>
              </Field>
            )}
            <Field label={<><RefreshCw className="w-3 h-3" /> Wiederholung</>}>
              <select value={recurrenceType} onChange={e => setRecurrenceType(e.target.value as typeof recurrenceType)} className={inputCls}>
                <option value="">Keine Wiederholung</option>
                <option value="weekly">Wöchentlich</option>
                <option value="biweekly">Alle 2 Wochen</option>
                <option value="monthly">Monatlich</option>
              </select>
              {recurrenceType === "monthly" && (() => {
                const labels = describeMonthlyModes(latestStartAt);
                return (
                  <div className="mt-2 space-y-1.5">
                    {(["dayOfMonth", "weekdayOfMonth"] as const).map(mode => (
                      <button key={mode} type="button" onClick={() => setRecurrenceMonthlyMode(mode)}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all"
                        style={recurrenceMonthlyMode === mode
                          ? { background: "color-mix(in srgb, var(--color-primary) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--color-primary) 35%, transparent)", color: "#2dd4bf" }
                          : { background: "transparent", border: "1px solid var(--color-line)", color: "#6b7280" }
                        }>
                        {labels[mode]}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </Field>
            {isModerator && recurrenceType && (
              <Field label={<><RefreshCw className="w-3 h-3" /> Zyklen automatisch fortführen</>}>
                <label className="flex items-start gap-2 text-sm text-gray-300 cursor-pointer select-none">
                  <input type="checkbox" checked={cycleConfig.enabled} className="rounded mt-0.5"
                    onChange={e => setCycleConfig(c => ({ ...c, enabled: e.target.checked }))} />
                  <span>
                    Reihe läuft dauerhaft — neue Zyklen legt das System selbst an
                    <span className="block text-xs text-gray-500">
                      Jeder Zyklus bleibt ein eigener Termin mit Anmeldung, Meldungen, Sieger und Abschluss. Startzeit und
                      Dauer folgen dem letzten Termin und der Wiederholung. Abschließen musst du die Zyklen weiterhin selbst.
                    </span>
                  </span>
                </label>
                {cycleConfig.enabled && (
                  <div className="mt-3 space-y-3 pl-6">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Vorab veröffentlichte Zyklen</label>
                      <select value={cycleConfig.aheadCount} className={inputCls}
                        onChange={e => setCycleConfig(c => ({ ...c, aheadCount: Number(e.target.value) }))}>
                        {Array.from({ length: MAX_CYCLES_AHEAD }, (_, i) => i + 1).map(n => (
                          <option key={n} value={n}>{n === 1 ? "Immer der nächste Zyklus" : `Immer die nächsten ${n} Zyklen`}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-600 mt-1">
                        So lange vorher können sich User anmelden und das Ziel des Zyklus sehen. In der Events-Übersicht
                        erscheint trotzdem nur der nächste Zyklus der Reihe.
                      </p>
                    </div>
                    <label className="flex items-start gap-2 text-sm text-gray-300 cursor-pointer select-none">
                      <input type="checkbox" checked={cycleConfig.carryParticipants} className="rounded mt-0.5"
                        onChange={e => setCycleConfig(c => ({ ...c, carryParticipants: e.target.checked }))} />
                      <span>
                        Teilnehmer automatisch übernehmen
                        <span className="block text-xs text-gray-500">Wer im laufenden oder einem kommenden Zyklus angemeldet ist, ist im neuen Zyklus direkt dabei.</span>
                      </span>
                    </label>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Reihe endet am (optional)</label>
                      <input type="date" className={inputCls}
                        value={cycleConfig.endsAt ? cycleConfig.endsAt.slice(0, 10) : ""}
                        onChange={e => setCycleConfig(c => {
                          const { endsAt: _drop, ...rest } = c;
                          void _drop;
                          return e.target.value ? { ...rest, endsAt: new Date(`${e.target.value}T23:59:59`).toISOString() } : rest;
                        })} />
                      <p className="text-xs text-gray-600 mt-1">Danach entstehen keine neuen Zyklen mehr.</p>
                    </div>
                    {series.events.length === 0 && (
                      <p className="text-xs text-amber-400">Lege den ersten Zyklus einmal selbst an — Start, Ende und Einstellungen werden dann übernommen.</p>
                    )}
                  </div>
                )}
              </Field>
            )}
          </Section>
          </>
  );
}
