import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { unstable_cache } from "next/cache";
import { auth } from "@/auth";
import { isLinkPreviewBot } from "@/lib/link-preview-bots";
import { prisma } from "@/lib/prisma";
import { allocatePool } from "@/lib/donation-pool";
import DashboardChrome from "./DashboardChrome";
import PartnerFooter from "@/components/PartnerFooter";
import { GUEST_ALLOWED_PATHS } from "@/lib/guest-access";
import type { SupportGlobal } from "@/components/shell/Sidebar";

/**
 * Spendenpool für die Support-Karte in der Seitenleiste: worauf das Guthaben gerade hinarbeitet
 * (erst die laufenden Kosten, dann die Ziele der Reihe nach — lib/donation-pool.ts). Für alle gleich,
 * 10 min gecacht. Beträge werden nicht gezeigt, nur der Fortschritt in Prozent.
 * Dazu für die Rotation der Karte: wie viele diesen Monat gespendet haben (nur die Zahl, keine Namen/Beträge) und
 * was zuletzt auf der Roadmap umgesetzt wurde (letzte 30 Tage).
 */
const getSupportProgress = unstable_cache(
  async (): Promise<SupportGlobal> => {
    const now = new Date();
    const since = new Date(now.getTime() - 30 * 86_400_000);
    const [donations, expenses, ideas, fixedCosts, monthDonors, doneItem, doneIdea] = await Promise.all([
      prisma.donation.aggregate({ _sum: { amount: true } }),
      prisma.poolExpense.aggregate({ _sum: { amount: true } }),
      prisma.poolIdea.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.poolFixedCost.findMany({ where: { active: true }, orderBy: { nextDueAt: "asc" } }),
      prisma.donation.groupBy({ by: ["userId"], where: { month: now.getMonth() + 1, year: now.getFullYear() } }),
      prisma.roadmapItem.findFirst({ where: { status: "DONE", doneAt: { gte: since } }, orderBy: { doneAt: "desc" }, select: { id: true, title: true, doneAt: true } }),
      prisma.communityIdea.findFirst({
        where: { lifecycle: "DONE", hiddenByAdminAt: null, lifecycleAt: { gte: since } },
        orderBy: { lifecycleAt: "desc" }, select: { id: true, title: true, lifecycleAt: true },
      }),
    ]);
    const pool = allocatePool((donations._sum.amount ?? 0) - (expenses._sum.amount ?? 0), fixedCosts, ideas, now);
    const next = pool.next;
    const progress = next.kind === "none" || next.target <= 0 ? null : {
      label: next.kind === "fixed" ? "Laufende Kosten" : next.goal.title,
      percent: Math.max(0, Math.min(100, Math.round((next.covered / next.target) * 100))),
    };
    const itemAt = doneItem?.doneAt?.getTime() ?? 0;
    const ideaAt = doneIdea?.lifecycleAt?.getTime() ?? 0;
    const latestDone = itemAt === 0 && ideaAt === 0 ? null
      : itemAt >= ideaAt
        ? { title: doneItem!.title, href: `/community-board/roadmap#item-${doneItem!.id}` }
        : { title: doneIdea!.title, href: `/community-board/idea/${doneIdea!.id}` };
    return { progress, supportersThisMonth: monthDonors.length, latestDone };
  },
  ["sidebar-support-progress-v2"], // v2: mit Spendern im Monat und zuletzt Umgesetztem (anderes Format)
  { revalidate: 600 },
);

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const pathnameHdr = (await headers()).get("x-pathname") ?? "";
  if (!session) {
    // redirect() macht aus der gesamten Antwort eine reine HTTP-Weiterleitung
    // ohne Body — die dynamischen Meta-Tags der jeweiligen Seite
    // (generateMetadata, z.B. Event-Titel/-Bild für Discord-Linkvorschauen)
    // kommen dann nie an.
    //
    // Für bekannte Link-Vorschau-Bots lassen wir den Redirect deshalb weg und
    // rendern direkt {children} — ohne die Chrome und Datenabfragen unten, die
    // eine echte Session voraussetzen. Wichtig: {children} wird von Next.js
    // unabhängig davon ausgeführt, ob dieses Layout es einbaut (kein Weg, das
    // hier zu unterbinden) — die betroffenen Seiten (tournament/[id],
    // leaderboard, profile/[id]) prüfen deshalb selbst auf eine fehlende
    // Session und zeigen dann BotPreviewShell statt echter Daten. Da nur
    // verifizierte Bots ohne redirect() bis hierher kommen, reicht dort ein
    // einfaches "keine Session? → Platzhalter" ohne erneute UA-Prüfung.
    const ua = (await headers()).get("user-agent");
    if (isLinkPreviewBot(ua)) return <>{children}</>;

    // Echte (nicht eingeloggte) Besucher dürfen ein paar Übersichtsseiten sehen —
    // die Seiten selbst blenden dort Inhalte aus/hinter Login-Overlays, alles
    // andere (Profil, Quests, Server, Turnier-Detail, …) bleibt hinter dem Login.
    const isGuestAllowed = GUEST_ALLOWED_PATHS.includes(pathnameHdr);
    if (!isGuestAllowed) redirect(`/login?notice=login_required&callbackUrl=${encodeURIComponent(pathnameHdr || "/dashboard")}`);
  }

  // Früher lag hier das News-Laufband mit eigenen Abfragen. Seine Inhalte stehen jetzt auf der
  // Übersicht (Bühne, Community-Ziel, Quests, Rangliste mit Wanderpokal) und in der Kopfzeile (Münzen).
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const [global, donor] = await Promise.all([
    getSupportProgress().catch((): SupportGlobal => ({ progress: null, supportersThisMonth: 0, latestDone: null })),
    // Hat die angemeldete Person schon gespendet? → Dank statt Aufforderung in der Support-Karte
    userId ? prisma.donation.count({ where: { userId } }).then(n => n > 0).catch(() => false) : Promise.resolve(false),
  ]);
  const support = { ...global, donor };

  return (
    <DashboardChrome
      partnerFooter={<PartnerFooter />}
      isGuest={!session}
      inviteUrl={process.env.DISCORD_INVITE_URL ?? null}
      support={support}
    >
      {children}
    </DashboardChrome>
  );
}
