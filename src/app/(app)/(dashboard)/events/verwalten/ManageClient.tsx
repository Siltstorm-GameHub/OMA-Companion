"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  CalendarClock, Check, ChevronDown, Copy, Edit2, ExternalLink, Eye, EyeOff, Flag, Loader2, Search, Trophy, UserCheck, Vote, X,
} from "@/components/icons";
import SeriesIcon from "@/components/SeriesIcon";
import { Card } from "@/components/ui/Card";
import { Glyph } from "@/components/ui/Glyph";
import { buttonClasses } from "@/components/ui/button-styles";
import { FIELD_CLASSES } from "@/components/ui/field-styles";
import { resolveSeriesColor } from "@/lib/series-icons";
import { dateBlock } from "@/lib/event-display";
import { groupManageEvents, matchesQuery, statusText, type ManageAction, type ManageBucket, type ManageEvent } from "@/lib/event-manage";
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
/** Ansicht-Chip für Mods (Alle / Meine / Von Mitgliedern) */
export type ManageView = { key: string; label: string; href: string; count: number; active: boolean };

const BUCKETS: { key: ManageBucket; label: string }[] = [
  { key: "running", label: "Läuft gerade" },
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

const ICON_BTN = "grid size-10 lg:size-8 shrink-0 place-items-center rounded-control text-subtle hover:bg-surface-3 hover:text-fg transition-colors";

/** Drei Punkte (Pictoicons haben kein "Mehr"-Symbol) */
function MoreDots({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
    </svg>
  );
}

function Section({ title, count, extra, children, tone, className = "" }: {
  title: ReactNode; count?: number; extra?: ReactNode; children: ReactNode; tone?: "attention"; className?: string;
}) {
  return (
    <Card aria-label={typeof title === "string" ? title : undefined}
      className={`min-w-0 ${tone === "attention" ? "border-warning/40" : ""} ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 text-base font-extrabold text-fg">
          {title}
          {count != null && (
            <span className={`rounded-full px-2 text-xs font-bold leading-5 tabular-nums ${tone === "attention" ? "bg-warning text-canvas" : "bg-surface-3 text-muted"}`}>{count}</span>
          )}
        </h2>
        {extra}
      </div>
      {children}
    </Card>
  );
}

/** Zwischenüberschrift innerhalb eines Abschnitts */
function SubHead({ children, tone }: { children: ReactNode; tone?: "danger" }) {
  return <p className={`mt-3 mb-0.5 text-xs font-bold uppercase tracking-wide ${tone === "danger" ? "text-danger" : "text-subtle"}`}>{children}</p>;
}

function Tag({ children, tone = "gray", title }: { children: ReactNode; tone?: "gray" | "amber" | "rose" | "teal"; title?: string }) {
  const cls = {
    gray: "bg-surface-3 text-muted",
    amber: "bg-warning-soft text-warning",
    rose: "bg-danger-soft text-danger",
    teal: "bg-primary-soft text-primary-fg",
  }[tone];
  return <span title={title} className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
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
          <Glyph name="target" className="size-3.5" />
          {ev.goal.settled && !ev.goal.reached ? "verfehlt" : ev.goal.reached ? "geschafft" : `${Math.floor(ev.goal.percent)} %`}
        </Tag>
      )}
    </>
  );
}

/** Mehr-Menü einer Event-Zeile: öffentliche Seite, duplizieren, ein-/ausblenden */
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

  const item = "flex min-h-10 w-full items-center gap-2.5 px-3 text-left text-sm text-fg hover:bg-surface-3 transition-colors";
  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Weitere Aktionen" aria-expanded={open} className={ICON_BTN}>
        <MoreDots className="size-4" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-control border border-line-strong bg-surface-2 py-1 shadow-card">
          <Link role="menuitem" href={`/tournament/${ev.id}`} className={item}><ExternalLink className="size-4 text-subtle" /> Öffentliche Seite</Link>
          <Link role="menuitem" href={`/events/verwalten/neu?from=${ev.id}`} className={item}><Copy className="size-4 text-subtle" /> Duplizieren</Link>
          <button role="menuitem" type="button" onClick={toggleHidden} disabled={busy} className={`${item} border-t border-line`}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : ev.hidden ? <Eye className="size-4 text-subtle" /> : <EyeOff className="size-4 text-subtle" />}
            {ev.hidden ? "Wieder einblenden" : "Ausblenden"}
          </button>
        </div>
      )}
    </div>
  );
}

/** Kalenderblock wie auf der Events-Seite */
function DateTile({ date, now }: { date: Date; now: Date }) {
  const b = dateBlock(date, now);
  return (
    <span className="w-12 shrink-0 rounded-control border border-line bg-surface-2 py-1 text-center leading-tight">
      <span className="block text-[0.65rem] font-bold uppercase tracking-wide text-subtle">{b.weekday}</span>
      <span className="block text-base font-extrabold text-fg tabular-nums">{b.day}</span>
      <span className="block text-[0.65rem] font-semibold text-muted tabular-nums">{b.time}</span>
    </span>
  );
}

function EventLine({ ev, now, right }: { ev: ManageEvent; now: Date; right?: ReactNode }) {
  const status = statusText(ev, now);
  const color = ev.series ? resolveSeriesColor(ev.series.icon) : null;
  return (
    <li className="flex items-center gap-3 py-2.5">
      <DateTile date={ev.startAt} now={now} />
      <Link href={`/events/verwalten/${ev.id}`} className="group min-w-0 flex-1">
        <span className="flex items-center gap-1.5 min-w-0">
          {color && <span className="w-1 h-3.5 rounded-full shrink-0" style={{ background: color }} />}
          <span className="truncate text-sm font-bold text-fg group-hover:text-primary-fg">{ev.title}</span>
        </span>
        <span className="block truncate text-xs text-subtle">
          {ev.series ? `${ev.series.name} · Termin ${ev.series.index} von ${ev.series.total}` : ev.game ?? "Kein Spiel festgelegt"}
          {ev.createdBy && ` · von ${ev.createdBy}`}
        </span>
        <span className="mt-1 flex flex-wrap gap-1 sm:hidden empty:hidden"><EventTags ev={ev} status={status} /></span>
      </Link>
      <span className="hidden sm:flex items-center gap-1"><EventTags ev={ev} status={status} /></span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
        ev.players === 0 ? "bg-warning-soft text-warning" : "bg-surface-3 text-muted"
      }`} title={ev.players === 0 ? "Noch niemand angemeldet" : "Anmeldungen als Spieler"}>
        {ev.maxPlayers ? `${ev.players}/${ev.maxPlayers}` : ev.players}
      </span>
      {right ?? (
        <span className="flex shrink-0 items-center">
          {/* Am Handy reicht der Titel als Link — so bleibt mehr Platz für den Namen */}
          <Link href={`/events/verwalten/${ev.id}`} aria-label="Bearbeiten" className={`${ICON_BTN} max-sm:hidden`}><Edit2 className="size-4" /></Link>
          <RowMenu ev={ev} />
        </span>
      )}
    </li>
  );
}

const ACTION_ICON: Record<ManageAction["kind"], typeof Trophy> = { tournament: Trophy, poll: Vote, complete: CalendarClock };
const ICON_TILE = "grid size-10 shrink-0 place-items-center rounded-control";

/** Eine Zeile unter "Braucht dich": Symbol, Text, Knöpfe */
function AttentionRow({ icon, tone, title, href, hint, hintTone, children }: {
  icon: ReactNode; tone: string; title: string; href?: string; hint: ReactNode; hintTone?: "danger"; children: ReactNode;
}) {
  const text = (
    <>
      <span className={`block truncate text-sm font-bold text-fg ${href ? "group-hover:text-primary-fg" : ""}`}>{title}</span>
      <span className={`block truncate text-xs ${hintTone === "danger" ? "font-semibold text-danger" : "text-subtle"}`}>{hint}</span>
    </>
  );
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
      <span className={`${ICON_TILE} ${tone}`}>{icon}</span>
      {href
        ? <Link href={href} className="group min-w-0 flex-1 basis-48">{text}</Link>
        : <span className="min-w-0 flex-1 basis-48">{text}</span>}
      {children}
    </li>
  );
}

