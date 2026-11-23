import Image from "next/image";
import RankedAvatar from "@/components/RankedAvatar";
import { ExternalLink, Tv2 } from "@/components/icons";
import EventLiveBadge from "./EventLiveBadge";

type Partner = { id: string; name: string; twitchLogin: string; logoUrl: string };
type Streamer = { id: string; name: string | null; username: string | null; image: string | null; twitchLogin: string | null };

const CHIP = "flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors";

/**
 * Streams zum Event: Partner und Community-Streamer (Twitch-Lila bleibt als Markenfarbe).
 * `compact` = schmale Seitenspalte. Ausgelagert aus page.tsx.
 */
export default function EventStreams({ partners, streamers, compact = false, className = "" }: {
  partners: Partner[];
  streamers: Streamer[];
  compact?: boolean;
  className?: string;
}) {
  if (partners.length === 0 && streamers.length === 0) return null;
  return (
    <section aria-label="Streams" className={`rounded-card border border-[#9146ff]/30 bg-surface shadow-card px-4 py-3 space-y-2 ${className}`}>
      <div className={`flex gap-2 ${compact ? "flex-col items-start" : "flex-wrap items-center"}`}>
        <span className="flex items-center gap-2">
          <Tv2 className="size-4 text-[#9146ff] shrink-0" />
          <span className="text-sm font-bold text-fg">Live übertragen von</span>
        </span>
        <span className="flex flex-wrap gap-1.5">
          {partners.map(p => (
            <a key={p.id} href={`https://twitch.tv/${p.twitchLogin}`} target="_blank" rel="noopener noreferrer"
              className={`${CHIP} border-[#9146ff]/40 bg-[#9146ff]/15 text-[#c4a3ff] hover:bg-[#9146ff]/25`}>
              <Image src={p.logoUrl} alt={p.name} width={16} height={16} className="rounded-full shrink-0" />
              {p.name}
              <ExternalLink className="size-3 opacity-60" />
            </a>
          ))}
          {streamers.map(u => u.twitchLogin ? (
            <a key={u.id} href={`https://twitch.tv/${u.twitchLogin}`} target="_blank" rel="noopener noreferrer"
              className={`${CHIP} border-[#9146ff]/30 bg-[#9146ff]/10 text-[#c4a3ff] hover:bg-[#9146ff]/20`}>
              <RankedAvatar userId={u.id} src={u.image} alt={u.name ?? u.username ?? ""} size={16} className="w-4 h-4" />
              {u.name ?? u.username}
              <ExternalLink className="size-3 opacity-60" />
            </a>
          ) : (
            <span key={u.id} className={`${CHIP} border-line bg-surface-3 text-muted`}>
              <RankedAvatar userId={u.id} src={u.image} alt={u.name ?? u.username ?? ""} size={16} className="w-4 h-4" />
              {u.name ?? u.username}
            </span>
          ))}
        </span>
      </div>
      {partners.length > 0 && <EventLiveBadge twitchLogins={partners.map(p => p.twitchLogin.toLowerCase())} />}
    </section>
  );
}
