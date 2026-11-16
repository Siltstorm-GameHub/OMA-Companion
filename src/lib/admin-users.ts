/*
 * Admin "Nutzer & Rollen": Suche, Filter und Sortierung der Mitgliederliste.
 * Rein und client-sicher (keine Server-Importe).
 */

export type AdminUserRow = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  image: string | null;
  role: string;
  points: number;
  rankPoints: number;
  discordId: string | null;
  hasLogin: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  leftServerAt: string | null;
  eventCount: number;
};

export type UserFilter = "all" | "team" | "active" | "never" | "left";
export type UserSort = "recent" | "name" | "coins" | "events";

export const USER_FILTERS: { key: UserFilter; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "team", label: "Team" },
  { key: "active", label: "Aktiv 30 Tage" },
  { key: "never", label: "Nie eingeloggt" },
  { key: "left", label: "Ausgetreten" },
];

export const USER_SORTS: { key: UserSort; label: string }[] = [
  { key: "recent", label: "Zuletzt aktiv" },
  { key: "name", label: "Name" },
  { key: "coins", label: "Münzen" },
  { key: "events", label: "Events" },
];

export const ROLE_INFO: Record<string, { label: string; rights: string }> = {
  user: { label: "Mitglied", rights: "Normale Rechte: eigene Events im Rahmen der Limits, Ergebnisse melden, Shop." },
  moderator: { label: "Moderator", rights: "Verwaltet alle Events, moderiert Clips, Jobs und Spieleliste. Keine Einstellungen, Rollen oder Münzen." },
  admin: { label: "Admin", rights: "Voller Zugriff: Rollen, Münzen, Shop, Benachrichtigungen und alle Einstellungen." },
};

export const displayName = (u: Pick<AdminUserRow, "username" | "name">) => u.username ?? u.name ?? "–";

const DAY = 86_400_000;

export function matchesFilter(u: AdminUserRow, f: UserFilter, now: number): boolean {
  switch (f) {
    case "all": return true;
    case "team": return u.role === "moderator" || u.role === "admin";
    case "active": return !u.leftServerAt && !!u.lastLoginAt && now - new Date(u.lastLoginAt).getTime() <= 30 * DAY;
    case "never": return !u.hasLogin && !u.leftServerAt;
    case "left": return !!u.leftServerAt;
  }
}

export function filterCounts(users: AdminUserRow[], now: number): Record<UserFilter, number> {
  return Object.fromEntries(USER_FILTERS.map(({ key }) => [key, users.filter((u) => matchesFilter(u, key, now)).length])) as Record<UserFilter, number>;
}

const norm = (s: string) => s.toLocaleLowerCase("de").normalize("NFD").replace(/[̀-ͯ]/g, "");

export function matchesQuery(u: AdminUserRow, q: string): boolean {
  const n = norm(q.trim());
  if (!n) return true;
  return [u.username, u.name, u.email, u.discordId].some((v) => !!v && norm(v).includes(n));
}

export function sortUsers(users: AdminUserRow[], sort: UserSort): AdminUserRow[] {
  const byName = (a: AdminUserRow, b: AdminUserRow) => displayName(a).localeCompare(displayName(b), "de");
  const t = (d: string | null) => (d ? new Date(d).getTime() : -Infinity);
  return [...users].sort((a, b) => {
    switch (sort) {
      case "recent": return t(b.lastLoginAt) - t(a.lastLoginAt) || byName(a, b);
      case "name": return byName(a, b);
      case "coins": return b.points - a.points || byName(a, b);
      case "events": return b.eventCount - a.eventCount || byName(a, b);
    }
  });
}

/** Suche + Filter + Sortierung in einem Schritt */
export function visibleUsers(users: AdminUserRow[], { query, filter, sort, now }: { query: string; filter: UserFilter; sort: UserSort; now: number }) {
  return sortUsers(users.filter((u) => matchesFilter(u, filter, now) && matchesQuery(u, query)), sort);
}

/** "vor 2 Std", "gestern", "vor 5 Wochen", "nie" */
export function relativeSince(iso: string | null, now: number): string {
  if (!iso) return "nie";
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (min < 60) return min <= 1 ? "gerade eben" : `vor ${min} Min`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std`;
  const d = Math.floor(h / 24);
  if (d === 1) return "gestern";
  if (d < 14) return `vor ${d} Tagen`;
  if (d < 60) return `vor ${Math.round(d / 7)} Wochen`;
  return `vor ${Math.round(d / 30)} Monaten`;
}
