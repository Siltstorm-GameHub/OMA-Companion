"use client";
import { GENRES } from "@/lib/app-icons";
import AppIcon from "@/components/AppIcon";
import Image from "next/image";
import Link from "next/link";
import { Repeat } from "@/components/icons";
import { Trophy, AlertTriangle, AlertCircle, Tv2, Clapperboard } from "@/components/icons";
import { EventCategory } from "@prisma/client";
import GameNameInput from "@/components/GameNameInput";
import DiscordChannelSelect from "@/components/DiscordChannelSelect";
import ImageUploadField from "@/components/ImageUploadField";
import OmaOriginalToggle from "@/components/OmaOriginalToggle";
import { isBlocksGame, isOmaOriginalSeries } from "@/lib/oma-original";
import { EVENT_COVER_PRESETS } from "@/lib/event-cover-presets";
import PublishStatusPanel from "./PublishStatusPanel";
import BlocksEventSettings from "@/components/blocks/BlocksEventSettings";
import { fromDatetimeLocalBerlin, formatBerlinDate } from "@/lib/time";
import GameCover from "@/components/GameCover";
import { EVENT_KIND_LABEL, type EventKind } from "@/lib/event-placement";
import { NumberInput } from "@/components/ui/NumberInput";
import { TMT_FORMATS, CATEGORIES, STATUS_OPTIONS, STATUS_STYLES, inputCls, labelCls, STATUS_LABELS_DE, Panel, Switch } from "./edit-shared";
import type { EventEdit } from "./useEventEdit";

