import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { loadAdminInbox, type InboxTone } from "@/lib/admin-inbox";
import {
  CalendarClock, CalendarPlus, ChevronDown, ChevronRight, Coins, Flag, Gamepad2, Megaphone, Server, Trophy, UserCheck, Vote, Zap,
} from "@/components/icons";
import ActivityFeed from "./ActivityFeed";
import AdminInboxRow from "./AdminInboxRow";

const ICONS = { CalendarClock, Flag, Gamepad2, Server, Trophy, UserCheck, Vote } as const;

const TONES: Record<InboxTone, string> = {
  amber: "text-amber-300 bg-amber-500/10 border-amber-500/20",
  teal: "text-teal-300 bg-teal-500/10 border-teal-500/20",
  blue: "text-sky-300 bg-sky-500/10 border-sky-500/20",
  red: "text-red-300 bg-red-500/10 border-red-500/20",
  violet: "text-purple-300 bg-purple-500/10 border-purple-500/20",
};

function endsIn(target: Date, now: Date): string {
  const min = Math.floor((target.getTime() - now.getTime()) / 60000);
  if (min <= 0) return "endet gleich";
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `noch ${d} ${d === 1 ? "Tag" : "Tage"}`;
  if (h > 0) return `noch ${h} Std`;
  return `noch ${min} Min`;
}

/**
 * Admin → Übersicht: Aufgaben-Eingang. Oben alles, was eine Entscheidung braucht (Turniere,
 * Abschlüsse, Freigaben, Bewerbungen, Vorschläge, Einsprüche — dieselbe Quelle wie die Zähler in der
 * Seitenleiste, lib/admin-inbox.ts), dann was gerade läuft, Schnellaktionen und eingeklappt das
 * Münz-Protokoll der letzten 7 Tage.
 */
export default async function AdminPage() {
  // Die Übersicht ist Mods vorbehalten — Mitglieder/Captains landen in ihrer Event-Verwaltung
  const me = await getSessionUser();
  if (!me || !hasMinRole(me.role, "moderator")) redirect("/events/verwalten");
  const isAdmin = hasMinRole(me.role, "admin");
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [{ todo, running }, recentActivity] = await Promise.all([
    loadAdminInbox(now),
    prisma.pointTransaction.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, username: true } } },
    }),
  ]);

  const quick = [
    { href: "/events/verwalten/neu", label: "Event anlegen", icon: CalendarPlus, show: true },
    { href: "/admin/daily-message", label: "Mitteilung senden", icon: Megaphone, show: isAdmin },
    { href: "/admin/users", label: "Münzen buchen", icon: Coins, show: isAdmin },
  ].filter((q) => q.show);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-black text-white">Übersicht</h1>

      {/* ── Zu erledigen ── */}
      <section aria-label="Zu erledigen" className="glass rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-white">
          Zu erledigen {todo.length > 0 && <span className="ml-1 rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-black tabular-nums">{todo.length}</span>}
        </h2>
        {todo.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">Gerade nichts zu tun. Alle Events, Freigaben und Meldungen sind erledigt.</p>
        ) : (
          <ul className="mt-2 divide-y divide-white/[0.05]">
            {todo.map((t) => {
              const I = ICONS[t.icon as keyof typeof ICONS] ?? CalendarClock;
              return (
                <AdminInboxRow key={t.key} href={t.href} title={t.title} hint={t.hint} action={t.action}
                  icon={<span className={`w-8 h-8 rounded-lg border flex items-center justify-center ${TONES[t.tone]}`}><I className="w-4 h-4" /></span>} />
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2 items-start">
        {/* ── Läuft gerade ── */}
        <section aria-label="Läuft gerade" className="glass rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-white">Läuft gerade</h2>
          {running.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">Keine Abstimmung und keine Umfrage aktiv.</p>
          ) : (
            <ul className="mt-1 divide-y divide-white/[0.05]">
              {running.map((r) => (
                <li key={r.key}>
                  <Link href={r.href} className="group flex items-center gap-3 py-2 text-sm">
                    <span className="flex-1 truncate text-gray-200 group-hover:text-white">{r.title}</span>
                    <span className="shrink-0 text-[11px] text-gray-500">{endsIn(r.endsAt, now)}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Schnellaktionen ── */}
        <section aria-label="Schnellaktionen" className="glass rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-white">Schnellaktionen</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {quick.map((q) => (
              <Link key={q.href} href={q.href}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-white/[0.07] hover:text-white">
                <q.icon className="w-3.5 h-3.5 text-purple-300" /> {q.label}
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* ── Münz-Protokoll (eingeklappt) ── */}
      <details className="group glass rounded-2xl p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-white [&::-webkit-details-marker]:hidden">
          <Zap className="w-4 h-4 text-amber-400" /> Münzen und Punkte, letzte 7 Tage
          <span className="font-normal text-gray-500">· {recentActivity.length} Buchungen</span>
          <ChevronDown className="ml-auto w-4 h-4 text-gray-500 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3"><ActivityFeed transactions={recentActivity} /></div>
      </details>
    </div>
  );
}
