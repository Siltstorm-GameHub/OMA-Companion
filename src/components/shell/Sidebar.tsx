"use client";

import { useOfficeCount } from "@/components/community/OfficeCountBadge";
import { useRoadmapNew } from "@/components/community/RoadmapNewDot";
import OmaWordmark from "@/components/OmaWordmark";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Heart, Rocket } from "@/components/icons";
import { GateLink } from "@/components/GuestGate";
import PollBadge from "@/components/PollBadge";
import AdminNav from "@/app/(app)/(dashboard)/admin/AdminNav";
import { HUB_ONLINE_EVENT, readHubOnline, toggleHub } from "@/lib/hub-events";
import { cn } from "@/lib/utils";
import { COMMUNITY_NAV, MAIN_NAV, isActive, isChildActive, type NavItem } from "./nav-config";
import { LiveNow } from "./LiveNow";

/** Spendenpool-Fortschritt für die Support-Karte (berechnet im Dashboard-Layout). */
export type SupportProgress = { label: string; percent: number };
/** Für alle gleich (gecacht): Spendenpool-Stand, Spender diesen Monat, zuletzt Umgesetztes auf der Roadmap */
export type SupportGlobal = {
  progress: SupportProgress | null;
  supportersThisMonth: number;
  latestDone: { title: string; href: string } | null;
};
/** + ob die angemeldete Person schon gespendet hat */
export type SupportView = SupportGlobal & { donor: boolean };

/**
 * Seitenleiste am Desktop (ab lg): Menü · Community · Gerade live · Support-Karte.
 * Im Admin-Bereich steht hier stattdessen die Admin-Navigation mit "Zurück zur App".
 */
export function Sidebar({ support }: { support: SupportView }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "user";
  const inAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-line bg-sidebar px-3.5 py-5 lg:flex">
      <div className="space-y-2">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2" aria-label="OMA – zur Übersicht">
          <Image src="/brand/logo-64.png" alt="" width={36} height={36} className="rounded-control" />
          <span className="text-lg font-extrabold tracking-wide text-fg">OLD MASTERS</span>
        </Link>
        {!inAdmin && <OnlineCount />}
      </div>

      {inAdmin ? (
        <>
          <Link
            href="/dashboard"
            className="flex min-h-10 items-center gap-2 rounded-control border border-line px-2.5 text-sm font-semibold text-muted hover:border-line-strong hover:text-fg"
          >
            <ArrowLeft className="size-4" aria-hidden /> Zurück zur App
          </Link>
          <AdminNav role={role} placement="sidebar" />
        </>
      ) : (
        <>
          <NavSection title="Menü" items={MAIN_NAV} pathname={pathname} label="Hauptnavigation" />
          <NavSection title="Community" items={COMMUNITY_NAV} pathname={pathname} label="Community" />
          <LiveNow />
          <SupportRotator active={pathname.startsWith("/hub")} support={support} pathname={pathname} />
        </>
      )}
    </aside>
  );
}

