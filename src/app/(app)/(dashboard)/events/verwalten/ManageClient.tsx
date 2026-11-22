"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  CalendarClock, Check, ChevronDown, ChevronRight, Copy, Edit2, ExternalLink, Eye, EyeOff, Flag, Loader2, Search, Trophy, UserCheck, Vote,
} from "@/components/icons";
import SeriesIcon from "@/components/SeriesIcon";
import { resolveSeriesColor } from "@/lib/series-icons";
import { dateBlock, type DayBucket } from "@/lib/event-display";
import { groupManageEvents, matchesQuery, statusText, type ManageAction, type ManageEvent } from "@/lib/event-manage";
import { formatBerlinDate } from "@/lib/time";
import { RejectControl } from "./ApprovalBanner";

export type ManageEventDTO = Omit<ManageEvent, "startAt" | "endAt"> & { startAt: string; endAt: string | null };
export type ManageSeriesDTO = {
  id: string; name: string; icon: string | null; hidden: boolean; awaitingApproval: boolean; rejected: boolean;
  played: number; total: number; next: string | null; seasonDone: boolean; createdBy: string | null;
  /** Saison abgeschlossen, keine Folgesaison */
  archived: boolean;
  /** Mods: Saison kürzlich abgeschlossen, an neue Saison erinnern */
  newSeasonDue: boolean;
};
/** Freigabe-Eintrag; `facts` = das Wichtigste auf einen Blick (Termin, Art, Anmeldungen, Belohnungen) */
export type ManageApproval = { kind: "events" | "series"; id: string; title: string; by: string; since: string; facts: string[]; href: string };

const BUCKETS: { key: DayBucket; label: string }[] = [
  { key: "today", label: "Heute" },
  { key: "week", label: "Diese Woche" },
  { key: "later", label: "Später" },
];
const PAST_VISIBLE = 10;

function since(d: Date | string, now: Date): string {
  const ms = Math.max(0, now.getTime() - new Date(d).getTime());
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "seit kurzem";
  if (h < 24) return `seit ${h} Std`;
  const days = Math.floor(h / 24);
  return `seit ${days} ${days === 1 ? "Tag" : "Tagen"}`;
}

const BTN = "shrink-0 inline-flex items-center gap-1 rounded-lg border border-line-strong bg-line px-2.5 py-1 text-xs font-semibold text-gray-200 hover:bg-line hover:text-white transition-colors";
const BTN_PRIMARY = "shrink-0 inline-flex items-center gap-1 rounded-lg bg-teal-600 hover:bg-teal-500 px-2.5 py-1 text-xs font-semibold text-white transition-colors disabled:opacity-50";

function Section({ title, count, children, tone }: { title: string; count?: number; children: ReactNode; tone?: "attention" }) {
  return (
    <section aria-label={title} className={`glass rounded-2xl p-4 ${tone === "attention" ? "ring-1 ring-amber-400/30" : ""}`}>
      <h2 className="text-sm font-semibold text-white">
        {title}{count != null && <span className="ml-1 font-normal text-gray-500">· {count}</span>}
      </h2>
      {children}
    </section>
  );
}

