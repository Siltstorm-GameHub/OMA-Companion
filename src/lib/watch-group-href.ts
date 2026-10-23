import type { WatchGroup } from "@/lib/watch-together";

/** Link zur gemeinsamen Ansicht einer Gruppe (Session, Event oder Kanal-Liste). */
export function watchGroupHref(g: WatchGroup): string {
  if (g.key.startsWith("session:")) return `/zusammen?s=${g.key.slice(8)}`;
  if (g.key.startsWith("event:")) return `/zusammen?event=${g.key.slice(6)}`;
  return `/zusammen?c=${g.members.map(m => m.twitchLogin).join(",")}`;
}
