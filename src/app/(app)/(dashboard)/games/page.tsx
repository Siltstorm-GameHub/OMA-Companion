// ============================================
// /games — Übersicht des Games-Bereichs: die beiden OMA-Produkte nebeneinander (OMA GameSwipe, OMA Blocks)
// mit Live-Stand und Hauptaktion, darunter kompakt Shop (Münzstand) und Glücksrad.
// ============================================
// "Games" in der Navigation öffnet diese Seite. GameSwipe liegt unter /spiele, Blocks unter /games/blocks,
// der Shop unter /shop. Bis 2026-11 lag hier direkt OMA Blocks (Benachrichtigungen mit "/games" landen jetzt hier).

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { buildSwipeDeck } from "@/lib/games/deck";
import { getBlocksPlace } from "@/lib/blocks/scores";
import { getActiveTournaments } from "@/lib/blocks/tournament";
import { seasonDaysLeft, seasonKey, seasonLabel } from "@/lib/month-season";
import { spinDateKey } from "@/lib/daily-spin";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonClasses } from "@/components/ui/button-styles";
import GamesSectionTabs from "@/components/games/GamesSectionTabs";
import OmaWordmark, { OMA_PRODUCTS } from "@/components/OmaWordmark";
import GameCover from "@/components/GameCover";
import CoinIcon from "@/components/CoinIcon";
import { ChevronRight, Play, ShoppingBag } from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Games | OMA",
  description: "OMA GameSwipe und OMA Blocks — Spiele entdecken und gegeneinander antreten.",
};

const fmt = (n: number) => n.toLocaleString("de-DE");

/** Deko für die Blocks-Karte: ein paar Steine in Violett-Tönen (kein Bild-Asset nötig) */
const BLOCK_ART: { x: number; y: number; c: string }[] = [
  { x: 0, y: 3, c: "#7c3aed" }, { x: 1, y: 3, c: "#7c3aed" }, { x: 2, y: 3, c: "#a78bfa" }, { x: 3, y: 3, c: "#a78bfa" },
  { x: 5, y: 3, c: "#c4b5fd" }, { x: 6, y: 3, c: "#8b5cf6" }, { x: 7, y: 3, c: "#8b5cf6" },
  { x: 0, y: 2, c: "#8b5cf6" }, { x: 1, y: 2, c: "#c4b5fd" }, { x: 3, y: 2, c: "#7c3aed" }, { x: 6, y: 2, c: "#a78bfa" }, { x: 7, y: 2, c: "#a78bfa" },
  { x: 4, y: 0, c: "#ddd6fe" }, { x: 4, y: 1, c: "#ddd6fe" }, { x: 5, y: 1, c: "#ddd6fe" }, { x: 5, y: 2, c: "#ddd6fe" },
];