function Tag({ children, tone = "gray", title }: { children: ReactNode; tone?: "gray" | "amber" | "rose" | "teal"; title?: string }) {
  const cls = {
    gray: "text-gray-400 bg-line border-line",
    amber: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    rose: "text-rose-300 bg-rose-500/10 border-rose-500/20",
    teal: "text-teal-300 bg-teal-500/10 border-teal-500/20",
  }[tone];
  return <span title={title} className={`shrink-0 rounded border px-1.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

/** Status-Markierungen einer Event-Zeile — auf dem Handy unter dem Titel, ab Tablet rechts daneben */
function EventTags({ ev, status }: { ev: ManageEvent; status: string }) {
  return (
    <>
      {ev.approvalStatus === "pending" && <Tag tone="amber" title="Discord-Ankündigung und Push erst nach der Freigabe">Freigabe offen</Tag>}
      {ev.approvalStatus === "rejected" && <Tag tone="rose" title="Von einem Mod nicht freigegeben">Abgelehnt</Tag>}
      {ev.hidden && ev.approvalStatus !== "rejected" && <Tag tone="rose">Ausgeblendet</Tag>}
      {status !== "Anmeldung offen" && <Tag tone={status === "Läuft" ? "teal" : "gray"}>{status}</Tag>}
      {ev.goal && (
        <Tag tone={ev.goal.reached ? "teal" : ev.goal.settled ? "rose" : "gray"}
          title={ev.goal.settled ? (ev.goal.reached ? "Community-Ziel geschafft" : "Community-Ziel verfehlt") : "Community-Ziel: Stand"}>
          🎯 {ev.goal.settled && !ev.goal.reached ? "verfehlt" : ev.goal.reached ? "geschafft" : `${Math.floor(ev.goal.percent)} %`}
        </Tag>
      )}
    </>
  );
}

/** ⋯-Menü einer Event-Zeile: öffentliche Seite, duplizieren, ein-/ausblenden */
function RowMenu({ ev }: { ev: ManageEvent }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  async function toggleHidden() {
    setBusy(true);
    const res = await fetch("/api/admin/events", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: ev.id, hidden: !ev.hidden }),
    });
    setBusy(false);
    setOpen(false);
    if (res.ok) { toast.success(ev.hidden ? "Wieder für alle sichtbar" : "Ausgeblendet, nur noch in der Verwaltung sichtbar"); router.refresh(); }
    else toast.error((await res.json().catch(() => null))?.error ?? "Das hat nicht geklappt");
  }

  const item = "flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-200 hover:bg-line";
  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Weitere Aktionen" aria-expanded={open}
        className="w-7 h-7 rounded-lg text-gray-400 hover:text-white hover:bg-line flex items-center justify-center text-base leading-none">
        ⋯
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-line-strong bg-gray-900 shadow-xl">
          <Link role="menuitem" href={`/tournament/${ev.id}`} className={item}><ExternalLink className="w-3.5 h-3.5 text-gray-500" /> Öffentliche Seite</Link>
          <Link role="menuitem" href={`/events/verwalten/neu?from=${ev.id}`} className={item}><Copy className="w-3.5 h-3.5 text-gray-500" /> Duplizieren</Link>
          <button role="menuitem" type="button" onClick={toggleHidden} disabled={busy} className={`${item} border-t border-line`}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : ev.hidden ? <Eye className="w-3.5 h-3.5 text-gray-500" /> : <EyeOff className="w-3.5 h-3.5 text-gray-500" />}
            {ev.hidden ? "Wieder einblenden" : "Ausblenden"}
          </button>
        </div>
      )}
    </div>
  );
}

function EventLine({ ev, now, right }: { ev: ManageEvent; now: Date; right?: ReactNode }) {
  const b = dateBlock(ev.startAt, now);
  const status = statusText(ev, now);
  const color = ev.series ? resolveSeriesColor(ev.series.icon) : null;
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="w-11 shrink-0 text-center leading-tight">
        <span className="block text-xs text-gray-500">{b.weekday}</span>
        <span className="block text-base font-bold text-white tabular-nums">{b.day}</span>
        <span className="block text-xs text-gray-500 tabular-nums">{b.time}</span>
      </span>
      <Link href={`/events/verwalten/${ev.id}`} className="group min-w-0 flex-1">
        <span className="flex items-center gap-1.5 min-w-0">
          {color && <span className="w-1 h-3.5 rounded-full shrink-0" style={{ background: color }} />}
          <span className="truncate text-sm font-medium text-white group-hover:text-teal-200">{ev.title}</span>
        </span>
        <span className="block truncate text-xs text-gray-500">
          {ev.series ? `${ev.series.name} · Termin ${ev.series.index} von ${ev.series.total}` : ev.game ?? "Kein Spiel festgelegt"}
          {ev.createdBy && ` · von ${ev.createdBy}`}
        </span>
        <span className="mt-1 flex flex-wrap gap-1 sm:hidden empty:hidden"><EventTags ev={ev} status={status} /></span>
      </Link>
      <span className="hidden sm:flex items-center gap-1"><EventTags ev={ev} status={status} /></span>
      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
        ev.players === 0 ? "bg-amber-500/10 text-amber-300" : "bg-line text-gray-300"
      }`} title="Anmeldungen als Spieler">
        {ev.maxPlayers ? `${ev.players}/${ev.maxPlayers}` : ev.players}
      </span>
      {right ?? (
        <>
          <Link href={`/events/verwalten/${ev.id}`} aria-label="Bearbeiten" className="w-7 h-7 rounded-lg text-gray-500 hover:text-white hover:bg-line flex items-center justify-center shrink-0">
            <Edit2 className="w-3.5 h-3.5" />
          </Link>
          <RowMenu ev={ev} />
        </>
      )}
    </li>
  );
}

