import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { loadAdminInbox } from "@/lib/admin-inbox";
import { notableTransactions } from "@/lib/admin-overview";
import { CalendarPlus, ChevronDown, Coins, Megaphone, Zap } from "@/components/icons";
import ActivityFeed from "./ActivityFeed";
import { InboxList, NotableList, Panel, PulseGrid, RunningList, UpcomingList } from "./AdminOverviewParts";

/**
 * Admin → Übersicht. Oben die Aufgaben in zwei Stufen mit Wartezeit: "Dringend" (Turniere,
 * Umfragephasen, vorbei und nicht abgeschlossen) und "Prüfen" (Freigaben, Bewerbungen, Vorschläge,
 * Einsprüche — einzeln mit Namen). Darunter die nächsten 48 Stunden, der Puls der Community (7 Tage
 * gegenüber Vorwoche), was gerade läuft, auffällige Buchungen und Schnellaktionen.
 * Quelle der Aufgaben ist dieselbe wie für die Zähler in der Seitenleiste (lib/admin-inbox.ts).
 */
export default async function AdminPage() {
  // Die Übersicht ist Mods vorbehalten — Mitglieder/Captains landen in ihrer Event-Verwaltung
  const me = await getSessionUser();
  if (!me || !hasMinRole(me.role, "moderator")) redirect("/events/verwalten");
  const isAdmin = hasMinRole(me.role, "admin");
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [inbox, recentActivity] = await Promise.all([
    loadAdminInbox(now),
    prisma.pointTransaction.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, username: true } } },
    }),
  ]);
  const { urgent, review, upcoming, running, pulse } = inbox;
  const notable = notableTransactions(recentActivity);
  const openCount = urgent.length + review.filter((r) => !r.key.startsWith("more-")).length;
  const urgentCount = urgent.length;

  const quick = [
    { href: "/events/verwalten/neu", label: "Event anlegen", icon: CalendarPlus, show: true },
    { href: "/admin/daily-message", label: "Mitteilung senden", icon: Megaphone, show: isAdmin },
    { href: "/admin/users", label: "Münzen buchen", icon: Coins, show: isAdmin },
  ].filter((q) => q.show);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-black text-white">Übersicht</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {openCount === 0
            ? "Gerade nichts zu tun."
            : `${openCount} ${openCount === 1 ? "Aufgabe" : "Aufgaben"} offen${urgentCount > 0 ? `, davon ${urgentCount} dringend` : ""}`}
        </p>
      </div>

      {/* ── Zu erledigen ── */}
      <Panel title="Zu erledigen">
        {urgent.length === 0 && review.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">Alle Events, Freigaben und Meldungen sind erledigt.</p>
        ) : (
          <>
            <InboxList label="Dringend" items={urgent} now={now} />
            <InboxList label="Prüfen" items={review} now={now} />
          </>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <Panel title="Nächste 48 Stunden" right={<Link href="/events/verwalten" className="text-[11px] text-teal-400 hover:text-teal-300">Alle Events →</Link>}>
          <UpcomingList events={upcoming} now={now} />
        </Panel>
        <Panel title={<>Puls der Community <span className="font-normal text-gray-500">· 7 Tage, ggü. Vorwoche</span></>}>
          <PulseGrid pulse={pulse} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <Panel title="Läuft gerade">
          <RunningList items={running} now={now} />
        </Panel>
        <Panel title={<>Auffällige Buchungen <span className="font-normal text-gray-500">· 7 Tage</span></>}>
          <NotableList items={notable} />
        </Panel>
      </div>

      {/* ── Schnellaktionen ── */}
      <div className="flex flex-wrap gap-2">
        {quick.map((q) => (
          <Link key={q.href} href={q.href}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-white/[0.07] hover:text-white">
            <q.icon className="w-3.5 h-3.5 text-purple-300" /> {q.label}
          </Link>
        ))}
      </div>

      {/* ── Alle Buchungen (eingeklappt) ── */}
      <details className="group glass rounded-2xl p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-white [&::-webkit-details-marker]:hidden">
          <Zap className="w-4 h-4 text-amber-400" /> Alle Buchungen der letzten 7 Tage
          <span className="font-normal text-gray-500">· {recentActivity.length}</span>
          <ChevronDown className="ml-auto w-4 h-4 text-gray-500 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3"><ActivityFeed transactions={recentActivity} /></div>
      </details>
    </div>
  );
}
