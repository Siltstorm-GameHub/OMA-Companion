import type { LucideIcon } from "lucide-react";
import {
  Bell, CalendarDays, Clapperboard, Coins, Gamepad2, Handshake, Home, Lightbulb, ScrollText, Server, ShoppingBag, Trophy, User, Users,
} from "@/components/icons";

/**
 * Navigation nach dem Designentwurf (OMA 2.0, docs/specs/00-design.md): eine Gliederung, zwei
 * Darstellungen. Desktop = Seitenleiste (MAIN + COMMUNITY), Handy = untere Leiste (MOBILE).
 *
 * Die URLs bleiben die der laufenden App (/dashboard, /leaderboard, /profile …), weil Bot-Nachrichten,
 * Push-Mitteilungen und geteilte Links darauf zeigen. "Werkbank" und "Ideen-Board" aus dem Entwurf
 * sind hier zusammen das Community-Board; eine eigene Turnier-Liste gibt es nicht (Turniere = Events).
 */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Weitere Pfade, bei denen dieser Eintrag als aktiv gilt (Unterseiten mit anderem Präfix). */
  alsoActiveOn?: string[];
  /** Abzeichen für offene Umfragen anzeigen (nur Events). */
  pollBadge?: boolean;
}

const CLIP_PATHS = ["/clip-des-monats", "/clip-des-jahres"];
const COMMUNITY_BOARD_PATHS = ["/interviews"];

export const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Übersicht", icon: Home },
  { href: "/events", label: "Events", icon: CalendarDays, alsoActiveOn: ["/tournament"], pollBadge: true },
  { href: "/spiele", label: "Games", icon: Gamepad2, alsoActiveOn: ["/games", "/shop"] },
  { href: "/leaderboard", label: "Rangliste", icon: Trophy },
];

export const COMMUNITY_NAV: NavItem[] = [
  { href: "/community-board", label: "Community-Board", icon: Lightbulb, alsoActiveOn: COMMUNITY_BOARD_PATHS },
  { href: "/squads", label: "Squads", icon: Users },
  { href: "/clip-galerie", label: "Clips", icon: Clapperboard, alsoActiveOn: CLIP_PATHS },
  { href: "/servers", label: "Gameserver", icon: Server },
];

/** Persönliche Bereiche: am Desktop im Avatar-Menü, am Handy unter "Ich". */
export const ME_NAV: NavItem[] = [
  { href: "/profile", label: "Mein Profil", icon: User },
  { href: "/quests", label: "Quests", icon: ScrollText },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/points", label: "Münzen-Verlauf", icon: Coins },
  { href: "/benachrichtigungen", label: "Benachrichtigungen", icon: Bell },
];

export const MOBILE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Übersicht", icon: Home },
  { href: "/events", label: "Events", icon: CalendarDays, alsoActiveOn: ["/tournament"], pollBadge: true },
  { href: "/spiele", label: "Games", icon: Gamepad2, alsoActiveOn: ["/games"] },
  {
    href: "/community",
    label: "Community",
    icon: Handshake,
    alsoActiveOn: ["/leaderboard", "/community-board", "/squads", "/clip-galerie", "/servers", "/donations", ...CLIP_PATHS, ...COMMUNITY_BOARD_PATHS],
  },
  { href: "/profile", label: "Ich", icon: User, alsoActiveOn: ["/quests", "/shop", "/points", "/benachrichtigungen"] },
];

function matches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isActive(pathname: string, item: NavItem): boolean {
  return matches(pathname, item.href) || (item.alsoActiveOn ?? []).some((p) => matches(pathname, p));
}
