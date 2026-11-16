// Client-sicher: nur Konstanten und reine Funktionen (kein prisma) — genutzt von der Admin-Seitenleiste
// (app/(app)/(dashboard)/admin/AdminNav.tsx) und serverseitig von den Zählern (lib/admin-inbox.ts).

export type AdminRole = "user" | "moderator" | "admin";

/** Schlüssel der offenen Aufgaben, die als Zähler an Menüpunkten hängen */
export type AdminCountKey = "eventActions" | "eventApprovals" | "serverApplications" | "gameSuggestions" | "jobDisputes";
export type AdminCounts = Record<AdminCountKey, number>;

export const EMPTY_COUNTS: AdminCounts = {
  eventActions: 0, eventApprovals: 0, serverApplications: 0, gameSuggestions: 0, jobDisputes: 0,
};

export type AdminNavChild = { href: string; label: string };

export type AdminNavItem = {
  key: string;
  href: string;
  label: string;
  /** Icon-Name aus components/icons (in AdminNav aufgelöst) */
  icon: string;
  minRole: AdminRole;
  /** Nur bei exakt gleicher URL aktiv (Übersicht) */
  exact?: boolean;
  /** Weitere URL-Präfixe, bei denen der Punkt aktiv ist */
  alsoActive?: string[];
  /** Zähler offener Aufgaben, die an diesem Punkt hängen */
  counts?: AdminCountKey[];
  /** Zusätzliche Suchbegriffe für die Schnellsuche */
  keywords?: string[];
  /** Unterseiten — klappen in der Seitenleiste auf, sobald der Punkt aktiv ist */
  children?: AdminNavChild[];
};

export type AdminNavGroup = { key: string; label: string | null; items: AdminNavItem[] };

const JOBS = "/admin/community-jobs";

/*
 * Tagesarbeit oben, selten genutzte Einstellungen unten. Die Event-Verwaltung liegt nicht mehr im
 * Admin-Bereich, sondern unter Events → "Verwalten" (/events/verwalten) — der Punkt hier führt dorthin.
 */
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    key: "start", label: null, items: [
      { key: "overview", href: "/admin", label: "Übersicht", icon: "LayoutDashboard", minRole: "moderator", exact: true,
        counts: ["eventActions", "eventApprovals", "serverApplications", "gameSuggestions", "jobDisputes"], keywords: ["dashboard", "aufgaben"] },
      { key: "events", href: "/events/verwalten", label: "Events verwalten", icon: "CalendarDays", minRole: "moderator",
        counts: ["eventActions", "eventApprovals"], keywords: ["turnier", "freigabe", "abschluss", "eventreihe", "saison"] },
    ],
  },
  {
    key: "twitch", label: "Twitch & Clips", items: [
      { key: "votes", href: "/admin/highlight-clips", label: "Abstimmungen", icon: "Clapperboard", minRole: "moderator",
        keywords: ["highlight", "clip des monats", "clip des jahres"] },
      { key: "overlay", href: "/admin/overlay-clips", label: "Overlay-Clips", icon: "Tv2", minRole: "moderator", keywords: ["stream"] },
      { key: "partners", href: "/admin/partners", label: "Partner", icon: "Handshake", minRole: "moderator", keywords: ["twitch", "kanal"] },
    ],
  },
  {
    key: "community", label: "Community", items: [
      { key: "users", href: "/admin/users", label: "Nutzer & Rollen", icon: "Users", minRole: "admin", keywords: ["mitglieder", "münzen", "rollen"] },
      { key: "squads", href: "/admin/squads", label: "Squads", icon: "Shield", minRole: "moderator" },
      { key: "jobs", href: JOBS, label: "Community-Jobs", icon: "Briefcase", minRole: "moderator",
        counts: ["jobDisputes"], keywords: ["moderation", "auszahlung", "einspruch", "auffälligkeiten"],
        children: [
          { href: JOBS, label: "Verwaltung" },
          { href: `${JOBS}/moderation`, label: "Moderation" },
          { href: `${JOBS}/auszahlungen`, label: "Auszahlungen" },
          { href: `${JOBS}/auffaelligkeiten`, label: "Auffälligkeiten" },
          { href: `${JOBS}/protokoll`, label: "Protokoll" },
          { href: `${JOBS}/texte`, label: "Job-Texte" },
          { href: `${JOBS}/ideas`, label: "Ideen" },
        ] },
      { key: "donations", href: "/admin/donations", label: "Spendenpool", icon: "Heart", minRole: "moderator", keywords: ["spende", "fixkosten"] },
    ],
  },
  {
    key: "content", label: "Inhalte", items: [
      { key: "games", href: "/admin/spiele", label: "Spieleliste", icon: "Gamepad2", minRole: "moderator", counts: ["gameSuggestions"], keywords: ["vorschlag"] },
      { key: "servers", href: "/admin/servers", label: "Gameserver", icon: "Server", minRole: "moderator", counts: ["serverApplications"], keywords: ["bewerbung"] },
      { key: "messages", href: "/admin/daily-message", label: "Mitteilungen & Umfragen", icon: "Megaphone", minRole: "admin", keywords: ["tagesnachricht"] },
    ],
  },
  {
    key: "settings", label: "Einstellungen", items: [
      { key: "limits", href: "/admin/community-limits", label: "Regeln & Limits", icon: "Scale", minRole: "moderator",
        keywords: ["community-limits", "endwertung", "mengenlimit"] },
      { key: "notifications", href: "/admin/notifications", label: "Benachrichtigungen", icon: "Bell", minRole: "admin", keywords: ["discord", "regeln"] },
      { key: "shop", href: "/admin/shop", label: "Shop & Glücksrad", icon: "ShoppingBag", minRole: "admin", keywords: ["kosmetik", "preise"] },
      { key: "blocks", href: "/admin/minigames", label: "OMA Blocks", icon: "LayoutGrid", minRole: "admin", keywords: ["minigames", "monatsziele"] },
    ],
  },
];

