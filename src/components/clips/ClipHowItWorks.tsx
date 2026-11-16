import Link from "next/link";
import { ChevronRight, Tv2 } from "@/components/icons";

/**
 * "So kommt dein Clip rein": Die Abstimmung sammelt automatisch die Twitch-Clips der Partner-Kanäle
 * und die Clips, die Mitglieder nach einem Event auf der Event-Seite einreichen (lib/clip-contest.ts).
 * Ziel des Sprungankers #einreichen (z.B. von der Startseiten-Kachel).
 */
export default function ClipHowItWorks({ lastEvent }: { lastEvent: { id: string; title: string } | null }) {
  return (
    <section id="einreichen" aria-label="So kommt dein Clip rein" className="glass rounded-2xl p-4 scroll-mt-24">
      <h2 className="text-sm font-semibold text-white flex items-center gap-2">
        <Tv2 className="w-4 h-4 text-[#b794ff]" /> So kommt dein Clip rein
      </h2>
      <ul className="mt-2 space-y-1.5 text-sm text-gray-400">
        <li>• Clips der Partner-Kanäle auf Twitch kommen automatisch in die nächste Abstimmung.</li>
        <li>• Deinen eigenen Clip reichst du nach einem Event direkt auf der Event-Seite ein. Er kommt in die Abstimmung für den Monat, in dem das Event war.</li>
      </ul>
      {lastEvent && (
        <Link href={`/tournament/${lastEvent.id}#clip`}
          className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[#9146ff]/15 border border-[#9146ff]/30 px-3 py-1.5 text-xs font-semibold text-purple-200 hover:bg-[#9146ff]/25">
          Clip zu „{lastEvent.title}“ einreichen <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </section>
  );
}