export default async function GamesOverviewPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login?notice=login_required&callbackUrl=/games");

  const season = seasonKey();
  const [deck, gameCount, place, tournaments, user, todaySpin] = await Promise.all([
    buildSwipeDeck(me.id, 3).catch(() => null),
    prisma.game.count({ where: { status: "APPROVED" } }),
    getBlocksPlace(me.id, season),
    getActiveTournaments().catch(() => []),
    prisma.user.findUnique({ where: { id: me.id }, select: { points: true } }),
    prisma.dailySpin.findUnique({ where: { userId_date: { userId: me.id, date: spinDateKey() } } }).catch(() => null),
  ]);
  const daysLeft = seasonDaysLeft();
  const covers = (deck?.cards ?? []).slice(0, 3);
  const toSwipe = deck?.remaining ?? 0;

  return (
    <div className="px-5 pb-5 pt-0 sm:p-6 max-w-5xl mx-auto w-full min-w-0 space-y-5 animate-fade-in">
      <GamesSectionTabs active="uebersicht" />
      <PageHeader title="Games" description="Unsere eigenen Spiele: neue Games für eure Runde finden — oder in Blocks um den Monatssieg spielen." />

      <div className="grid gap-4 md:grid-cols-2">
        {/* ── OMA GameSwipe ── */}
        <section aria-labelledby="gs-title" className="relative flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <div className="relative h-36 overflow-hidden"
            style={{ background: `radial-gradient(120% 90% at 80% 0%, ${OMA_PRODUCTS.gameSwipe.color}33, transparent 70%)` }}>
            {/* Cover-Fächer: die nächsten Karten im eigenen Stapel */}
            <div className="absolute inset-x-0 bottom-0 flex justify-center">
              {covers.length > 0 ? covers.map((c, i) => (
                <div key={i} className="relative -mx-3 w-28 origin-bottom shadow-pop"
                  style={{ transform: `rotate(${(i - (covers.length - 1) / 2) * 9}deg) translateY(${i === 1 ? -6 : 10}px)`, zIndex: i === 1 ? 2 : 1 }}>
                  <GameCover game={c.name} coverUrl={c.coverUrl} className="w-28 h-36" rounded="rounded-control" fallbackVariant="plain" />
                </div>
              )) : (
                <div className="mb-6 text-5xl" aria-hidden>🃏</div>
              )}
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
            <h2 id="gs-title"><OmaWordmark product="gameSwipe" size="md" /></h2>
            <p className="text-sm text-muted">Wisch dich durch die Spiele: am Start, würde ich holen oder nicht meins. So findet ihr Mitspieler und das nächste Gruppen-Game.</p>
            <p className="text-sm text-fg">
              {toSwipe > 0
                ? <><b className="tabular-nums">{fmt(toSwipe)}</b> {toSwipe === 1 ? "Spiel wartet" : "Spiele warten"} auf deine Entscheidung</>
                : <>Alles gewischt · <b className="tabular-nums">{fmt(gameCount)}</b> Spiele in der Liste</>}
              {deck?.drop && deck.drop.open > 0 && <span className="text-subtle"> · Drop der Woche: {deck.drop.open} offen</span>}
            </p>
            <div className="mt-auto flex flex-wrap gap-2 pt-1">
              <Link href="/spiele" className={buttonClasses("primary", "md")}>{toSwipe > 0 ? "Jetzt wischen" : "GameSwipe öffnen"}</Link>
              <Link href="/spiele?ansicht=liste" className={buttonClasses("secondary", "md")}>Alle Spiele</Link>
            </div>
          </div>
        </section>

        {/* ── OMA Blocks ── */}
        <section aria-labelledby="bl-title" className="relative flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <div className="relative h-36 overflow-hidden"
            style={{ background: `radial-gradient(120% 90% at 20% 0%, ${OMA_PRODUCTS.blocks.color}33, transparent 70%)` }}>
            <div className="absolute bottom-3 left-1/2 grid -translate-x-1/2 grid-cols-8 gap-1" aria-hidden>
              {Array.from({ length: 32 }, (_, i) => {
                const b = BLOCK_ART.find(a => a.x === i % 8 && a.y === Math.floor(i / 8));
                return <span key={i} className="size-6 rounded-[5px]" style={b ? { background: b.c, boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.25)" } : undefined} />;
              })}
            </div>
            {tournaments.length > 0 && (
              <span className="absolute right-3 top-3 rounded-full bg-live px-2.5 py-0.5 text-xs font-bold text-canvas">Live-Turnier</span>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
            <h2 id="bl-title"><OmaWordmark product="blocks" size="md" /></h2>
            <p className="text-sm text-muted">Das Community-Spiel der Old Masters Allies: Solo-Marathon um den Monatssieg, Versus gegeneinander und Live-Turniere.</p>
            <p className="text-sm text-fg">
              {place ? <>Dein Platz im {seasonLabel(season)}: <b className="tabular-nums">#{place.place}</b> · {fmt(place.score)} Punkte</> : <>Im {seasonLabel(season)} noch keine Runde gespielt</>}
              <span className="text-subtle"> · noch {daysLeft} {daysLeft === 1 ? "Tag" : "Tage"}</span>
            </p>
            <div className="mt-auto flex flex-wrap gap-2 pt-1">
              <Link href="/games/blocks/solo" className={buttonClasses("primary", "md")}><Play className="size-4" /> Spielen</Link>
              <Link href="/games/blocks" className={buttonClasses("secondary", "md")}>Versus &amp; Ranglisten</Link>
            </div>
          </div>
        </section>
      </div>

      {/* ── Shop + Glücksrad ── */}
      <Link href={todaySpin ? "/shop" : "/shop#gluecksrad"}
        className="group flex items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong">
        <span className="grid size-10 shrink-0 place-items-center rounded-control bg-coin-soft text-coin"><ShoppingBag className="size-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-semibold text-fg">
            Shop
            <span className="inline-flex items-center gap-1 text-coin tabular-nums"><CoinIcon size={14} /> {fmt(user?.points ?? 0)}</span>
          </span>
          <span className="block truncate text-xs text-muted">
            {todaySpin ? "Glücksrad heute schon gedreht · Rahmen, Auren, Titel und mehr" : "Glücksrad: heute noch frei — dreh für Münzen und Preise"}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