/**
 * Events → Verwalten: Kopf (Anlegen, Ansichten), "Braucht dich" (gegliedert: Überfällig, Freigaben,
 * Turniere & Umfragen, Abschließen, Saisons), Eventreihen (Klick filtert "Anstehend"), "Anstehend"
 * (Läuft gerade / Heute / Diese Woche / Später) und Beendete — mit gemeinsamer Suche.
 * Logik in lib/event-manage.ts.
 */
export default function ManageClient({ isStaff, nowIso, events, series, approvals, pastLimit, createActions, views, limits, notice = null }: {
  /** Hinweis oben, z.B. Reihen, deren Ablaufart noch festgelegt werden muss */
  notice?: ReactNode;
  isStaff: boolean; nowIso: string; events: ManageEventDTO[]; series: ManageSeriesDTO[]; approvals: ManageApproval[];
  /** gesetzt, wenn bei Beendeten nur die letzten N geladen sind */
  pastLimit: number | null;
  /** Knöpfe "Neues Event" / "Neue Eventreihe" (auch in der Leer-Ansicht) */
  createActions: ReactNode;
  /** Mods: Ansichten mit Anzahl offener Events */
  views: ManageView[] | null;
  /** Mitglieder: Limit-Karte */
  limits: ReactNode;
}) {
  const router = useRouter();
  const now = new Date(nowIso);
  const [query, setQuery] = useState("");
  const [pastOpen, setPastOpen] = useState(false);
  const [showAllPast, setShowAllPast] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  // Filter "Anstehend" nach einer Reihe ("" = alle Events) — gesetzt per Klick auf eine Reihe
  const [seriesFilter, setSeriesFilter] = useState("");
  const upcomingRef = useRef<HTMLDivElement>(null);

  const all: ManageEvent[] = events.map((e) => ({ ...e, startAt: new Date(e.startAt), endAt: e.endAt ? new Date(e.endAt) : null }));
  const q = query.trim().toLowerCase();
  const groups = groupManageEvents(all.filter((e) => matchesQuery(e, query)), now);
  const seriesShown = series.filter((s) => !q || s.name.toLowerCase().includes(q) || (s.createdBy ?? "").toLowerCase().includes(q));
  const approvalsShown = approvals.filter((a) => !q || a.title.toLowerCase().includes(q) || a.by.toLowerCase().includes(q));
  // Saisonabschluss (Endwertung, Auszahlung) machen nur Mods — Mitglieder sehen den Stand in der Reihen-Liste
  const seasonsDone = isStaff ? seriesShown.filter((s) => s.seasonDone) : [];
  const newSeasons = seriesShown.filter((s) => s.newSeasonDue);
  const late = groups.action.filter((a) => a.action.late);
  const running = groups.action.filter((a) => !a.action.late && a.action.kind !== "complete");
  const toComplete = groups.action.filter((a) => !a.action.late && a.action.kind === "complete");
  const attentionCount = approvalsShown.length + seasonsDone.length + newSeasons.length + groups.action.length;
  const filterSeries = series.find((s) => s.id === seriesFilter) ?? null;
  const inFilter = (ev: ManageEvent) => !filterSeries || ev.series?.id === filterSeries.id;
  const upcoming = Object.fromEntries(
    BUCKETS.map(({ key }) => [key, groups.upcoming[key].filter(inFilter)]),
  ) as Record<ManageBucket, ManageEvent[]>;
  const upcomingCount = BUCKETS.reduce((n, { key }) => n + upcoming[key].length, 0);
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

  function pickSeries(id: string) {
    const next = seriesFilter === id ? "" : id;
    setSeriesFilter(next);
    // Auf dem Handy steht "Anstehend" unter den Reihen — dorthin scrollen, damit man das Ergebnis sieht
    if (next && window.matchMedia("(max-width: 1023px)").matches) {
      upcomingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const empty = all.length === 0 && series.length === 0 && approvals.length === 0;
  const summary = [
    attentionCount > 0 ? `${attentionCount} ${attentionCount === 1 ? "braucht" : "brauchen"} dich` : "Nichts offen",
    `${groups.upcoming.running.length + groups.upcoming.today.length + groups.upcoming.week.length + groups.upcoming.later.length} anstehend`,
    series.length > 0 ? `${series.filter((s) => !s.archived).length} ${series.filter((s) => !s.archived).length === 1 ? "Reihe" : "Reihen"}` : null,
  ].filter(Boolean).join(" · ");

  const actionRow = (ev: ManageEvent, action: ManageAction) => {
    const I = ACTION_ICON[action.kind];
    const tone = action.late ? "bg-danger-soft text-danger" : action.kind === "tournament" ? "bg-coin-soft text-coin" : action.kind === "poll" ? "bg-violet-500/15 text-violet-300" : "bg-surface-3 text-muted";
    return (
      <AttentionRow key={`e-${ev.id}`} icon={<I className="size-5" />} tone={tone} title={ev.title} href={`/events/verwalten/${ev.id}`}
        hint={<>{action.label}{action.since && ` · ${since(action.since, now)}`}</>} hintTone={action.late ? "danger" : undefined}>
        <Link href={action.href} className={buttonClasses(action.late ? "primary" : "secondary", "sm")}>{action.button}</Link>
      </AttentionRow>
    );
  };

  return (
    <div className="space-y-5">
      {/* ── Kopf: Titel, Stand, Anlegen; Mods: Ansichten ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold tracking-tight text-fg">Events verwalten</h2>
          {!empty && <p className="mt-0.5 text-sm text-muted">{summary}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">{createActions}</div>
      </div>

      {notice}
      {limits}

      {(views || !empty) && (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          {views && (
            <nav aria-label="Ansicht" className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {views.map((v) => (
                <Link key={v.key} href={v.href} aria-current={v.active ? "true" : undefined}
                  className={`shrink-0 inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors ${
                    v.active ? "border-primary/40 bg-primary-soft text-primary-fg" : "border-line bg-surface text-muted hover:border-line-strong hover:bg-surface-2 hover:text-fg"
                  }`}>
                  {v.label}
                  <span className={`text-xs tabular-nums ${v.active ? "text-primary-fg/80" : "text-subtle"}`}>{v.count}</span>
                </Link>
              ))}
            </nav>
          )}
          {!empty && (
            <div className="relative w-full sm:ml-auto sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-subtle" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Titel, Spiel, Reihe oder Person"
                aria-label="Events durchsuchen" className={`${FIELD_CLASSES} min-h-10 pl-9`} />
            </div>
          )}
        </div>
      )}

      {empty && (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <span className={`${ICON_TILE} bg-primary-soft text-primary-fg`}><Glyph name="calendar" className="size-5" /></span>
          <div>
            <p className="text-base font-extrabold text-fg">{isStaff ? "In dieser Ansicht gibt es keine Events" : "Du hast noch kein Event angelegt"}</p>
            <p className="mt-1 text-sm text-muted">Leg ein Event oder eine Eventreihe an. Danach bearbeitest und schließt du es hier ab.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">{createActions}</div>
        </Card>
      )}

      {/* ── Braucht dich ── */}
      {attentionCount > 0 && (
        <Section title="Braucht dich" count={attentionCount} tone="attention">
          {late.length > 0 && (
            <>
              <SubHead tone="danger">Überfällig</SubHead>
              <ul className="divide-y divide-line">{late.map(({ ev, action }) => actionRow(ev, action))}</ul>
            </>
          )}

          {approvalsShown.length > 0 && (
            <>
              <SubHead>Freigaben</SubHead>
              <ul className="divide-y divide-line">
                {approvalsShown.map((a) => (
                  <AttentionRow key={`a-${a.id}`} icon={<UserCheck className="size-5" />} tone="bg-primary-soft text-primary-fg"
                    title={a.title} href={a.href}
                    hint={`${a.kind === "series" ? "Reihe" : "Event"} von ${a.by} · wartet ${since(a.since, now).replace("seit ", "")}`}>
                    {/* "contents": die Knöpfe sind direkte Flex-Kinder der Zeile — so öffnet das Ablehnen-Feld
                        (basis-full) in voller Breite unter der Zeile */}
                    <span className="contents">
                      <button type="button" onClick={() => approve(a)} disabled={approving === a.id} className={buttonClasses("primary", "sm")}>
                        {approving === a.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Freigeben
                      </button>
                      <RejectControl kind={a.kind} id={a.id} compact />
                    </span>
                    {a.facts.length > 0 && (
                      <span className="flex basis-full flex-wrap gap-1 sm:pl-[3.25rem]">
                        {a.facts.map((f) => <Tag key={f}>{f}</Tag>)}
                      </span>
                    )}
                  </AttentionRow>
                ))}
              </ul>
            </>
          )}

          {running.length > 0 && (
            <>
              <SubHead>Turniere &amp; Umfragen</SubHead>
              <ul className="divide-y divide-line">{running.map(({ ev, action }) => actionRow(ev, action))}</ul>
            </>
          )}

          {toComplete.length > 0 && (
            <>
              <SubHead>Abschließen</SubHead>
              <ul className="divide-y divide-line">{toComplete.map(({ ev, action }) => actionRow(ev, action))}</ul>
            </>
          )}

          {(seasonsDone.length > 0 || newSeasons.length > 0) && (
            <>
              <SubHead>Saisons</SubHead>
              <ul className="divide-y divide-line">
                {seasonsDone.map((s) => (
                  <AttentionRow key={`s-${s.id}`} icon={<Flag className="size-5" />} tone="bg-violet-500/15 text-violet-300"
                    title={s.name} hint={`Alle ${s.total} Termine gespielt · Endwertung offen`}>
                    <Link href={`/events/verwalten/reihen/${s.id}/complete`} className={buttonClasses("secondary", "sm")}>Saison abschließen</Link>
                  </AttentionRow>
                ))}
                {newSeasons.map((s) => (
                  <AttentionRow key={`n-${s.id}`} icon={<Flag className="size-5" />} tone="bg-primary-soft text-primary-fg"
                    title={s.name} hint="Saison abgeschlossen · noch keine neue Saison">
                    <Link href={`/events/verwalten/reihen/${s.id}/new-season`} className={buttonClasses("secondary", "sm")}>Neue Saison</Link>
                  </AttentionRow>
                ))}
              </ul>
            </>
          )}
        </Section>
      )}

      {/* ── Eventreihen und Anstehend — große Bildschirme nebeneinander ── */}
      {(seriesShown.length > 0 || upcomingCount > 0 || (!empty && !q)) && (
        <div className={`grid gap-5 items-start ${seriesShown.length > 0 ? "lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]" : ""}`}>
          {seriesShown.length > 0 && (
            <Section title="Eventreihen" count={seriesShown.length} className="lg:sticky lg:top-[5.5rem]"
              extra={<span className="ml-auto text-xs text-subtle">Klick filtert die Termine</span>}>
              <ul className="mt-2 space-y-1">
                {seriesShown.map((s) => {
                  const color = resolveSeriesColor(s.icon);
                  const pct = s.total > 0 ? Math.round((s.played / s.total) * 100) : 0;
                  const on = seriesFilter === s.id;
                  return (
                    <li key={s.id} className={`flex items-center gap-1 rounded-control border transition-colors ${
                      on ? "border-primary/40 bg-primary-soft" : "border-transparent hover:bg-surface-2"
                    }`}>
                      <button type="button" onClick={() => pickSeries(s.id)} aria-pressed={on}
                        className="flex min-w-0 flex-1 items-center gap-2.5 px-2 py-2 text-left">
                        <span className="w-1 h-10 rounded-full shrink-0" style={{ background: color }} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <SeriesIcon name={s.icon} className="size-4 shrink-0" />
                            <span className={`truncate text-sm font-bold ${on ? "text-primary-fg" : "text-fg"}`}>{s.name}</span>
                          </span>
                          <span className="block truncate text-xs text-subtle">
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
                          <span className="mt-1.5 block h-1 w-full rounded-full bg-surface-3 overflow-hidden" aria-hidden>
                            <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                          </span>
                        </span>
                      </button>
                      <Link href={`/events/verwalten/reihen/${s.id}`} aria-label={`${s.name} bearbeiten`} className={`${ICON_BTN} mr-1`}>
                        <Edit2 className="size-4" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          <div ref={upcomingRef} className="min-w-0 scroll-mt-36">
            <Section title="Anstehend" count={upcomingCount}
              extra={filterSeries && (
                <button type="button" onClick={() => setSeriesFilter("")}
                  className="ml-auto inline-flex min-h-8 items-center gap-1.5 rounded-full border border-primary/40 bg-primary-soft px-3 text-xs font-semibold text-primary-fg hover:text-fg">
                  Nur {filterSeries.name} <X className="size-3.5" />
                </button>
              )}>
              {upcomingCount === 0 ? (
                <p className="mt-2 text-sm text-muted">{filterSeries ? "Für diese Reihe ist kein Termin geplant." : "Kein Event geplant."}</p>
              ) : BUCKETS.map(({ key, label }) => upcoming[key].length > 0 && (
                <div key={key}>
                  <SubHead>{label}</SubHead>
                  <ul className="divide-y divide-line">
                    {upcoming[key].map((ev) => <EventLine key={ev.id} ev={ev} now={now} />)}
                  </ul>
                </div>
              ))}
            </Section>
          </div>
        </div>
      )}

      {/* ── Beendet ── */}
      {groups.past.length > 0 && (
        <Card aria-label="Beendet">
          <button type="button" onClick={() => setPastOpen((o) => !o)} aria-expanded={pastOpen || !!q}
            className="flex w-full items-center gap-2 text-left">
            <span className="text-base font-extrabold text-fg">Beendet</span>
            <span className="rounded-full bg-surface-3 px-2 text-xs font-bold leading-5 tabular-nums text-muted">{groups.past.length}</span>
            {pastLimit && !q && <span className="text-xs text-subtle">letzte {pastLimit}</span>}
            {groups.past.some((e) => !e.completed) && <Tag tone="amber">Ergebnisse fehlen</Tag>}
            <ChevronDown className={`ml-auto size-4 text-subtle transition-transform ${pastOpen || q ? "rotate-180" : ""}`} />
          </button>
          {(pastOpen || !!q) && (
            <>
              <ul className="mt-1 divide-y divide-line">
                {pastShown.map((ev) => (
                  <EventLine key={ev.id} ev={ev} now={now}
                    right={
                      <span className="flex shrink-0 items-center gap-1">
                        {!ev.completed && <Link href={`/events/verwalten/${ev.id}/complete`} className={buttonClasses("secondary", "sm")}>Ergebnisse</Link>}
                        <RowMenu ev={ev} />
                      </span>
                    } />
                ))}
              </ul>
              {!showAllPast && !q && groups.past.length > PAST_VISIBLE && (
                <button type="button" onClick={() => setShowAllPast(true)} className="mt-2 text-sm font-semibold text-primary-fg hover:text-fg">
                  Alle {groups.past.length} anzeigen
                </button>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
