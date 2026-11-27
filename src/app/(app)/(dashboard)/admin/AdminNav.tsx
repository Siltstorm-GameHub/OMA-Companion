"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell, Briefcase, CalendarDays, ChevronDown, Clapperboard, Download, Gamepad2, Handshake, Heart, LayoutDashboard, LayoutGrid,
  Megaphone, Scale, Search, Server, Shield, ShoppingBag, Tv2, Users, X,
} from "@/components/icons";
import { usePolling } from "@/lib/usePolling";
import { useMediaQuery } from "@/lib/useMediaQuery";
import {
  EMPTY_COUNTS, activeAdminChild, activeAdminItem, isAdminItemActive, itemCount, searchAdminNav, visibleAdminNav,
  type AdminCounts, type AdminNavGroup, type AdminNavItem,
} from "@/lib/admin-nav";

const ICONS = {
  Bell, Briefcase, CalendarDays, Clapperboard, Download, Gamepad2, Handshake, Heart, LayoutDashboard, LayoutGrid,
  Megaphone, Scale, Server, Shield, ShoppingBag, Tv2, Users,
} as const;

function Icon({ name, className }: { name: string; className?: string }) {
  const C = ICONS[name as keyof typeof ICONS] ?? LayoutDashboard;
  return <C className={className} />;
}

function Count({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-xs font-bold text-black flex items-center justify-center tabular-nums">
      {n > 99 ? "99+" : n}
    </span>
  );
}

function ItemLink({ item, active, count, onNavigate }: { item: AdminNavItem; active: boolean; count: number; onNavigate?: () => void }) {
  return (
    <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
      className={`flex min-h-10 items-center gap-2.5 rounded-control px-2.5 text-sm transition-colors ${
        active ? "bg-primary-soft font-semibold text-primary-fg" : "text-gray-300 hover:text-fg hover:bg-surface-2"
      }`}>
      <Icon name={item.icon} className={`w-4 h-4 shrink-0 ${active ? "text-primary-fg" : "text-subtle"}`} />
      <span className="truncate">{item.label}</span>
      <Count n={count} />
    </Link>
  );
}

