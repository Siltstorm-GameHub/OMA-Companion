"use client";
import Link from "next/link";
import { ChevronLeft } from "@/components/icons";
import { Save, Trophy, CheckCircle2, ExternalLink } from "@/components/icons";
import SeriesIcon from "@/components/SeriesIcon";
import EventCategoryBadge from "@/components/EventCategoryBadge";
import { LIFECYCLE_STEPS } from "@/lib/event-manage";
import { HeaderMenu, SNAPSHOT_TAB, type EventEditProps, type PlacementReward, type TabKey } from "./edit-shared";
import { buttonClasses } from "@/components/ui/button-styles";
import { useEventEdit } from "./useEventEdit";
import TabDetails from "./TabDetails";
import TabRewards from "./TabRewards";
import TabSchedule from "./TabSchedule";
import TabBracket from "./TabBracket";
import TabParticipants from "./TabParticipants";
import TabSeries from "./TabSeries";
import TabGoal from "./TabGoal";

/** Bearbeiten-Seite eines Events: Kopf, Ablauf-Leiste, Reiter und Speicherleiste. Zustand und Aktionen
 *  in ./useEventEdit.tsx, die Reiter in ./Tab*.tsx, gemeinsame Bausteine in ./edit-shared.tsx. */
export default function EventEditClient(props: EventEditProps) {
  const ctx = useEventEdit(props);
  const { event, isSeriesEvent, loading, activeTab, setActiveTab, ConfirmDialogElement, dirty, changedCount, discardChanges, handleSave, isUpcoming, canDelete, deleteEvent, tabs, bracketTournament, step, statusLine, nextStep, backHref,
    formSnapshot, savedSnapshot, playerCount, checkInEnabled, checkedInIds, registeredIds, relTime, savedStart, rewardLimits, participationCoins, participationRankPts, placements } = ctx;
  const overview = props.overview ?? null;

  // (7) Ungespeicherte Änderungen je Reiter
  const dirtyTabs = new Set<TabKey>();
  if (dirty) {
    const a = JSON.parse(formSnapshot) as Record<string, unknown>;
    const b = JSON.parse(savedSnapshot) as Record<string, unknown>;
    for (const k of Object.keys(a)) {
      if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) dirtyTabs.add(SNAPSHOT_TAB[k] ?? "details");
    }
  }
  // (6) Belohnungen über dem Limit (Mitglieder-Events)
  const overLimit = !!rewardLimits && (
    Number(participationCoins) > rewardLimits.participationCoins
    || Number(participationRankPts) > rewardLimits.participationRankPts
    || placements.some((p: PlacementReward) => p.coins > (rewardLimits.placementCoins[p.place - 1] ?? rewardLimits.placementCoinsOther))
  );
  const readyCount = [...registeredIds].filter(id => checkedInIds.has(id)).length;
  const tabBadge = (key: TabKey): { text: string; tone: "count" | "alert" | "warn" } | null => {
    if (key === "participants") return { text: String(event._count.registrations), tone: "count" };
    if ((key === "tournament" || key === "bracket") && overview?.pendingReports) return { text: `${overview.pendingReports} offen`, tone: "alert" };
    if (key === "rewards" && overLimit) return { text: "über Limit", tone: "warn" };
    return null;
  };
  // (5) Kennzahlen der Übersicht — jede führt dorthin, wo man etwas tun kann
  const kpis: { label: string; value: string; tone?: "alert" | "ok"; onClick?: () => void; href?: string }[] = [
    ...(step === 0 ? [{ label: "Start", value: relTime(savedStart) }] : []),
    { label: "Angemeldet", value: `${playerCount}${event.maxPlayers ? `/${event.maxPlayers}` : ""}`, onClick: () => setActiveTab("participants") },
    ...(checkInEnabled && step === 0 ? [{ label: "Bereit", value: `${readyCount}/${playerCount}`, tone: readyCount === playerCount && playerCount > 0 ? "ok" as const : undefined, onClick: () => setActiveTab("participants") }] : []),
    ...(overview?.pendingReports ? [{ label: "Meldungen offen", value: String(overview.pendingReports), tone: "alert" as const, href: `/events/verwalten/${event.id}/results` }] : []),
    ...(overview?.waitlistCount ? [{ label: "Warteliste", value: String(overview.waitlistCount), onClick: () => setActiveTab("participants") }] : []),
  ];

  return (
    <div className="space-y-4 pb-28">
      {/* ── Kopf ── */}
      <div className="space-y-2">
        <Link href={backHref} className="inline-flex items-center gap-1 text-xs text-subtle hover:text-fg/90 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
          {event.series ? <><SeriesIcon name={event.series.icon} className="w-3.5 h-3.5" /> {event.series.name}</> : "Events verwalten"}
        </Link>
        <div className="flex items-start gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-fg tracking-tight break-words">{event.title}</h1>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <EventCategoryBadge category={event.category ?? "fun"} />
              {event.hidden && <span className="rounded border border-danger/30 bg-danger-soft px-1.5 py-0.5 text-xs font-medium text-danger">Ausgeblendet</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/tournament/${event.id}`}
              className="flex items-center gap-1.5 text-xs text-fg/90 hover:text-fg border border-line-strong hover:border-line-strong rounded-control px-3 py-1.5 transition-colors max-lg:min-h-10">
              <ExternalLink className="w-3.5 h-3.5" /> Öffentliche Seite
            </Link>
            <HeaderMenu
              duplicateHref={`/events/verwalten/neu?from=${event.id}`}
              deleteLabel={canDelete ? (isUpcoming ? "Event absagen" : "Event löschen") : null}
              onDelete={deleteEvent}
            />
          </div>
        </div>
      </div>

      {/* ── Ablauf ── */}
      <section aria-label="Übersicht" className="rounded-card border border-line bg-surface shadow-card p-3 sm:p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-2">
          {kpis.map(k => {
            const inner = (
              <>
                <span className={`block text-lg font-extrabold tabular-nums leading-tight ${k.tone === "alert" ? "text-warning" : k.tone === "ok" ? "text-success" : "text-fg"}`}>{k.value}</span>
                <span className="block text-xs font-semibold text-subtle">{k.label}</span>
              </>
            );
            const cls = `rounded-control border px-3 py-2 text-left transition-colors ${k.tone === "alert" ? "border-warning/40 bg-warning-soft" : "border-line bg-surface-2"} ${k.onClick || k.href ? "hover:border-line-strong" : ""}`;
            return k.href
              ? <Link key={k.label} href={k.href} className={cls}>{inner}</Link>
              : k.onClick
                ? <button key={k.label} type="button" onClick={k.onClick} className={cls}>{inner}</button>
                : <div key={k.label} className={cls}>{inner}</div>;
          })}
        </div>
        <ol className="grid grid-cols-4 gap-1.5">
          {LIFECYCLE_STEPS.map((label, i) => (
            <li key={label} className={`border-t-[3px] pt-1.5 text-center text-xs ${
              i < step ? "border-primary/60 text-muted" : i === step ? "border-primary text-fg font-semibold" : "border-line text-subtle"
            }`} aria-current={i === step ? "step" : undefined}>
              {label}
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-3 flex-wrap">
          <p className="flex-1 min-w-0 text-xs text-muted">{statusLine}</p>
          {nextStep && (nextStep.href ? (
            <Link href={nextStep.href} className={buttonClasses("primary", "sm", "shrink-0")}>
              <CheckCircle2 className="w-3.5 h-3.5" /> {nextStep.label}
            </Link>
          ) : (
            <button type="button" onClick={() => setActiveTab(nextStep.tab!)}
              className={buttonClasses("secondary", "sm", "shrink-0")}>
              <Trophy className="w-3.5 h-3.5" /> {nextStep.label}
            </button>
          ))}
        </div>
      </section>

      {/* Tabs */}
      <div role="tablist" aria-label="Bereiche" className="-mx-1 flex gap-1.5 overflow-x-auto scrollbar-none px-1">
        {tabs.map(tab => {
          const on = activeTab === tab.key;
          const badge = tabBadge(tab.key);
          // "Teilnehmer (8)" → Zahl als Badge statt in Klammern
          const label = tab.key === "participants" ? tab.label.replace(/\s*\(\d+\)$/, "") : tab.label;
          return (
            <button key={tab.key} type="button" role="tab" aria-selected={on} onClick={() => setActiveTab(tab.key)}
              className={`relative shrink-0 inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors ${
                on ? "border-primary/40 bg-primary-soft text-primary-fg" : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg"
              }`}>
              {label}
              {badge && (
                <span className={`rounded-full px-1.5 text-[11px] font-bold leading-4 tabular-nums ${
                  badge.tone === "alert" ? "bg-warning text-canvas" : badge.tone === "warn" ? "bg-danger text-canvas" : "bg-surface-3 text-muted"
                }`}>{badge.text}</span>
              )}
              {dirtyTabs.has(tab.key) && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-canvas bg-warning" title="Ungespeicherte Änderungen" />}
            </button>
          );
        })}
      </div>

      {/* Termin einer Reihe mit festem Spiel: Belohnungen, Umfragen und Wertung kommen aus der Reihe —
          ohne diesen Hinweis wirkt der fehlende Reiter "Belohnungen" wie ein Fehler */}
      {isSeriesEvent && (
        <p className="flex flex-wrap items-center gap-x-1.5 rounded-control border border-primary/35 bg-primary-soft/60 px-3 py-2 text-xs text-fg/90">
          Belohnungen, Umfragen und Wertung legt die Eventreihe fest.
          <Link href={backHref} className="font-semibold text-primary-fg hover:text-fg">Zur Reihe „{event.series.name}“</Link>
        </p>
      )}

      {/* ── Tab: Details (eine Ansicht für Einzel- und Reihen-Events) ── */}
      {activeTab === "details" && <TabDetails ctx={ctx} />}

      {/* ── Tab: Belohnungen ── */}
      {activeTab === "rewards" && <TabRewards ctx={ctx} />}

      {/* ── Tab: Turnier ── */}
      {activeTab === "tournament" && <TabSchedule ctx={ctx} />}

      {/* ── Tab: Turnierbaum (Reihen-Event: reduzierte Ansicht ohne Turnier-Einstellungen) ── */}
      {activeTab === "bracket" && bracketTournament && <TabBracket ctx={ctx} />}

      {/* ── Tab: Teilnehmer ── */}
      {activeTab === "participants" && <TabParticipants ctx={ctx} waitlist={overview?.waitlist ?? []} />}

      {/* ── Tab: Reihe ── */}
      {activeTab === "series" && event.series &&
        (event.format === "single_elimination" || event.format === "double_elimination" || event.format === "group_knockout") && <TabSeries ctx={ctx} />}
      {activeTab === "goal" && <TabGoal ctx={ctx} />}

      {/* ── Speicherleiste: erscheint bei ungespeicherten Änderungen (alle Einstellungen, siehe formSnapshot) ── */}
      {dirty && (
        <div className="sticky bottom-20 lg:bottom-4 z-30">
          <div className="flex items-center gap-3 rounded-control border border-warning/40 bg-surface-2/95 px-3 py-2.5 shadow-card">
            <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
            <span className="flex-1 min-w-0 truncate text-sm text-fg">
              {changedCount === 1 ? "1 ungespeicherte Änderung" : `${changedCount} ungespeicherte Änderungen`}
              {dirtyTabs.size > 0 && <span className="text-subtle"> · {[...dirtyTabs].map(k => (tabs.find(t => t.key === k)?.label ?? k).replace(/\s*\(\d+\)$/, "")).join(", ")}</span>}
            </span>
            <button type="button" onClick={discardChanges} disabled={loading}
              className="shrink-0 rounded-control px-3 py-1.5 text-xs font-semibold text-fg/90 hover:text-fg hover:bg-line disabled:opacity-50">
              Verwerfen
            </button>
            <button type="button" onClick={handleSave} disabled={loading}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-control bg-primary hover:bg-primary-hover px-3.5 py-1.5 text-xs font-semibold text-primary-ink disabled:opacity-50 max-lg:min-h-10">
              <Save className="w-3.5 h-3.5" /> {loading ? "Speichert…" : "Speichern"}
            </button>
          </div>
        </div>
      )}
      {ConfirmDialogElement}
    </div>
  );
}