const ACTION_ICON: Record<ManageAction["kind"], typeof Trophy> = { tournament: Trophy, poll: Vote, complete: CalendarClock };

/**
 * Events → Verwalten: "Braucht dich", "Anstehend" (Heute / Diese Woche / Später, filterbar nach Reihe),
 * Eventreihen und Beendete — alles mit einer gemeinsamen Suche. Logik in lib/event-manage.ts.
 */
export default function ManageClient({ isStaff, nowIso, events, series, approvals, pastLimit }: {
  isStaff: boolean; nowIso: string; events: ManageEventDTO[]; series: ManageSeriesDTO[]; approvals: ManageApproval[];
  /** gesetzt, wenn bei Beendeten nur die letzten N geladen sind */
  pastLimit: number | null;
}) {
  const router = useRouter();
  const now = new Date(nowIso);
  const [query, setQuery] = useState("");
  const [pastOpen, setPastOpen] = useState(false);
  const [showAllPast, setShowAllPast] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  // Filter "Anstehend" nach einer Reihe ("" = alle Events)
  const [seriesFilter, setSeriesFilter] = useState("");

  const all: ManageEvent[] = events.map((e) => ({ ...e, startAt: new Date(e.startAt), endAt: e.endAt ? new Date(e.endAt) : null }));
  const q = query.trim().toLowerCase();
  const groups = groupManageEvents(all.filter((e) => matchesQuery(e, query)), now);
  const seriesShown = series.filter((s) => !q || s.name.toLowerCase().includes(q) || (s.createdBy ?? "").toLowerCase().includes(q));
  const approvalsShown = approvals.filter((a) => !q || a.title.toLowerCase().includes(q) || a.by.toLowerCase().includes(q));
  // Saisonabschluss (Endwertung, Auszahlung) machen nur Mods — Mitglieder sehen den Stand in der Reihen-Liste
  const seasonsDone = isStaff ? seriesShown.filter((s) => s.seasonDone) : [];
  const newSeasons = seriesShown.filter((s) => s.newSeasonDue);
  const attentionCount = approvalsShown.length + seasonsDone.length + newSeasons.length + groups.action.length;
  const filterSeries = series.find((s) => s.id === seriesFilter) ?? null;
  const inFilter = (ev: ManageEvent) => !filterSeries || ev.series?.id === filterSeries.id;
  const upcoming: Record<DayBucket, ManageEvent[]> = {
    today: groups.upcoming.today.filter(inFilter),
    week: groups.upcoming.week.filter(inFilter),
    later: groups.upcoming.later.filter(inFilter),
  };
  const upcomingCount = upcoming.today.length + upcoming.week.length + upcoming.later.length;
  const pastShown = showAllPast || q ? groups.past : groups.past.slice(0, PAST_VISIBLE);

  async function approve(a: ManageApproval) {
    setApproving(a.id);
    try {
      const res = await fetch(`/api/admin/${a.kind}/${a.id}/approve`, { method: "POST" });
      if (res.ok) { toast.success("Freigegeben, Discord-Post und Push gehen raus"); router.refresh(); }
      else toast.error("Freigabe hat nicht geklappt");
    } finally {
      setApproving(null);
    }
  }

  const empty = all.length === 0 && series.length === 0 && approvals.length === 0;

  return (
    <div className="space-y-4">
      {/* ── Suche ── */}
      {!empty && (
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Titel, Spiel, Reihe oder Person"
            aria-label="Events durchsuchen"
            className="w-full rounded-control bg-surface-2 border border-line pl-8 pr-3 py-1.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-primary" />
        </div>
      )}

      {empty && (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-sm text-gray-300">{isStaff ? "In dieser Ansicht gibt es keine Events." : "Du hast noch kein Event angelegt."}</p>
          <p className="mt-1 text-xs text-gray-500">Leg oben ein Event oder eine Eventreihe an. Danach kannst du es hier bearbeiten und abschließen.</p>
        </div>
      )}

      {/* ── Braucht dich ── */}
      {attentionCount > 0 && (
        <Section title="Braucht dich" count={attentionCount} tone="attention">
          <ul className="mt-1 divide-y divide-line">
            {approvalsShown.map((a) => (
              <li key={`a-${a.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                <span className="w-8 h-8 shrink-0 rounded-lg border border-teal-500/20 bg-teal-500/10 text-teal-300 flex items-center justify-center"><UserCheck className="w-4 h-4" /></span>
                {/* basis-56: auf schmalen Bildschirmen rutschen die Knöpfe in eine eigene Zeile */}
                <span className="min-w-0 flex-1 basis-56">
                  <span className="block truncate text-sm font-medium text-white">{a.title}</span>
                  <span className="block truncate text-xs text-gray-500">
                    {a.kind === "series" ? "Reihe" : "Event"} von {a.by} · wartet {since(a.since, now).replace("seit ", "")}
                  </span>
                  {a.facts.length > 0 && (
                    <span className="mt-0.5 block text-xs text-gray-400">{a.facts.join(" · ")}</span>
                  )}
                </span>
                {/* "contents": die Knöpfe sind direkte Flex-Kinder der Zeile — so öffnet das Ablehnen-Feld
                    (basis-full) in voller Breite unter der Zeile */}
                <span className="contents">
                  <Link href={a.href} className={BTN}>Ansehen</Link>
                  <button type="button" onClick={() => approve(a)} disabled={approving === a.id} className={BTN_PRIMARY}>
                    {approving === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Freigeben
                  </button>
                  <RejectControl kind={a.kind} id={a.id} compact />
                </span>
              </li>
            ))}
            {seasonsDone.map((s) => (
              <li key={`s-${s.id}`} className="flex items-center gap-3 py-2.5">
                <span className="w-8 h-8 shrink-0 rounded-lg border border-violet-500/20 bg-violet-500/10 text-violet-300 flex items-center justify-center"><Flag className="w-4 h-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">{s.name}</span>
                  <span className="block truncate text-xs text-gray-500">Alle {s.total} Termine gespielt · Endwertung offen</span>
                </span>
                <Link href={`/events/verwalten/reihen/${s.id}/complete`} className={BTN}>Saison abschließen</Link>
              </li>
            ))}
            {newSeasons.map((s) => (
              <li key={`n-${s.id}`} className="flex items-center gap-3 py-2.5">
                <span className="w-8 h-8 shrink-0 rounded-lg border border-teal-500/20 bg-teal-500/10 text-teal-300 flex items-center justify-center"><Flag className="w-4 h-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">{s.name}</span>
                  <span className="block truncate text-xs text-gray-500">Saison abgeschlossen · noch keine neue Saison</span>
                </span>
                <Link href={`/events/verwalten/reihen/${s.id}/new-season`} className={BTN}>Neue Saison</Link>
              </li>
            ))}
            {groups.action.map(({ ev, action }) => {
              const I = ACTION_ICON[action.kind];
              const tone = action.late ? "border-red-500/20 bg-red-500/10 text-red-300" : action.kind === "tournament" ? "border-amber-500/20 bg-amber-500/10 text-amber-300" : "border-sky-500/20 bg-sky-500/10 text-sky-300";
              return (
                <li key={`e-${ev.id}`} className="flex items-center gap-3 py-2.5">
                  <span className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center ${tone}`}><I className="w-4 h-4" /></span>
                  <Link href={`/events/verwalten/${ev.id}`} className="min-w-0 flex-1 group">
                    <span className="block truncate text-sm font-medium text-white group-hover:text-teal-200">{ev.title}</span>
                    <span className={`block truncate text-xs ${action.late ? "text-red-300" : "text-gray-500"}`}>
                      {action.label}{action.since && ` · ${since(action.since, now)}`}
                    </span>
                  </Link>
                  <Link href={action.href} className={BTN}>{action.button}</Link>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* ── Eventreihen und Anstehend — große Bildschirme nebeneinander ── */}
      {(seriesShown.length > 0 || upcomingCount > 0 || (!empty && !q)) && (
        <div className={`grid gap-4 items-start ${seriesShown.length > 0 ? "lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]" : ""}`}>
          {seriesShown.length > 0 && (
            <section aria-label="Eventreihen" className="glass rounded-2xl p-4 lg:sticky lg:top-[5.5rem]">
              <h2 className="text-sm font-semibold text-white">
                Eventreihen <span className="ml-1 font-normal text-gray-500">· {seriesShown.length}</span>
              </h2>
              <ul className="mt-1 divide-y divide-line">
                {seriesShown.map((s) => {
                  const color = resolveSeriesColor(s.icon);
                  const pct = s.total > 0 ? Math.round((s.played / s.total) * 100) : 0;
                  return (
                    <li key={s.id}>
                      <Link href={`/events/verwalten/reihen/${s.id}`}
                        className="group flex items-center gap-2.5 rounded-lg px-1.5 py-2 hover:bg-surface-2 transition-colors">
                        <span className="w-1 h-9 rounded-full shrink-0" style={{ background: color }} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <SeriesIcon name={s.icon} className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate text-sm font-medium text-white group-hover:text-teal-200">{s.name}</span>
                          </span>
                          <span className="block truncate text-xs text-gray-500">
                            {s.archived ? `Saison abgeschlossen · ${s.total} Termine` : s.total > 0 ? `${s.played} von ${s.total} gespielt` : "Noch keine Termine"}
                            {s.archived ? "" : s.seasonDone ? (isStaff ? " · Endwertung offen" : " · ein Mod schließt die Saison ab")
                              : s.next ? ` · nächster ${formatBerlinDate(s.next, { weekday: "short", day: "numeric", month: "numeric" })}`
                              : s.total > 0 ? " · kein Termin geplant" : ""}
                          </span>
                          {(s.awaitingApproval || s.rejected || s.hidden) && (
                            <span className="mt-1 flex flex-wrap gap-1">
                              {s.awaitingApproval && <Tag tone="amber">Freigabe offen</Tag>}
                              {s.rejected && <Tag tone="rose">Abgelehnt</Tag>}
                              {s.hidden && !s.rejected && <Tag tone="rose">Ausgeblendet</Tag>}
                            </span>
                          )}
                          <span className="mt-1 block h-1 w-full rounded-full bg-line overflow-hidden" aria-hidden>
                            <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                          </span>
                        </span>
                        <ChevronRight className="w-4 h-4 shrink-0 text-gray-600 group-hover:text-gray-300" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section aria-label="Anstehend" className="glass rounded-2xl p-4 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-white">
                Anstehend <span className="ml-1 font-normal text-gray-500">· {upcomingCount}</span>
              </h2>
              {series.length > 0 && (
                <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-500">
                  Zeigen:
                  <select value={seriesFilter} onChange={(e) => setSeriesFilter(e.target.value)}
                    className="max-w-[12rem] rounded-control bg-surface-2 border border-line px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-primary">
                    <option value="">Alle Events</option>
                    {series.map((s) => <option key={s.id} value={s.id}>Nur {s.name}</option>)}
                  </select>
                </label>
              )}
            </div>
            {upcomingCount === 0 ? (
              <p className="mt-2 text-sm text-gray-500">{filterSeries ? "Für diese Reihe ist kein Termin geplant." : "Kein Event geplant."}</p>
            ) : BUCKETS.map(({ key, label }) => upcoming[key].length > 0 && (
              <div key={key} className="mt-2">
                <p className="text-xs font-semibold text-gray-500">{label}</p>
                <ul className="divide-y divide-line">
                  {upcoming[key].map((ev) => <EventLine key={ev.id} ev={ev} now={now} />)}
                </ul>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* ── Beendet ── */}
      {groups.past.length > 0 && (
        <section aria-label="Beendet" className="glass rounded-2xl p-4">
          <button type="button" onClick={() => setPastOpen((o) => !o)} aria-expanded={pastOpen || !!q}
            className="flex w-full items-center gap-2 text-sm font-semibold text-white">
            Beendet <span className="font-normal text-gray-500">· {groups.past.length}{pastLimit && !q ? ` (letzte ${pastLimit})` : ""}</span>
            {groups.past.some((e) => !e.completed) && <Tag tone="amber">Ergebnisse fehlen</Tag>}
            <ChevronDown className={`ml-auto w-4 h-4 text-gray-500 transition-transform ${pastOpen || q ? "rotate-180" : ""}`} />
          </button>
          {(pastOpen || !!q) && (
            <>
              <ul className="mt-1 divide-y divide-line">
                {pastShown.map((ev) => (
                  <EventLine key={ev.id} ev={ev} now={now}
                    right={
                      <>
                        {!ev.completed && <Link href={`/events/verwalten/${ev.id}/complete`} className={BTN}>Ergebnisse</Link>}
                        <RowMenu ev={ev} />
                      </>
                    } />
                ))}
              </ul>
              {!showAllPast && !q && groups.past.length > PAST_VISIBLE && (
                <button type="button" onClick={() => setShowAllPast(true)} className="mt-2 text-xs font-semibold text-teal-300 hover:text-teal-200">
                  Alle {groups.past.length} anzeigen
                </button>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
