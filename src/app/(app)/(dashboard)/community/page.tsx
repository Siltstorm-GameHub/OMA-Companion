import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import type { LucideIcon } from "lucide-react";
import { GateLink } from "@/components/GuestGate";
import { ChevronRight, Heart, Trophy } from "@/components/icons";
import { COMMUNITY_NAV } from "@/components/shell/nav-config";

export const metadata: Metadata = { title: "Community | OMA" };

type Tile = { href: string; label: string; text: string; icon: LucideIcon; tone?: "live" | "coin" };

const DESCRIPTIONS: Record<string, string> = {
  "/community-board": "Berichte, Fotos, Ideen und Anleitungen aus den Community-Jobs",
  "/squads": "Feste Gruppen finden oder gründen",
  "/clip-galerie": "Clip des Monats, Clip des Jahres und die Galerie",
  "/servers": "Unsere Gameserver und Zugänge",
};

// Rangliste und Support stehen am Desktop in Menü bzw. Seitenleiste — am Handy sammelt diese Seite sie.
const TILES: Tile[] = [
  { href: "/leaderboard", label: "Rangliste", text: "Rang-Punkte, Saisons und Wanderpokale", icon: Trophy, tone: "coin" },
  ...COMMUNITY_NAV.map((n) => ({ href: n.href, label: n.label, text: DESCRIPTIONS[n.href] ?? "", icon: n.icon })),
  { href: "/donations", label: "Support", text: "Spendenpool: Server, Preise und Events", icon: Heart, tone: "live" },
];

/** Kachel-Übersicht hinter dem Reiter "Community" der unteren Leiste (Handy). */
export default function CommunityPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
      <PageHeader title="Community" description="Alles, was die OMA-Community gemeinsam macht." />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TILES.map((t) => (
          <GateLink
            key={t.href}
            href={t.href}
            className="card-hover flex min-h-20 items-center gap-3.5 rounded-card border border-line bg-surface p-4"
          >
            <span
              className={`grid size-11 shrink-0 place-items-center rounded-control ${
                t.tone === "live" ? "bg-live-soft text-live" : t.tone === "coin" ? "bg-coin-soft text-coin" : "bg-primary-soft text-primary-fg"
              }`}
            >
              <t.icon className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-fg">{t.label}</span>
              <span className="block text-xs leading-snug text-muted">{t.text}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-subtle" aria-hidden />
          </GateLink>
        ))}
      </div>
    </div>
  );
}
