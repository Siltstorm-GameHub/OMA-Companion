import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarClock, ChevronRight, Flag, Gamepad2, Server, Trophy, UserCheck, Vote } from "@/components/icons";
import { formatBerlinDate, formatBerlinDateTime } from "@/lib/time";
import { berlinDayDiff } from "@/lib/event-display";
import { sinceLabel, NOTABLE_LABELS, type NotableTx, type PulseValue } from "@/lib/admin-overview";
import type { InboxItem, InboxTone, UpcomingEvent } from "@/lib/admin-inbox";
import AdminInboxRow from "./AdminInboxRow";

/* Bausteine der Admin-Übersicht (admin/page.tsx) — ohne eigene Datenabfragen, damit sie sich
 * auch mit Beispieldaten ansehen lassen. */

const ICONS = { CalendarClock, Flag, Gamepad2, Server, Trophy, UserCheck, Vote } as const;
const TONES: Record<InboxTone, string> = {
  amber: "text-amber-300 bg-amber-500/10 border-amber-500/20",
  teal: "text-primary-fg bg-primary/10 border-primary/20",
  blue: "text-sky-300 bg-sky-500/10 border-sky-500/20",
  red: "text-red-300 bg-red-500/10 border-red-500/20",
  violet: "text-primary-fg bg-primary-soft border-primary/40",
};
const fmt = (n: number) => n.toLocaleString("de-DE");

export function Panel({ title, right, children, className = "" }: { title: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`glass rounded-2xl p-4 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function InboxList({ label, items, now }: { label: string; items: InboxItem[]; now: Date }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <ul className="divide-y divide-line">
        {items.map((t) => {
          const I = ICONS[t.icon as keyof typeof ICONS] ?? CalendarClock;
          return (
            <AdminInboxRow key={t.key} href={t.href} title={t.title} hint={t.hint} action={t.action}
              since={t.since ? sinceLabel(t.since, now) : null} late={!!t.late}
              icon={<span className={`w-8 h-8 rounded-lg border flex items-center justify-center ${TONES[t.tone]}`}><I className="w-4 h-4" /></span>} />
          );
        })}
      </ul>
    </div>
  );
}

function whenLabel(d: Date, now: Date) {
  const diff = berlinDayDiff(now, d);
  const time = formatBerlinDateTime(d, { hour: "2-digit", minute: "2-digit" });
  if (diff === 0) return `Heute ${time}`;
  if (diff === 1) return `Morgen ${time}`;
  return `${formatBerlinDate(d, { weekday: "short" })} ${time}`;
}

export function UpcomingList({ events, now }: { events: UpcomingEvent[]; now: Date }) {
  if (events.length === 0) return <p className="mt-2 text-sm text-gray-500">In den nächsten 48 Stunden steht kein Event an.</p>;
  return (
    <ul className="mt-1 divide-y divide-line">
      {events.map((e) => {
        const empty = e.players === 0;
        const full = e.maxPlayers != null && e.players >= e.maxPlayers;
        return (
          <li key={e.id}>
            <Link href={`/events/verwalten/${e.id}`} className="group flex items-center gap-3 py-2">
              <span className="w-[5.5rem] shrink-0 text-xs text-gray-500 tabular-nums">{whenLabel(e.startAt, now)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-gray-200 group-hover:text-white">{e.title}</span>
                {(e.awaitingApproval || e.notAnnounced) && (
                  <span className="block text-xs text-amber-300/90">
                    {e.awaitingApproval ? "wartet noch auf Freigabe" : "nicht im Discord angekündigt"}
                  </span>
                )}
              </span>
              <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
                empty ? "bg-amber-500/15 text-amber-300" : full ? "bg-primary/15 text-primary-fg" : "bg-line text-gray-300"
              }`} title="Anmeldungen als Spieler">
                {empty ? "0 Anm." : e.maxPlayers ? `${e.players}/${e.maxPlayers}` : e.players}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function PulseTile({ label, p, hint }: { label: string; p: PulseValue; hint?: string }) {
  const tone = p.delta > 0 ? "text-emerald-300" : p.delta < 0 ? "text-red-300" : "text-gray-500";
  return (
    <div className="rounded-xl bg-surface-2 p-3" title={hint}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-lg font-bold text-white tabular-nums">{fmt(p.value)}</span>
        <span className={`text-xs font-semibold tabular-nums ${tone}`}>{p.delta > 0 ? "+" : p.delta < 0 ? "−" : "±"}{fmt(Math.abs(p.delta))}</span>
      </p>
    </div>
  );
}

export function PulseGrid({ pulse }: { pulse: { activeMembers: PulseValue; newMembers: PulseValue; participations: PulseValue; coinsAwarded: PulseValue } }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      <PulseTile label="Aktive Mitglieder" p={pulse.activeMembers} hint="Mindestens einmal in der App aktiv" />
      <PulseTile label="Neue Mitglieder" p={pulse.newMembers} />
      <PulseTile label="Event-Anmeldungen" p={pulse.participations} hint="Neue Anmeldungen als Spieler" />
      <PulseTile label="Münzen vergeben" p={pulse.coinsAwarded} hint="Ohne Shop-Käufe und Rang-Punkte" />
    </div>
  );
}

export function NotableList({ items }: { items: NotableTx[] }) {
  if (items.length === 0) return <p className="mt-2 text-sm text-gray-500">Keine Korrekturen, manuellen Buchungen oder großen Beträge.</p>;
  return (
    <ul className="mt-1 divide-y divide-line">
      {items.map((t) => (
        <li key={t.id} className="flex items-center gap-3 py-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-gray-200">
              <Link href={`/profile/${t.userId}`} className="font-medium text-white hover:text-teal-200">{t.userName}</Link> · {t.label}
            </span>
            <span className="block text-xs text-gray-500">{NOTABLE_LABELS[t.kind]} · {formatBerlinDate(t.createdAt, { weekday: "short", day: "numeric", month: "numeric" })}</span>
          </span>
          <span className={`shrink-0 text-sm font-semibold tabular-nums ${t.rank ? "text-primary-fg" : t.amount < 0 ? "text-red-300" : "text-amber-300"}`}>
            {t.amount > 0 ? "+" : "−"}{fmt(Math.abs(t.amount))}{t.rank && " Rang"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function RunningList({ items, now }: { items: { key: string; title: string; endsAt: Date; href: string }[]; now: Date }) {
  if (items.length === 0) return <p className="mt-2 text-sm text-gray-500">Keine Abstimmung und keine Umfrage aktiv.</p>;
  const left = (d: Date) => {
    const min = Math.floor((d.getTime() - now.getTime()) / 60000);
    if (min <= 0) return "endet gleich";
    const h = Math.floor(min / 60);
    const days = Math.floor(h / 24);
    return days > 0 ? `noch ${days} ${days === 1 ? "Tag" : "Tage"}` : h > 0 ? `noch ${h} Std` : `noch ${min} Min`;
  };
  return (
    <ul className="mt-1 divide-y divide-line">
      {items.map((r) => (
        <li key={r.key}>
          <Link href={r.href} className="group flex items-center gap-3 py-2 text-sm">
            <span className="flex-1 truncate text-gray-200 group-hover:text-white">{r.title}</span>
            <span className="shrink-0 text-xs text-gray-500">{left(r.endsAt)}</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-300" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