const HIERARCHY: AdminRole[] = ["user", "moderator", "admin"];
export function hasAdminRole(role: string, min: AdminRole): boolean {
  return HIERARCHY.indexOf(role as AdminRole) >= HIERARCHY.indexOf(min);
}

/** Nur die Gruppen und Punkte, die diese Rolle sehen darf; leere Gruppen fallen weg. */
export function visibleAdminNav(role: string): AdminNavGroup[] {
  return ADMIN_NAV
    .map((g) => ({ ...g, items: g.items.filter((i) => hasAdminRole(role, i.minRole)) }))
    .filter((g) => g.items.length > 0);
}

/** Aktive Unterseite eines Punkts (längster passender Pfad) */
export function activeAdminChild(item: AdminNavItem, pathname: string): AdminNavChild | null {
  let best: AdminNavChild | null = null;
  for (const c of item.children ?? []) {
    const hit = c.href === item.href ? pathname === c.href : pathname === c.href || pathname.startsWith(`${c.href}/`);
    if (hit && (!best || c.href.length > best.href.length)) best = c;
  }
  return best;
}

export function isAdminItemActive(item: AdminNavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`) || !!item.alsoActive?.some((p) => pathname.startsWith(p));
}

/** Aktiver Menüpunkt — der mit dem längsten passenden Pfad gewinnt. */
export function activeAdminItem(groups: AdminNavGroup[], pathname: string): AdminNavItem | null {
  let best: AdminNavItem | null = null;
  for (const g of groups) for (const i of g.items) {
    if (isAdminItemActive(i, pathname) && (!best || i.href.length > best.href.length)) best = i;
  }
  return best;
}

export function itemCount(item: AdminNavItem, counts: AdminCounts): number {
  return (item.counts ?? []).reduce((s, k) => s + (counts[k] ?? 0), 0);
}

/** Schnellsuche: Treffer in Name, Gruppe und Suchbegriffen (ohne Groß/Klein, ohne Umlaut-Probleme). */
export function searchAdminNav(groups: AdminNavGroup[], query: string): AdminNavItem[] {
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const q = norm(query.trim());
  if (!q) return [];
  return groups.flatMap((g) => g.items.filter((i) =>
    [i.label, g.label ?? "", ...(i.keywords ?? [])].some((s) => norm(s).includes(q)),
  ));
}