function NavList({ groups, pathname, counts, onNavigate }: { groups: AdminNavGroup[]; pathname: string; counts: AdminCounts; onNavigate?: () => void }) {
  const active = activeAdminItem(groups, pathname);
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.key}>
          {g.label && <p className="mb-1 px-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-subtle">{g.label}</p>}
          <ul className="space-y-0.5">
            {g.items.map((i) => {
              const isActive = active?.key === i.key || (!active && isAdminItemActive(i, pathname));
              const child = isActive ? activeAdminChild(i, pathname) : null;
              return (
                <li key={i.key}>
                  <ItemLink item={i} active={isActive} count={itemCount(i, counts)} onNavigate={onNavigate} />
                  {/* Unterseiten (z.B. Community-Jobs) klappen auf, sobald der Punkt aktiv ist */}
                  {isActive && i.children && (
                    <ul className="mt-0.5 mb-1 ml-[1.15rem] border-l border-line pl-2 space-y-0.5">
                      {i.children.map((c) => {
                        const on = child?.href === c.href;
                        return (
                          <li key={c.href}>
                            <Link href={c.href} onClick={onNavigate} aria-current={on ? "page" : undefined}
                              className={`block rounded-md px-2 py-1.5 text-xs transition-colors ${on ? "text-fg bg-surface-2" : "text-subtle hover:text-fg"}`}>
                              {c.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Schnellsuche über alle Admin-Seiten; Enter springt zum ersten Treffer. */
function SearchBox({ groups, counts, inputRef, onNavigate }: {
  groups: AdminNavGroup[]; counts: AdminCounts; inputRef: React.RefObject<HTMLInputElement | null>; onNavigate?: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const hits = searchAdminNav(groups, q);
  return (
    <div className="space-y-1">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && hits[0]) { router.push(hits[0].href); setQ(""); onNavigate?.(); }
            if (e.key === "Escape") { setQ(""); (e.target as HTMLInputElement).blur(); }
          }}
          placeholder="Seite suchen" aria-label="Admin-Seite suchen"
          className="w-full min-h-10 rounded-control bg-surface-2 border border-line pl-8 pr-12 py-1.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-primary" />
        <kbd className="hidden lg:block absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-600">Strg K</kbd>
      </div>
      {q.trim() && (
        <ul className="rounded-control border border-line bg-surface-2 p-1 space-y-0.5">
          {hits.length === 0
            ? <li className="px-2.5 py-1.5 text-xs text-gray-500">Nichts gefunden</li>
            : hits.map((i) => (
              <li key={i.key}><ItemLink item={i} active={false} count={itemCount(i, counts)} onNavigate={() => { setQ(""); onNavigate?.(); }} /></li>
            ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Admin-Navigation: Seitenleiste nach Aufgaben gruppiert (Übersicht · Twitch & Clips · Community ·
 * Inhalte · Einstellungen) mit Zählern offener Aufgaben und Schnellsuche (Strg+K). Auf dem Handy ein
 * Menü-Button mit dem aktuellen Seitennamen. Die Event-Verwaltung liegt unter /events/verwalten
 * (Punkt "Events verwalten"). Struktur und Rechte: lib/admin-nav.ts.
 */
export default function AdminNav({ role, placement = "page" }: {
  role: string;
  /** "page": nur der Menü-Knopf am Handy/Tablet (oben im Admin-Bereich). "sidebar": die Liste in der App-Seitenleiste (Desktop). */
  placement?: "page" | "sidebar";
}) {
  const pathname = usePathname();
  const groups = visibleAdminNav(role);
  const isStaff = role === "moderator" || role === "admin";
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  // Jede Darstellung lädt die Zähler nur, wenn sie gerade sichtbar ist (sonst doppelte Abfragen)
  const visible = placement === "sidebar" ? isDesktop : !isDesktop;
  const [counts, setCounts] = useState<AdminCounts>(EMPTY_COUNTS);
  const [open, setOpen] = useState(false);
  const desktopSearch = useRef<HTMLInputElement>(null);
  const mobileSearch = useRef<HTMLInputElement>(null);

  const loadCounts = useCallback(async () => {
    if (!isStaff || !visible) return;
    try {
      const res = await fetch("/api/admin/nav-counts", { cache: "no-store" });
      if (res.ok) setCounts(await res.json());
    } catch { /* Zähler sind nur ein Hinweis */ }
  }, [isStaff, visible]);
  usePolling(loadCounts, 60_000);

  const active = activeAdminItem(groups, pathname);

  // Tab-Titel, damit man mehrere offene Admin-Tabs unterscheiden kann
  useEffect(() => {
    if (placement === "page") document.title = `${active?.label ?? "Admin"} · Admin`;
  }, [active?.label, placement]);

  // Strg/Cmd+K: Suche fokussieren (Handy: Menü öffnen)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const desktop = window.matchMedia("(min-width: 1024px)").matches;
        if (placement === "sidebar" && desktop) desktopSearch.current?.focus();
        if (placement === "page" && !desktop) { setOpen(true); setTimeout(() => mobileSearch.current?.focus(), 0); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [placement]);

  if (!isStaff) return null;
  const total = itemCount({ key: "all", href: "", label: "", icon: "", minRole: "moderator",
    counts: ["eventActions", "eventApprovals", "serverApplications", "gameSuggestions", "jobDisputes"] }, counts);

  // Desktop: Liste in der App-Seitenleiste (components/shell/Sidebar.tsx)
  if (placement === "sidebar") {
    return (
      <nav aria-label="Admin-Bereich" className="space-y-4">
        <SearchBox groups={groups} counts={counts} inputRef={desktopSearch} />
        <NavList groups={groups} pathname={pathname} counts={counts} />
      </nav>
    );
  }

  return (
    <>
      {/* ── Handy/Tablet: Menü-Button mit aktuellem Seitennamen ── */}
      <div className="lg:hidden mb-4">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
          className="w-full min-h-11 flex items-center gap-2.5 rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-fg">
          <Icon name={active?.icon ?? "LayoutDashboard"} className="w-4 h-4 text-primary-fg" />
          <span className="flex-1 text-left truncate">{active?.label ?? "Admin"}</span>
          {total > 0 && <span className="rounded-full bg-amber-400 px-1.5 text-xs font-bold text-black tabular-nums">{total}</span>}
          {open ? <X className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {open && (
          <div className="mt-2 rounded-card border border-line bg-surface p-2 space-y-3">
            <SearchBox groups={groups} counts={counts} inputRef={mobileSearch} onNavigate={() => setOpen(false)} />
            <NavList groups={groups} pathname={pathname} counts={counts} onNavigate={() => setOpen(false)} />
          </div>
        )}
      </div>

    </>
  );
}
