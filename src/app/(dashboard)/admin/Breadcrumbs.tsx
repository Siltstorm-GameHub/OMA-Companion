"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, Home, ChevronLeft } from "lucide-react";

const SEGMENT_LABELS: Record<string, string> = {
  admin: "Dashboard",
  events: "Events",
  series: "Serien",
  lul: "Level-Up-League",
  "highlight-clips": "Highlight Clips",
  "clip-contest": "Clip-Contest",
  "clip-of-year": "Clip des Jahres",
  "daily-message": "Mitteilungen",
  partners: "Partner",
  servers: "Gameserver",
  donations: "Spendenpool",
  shop: "Shop",
  notifications: "Benachrichtigungen",
  badges: "Abzeichen",
  minigames: "Minigames",
  users: "Nutzer & Rollen",
  bracket: "Turnier",
  complete: "Abschließen",
  applications: "Anträge",
  new: "Neu",
  "new-season": "Neue Saison",
};

// IDs (cuid, uuid, etc.) sind lang und alphanumerisch — dafür zeigen wir einen generischen Label statt der rohen ID.
function isLikelyId(segment: string) {
  return segment.length > 15 && /^[a-z0-9-]+$/i.test(segment);
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const router = useRouter();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null; // nur "/admin" selbst -> keine Breadcrumbs nötig

  const crumbs = segments.map((segment, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = SEGMENT_LABELS[segment] ?? (isLikelyId(segment) ? "Details" : segment);
    return { href, label, isLast: i === segments.length - 1 };
  });

  // Auf tief verschachtelten Seiten (z.B. Bracket eines Events) zusätzlich einen
  // direkten "Zurück"-Button anzeigen, statt sich nur auf die Breadcrumb-Leiste zu verlassen.
  const isDeepPage = segments.length > 2;

  return (
    <div className="flex items-center gap-3 mb-3 flex-wrap">
      {isDeepPage && (
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors shrink-0 -m-1 p-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Zurück
        </button>
      )}
      <nav className="flex items-center gap-1 text-xs text-gray-500 overflow-x-auto scrollbar-none whitespace-nowrap">
        <Link href="/admin" className="flex items-center gap-1 hover:text-gray-300 transition-colors shrink-0">
          <Home className="w-3 h-3" />
        </Link>
        {crumbs.map(c => (
          <span key={c.href} className="flex items-center gap-1 shrink-0">
            <ChevronRight className="w-3 h-3 text-gray-700" />
            {c.isLast ? (
              <span className="text-gray-300 font-medium">{c.label}</span>
            ) : (
              <Link href={c.href} className="hover:text-gray-300 transition-colors">{c.label}</Link>
            )}
          </span>
        ))}
      </nav>
    </div>
  );
}