function NavSection(props: { title: string; items: NavItem[]; pathname: string; label: string }) {
  const { status } = useSession();
  const loggedIn = status === "authenticated";
  // Zahl am Untermenü "Verwalten" — nur nachladen, wenn der Events-Bereich offen ist
  const eventsOpen = props.items.some(i => i.children?.some(c => c.count === "eventManage") && isActive(props.pathname, i));
  const [manageCount, setManageCount] = useState(0);
  // Zahl am Untermenü "Büro" des Community-Boards — nur, wenn das Board offen ist
  const boardOpen = props.items.some(i => i.children?.some(c => c.count === "boardOffice") && isActive(props.pathname, i));
  const officeCount = useOfficeCount(boardOpen && loggedIn);
  const roadmapNew = useRoadmapNew(boardOpen && loggedIn);
  useEffect(() => {
    if (!eventsOpen || !loggedIn) return;
    let cancelled = false;
    fetch("/api/events/manage-count").then(r => (r.ok ? r.json() : null)).then(d => { if (!cancelled && d) setManageCount(d.count ?? 0); }).catch(() => {});
    return () => { cancelled = true; };
  }, [eventsOpen, loggedIn, props.pathname]);

  return (
    <nav aria-label={props.label} className="flex flex-col gap-0.5">
      <p className="mb-1.5 px-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-subtle">{props.title}</p>
      {props.items.map((item) => {
        const active = isActive(props.pathname, item);
        const children = active ? (item.children ?? []).filter(c => loggedIn || !c.auth) : [];
        return (
          <div key={item.href}>
          <GateLink
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-2.5 rounded-control px-2.5 text-[0.9375rem] transition-colors",
              active ? "bg-primary-soft font-semibold text-primary-fg" : "text-gray-300 hover:bg-surface-2 hover:text-fg",
            )}
          >
            <span className="relative inline-flex">
              <item.icon className="size-[1.125rem]" aria-hidden />
              {item.pollBadge && <PollBadge />}
            </span>
            {item.label}
          </GateLink>
          {/* Unterseiten des aktiven Bereichs (statt Reitern oben auf der Seite) */}
          {children.length > 0 && (
            <ul className="mb-1 ml-[1.375rem] mt-0.5 space-y-0.5 border-l border-line pl-2.5">
              {children.map((c) => {
                const on = isChildActive(props.pathname, c);
                const n = c.count === "eventManage" ? manageCount : c.count === "boardOffice" ? officeCount : 0;
                return (
                  <li key={c.href}>
                    <GateLink href={c.href} aria-current={on ? "page" : undefined}
                      className={cn(
                        "flex min-h-9 items-center gap-2 rounded-control px-2.5 text-sm transition-colors",
                        on ? "bg-surface-2 font-semibold text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
                      )}>
                      {c.brand
                        ? <span className="flex-1 truncate"><OmaWordmark product={c.brand} size="xs" plainName={!on} /></span>
                        : <span className="flex-1 truncate">{c.label}</span>}
                      {c.count === "roadmapNew" && roadmapNew && !on && <span className="size-2 rounded-full bg-primary" aria-label="Neu seit deinem letzten Besuch" />}
                      {n > 0 && (
                        <span className="min-w-5 rounded-full bg-warning px-1.5 text-center text-xs font-bold leading-5 tabular-nums text-canvas" aria-label={`${n} offen`}>
                          {n > 99 ? "99+" : n}
                        </span>
                      )}
                    </GateLink>
                  </li>
                );
              })}
            </ul>
          )}
          </div>
        );
      })}
    </nav>
  );
}

/** "12 online" — Zahl kommt vom Community-Hub (Presence), ein Klick öffnet dessen Panel. */
function OnlineCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Startwert, falls der Hub schon gemeldet hat
    setCount(readHubOnline());
    const on = (e: Event) => setCount((e as CustomEvent<number>).detail);
    window.addEventListener(HUB_ONLINE_EVENT, on);
    return () => window.removeEventListener(HUB_ONLINE_EVENT, on);
  }, []);
  if (count <= 0) return null;
  return (
    <button
      type="button"
      onClick={toggleHub}
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-muted hover:bg-surface-2 hover:text-fg max-lg:min-h-10"
    >
      <span className="size-1.5 rounded-full bg-success" aria-hidden />
      {count} online
    </button>
  );
}

/**
 * Support-Karte unten in der Seitenleiste — bewusst kompakt: eine Zeile mit Herz, Ziel und Prozent, darunter ein
 * schmaler Balken. Die ganze Karte ist der Link (kein eigener Knopf, der mit den Hauptaktionen der Seite konkurriert).
 * Bei wenig Bildschirmhöhe nur Herz + Balken. Wer schon gespendet hat, sieht einen Dank statt einer Aufforderung.
 */
const ROTATE_MS = 9000;
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

/**
 * Unten in der Seitenleiste: abwechselnd das Spendenziel (mit "Danke an N Unterstützer") und das zuletzt auf der
 * Roadmap Umgesetzte — damit sichtbar wird, was mit der Unterstützung passiert. Wechsel alle 9 s, pausiert bei
 * Hover/Fokus; bei "Bewegung reduzieren" nur beim Seitenwechsel. Punkte darunter zum direkten Umschalten.
 */
