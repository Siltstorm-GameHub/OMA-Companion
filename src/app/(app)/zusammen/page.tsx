import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getWatchOverview, resolveEventWatch, resolveWatchChannels } from "@/lib/watch-together";
import { getSessionGroups, resolveSessionWatch } from "@/lib/watch-sessions";
import WatchTogetherView from "@/components/watch/WatchTogetherView";
import WatchOverview from "@/components/watch/WatchOverview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Zusammen ansehen · OMA",
  description: "Bis zu 4 Streams aus der OMA-Community gleichzeitig – mit gemeinsamem Chat.",
};

/**
 * "Zusammen ansehen" — öffentlich (bewusst außerhalb des Dashboard-Layouts: kein Login, volle
 * Breite für bis zu 4 Streams).
 *   /zusammen?c=a,b,c   → diese Kanäle (nur Community-Mitglieder),
 *   /zusammen?event=id  → alle streamenden Beteiligten eines Events,
 *   /zusammen?s=slug    → Einladungs-Session (fester, teilbarer Link aus der Live-Steuerung),
 *   /zusammen           → Übersicht.
 */
export default async function ZusammenPage({ searchParams }: { searchParams: Promise<{ c?: string; event?: string; s?: string }> }) {
  const { c, event, s } = await searchParams;

  if (s) {
    const watch = await resolveSessionWatch(s);
    if (!watch) notFound();
    if (watch.ended) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
          <h1 className="text-lg font-semibold text-white">{watch.title}</h1>
          <p className="text-sm text-gray-400">Diese gemeinsame Session ist beendet.</p>
          <Link href="/zusammen" className="text-sm text-teal-300 hover:underline">Wer ist gerade gemeinsam live? →</Link>
        </div>
      );
    }
    return (
      <WatchTogetherView
        title={watch.title}
        subtitle={[...new Set(watch.members.filter(m => m.live && m.game).map(m => m.game!))].join(" · ") || null}
        initialMembers={watch.members}
        refreshUrl={`/api/zusammen?s=${encodeURIComponent(s)}`}
      />
    );
  }

  if (c) {
    const members = await resolveWatchChannels(c.split(","));
    if (members.length === 0) notFound();
    const games = [...new Set(members.filter(m => m.live && m.game).map(m => m.game!))];
    return (
      <WatchTogetherView
        title={members.map(m => m.name).join(" + ")}
        subtitle={games.join(" · ") || null}
        initialMembers={members}
        refreshUrl={`/api/zusammen?c=${members.map(m => m.twitchLogin).join(",")}`}
      />
    );
  }

  if (event) {
    const watch = await resolveEventWatch(event);
    if (!watch) notFound();
    return (
      <WatchTogetherView
        title={watch.title}
        subtitle={watch.game}
        initialMembers={watch.members}
        refreshUrl={`/api/zusammen?event=${encodeURIComponent(event)}`}
      />
    );
  }

  const [overview, sessions] = await Promise.all([getWatchOverview(), getSessionGroups().catch(() => [])]);
  return <WatchOverview data={{ ...overview, sessions }} />;
}
