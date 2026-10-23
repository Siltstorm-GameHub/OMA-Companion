import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWatchOverview, resolveEventWatch, resolveWatchChannels } from "@/lib/watch-together";
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
 *   /zusammen           → Übersicht.
 */
export default async function ZusammenPage({ searchParams }: { searchParams: Promise<{ c?: string; event?: string }> }) {
  const { c, event } = await searchParams;

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

  return <WatchOverview data={await getWatchOverview()} />;
}