function SupportRotator({ active, support, pathname }: { active: boolean; support: SupportView; pathname: string }) {
  const slides = support.latestDone ? (["support", "done"] as const) : (["support"] as const);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  // Im Takt wechseln (nicht bei "Bewegung reduzieren", nicht während Hover/Fokus)
  useEffect(() => {
    if (count < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIndex(i => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(t);
  }, [count, paused]);
  // Bei "Bewegung reduzieren": beim Seitenwechsel weiterblättern (nicht schon beim ersten Laden)
  const firstPath = useRef(pathname);
  useEffect(() => {
    if (count < 2 || pathname === firstPath.current || !window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    firstPath.current = "";
    setIndex(i => (i + 1) % count);
  }, [pathname, count]);

  const slide = slides[index % count];
  return (
    <div className="mt-auto" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div key={slide} className="animate-fade-in">
        {slide === "done" && support.latestDone
          ? <DoneCard done={support.latestDone} />
          : <SupportCard active={active} support={support} />}
      </div>
      {count > 1 && (
        <div className="mt-1.5 flex justify-center gap-1" role="group" aria-label="Hinweis wechseln">
          {slides.map((s, i) => (
            <button key={s} type="button" onClick={() => setIndex(i)} aria-label={s === "done" ? "Neu umgesetzt" : "Spendenziel"} aria-pressed={i === index % count}
              className="grid size-5 place-items-center">
              <span className={cn("block h-1.5 rounded-full transition-all", i === index % count ? "w-4 bg-muted" : "w-1.5 bg-line-strong")} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Roadmap: zuletzt Umgesetztes ("Neu: …") */
function DoneCard({ done }: { done: { title: string; href: string } }) {
  return (
    <GateLink href={done.href} aria-label={`Neu umgesetzt: ${done.title}`}
      className="group block rounded-card border border-line bg-surface px-3 py-2.5 transition-colors hover:border-line-strong">
      <span className="flex items-center gap-2">
        <Rocket className="size-4 shrink-0 text-success" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-fg [@media(max-height:760px)]:sr-only">Neu umgesetzt</span>
      </span>
      <span className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted">
        <span className="truncate">{done.title}</span>
        <span className="shrink-0 text-subtle transition-colors group-hover:text-fg">→</span>
      </span>
    </GateLink>
  );
}

function SupportCard({ active, support }: { active: boolean; support: SupportView }) {
  const { progress, donor, supportersThisMonth } = support;
  const title = donor ? "Du unterstützt OMA" : "OMA unterstützen";
  return (
    <GateLink
      href="/hub"
      aria-current={active ? "page" : undefined}
      aria-label={progress ? `${title} — ${progress.label} zu ${progress.percent} % gedeckt` : title}
      className={cn(
        "group block rounded-card border px-3 py-2.5 transition-colors",
        donor ? "border-success/30 bg-success-soft hover:border-success/50" : "border-line bg-surface hover:border-line-strong",
        active && "border-primary/40",
      )}
    >
      <span className="flex items-center gap-2">
        <Heart className={cn("size-4 shrink-0", donor ? "text-success" : "text-live")} aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-fg [@media(max-height:760px)]:sr-only">{title}</span>
        {progress && <span className="shrink-0 text-xs font-bold tabular-nums text-fg">{progress.percent} %</span>}
      </span>
      {progress ? (
        <>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
            <span className={cn("block h-full rounded-full", donor ? "bg-success" : "bg-primary")} style={{ width: `${progress.percent}%` }} />
          </span>
          <span className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted [@media(max-height:760px)]:hidden">
            <span className="truncate">{donor ? `Aktuelles Ziel: ${progress.label}` : progress.label}</span>
            <span className="shrink-0 text-subtle transition-colors group-hover:text-fg">→</span>
          </span>
          {supportersThisMonth > 0 && (
            <span className="mt-0.5 block truncate text-xs text-subtle [@media(max-height:760px)]:hidden"
              title={`${supportersThisMonth} Unterstützer im ${MONTHS[new Date().getMonth()]}`}>
              Danke an {supportersThisMonth} Unterstützer 💚
            </span>
          )}
        </>
      ) : (
        <span className="mt-1 block text-xs leading-relaxed text-muted [@media(max-height:760px)]:hidden">
          {donor ? "Server, Preise und Events laufen auch dank dir." : "Server, Preise und Events laufen über den Spendenpool."}
        </span>
      )}
    </GateLink>
  );
}