/** Reiter "Details": Grunddaten, Zeit und Teilnahme, Darstellung, Vorschau, Sichtbarkeit, Erweitert. */
export default function TabDetails({ ctx }: { ctx: EventEdit }) {
  const { registrationClosesAt, setRegistrationClosesAt, event, squads, isModerator, status, loading, undoCompletion, title, setTitle, description, setDescription, rules, setRules, game, setGame, genre, setGenre, category, setCategory, startAt, setStartAt, endAt, setEndAt, maxPlayers, setMaxPlayers, discordChannelId, setDiscordChannelId, propagateTitleDesc, setPropagateTitleDesc, isBlocksEvent, blocks, setBlocks, blocksKindLocked, blocksLockedReason, titleDescChanged, participationCoins, eventKind, setEventKind, kindLocked, tmtFormat, setTmtFormat, tmtLoading, hasTournament, hidden, setHidden, registrationLocked, setRegistrationLocked, spectatorMode, setSpectatorMode, omaOriginal, setOmaOriginal, squadId, setSquadId, twitchClipUrl, setTwitchClipUrl, coverImageUrl, setCoverImageUrl, allPartners, selectedPartnerIds, setSelectedPartnerIds, partnersLoaded, partnersOpen, setPartnersOpen, seriesGame, seriesDiscord, pickStatus, saveTmtSettings, isUpcoming, isSeriesEvent, playerCount, selectedPartners, backHref } = ctx;
  // Mitglieder: von einem Mod ausgeblendet → nicht selbst einblendbar; wartet auf Freigabe → keine Ankündigung
  const lockedByMod = !isModerator && !!(event.hiddenByModAt || event.series?.hiddenByModAt);
  const awaitingApproval = event.approvalStatus === "pending" || event.series?.approvalStatus === "pending";
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] items-start">
          <div className="space-y-4 min-w-0">
            {/* Reihen-Termin ohne Turnier (z.B. versehentlich gelöscht) — sonst gäbe es keinen Weg zurück */}
            {isSeriesEvent && !hasTournament && (
              <div className="rounded-xl p-4 border border-red-500/20 bg-red-500/5 space-y-3">
                <p className="text-sm font-medium text-red-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Kein Turnier vorhanden
                </p>
                <p className="text-xs text-gray-500">
                  Dieser Termin hat kein Format, deshalb fehlt der Reiter „Spielplan“. Format wählen und erstellen,
                  um ihn wiederherzustellen. Vorherige Matches und Ergebnisse lassen sich dabei nicht wiederherstellen.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {TMT_FORMATS.map(f => (
                    <button key={f.value} type="button" onClick={() => setTmtFormat(f.value)}
                      className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                        tmtFormat === f.value ? "border-amber-500 bg-amber-900/25 text-white" : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                      }`}>
                      <p className="text-xs font-medium leading-tight">{f.label}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{f.desc}</p>
                    </button>
                  ))}
                </div>
                <button onClick={() => saveTmtSettings()} disabled={tmtLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white bg-red-700 hover:bg-red-600 transition-colors disabled:opacity-50">
                  <Trophy className="w-4 h-4" />
                  {tmtLoading ? "Wird erstellt…" : "Format anlegen und Reiter wiederherstellen"}
                </button>
              </div>
            )}

            {/* ── Grunddaten ── */}
            <Panel title="Grunddaten">
              {isSeriesEvent ? (
                <p className="text-xs text-gray-500">
                  Titel, Spiel, Regeln und Belohnungen kommen aus der Eventreihe{" "}
                  <Link href={backHref} className="text-teal-400 hover:text-teal-300">{event.series.name}</Link>.
                </p>
              ) : (
                <>
                  <div>
                    <label className={labelCls}>Titel</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputCls} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={`${labelCls} flex items-center justify-between`}>
                        <span>Spiel</span>
                        {seriesGame && game && seriesGame !== game && (
                          <span className="flex items-center gap-1 text-amber-400 text-[10px]">
                            <AlertCircle className="w-3 h-3" /> Abweichend von Reihe ({seriesGame})
                          </span>
                        )}
                      </label>
                      <GameNameInput value={game} onChange={setGame} placeholder="z.B. Valorant" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Event-Typ</label>
                      <select value={eventKind} disabled={kindLocked} onChange={e => setEventKind(e.target.value as EventKind)}
                        title={kindLocked ? "Nach dem Abschluss nicht mehr änderbar" : undefined}
                        className={`${inputCls} disabled:opacity-60`}>
                        {(["community", "tournament"] as const).map(k => (
                          <option key={k} value={k}>{EVENT_KIND_LABEL[k].emoji} {EVENT_KIND_LABEL[k].label}</option>
                        ))}
                      </select>
                      {eventKind === "community" && !kindLocked && (
                        <p className="mt-1 text-[11px] text-violet-300/80">Keine Platzierung — alle Teilnehmer bekommen nur die Teilnahme-Belohnung.</p>
                      )}
                      {kindLocked && <p className="mt-1 text-[11px] text-gray-500">Nach dem Abschluss nicht mehr änderbar.</p>}
                    </div>
                    <div>
                      <label className={labelCls}>Kategorie</label>
                      <select value={category} onChange={e => setCategory(e.target.value as EventCategory)} className={inputCls}>
                        {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                      </select>
                    </div>
                  </div>
                  {isBlocksEvent && (
                    <BlocksEventSettings value={blocks} onChange={setBlocks} kindLocked={blocksKindLocked}
                      lockedReason={blocksLockedReason} inputCls={inputCls} labelCls={labelCls} />
                  )}
                  {game && (
                    <div>
                      <label className={labelCls}>Genre</label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {GENRES.map(g => (
                          <button key={g.value} type="button" onClick={() => setGenre(genre === g.value ? null : g.value)}
                            className={`flex flex-col items-center gap-1.5 rounded-xl p-2 border transition-all ${
                              genre === g.value ? "border-teal-500/60 bg-teal-500/10" : "border-line bg-surface-2 hover:border-line-strong"
                            }`}>
                            <AppIcon kind="genre" name={g.value} size={28} />
                            <span className={`text-[10px] font-medium leading-tight text-center ${genre === g.value ? "text-teal-300" : "text-gray-500"}`}>{g.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Beschreibung</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)}
                      rows={3} placeholder="Wird auch im Discord angezeigt" className={`${inputCls} resize-none`} />
                  </div>
                  <div>
                    <label className={labelCls}>Regelwerk</label>
                    <textarea value={rules} onChange={e => setRules(e.target.value)}
                      rows={4} placeholder="Wird über dem Punktesystem angezeigt" className={`${inputCls} resize-none`} />
                  </div>
                  {event.series && titleDescChanged && (
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={propagateTitleDesc} onChange={e => setPropagateTitleDesc(e.target.checked)}
                        className="rounded accent-teal-500" />
                      <span className="text-teal-400 text-xs flex items-center gap-1">
                        <Repeat className="w-3 h-3" />
                        Titel und Beschreibung auf alle Events von „{event.series.name}“ anwenden
                      </span>
                    </label>
                  )}
                </>
              )}
            </Panel>

            {/* ── Zeit und Teilnahme ── */}
            <Panel title="Zeit und Teilnahme">
              <div className={`grid gap-3 ${isSeriesEvent ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
                <div>
                  <label className={labelCls}>Start</label>
                  <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Ende (optional)</label>
                  <input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} className={inputCls} />
                </div>
                {!isSeriesEvent && (
                  <div>
                    <label className={labelCls}>Max. Spieler</label>
                    <NumberInput min={2} value={maxPlayers} onChange={e => setMaxPlayers(e.target.value)} placeholder="unbegrenzt" className={inputCls} />
                  </div>
                )}
              </div>
              {!registrationLocked && (
                <div>
                  <label className={labelCls}>Anmeldeschluss (optional)</label>
                  <input type="datetime-local" value={registrationClosesAt} onChange={e => setRegistrationClosesAt(e.target.value)} className={inputCls} />
                  <p className="text-[11px] text-gray-500 mt-1">Leer = Anmeldung bis zum Start. Praktisch bei Turnieren, damit vor der Auslosung niemand mehr dazukommt.</p>
                  {registrationClosesAt && startAt && registrationClosesAt > startAt && (
                    <p className="text-[11px] text-amber-300 mt-1">Liegt nach dem Start, die Anmeldung schließt trotzdem schon beim Start.</p>
                  )}
                </div>
              )}
              <Switch checked={!registrationLocked} onChange={v => setRegistrationLocked(!v)}
                label="Selbst anmelden erlaubt"
                hint={registrationLocked ? "Nur du trägst Teilnehmer ein (Reiter Teilnehmer)" : "Mitglieder melden sich selbst an"} />
              <Switch checked={spectatorMode} onChange={setSpectatorMode}
                label="Zuschauer erlauben"
                hint={spectatorMode ? "Mitglieder können sich bis zum Abschluss als Zuschauer anmelden (Belohnung im Reiter Belohnungen)" : "Nur Spieler"} />
              {squads.length > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-300">Nur für ein Squad</span>
                  <select value={squadId} onChange={e => setSquadId(e.target.value)}
                    className="rounded-lg px-2.5 py-1.5 text-xs text-white outline-none bg-gray-800 border border-gray-700 max-w-[55%]">
                    <option value="">Für alle offen</option>
                    {squads.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
            </Panel>

            {/* ── Darstellung und Stream ── */}
            <Panel title="Darstellung und Stream">
              <ImageUploadField
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                kind="event-cover"
                presetsOnly={!isModerator}
                presets={EVENT_COVER_PRESETS}
                label="Eigenes Event-Bild"
                hint="Optional. Ohne eigenes Bild greift das Spiel-Cover, sonst das Standard-Motiv. Empfohlen: 1200×630."
                previewAspect="1200/630"
              />
              <div>
                <label className={`${labelCls} flex items-center gap-1.5`}>
                  <Clapperboard className="w-3.5 h-3.5 text-[#9146ff]" /> Twitch-Clip (Highlight des Events)
                </label>
                <input type="url" value={twitchClipUrl} onChange={e => setTwitchClipUrl(e.target.value)}
                  placeholder="https://www.twitch.tv/clips/..." className={inputCls} />
              </div>
              <div className="rounded-lg border border-line bg-surface-2">
                <button type="button" onClick={() => setPartnersOpen(o => !o)} aria-expanded={partnersOpen}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left">
                  <Tv2 className="w-4 h-4 text-[#9146ff]" />
                  <span className="text-sm text-gray-300">Streaming-Partner</span>
                  <span className="ml-auto truncate text-xs text-gray-500">
                    {selectedPartnerIds.length === 0 ? "keine" : selectedPartners.length > 0 ? selectedPartners.map(p => p.name).join(", ") : `${selectedPartnerIds.length} ausgewählt`}
                  </span>
                </button>
                {partnersOpen && (
                  <div className="border-t border-line px-3 py-2 space-y-1.5">
                    {!partnersLoaded ? (
                      <p className="text-xs text-gray-600">Lädt…</p>
                    ) : allPartners.length === 0 ? (
                      <p className="text-xs text-gray-600">Keine Partner eingetragen. Im Admin-Bereich unter Twitch &amp; Clips → Partner anlegen.</p>
                    ) : allPartners.map(p => (
                      <label key={p.id} className="flex items-center gap-2.5 cursor-pointer group">
                        <input type="checkbox" checked={selectedPartnerIds.includes(p.id)}
                          onChange={e => setSelectedPartnerIds(ids => e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id))}
                          className="rounded accent-violet-500" />
                        <Image src={p.logoUrl} alt={p.name} width={20} height={20} className="rounded-full" />
                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{p.name}</span>
                        <span className="text-xs text-gray-600">twitch.tv/{p.twitchLogin}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {isModerator && (
                <OmaOriginalToggle
                  kind="event"
                  checked={omaOriginal}
                  onChange={setOmaOriginal}
                  inheritedFromSeries={isOmaOriginalSeries(event.series)}
                  blocksGame={isBlocksGame(event.game)}
                />
              )}
            </Panel>
          </div>

          {/* ── Rechte Spalte: Vorschau, Sichtbarkeit, Erweitert ── */}
          <aside className="space-y-4 min-w-0">
            <Panel title="So sieht es aus">
              <div className="overflow-hidden rounded-xl border border-line bg-surface-2">
                <div className="relative">
                  <GameCover game={game || title} coverUrl={coverImageUrl || null} className="w-full aspect-[1200/630]" rounded="rounded-none" fallbackVariant="plain" />
                  <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2 pt-8" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}>
                    <p className="truncate text-sm font-semibold text-white">{title || "Ohne Titel"}</p>
                  </div>
                </div>
                <p className="px-2.5 py-2 text-[11px] text-gray-400">
                  {startAt ? formatBerlinDate(fromDatetimeLocalBerlin(startAt), { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }) : "kein Termin"}
                  {" · "}{playerCount}{maxPlayers ? `/${maxPlayers}` : ""} Spieler
                  {!event.series && participationCoins > 0 && <> · +{participationCoins} Münzen</>}
                </p>
              </div>
              {!coverImageUrl && <p className="text-[11px] text-gray-600">Ohne eigenes Bild zeigt die App das Spiel-Cover.</p>}
            </Panel>

            <Panel title="Sichtbarkeit">
              {lockedByMod ? (
                // Von einem Mod ausgeblendet: nur ein Mod kann es wieder einblenden (api/admin/events)
                <p className="rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2 text-xs text-rose-200">
                  Ein Mod hat dieses Event ausgeblendet. Nur ein Mod kann es wieder einblenden.
                </p>
              ) : (
                <Switch checked={!hidden} onChange={v => setHidden(!v)} label="Für alle sichtbar"
                  hint={hidden
                    ? (awaitingApproval ? "Nur in der Verwaltung sichtbar. Discord-Post und Push folgen erst nach der Freigabe durch einen Mod." : "Nur in der Verwaltung sichtbar. Beim Einblenden gehen Discord-Post und Push raus.")
                    : (awaitingApproval ? "In der App sichtbar. Discord-Post und Push folgen nach der Freigabe durch einen Mod." : "In der App, im Discord und per Push angekündigt")} />
              )}
              <PublishStatusPanel
                eventId={event.id}
                hidden={event.hidden}
                publishAt={event.publishAt ?? null}
                publishStateJson={event.publishStateJson ?? null}
                startAt={event.startAt}
              />
            </Panel>

            <Panel title="Erweitert">
              {event.completionData ? (
                // Abgeschlossen: der Status kommt aus dem Abschluss — zurück geht es nur über "Abschluss aufheben"
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-500">Abschluss aufheben</p>
                  <p className="text-[11px] text-gray-600">
                    Bucht alle Belohnungen dieses Abschlusses zurück (Teilnahme, Platzierung, Zuschauer, Umfragen, Reihentabelle).
                    Danach kannst du das Event neu abschließen.
                  </p>
                  <button type="button" onClick={undoCompletion} disabled={loading}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10 disabled:opacity-50">
                    Abschluss aufheben
                  </button>
                </div>
              ) : isModerator && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-500">Status von Hand setzen</p>
                <div className="flex gap-1.5 flex-wrap">
                  {STATUS_OPTIONS.map(s => (
                    <button key={s} type="button" onClick={() => pickStatus(s)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                        status === s ? STATUS_STYLES[s] : "text-gray-600 border-line hover:text-gray-400"
                      }`}>
                      {STATUS_LABELS_DE[s]}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-600">Normalerweise nicht nötig: Der Ablauf oben ergibt sich aus Startzeit und Abschluss. Beendet wird ein Event über „Event abschließen“.</p>
              </div>
              )}
              {isModerator && !isSeriesEvent && (
                <div>
                  <label className={`${labelCls} flex items-center justify-between`}>
                    <span>Discord-Kanal</span>
                    {seriesDiscord && discordChannelId && seriesDiscord !== discordChannelId && (
                      <span className="flex items-center gap-1 text-amber-400 text-[10px]">
                        <AlertCircle className="w-3 h-3" /> Abweichend von Reihe
                      </span>
                    )}
                  </label>
                  <DiscordChannelSelect value={discordChannelId} onChange={setDiscordChannelId}
                    emptyLabel={seriesDiscord ? "Wie Eventreihe" : "Standard (News-Kanal)"} />
                </div>
              )}
              <p className="text-[11px] text-gray-600">Duplizieren und {isUpcoming ? "Absagen" : "Löschen"} findest du oben im ⋯-Menü.</p>
            </Panel>
          </aside>
        </div>
  );
}
