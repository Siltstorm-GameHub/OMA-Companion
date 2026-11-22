"use client";
import PlaceMedal from "@/components/PlaceMedal";
import { BarChart2, Coins } from "@/components/icons";
import RankPointsIcon from "@/components/RankPointsIcon";
import RecalculateSeriesButton from "./RecalculateSeriesButton";
import { NumberInput } from "@/components/ui/NumberInput";
import { inputCls, numCls, Section, Field, Checkbox } from "./series-shared";
import { LimitHint } from "../../neu/wizard/shared";
import type { SeriesDetail } from "./useSeriesDetail";

/** Reiter "Belohnungen": Endwertung, Teilnahme, Platzierungs-Bonus je Event. */
export default function SeriesTabRewards({ ctx }: { ctx: SeriesDetail }) {
  const { rewardLimits, series, isArchived, statParticipationPts, setStatParticipationPts, statSpectatorPts, setStatSpectatorPts, statParticipationCoins, setStatParticipationCoins, statSpectatorCoins, setStatSpectatorCoins, statTransferToGlobal, setStatTransferToGlobal, eventPlacementCoins, eventPlacementPoints, placementRewards, updatePlacementReward, updateEventPlacementCoins, updateEventPlacementPoints, lockedNotice } = ctx;
  return (
    <>
          {lockedNotice}
          <fieldset disabled={isArchived} className="space-y-4 min-w-0 border-0 p-0 m-0">
          {/* Belohnungen */}
          <Section title="Belohnungen (Endplatzierung der Eventreihe)">
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center text-xs text-gray-500 px-1">
                <span>Platzierung</span><span className="text-center">Punkte</span><span className="text-center">Münzen</span>
              </div>
              {placementRewards.map(r => (
                <div key={r.place} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                  <span className="text-sm text-gray-300 flex items-center gap-1.5">
                    <PlaceMedal place={r.place} /> {r.place}. Platz
                  </span>
                  <div className="flex items-center gap-1">
                    <RankPointsIcon size={12} />
                    <NumberInput min={0} value={r.rankPoints}
                      onChange={e => updatePlacementReward(r.place, "rankPoints", Number(e.target.value))}
                      className={numCls} />
                  </div>
                  <div className="flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                    <NumberInput min={0} value={r.coins}
                      onChange={e => updatePlacementReward(r.place, "coins", Number(e.target.value))}
                      className={numCls} />
                  </div>
                </div>
              ))}
              {rewardLimits && (
                <p className="text-[11px] text-amber-200/80">
                  Für Mitglieder-Reihen hängt die Obergrenze der Endwertung von der Zahl der Termine ab. Zu hohe Werte werden beim Saisonabschluss gekürzt.
                </p>
              )}
              <p className="text-[11px] text-gray-500">
                Wird bei Abschluss der gesamten Eventreihe anhand der finalen Gesamtplatzierung vergeben — nicht mehr pro einzelnem Event.
              </p>
              <p className="text-[11px] text-gray-500 pt-1 border-t border-line">
                Münzen pro Teilnahme (Mitspieler &amp; Zuschauer): siehe „Reihentabellen-Konfiguration" weiter unten.
              </p>
              <Checkbox
                checked={statTransferToGlobal}
                onChange={setStatTransferToGlobal}
                label="Tabellenpunkte bei Event-Abschluss auf die Rangliste übertragen"
              />
            </div>
          </Section>

          {/* Punkte & Münzen pro Teilnahme */}
          <Section title="Punkte & Münzen pro Teilnahme">
            <div className="grid grid-cols-2 gap-3">
              <Field label={<><BarChart2 className="w-3 h-3" /> Punkte pro Teilnahme</>}>
                <NumberInput min={0} value={statParticipationPts}
                  onChange={e => setStatParticipationPts(Number(e.target.value))}
                  className={inputCls} />
              </Field>
              <Field label="Punkte pro Zuschauer-Teilnahme">
                <NumberInput min={0} value={statSpectatorPts}
                  onChange={e => setStatSpectatorPts(Number(e.target.value))}
                  className={inputCls} />
              </Field>
              <Field label={<><Coins className="w-3 h-3 text-amber-400" /> Münzen pro Teilnahme</>}>
                <NumberInput min={0} value={statParticipationCoins}
                  onChange={e => setStatParticipationCoins(Number(e.target.value))}
                  className={inputCls} />
                <LimitHint value={statParticipationCoins} max={rewardLimits?.participationCoins} />
              </Field>
              <Field label="Münzen pro Zuschauer-Teilnahme">
                <NumberInput min={0} value={statSpectatorCoins}
                  onChange={e => setStatSpectatorCoins(Number(e.target.value))}
                  className={inputCls} />
                <LimitHint value={statSpectatorCoins} max={rewardLimits?.spectatorCoins} />
              </Field>
            </div>
            <p className="text-[11px] text-gray-500">
              Wird jeweils direkt bei Abschluss des einzelnen Events vergeben, nicht erst am Ende der Reihe.
            </p>
          </Section>

          {/* Platzierungs-Bonus je Event */}
          <Section title="Platzierungs-Bonus je Event">
            <p className="text-xs text-gray-500">
              Für die Platzierung im jeweiligen Einzel-Event: zusätzliche Münzen und/oder Tabellenpunkte für die Reihentabelle
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wider">
                <span className="w-24 shrink-0" />
                <span className="flex items-center gap-1 w-24"><Coins className="w-3 h-3 text-amber-400" /> Münzen</span>
                <span className="flex items-center gap-1"><RankPointsIcon size={12} /> Tabellenpunkte</span>
              </div>
              {eventPlacementCoins.map(r => (
                <div key={r.place} className="flex items-center gap-2">
                  <span className="text-sm text-gray-300 flex items-center gap-1.5 w-24 shrink-0">
                    <PlaceMedal place={r.place} /> {r.place}. Platz
                  </span>
                  <div className="w-24">
                    <NumberInput min={0} value={r.coins}
                      onChange={e => updateEventPlacementCoins(r.place, Number(e.target.value))}
                      className={numCls} />
                    <LimitHint value={r.coins} max={rewardLimits ? (rewardLimits.placementCoins[r.place - 1] ?? rewardLimits.placementCoinsOther) : null} />
                  </div>
                  <NumberInput min={0} value={eventPlacementPoints.find(p => p.place === r.place)?.points ?? 0}
                    onChange={e => updateEventPlacementPoints(r.place, Number(e.target.value))}
                    className={numCls} />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-500">
              Wird direkt bei Abschluss des jeweiligen Events anhand seiner Finalen Platzierung vergeben (bei
              Gleichstand bekommen alle Gleichplatzierten die Punkte dieses Platzes), unabhängig von der
              Endplatzierung der gesamten Reihe. Die Platzierung ergibt sich aus dem Sieger-Stat des Events.
              Die Tabellenpunkte erscheinen in der Reihentabelle als Spalte „Platzierungspunkte“ und werden —
              wenn oben aktiviert — auch auf die Rangliste übertragen.
            </p>
          </Section>

          {/* Geänderte Einstellungen auf bereits beendete Events anwenden */}
          {!isArchived && series.status !== "finished" && series.status !== "closed" && (
            <Section title="Bereits abgeschlossene Events">
              <p className="text-xs text-gray-500">
                Änderungen an Punkten und Statistiken gelten zunächst nur für noch nicht abgeschlossene Events — jedes
                beendete Event behält die Einstellungen von seinem Abschluss. Hiermit werden alle beendeten Events der
                Reihe mit den aktuell gespeicherten Einstellungen neu berechnet (einzeln geht es über „Ergebnisse“ am Event).
              </p>
              <RecalculateSeriesButton
                seriesId={series.id}
                finishedCount={(series.events as { status: string }[]).filter(e => e.status === "finished").length}
              />
            </Section>
          )}
          </fieldset>
          </>
  );
}
